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

**Web reputation search (needs internet):**
- Searches the web for the shop's domain and scans the results for scam
  reports, complaints and reviews on recognized platforms (ScamAdviser,
  Trustpilot, Sitejabber, Reddit, BBB, and similar)
- Flags the site if independent sources describe it as a scam, and gives
  it a mild positive if it's reviewed with no complaints or has an
  established web presence (e.g. a Wikipedia entry)
- Shows the sources it found as clickable links ("What the web says") so
  you can read them yourself

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

## Web-search reliability (optional API key)

The web-reputation search works with **no setup** using DuckDuckGo. But
search engines often rate-limit or block requests coming from cloud
servers (like Vercel), so for consistent results you can plug in a real
search API by setting **one** of these environment variables:

| Env var | Provider | Free tier |
|---|---|---|
| `SERPER_API_KEY` | [serper.dev](https://serper.dev) (Google results) | ~2,500 free searches |
| `BRAVE_API_KEY` | [Brave Search API](https://brave.com/search/api/) | free tier available |

On Vercel: **Project → Settings → Environment Variables**, add the key,
then redeploy. If neither key is set, the app falls back to DuckDuckGo,
and if a search can't be completed it simply says so rather than guessing.

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
