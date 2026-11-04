"""Negotiation flow in local demo mode: borrower offers, owner accepts, request carries the agreed rate."""
from playwright.sync_api import sync_playwright
BASE = "http://localhost:3100"
ok = fail = 0
def check(name, cond, extra=""):
    global ok, fail
    print(("PASS " if cond else "FAIL ") + name + (f" | {extra}" if extra else ""))
    ok += cond; fail += (not cond)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome")
    pg = b.new_page(viewport={"width": 1280, "height": 900}); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.goto(BASE + "/"); pg.wait_for_selector("h1")
    pg.select_option('select[aria-label="Switch demo account"]', label="Lakshmi Priya")
    pg.goto(BASE + "/discover"); pg.wait_for_selector("h1")
    pg.click("text=Cordless drill with bit set"); pg.wait_for_selector("text=Message owner")
    check("listed price shown on detail", pg.locator("text=₹80/day").count() > 0)
    pg.click("text=Message owner"); pg.wait_for_selector('textarea[aria-label="Message"]')
    pg.fill('textarea[aria-label="Message"]', "Hi, could you do it for less? I need it for 3 days."); pg.keyboard.press("Enter")
    pg.wait_for_selector("text=could you do it for less")
    check("text message appears", True)
    pg.click("text=Price offer"); pg.fill('input[placeholder="/day"]', "60"); pg.fill('textarea[aria-label="Message"]', "Student budget, thanks!")
    pg.click('button[aria-label="Send offer"]'); pg.wait_for_selector("text=Offer ₹60/day")
    check("offer bubble appears", True)
    check("waiting banner", pg.locator("text=Waiting for Meera").count() > 0)
    pg.fill('input[placeholder="/day"]', "-5") if False else None
    # privacy: a third account must not see the thread
    pg.select_option('select[aria-label="Switch demo account"]', label="Kavin Raj"); pg.goto(BASE + "/messages"); pg.wait_for_selector("h1")
    check("third party sees no conversation", pg.locator("text=Cordless drill").count() == 0 or pg.locator("text=No conversations yet").count() > 0)
    # owner answers
    pg.select_option('select[aria-label="Switch demo account"]', label="Meera Iyer"); pg.goto(BASE + "/messages"); pg.wait_for_selector("h1")
    pg.click('ul[aria-label="Conversations"] button'); pg.wait_for_selector("text=Offer ₹60/day")
    check("owner sees offer + accept", pg.locator("button:has-text('Accept')").count() > 0)
    pg.click("button:has-text('Accept')"); pg.wait_for_selector("text=Agreed price: ₹60/day")
    check("deal banner for owner", True)
    # borrower requests at the agreed rate
    pg.select_option('select[aria-label="Switch demo account"]', label="Lakshmi Priya"); pg.goto(BASE + "/discover/i1"); pg.wait_for_selector("text=Message owner")
    pg.click("button:has-text('Request')")
    pg.wait_for_selector("text=your negotiated rate")
    check("request dialog shows negotiated rate", pg.locator("text=₹60/day").count() > 0 and pg.locator("text=listed ₹80/day").count() > 0)
    pg.close()
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(BASE + "/"); pg.evaluate("localStorage.setItem('relo.theme','dark')"); pg.reload(); pg.wait_for_selector("h1")
    check("dark class applied before paint", pg.evaluate("document.documentElement.classList.contains('dark')"))
    bg = pg.evaluate("getComputedStyle(document.body).backgroundColor")
    check("dark background", bg == "rgb(10, 20, 36)", bg)
    pg.click('button[aria-label="Light theme"]')
    check("switch to light", not pg.evaluate("document.documentElement.classList.contains('dark')"))
    check("no console errors", not errs, str(errs[:2]))
    b.close()
print(f"\n{ok}/{ok+fail} passed"); raise SystemExit(1 if fail else 0)
