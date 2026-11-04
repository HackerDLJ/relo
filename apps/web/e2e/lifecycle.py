import re, sys
from playwright.sync_api import sync_playwright, expect
BASE="http://localhost:3100"
log=[]
def ok(name,cond,extra=""):
    log.append((name,bool(cond),extra)); print(("PASS " if cond else "FAIL ")+name+(" | "+extra if extra else ""))
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    ctx=b.new_context(viewport={"width":1280,"height":900}); pg=ctx.new_page()
    pg.on("console",lambda m:errs.append(m.text[:160]) if m.type=="error" else None)
    pg.on("pageerror",lambda e:errs.append(str(e)[:160]))
    def go(path): pg.goto(BASE+path); pg.wait_for_selector("h1",timeout=8000)
    def switch(name): pg.select_option('select[aria-label="Switch demo account"]',label=name); pg.wait_for_timeout(150)
    def toast(): return pg.locator('[role=status]').inner_text()

    # 1 Discover search + filter
    go("/discover")
    pg.fill('input[aria-label="Search items"]',"drill"); pg.wait_for_timeout(200)
    n=pg.locator("main a[href^='/discover/']").count()
    ok("Search 'drill' returns drills",n>=2,f"{n} results")
    pg.fill('input[aria-label="Search items"]',"zzzz"); pg.wait_for_timeout(200)
    ok("Empty state for no results",pg.get_by_text("Nothing matches yet").is_visible())
    pg.fill('input[aria-label="Search items"]',""); pg.get_by_role("button",name="Kitchen",exact=True).click(); pg.wait_for_timeout(200)
    ok("Category filter Kitchen",pg.locator("main a[href^='/discover/']").count()==1)

    # 2 Owner ranking + approve -> competing go to waitlist (as Meera, drill i1)
    go("/listings")
    card=pg.locator("li.card").filter(has_text="Cordless drill with bit set").first
    ranks=card.locator('span[aria-label^="Rank"]')
    ok("3 competing requests ranked on drill",ranks.count()==3)
    first=card.locator("li, div.rounded-xl.border").first
    names=card.get_by_text(re.compile(r"(Divya Nair|Kavin Raj|Arun Pandian) ·")).all_inner_texts()
    ok("Urgent+trusted Divya outranks earlier Kavin",names and names[0].startswith("Divya"),str(names[:3]))
    card.get_by_text("Why this rank?").first.click()
    ok("Rank explanation shows breakdown",card.get_by_text("Fairness boost for past denials").first.is_visible())
    card.get_by_role("button",name="Approve").first.click(); pg.wait_for_timeout(300)
    t=toast(); ok("Approve moves others to waitlist","waitlist" in t.lower(),t[:90])
    go("/discover/i1")
    ok("Locked dates visible on item page",pg.get_by_text("Locked dates").is_visible())

    # 3 Conflict prevention: Kavin requests overlapping approved dates
    switch("Lakshmi Priya"); go("/discover/i1")
    pg.get_by_role("button",name=re.compile("Request")).first.click()
    from datetime import date,timedelta
    d=lambda n:(date.today()+timedelta(days=n)).isoformat()
    inputs=pg.locator('[role=dialog] input[type=date]')
    inputs.nth(0).fill(d(3)); inputs.nth(1).fill(d(4)); pg.wait_for_timeout(200)
    ok("Overlap detected before submit",pg.get_by_text("Those dates are reserved").is_visible())
    ok("Alternatives offered for booked dates",pg.get_by_text("Next-best alternatives for your dates").is_visible())
    ok("Waitlist button offered",pg.get_by_role("button",name="Join the waitlist").is_visible())
    pg.keyboard.press("Escape")

    # 4 Past/reversed date validation
    pg.get_by_role("button",name=re.compile("Request")).first.click()
    inputs=pg.locator('[role=dialog] input[type=date]')
    inputs.nth(0).fill(d(10)); inputs.nth(1).fill(d(8)); pg.wait_for_timeout(200)
    ok("Reversed dates rejected inline",pg.get_by_text("can't be before the start date").is_visible())
    pg.keyboard.press("Escape")

    # 5 Publish an item as Meera and find it
    switch("Meera Iyer"); go("/listings")
    pg.get_by_role("button",name="List an item").first.click()
    dlg=pg.locator("[role=dialog]")
    dlg.get_by_role("button",name="Publish item").click(); pg.wait_for_timeout(200)
    ok("Listing validation blocks empty form",dlg.locator("[role=alert]").first.is_visible())
    dlg.get_by_label("Item name").fill("Test Soldering Iron Kit")
    dlg.get_by_label("Category").select_option("Tools")
    dlg.get_by_label("Description").fill("Temperature controlled soldering iron with stand and solder.")
    dlg.get_by_label("Available until").fill(d(60))
    dlg.get_by_label(re.compile("replacement value")).fill("1800")
    dlg.get_by_role("button",name="Publish item").click(); pg.wait_for_timeout(300)
    ok("Item published",pg.locator("li.card").filter(has_text="Test Soldering Iron Kit").count()==1)
    go("/discover"); pg.fill('input[aria-label="Search items"]',"soldering"); pg.wait_for_timeout(200)
    ok("New item discoverable via search",pg.locator("main a[href^='/discover/']").count()==1)

    # 6 Persistence
    pg.reload(); pg.wait_for_selector("h1"); pg.fill('input[aria-label="Search items"]',"soldering"); pg.wait_for_timeout(200)
    ok("Item persists after reload",pg.locator("main a[href^='/discover/']").count()==1)

    # 7 Extension approve (Meera owns drill i1 with Syed's pending extension)
    go("/returns")
    ok("Extension request visible to owner",pg.get_by_text("Extension requests to decide").is_visible())
    pg.get_by_role("button",name="Approve").first.click(); pg.wait_for_timeout(300)
    ok("Extension approved",("Extension approved" in toast()) or ("approved" in toast().lower()),toast()[:80])

    # 8 Return + trust update (Arun's overdue cooker, owner Meera)
    go("/trust"); before=int(pg.locator("svg[aria-label^='Trust score']").get_attribute("aria-label").split()[2])
    switch("Arun Pandian"); go("/trust"); a0=int(pg.locator("svg[aria-label^='Trust score']").get_attribute("aria-label").split()[2])
    switch("Meera Iyer"); go("/returns")
    c=pg.locator("li.card").filter(has_text="7L pressure cooker").first
    c.get_by_role("button",name="Confirm return").click()
    pg.locator("[role=dialog]").get_by_role("button",name="Confirm item is back").click(); pg.wait_for_timeout(300)
    t=toast(); ok("Late return penalises borrower","late" in t.lower(),t[:100])
    switch("Arun Pandian"); go("/trust"); a1=int(pg.locator("svg[aria-label^='Trust score']").get_attribute("aria-label").split()[2])
    ok("Borrower trust dropped after late return",a1<a0,f"{a0} -> {a1}")
    switch("Lakshmi Priya"); go("/waitlist")
    go("/borrowing")
    ok("Waitlisted request reopened to pending after return",pg.get_by_text("Awaiting owner").count()>=1)

    # 9 Impact updates
    go("/impact"); ok("Impact page labels estimates",pg.get_by_text("Estimate").first.is_visible())

    # 10 Different page: all 8 rows
    go("/different")
    rows=["Finding a match","Demand side","Availability","Competing requests","Item suddenly unavailable","Overdue returns","Trust","Purpose"]
    ok("All 8 differentiators present",all(pg.locator("tbody th",has_text=r).count()==1 for r in rows))

    ok("No console errors in flow",not errs,str(errs[:3]))
    b.close()
fails=[l for l in log if not l[1]]
print(f"\n{len(log)-len(fails)}/{len(log)} passed")
