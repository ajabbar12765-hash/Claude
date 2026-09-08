# Promo Radar

A promo-code and gift-card tracker for popular Pakistani stores, with a
travel mode that finds deals by destination country.

**Live:** https://promo-radar-pk-git-claude-pa-1c98a0-ajabbar12765-hashs-projects.vercel.app
(git-linked to this branch — every push here redeploys it automatically)

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
`website-content-crawler` actor server-side against official store pages
(see `TARGETS` in `api/codes.js`), and extracts what's actually live on the
page right now. Results are cached for 6 hours and merged into the
catalogue.

**Why this finds deals, not codes.** The first version of this hunted for
alphanumeric "code-shaped" tokens near discount language. Before shipping
it, it was actually run — for real, with a real Apify actor — against
Daraz's own vouchers page, SteamShop.pk, and Outfitters. All three publish
**automatic** discounts ("50% OFF" sitewide, "Rs. 100 off orders over Rs.
1000") with nothing to type in at checkout — no store checked turned up a
single literal code on its own page. Worse, the naive extractor didn't just
fail quietly on that content: it found URL query-string fragments like
`sellerId%3D14161` sitting next to the word "Off" and reported `3D14161` as
if it were a real code. So the scanner now looks for what's genuinely
there — live "N% off" / "Rs. X off" rates — and the app shows those as **"No
code needed — applies automatically"** rather than inventing a code chip
for them. If a store's page ever does carry a literal code, `extractDeals()`
in `api/codes.js` is the place to add that pattern back for it.

Also dropped two guessed target URLs that turned out not to exist:
`telemart.pk/promotions` was a hard 404, and `symbios.pk/pages/discounts`
never resolved at all. `TARGETS` now only lists pages actually confirmed
reachable by running the crawler against them.

Deliberately **not** scraping third-party coupon-listicle sites (Picodi,
WorthEPenny, SimplyCodes, etc.) — a live web search while building this
turned up codes like `Hiba10` for Daraz on exactly those sites, and they're
widely known for auto-generating plausible-looking codes that don't actually
work at checkout.

**Setup** (all server-side — once it's on, scans run on Vercel + Apify's
compute with zero further Anthropic/Claude usage):

1. Create a free account at [apify.com](https://apify.com) and copy your
   API token from **Settings → Integrations**.
2. In the Vercel project → **Settings → Environment Variables**, add
   `APIFY_TOKEN` with that value. **Tick the "Preview" environment**, not
   just Production — this project's Production Branch is `main`, which
   doesn't have this app on it, so the live deployment is a Preview build
   and only picks up variables scoped to Preview.
3. Redeploy (env var changes need a fresh deployment — push a commit or hit
   Redeploy in the Vercel dashboard) and reload the app. The status pill
   switches from "Starter data only" to "Live scan active" once a scan
   succeeds; individual live entries show a turquoise "Live" badge instead
   of "Unverified"/"Verified".

**Known cost, timing and honesty limits:**
- A real timed run against the two current targets took **~40 seconds**
  (Playwright rendering is slow) — `vercel.json` sets `maxDuration: 60` for
  this function and `SCAN_TIMEOUT_MS` in `api/codes.js` is set well above
  the measured time. If your Vercel plan caps function duration below that,
  the scan will time out; the app still falls back to starter data cleanly
  either way.
- Apify's `website-content-crawler` run costs a small amount of Apify
  platform credit per scan (well within the free tier for a 6-hourly cache,
  occasional-use scan of two pages).
- Live entries are still not "verified working" in the sense of someone
  having redeemed them — they're a snapshot of what a page said at scan
  time. Rates change; the radar's normal expiry/archive flow still applies.

## Deploying to Vercel

Already set up: the Vercel project `promo-radar-pk` is git-linked to this
repo with **Root Directory** set to `promo-radar` (the repo holds several
apps, so that setting matters). Every push to this branch triggers a fresh
deployment automatically — nothing to run by hand.

To point it at production instead of a branch preview, either merge this
branch to the repo's default branch, or change the project's **Production
Branch** in Vercel → Settings → Git.

Setting it up from scratch elsewhere: go to
[vercel.com/new](https://vercel.com/new), import the repo, set **Root
Directory** to `promo-radar`, and deploy — `vercel.json` pins the framework,
build command and output directory, so leave those on auto-detect.

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
