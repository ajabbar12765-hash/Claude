# Promo Radar

A promo-code and gift-card tracker for popular Pakistani stores, with a
travel mode that finds deals by destination country.

**Live:** git-linked Vercel project `promo-radar-pk`, auto-deploys a preview on every push to this branch.

```bash
cd promo-radar
npm install
npm run dev      # http://localhost:5181
```

## What it does

**Local deals.** Browse codes across online shopping (Daraz, Telemart,
iShopping.pk), fashion (Springs, Khaadi, Sapphire, Gul Ahmed, Outfitters,
Bonanza Satrangi, J., Levi's Pakistan), food delivery (Foodpanda, Cheetay),
grocery (Metro, Imtiaz), telecom (Jazz, Zong, Telenor, Ufone), and gift cards
(Google Play PK, PlayStation Store PK, Careem, Daraz). Search, filter by
category, copy a code, or open a card for the full details — min spend, max
discount, terms, and step-by-step redemption instructions.

**Travel mode.** Switch to "✈️ Travel mode", type a destination country (UAE,
Saudi Arabia, Turkey, Thailand, Malaysia, UK, China, or domestic Pakistan),
and see flight, hotel and tour-package codes tagged for that country, plus
gift cards that work anywhere.

**The radar.** Runs on a timer in the background and re-checks every code's
expiry date. The moment one passes, it's auto-retired — moved to the Archive
with a toast and an Undo button — so the active list is never cluttered with
dead codes. The status pill in the header shows how many codes are being
watched and when the last scan ran.

**Mark as used, and it's gone.** Every card has "✅ It worked" and "❌ Didn't
work". Marking a code as worked records it as used *and* removes it from your
active list, since most codes are one-time-use anyway — it moves to the
Archive so you still have a record, with Undo if you tap it by mistake.
Reporting "Didn't work" removes it the same way. All of this is local to your
browser (`localStorage`) — no account, no server, same as this repo's other
radar apps.

**Add your own.** "+ Add a code" saves a code you found elsewhere (a
newsletter, Instagram, a coupon site) into the same tracked list — the radar
watches it, expiry and all, exactly like the starter catalogue.

## Starter data vs. the live scan

The catalogue in `src/lib/catalog.js` ships as clearly-labeled **starter
data** — realistic in shape, badged "Unverified" in the UI. What's genuinely
automatic even without any setup is the radar loop: it continuously watches
whatever is in your list (seed + anything you add) and retires it the
instant it expires.

On top of that, `api/codes.js` is a real, optional live scanner. It's off by
default because it needs your own Apify account (see below) — without one
the app runs perfectly well on the starter catalogue alone.

### Turning on the live scan (Apify)

When configured, `/api/codes` calls [Apify](https://apify.com)'s
`website-content-crawler` actor server-side against a curated list of
**official store pages** (currently Daraz's own vouchers page, Telemart's
and Symbios.pk's promotions pages — see `TARGETS` in `api/codes.js`), pulls
back page text, and regex-extracts code-shaped tokens that sit near discount
language ("% off", "Rs", "flat", "voucher", …). Results are cached for 6
hours and merged into the catalogue as unverified live finds.

Deliberately **not** scraping third-party coupon-listicle sites (Picodi,
WorthEPenny, SimplyCodes, etc.) — a live web search while building this
turned up codes like `Hiba10` for Daraz on exactly those sites, and they're
widely known for auto-generating plausible-looking codes that don't actually
work at checkout. Official first-party pages are the only source worth
automating.

**Setup** (all server-side — once it's on, scans run on Vercel + Apify's
compute with zero further Anthropic/Claude usage):

1. Create a free account at [apify.com](https://apify.com) and copy your
   API token from **Settings → Integrations**.
2. In the Vercel project → **Settings → Environment Variables**, add
   `APIFY_TOKEN` with that value, then redeploy.
3. Reload the app — the status pill switches from "Starter data only" to
   "Live scan active" once a scan succeeds.

**Honest limits, so you know what you're getting:** this is real
infrastructure, not a finished, perfectly-tuned scraper. Some store pages
render their voucher list client-side after the initial load (Daraz's own
vouchers page does), so the crawler's markdown extract can come back mostly
navigation chrome rather than the voucher cards — the regex extractor then
simply finds nothing on that pass and the app quietly keeps using the
starter data. Getting each target page reliably parsed (waiting for the
right selector, or finding the site's internal JSON endpoint) is exactly the
kind of per-site tuning a production scraper needs over time; `TARGETS` and
`extractCandidates()` in `api/codes.js` are where that tuning happens. Live
finds are still badged "Unverified" like everything else until confirmed —
this system finds candidates faster, it doesn't replace judgment at
checkout.

## Deploying to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import
   `ajabbar12765-hash/Claude`.
2. Set **Root Directory** to `promo-radar` — the repo holds several apps, so
   this is the setting that matters.
3. Deploy. `vercel.json` pins the framework, build command and output
   directory, so leave those on auto-detect.

## Layout

```
api/
  codes.js                    Apify-backed live scan (optional, needs APIFY_TOKEN)
src/
  App.jsx                     top-level state, radar scan loop, live-scan fetch
  lib/
    catalog.js                starter codes: stores, categories, countries, accents
    storage.js                 localStorage: used / removed / custom codes
    radar.js                    scan loop: finds expired codes, flags soon-to-expire
    liveCodes.js                 fetches /api/codes, shapes results into catalog entries
    format.js                    date/expiry/relative-time helpers
    useReveal.js                  scroll-triggered reveal hook (IntersectionObserver)
  components/
    Hero  PlaceLookup           scroll hero + "look up a place" search
    TopBar  StatusPill  CategoryTabs  SearchBar  TravelPanel
    CodeCard  CodeDetailModal  ArchiveDrawer  AddCodeModal  Toasts
```

## Notes

- Everything — used codes, removed codes, codes you add, scan timestamps —
  persists to `localStorage` only. Clearing site data resets it.
- Works in light and dark, down to small phone widths.
- No signup, no payment handling — every card links out to the store's own
  site for checkout.
