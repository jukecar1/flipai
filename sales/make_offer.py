"""Builds one-page offer sheets (PDF) from the template below.
Usage: python3 make_offer.py [--name "Your Business"] [--contact "Your Name | (850) 555-0100 | you@email.com"]
Outputs sales/offer/offer-standard.pdf and offer-showcase.pdf
"""
import argparse, html, subprocess, pathlib

ap = argparse.ArgumentParser()
ap.add_argument("--name", default="[Your Business Name]")
ap.add_argument("--contact", default="[Your Name]  |  [Phone]  |  [Email]")
ap.add_argument("--regular-build", type=int, default=400)
ap.add_argument("--showcase-build", type=int, default=200)
ap.add_argument("--monthly", type=int, default=50)
ap.add_argument("--buyout", type=int, default=300)
a = ap.parse_args()
out = pathlib.Path(__file__).parent / "offer"; out.mkdir(exist_ok=True)
e = html.escape

def page(showcase: bool) -> str:
    if showcase:
        build = f'<s>${a.regular_build}</s> <b>${a.showcase_build}</b>'
        note = "First-client price in exchange for permission to show your site in my portfolio and a short testimonial."
    else:
        build = f'<b>${a.regular_build}</b>'
        note = "One-time. Includes one round of revisions before launch."
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@page {{ size: Letter; margin: 0.45in }}
*{{box-sizing:border-box}}
body{{margin:0;font-family:Arial,Helvetica,sans-serif;color:#0f1c2e;font-size:13px;line-height:1.45}}
.top{{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #15407a;padding-bottom:8px;margin-bottom:12px}}
h1{{margin:0;font-size:28px;color:#15407a}} .sub{{color:#566177;font-size:12px;margin-top:4px}}
.biz{{text-align:right;font-weight:bold;color:#15407a;font-size:16px}}
.prices{{display:flex;gap:14px;margin-bottom:6px}}
.box{{flex:1;border:1px solid #d0d7e2;border-radius:12px;padding:14px 16px}}
.box .l{{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#566177;font-weight:bold}}
.box .p{{font-size:36px;color:#15407a;margin:2px 0}} .box .p b{{font-weight:900}} .box .p small{{font-size:15px;color:#566177}}
.box .n{{font-size:11px;color:#566177}}
h2{{font-size:14px;margin:18px 0 7px;color:#15407a;text-transform:uppercase;letter-spacing:.06em}}
ul{{margin:0;padding-left:16px}} li{{margin:4px 0}}
.cols{{display:flex;gap:18px}} .cols>div{{flex:1}}
.fine{{background:#f3f6fb;border-radius:8px;padding:11px 14px;margin-top:16px;font-size:11.5px;color:#34405a}}
.foot{{margin-top:18px;border-top:1px solid #d0d7e2;padding-top:9px;color:#566177;font-size:11px;display:flex;justify-content:space-between}}
</style></head><body>
<div class="top"><div><h1>Your Website + Care Plan</h1><div class="sub">Prepared for: ______________________________ &nbsp; Date: ____________</div></div>
<div class="biz">{e(a.name)}</div></div>

<div class="prices">
<div class="box"><div class="l">Website build</div><div class="p">{build}</div><div class="n">{e(note)}</div></div>
<div class="box"><div class="l">Care plan</div><div class="p"><b>${a.monthly}</b><small> / month</small></div><div class="n">Month-to-month. Cancel any time with 30 days' notice.</div></div>
</div>

<div class="cols"><div>
<h2>Your website includes</h2>
<ul><li>Custom, mobile-friendly design built around your business</li>
<li>Your services, service areas, hours, and real photos</li>
<li>Your Google reviews displayed on the page</li>
<li>Tap-to-call buttons and a free-estimate request form</li>
<li>Your own domain name and secure (HTTPS) hosting set up</li>
<li>One round of revisions before launch</li></ul>
</div><div>
<h2>Your care plan includes</h2>
<ul><li>Hosting, security, and domain renewal</li>
<li>Up to 2 small edits a month (hours, prices, photos, services)</li>
<li>Contact form kept working, with requests sent to your email</li>
<li>Uptime monitoring, with fixes within 1 business day</li>
<li>Quarterly Google profile check-up</li>
<li>A simple way to ask customers for Google reviews</li>
<li>Support by text or email, with a reply within 1 business day</li></ul>
</div></div>

<h2>Not included (quoted separately)</h2>
<div class="cols"><div><ul><li>Extra edits beyond 2 a month: $25 each</li><li>New pages or a redesign</li><li>Logo design, photography, long-form writing</li></ul></div>
<div><ul><li>Optional add-ons: online booking, an AI assistant that answers calls and texts, call tracking</li><li>Ads management and business email accounts</li></ul></div></div>

<div class="fine"><b>Good to know:</b> I register and host your domain name and site for you under the care plan. If you ever want to take over your domain and site files, a one-time <b>${a.buyout} buyout</b> transfers them to you, along with help moving the site to your own hosting. The text and photos you provide always remain yours. Unused edits do not roll over. A website supports your business but I can't guarantee search rankings, calls, or sales. Details are confirmed in a short written agreement before work begins.</div>

<div class="foot"><span>{e(a.contact)}</span><span>Prices valid for 14 days</span></div>
</body></html>"""

chrome = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
for name, showcase in (("standard", False), ("showcase", True)):
    h = out / f"offer-{name}.html"; h.write_text(page(showcase))
    subprocess.run([chrome, "--headless", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                    f"--print-to-pdf={out / f'offer-{name}.pdf'}", f"file://{h}"], check=True, capture_output=True)
    print("built", out / f"offer-{name}.pdf")
