# Promo Radar

A promo-code and gift-card tracker for popular Pakistani stores, with a
travel mode that finds deals by destination country.

**Live:** https://promo-radar-ten.vercel.app

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

## Why this isn't a live scraper

"Constantly looks for promo codes" sounds like it should mean a bot crawling
Daraz, Foodpanda and every fashion site around the clock. That's not viable
as the default, for the same reasons this repo's `hotel-radar` app landed on
licensed APIs instead of scraping booking sites:

- Retailers vary and mostly don't offer a public "current coupons" API, so
  there's no legitimate source to poll.
- Anything that did scrape store pages would break constantly (markup
  changes with no notice), risk violating each site's terms of service, and
  get treated as a bot by anti-abuse systems — a wall this repo's hotel
  radar hit directly.
- Promo codes churn fast and are highly personalized (first-order-only,
  app-only, one-per-CNIC); a scraped code list would be stale within hours
  regardless.

So the catalogue in `src/lib/catalog.js` ships as clearly-labeled **starter
data** — realistic in shape, badged "Unverified" in the UI, meant to be
replaced with codes you actually confirm. What *is* real and automatic is
the radar loop: it genuinely, continuously watches whatever is in your list
(seed + anything you add) and retires it the instant it expires.

### If you want real live data later

The cleanest path, same pattern as `hotel-radar/api/hotels.js`: add a small
serverless function (`api/codes.js`) that calls an affiliate network with an
actual coupon feed — Involve Asia and Admitad both operate in Pakistan and
give merchants/affiliates a structured feed of live vouchers — and merge its
response into `CATALOG` client-side. The data model (`store`, `code`,
`discountType`, `expiresAt`, `terms`, `howTo`, …) is already shaped for that;
nothing in the UI needs to change, only where the array comes from.

## Deploying to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import
   `ajabbar12765-hash/Claude`.
2. Set **Root Directory** to `promo-radar` — the repo holds several apps, so
   this is the setting that matters.
3. Deploy. `vercel.json` pins the framework, build command and output
   directory, so leave those on auto-detect.

## Layout

```
src/
  App.jsx                    top-level state, radar scan loop
  lib/
    catalog.js               starter codes: stores, categories, countries
    storage.js                localStorage: used / removed / custom codes
    radar.js                   scan loop: finds expired codes, flags soon-to-expire
    format.js                  date/expiry/relative-time helpers
  components/
    TopBar  StatusPill  CategoryTabs  SearchBar  TravelPanel
    CodeCard  CodeDetailModal  ArchiveDrawer  AddCodeModal  Toasts
```

## Notes

- Everything — used codes, removed codes, codes you add, scan timestamps —
  persists to `localStorage` only. Clearing site data resets it.
- Works in light and dark, down to small phone widths.
- No signup, no payment handling — every card links out to the store's own
  site for checkout.
