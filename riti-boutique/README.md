# Riti Boutique — spec demo site + outreach pack

A pitch asset for **Northlight**: a complete website built for Riti Boutique (Al Karama, Dubai)
before they have agreed to anything, plus the WhatsApp script to send it with.

Everything on the page — photos, reviews, rating, address, hours, phone — was scraped from the
boutique's public Google Business listing and Instagram profile on **12 August 2026**.
Nothing is invented.

## Files

| Path | What it is |
|---|---|
| `index.html` | The built site. Open it in a browser. |
| `template.html` | Source template with `{{PLACEHOLDER}}` slots. |
| `build.py` | Renders `index.html` from `template.html` + `data/scraped-raw.json`. |
| `assets/style.css` | All styling. Single light theme — oxblood, antique gold, warm cream. |
| `assets/site.js` | Mobile nav + "show all photos". No dependencies. |
| `data/scraped-raw.json` | Raw scrape: 30 Google photo URLs, 50 reviews, 34 Instagram posts. |
| `SALES-SCRIPT.md` | The WhatsApp outreach pack — lead intel, opener, demo drop, pricing, objections, follow-ups. |

## Rebuilding

```bash
python3 build.py
```

Edit `template.html` for copy and layout, `build.py` for which reviews and images get pulled
through, then rebuild. No toolchain, no npm.

## Images — important

The gallery hotlinks 30 photos from `lh3.googleusercontent.com` (the Google Maps photo host).
Those URLs are stable and load fine in any browser.

The **Instagram** image URLs in `data/scraped-raw.json` are signed `fbcdn.net` links that
**expire within days**. They are stored for reference only and are not used by the page. If you
want Instagram photos on the site, download them promptly and commit them locally:

```bash
mkdir -p assets/img/ig
jq -r '.instagram.posts[].displayUrl' data/scraped-raw.json \
  | nl -w2 -nrz | while read -r n u; do curl -sSL -o "assets/img/ig/ig-$n.jpg" "$u"; done
```

(This has to run somewhere with unrestricted outbound access — a sandboxed environment with a
filtering proxy will get 403s on the CDN hosts.)

## Deploying

Static — any host works. Drag the folder into Netlify, or:

```bash
npx vercel deploy --prod
```

**Deploy before you send the script.** The entire pitch depends on dropping a live link in
message 3.

## Data sources

- `compass/crawler-google-places` — place details, 50 reviews, 30 photos, hours, rating spread
- `apify/instagram-scraper` — profile details (72,835 followers, 10,854 posts) + 34 recent posts

## One caution

This is a spec mockup made to win the client, and it uses their photography and their customer
reviews. That is normal for a pitch — but keep it on a private or unlisted URL, share it with
the boutique directly, and take it down if they pass. Do not let it get indexed as if it were
their official site while it isn't.
