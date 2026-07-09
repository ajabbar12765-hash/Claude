# 🛡️ Scam Shield

A small web app that helps you decide whether it's safe to order from a
website you found through an ad (Facebook, Instagram, TikTok, Google ads,
etc.). Paste the link, and it gives you a color-coded verdict with a
plain-English explanation of every red flag it found.

**Live site:** https://scam-shield-snowy.vercel.app

## What it checks

**The link itself (works even offline):**
- Fake-brand domains — typos of Amazon, Nike, Daraz, PayPal, etc.
  (`amazom.top`), brand names buried in subdomains
  (`amazon.com.big-sale.xyz`)
- Disguised international "lookalike" characters (punycode phishing)
- Cheap throwaway domain endings (`.top`, `.xyz`, `.icu`, …)
- Link shorteners that hide the real destination
- Raw IP addresses instead of a real website name
- Unencrypted (HTTP) links
- Facebook / Instagram / Google ad redirects are automatically unwrapped
  so the real destination is analyzed

**Live checks (needs internet):**
- Domain age via the public RDAP registry — most scam shops are under
  3 months old
- Whether the site exists, has a valid HTTPS certificate, and where its
  redirects really lead
- Page content: fake urgency ("closing down!", countdown timers),
  impossible discounts (70–90% off), prize/giveaway bait, requests for
  untraceable payment (wire transfer, gift cards, crypto), and whether
  the shop has contact / returns / policy pages at all

Each signal contributes points to a 0–100 risk score:

| Verdict | Meaning |
|---|---|
| 🔴 High risk | Multiple strong scam signals — do not order |
| 🟠 Suspicious | Real warning signs — research before paying anything |
| 🟡 Mixed signals | A few yellow flags — check reviews first |
| 🟢 No major red flags | Nothing matched known scam patterns (not a guarantee) |

## How to run it

The app is deployed on Vercel at https://scam-shield-snowy.vercel.app —
`pyproject.toml` declares the Flask app (`app:app`) as the Vercel Python
entrypoint, so redeploying is just pushing this folder to a Vercel project.

To run it locally instead (Python 3.9+):

```bash
cd scam-shield
pip install -r requirements.txt
python3 app.py
```

Then open **http://localhost:5000** in your browser, paste a link, and
press **Check**.

## Running the tests

The heuristics have an offline test suite (no network required):

```bash
cd scam-shield
python3 -m unittest test_analyzer -v
```

## Honest limitations

- A **green result is not a guarantee** — brand-new scams with clean
  domains can pass any automated check. Always pay with a method that
  has buyer protection (credit card or PayPal).
- A **flagged site is not proof of fraud** — some legitimate small shops
  use cheap domains or aggressive marketing.
- Domain-age lookups depend on the public RDAP service; if it's
  unreachable, that check is skipped and says so.
