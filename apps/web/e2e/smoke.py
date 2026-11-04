import sys
from playwright.sync_api import sync_playwright
BASE="http://localhost:3100"
ROUTES=["/","/discover","/discover/i1","/requests","/listings","/borrowing","/loans","/waitlist","/returns","/trust","/impact","/different","/profile"]
errs=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    for vp,name in [({"width":1280,"height":800},"desktop"),({"width":390,"height":800},"mobile")]:
        ctx=b.new_context(viewport=vp); pg=ctx.new_page()
        pg.on("console",lambda m,n=name:errs.append((n,m.type,m.text[:200])) if m.type in("error",) else None)
        pg.on("pageerror",lambda e,n=name:errs.append((n,"pageerror",str(e)[:200])))
        for r in ROUTES:
            pg.goto(BASE+r); pg.wait_for_selector("h1",timeout=8000)
            h=pg.locator("h1").first.inner_text()
            sw=pg.evaluate("document.documentElement.scrollWidth>window.innerWidth+1")
            print(name,r,"|",h[:40],"| hscroll" if sw else "")
        ctx.close()
    b.close()
print("ERRORS:",errs if errs else "none")
