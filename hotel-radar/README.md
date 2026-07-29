# Hotel Radar

An always-on hotel deal watch. Set a budget and a filter, and the app keeps
scanning in the background. The moment a matching stay drops into range you get
a message — with the price, the hotel, and a link straight through to booking.

```bash
cd hotel-radar
npm install
npm run dev      # http://localhost:5180
```

## What it does

**Continuous scanning.** A scan runs on a timer (15s to 15 min, set in
Settings) and re-prices the whole catalogue each pass. The status pill in the
header shows how many stays are currently in budget and when the last scan ran.

**Budget alerts.** The budget slider is the alert threshold, per night or for
the whole stay. When a stay lands at or under it you get a browser
notification, an in-page message, and an entry in the Messages drawer with an
unread badge. Tapping the notification opens the booking page.

The alert rules are deliberately quiet. A hotel alerts once when it first drops
into budget; after that it only alerts again if the price falls a further 6%,
and never more than once per hotel per 10 minutes. Changing your budget or your
search starts the watch fresh, and sends one message with the best current
match so a new budget gets an answer immediately.

**The filter box.** Type what you actually want and it gets parsed into real
filters:

| You type | It reads |
|---|---|
| `a hotel near Lake Como` | landmark, 8 km radius |
| `5 star near the Duomo in Milan under 400` | landmark + city + stars + price ceiling |
| `walking distance to the Colosseum` | landmark, 1.2 km radius |
| `rooftop pool in Barcelona` | city + rooftop + pool |
| `cheap place in Rome between 80 and 150` | city + price band |

Whatever it understands appears as chips under the box, so you can always see
how your phrase was read. Anything it doesn't recognise stays on as a plain
keyword match rather than being silently dropped.

It also catches the case where a landmark and a city don't belong together.
`a hotel near Lake Como in Milan` returns lakeside stays and says why —
Lake Como is about 58 km from Milan.

**Filters.** Budget (per night or total), star rating, guest rating, dates and
occupancy, destination, and 17 amenity toggles. Amenities implied by your
search text show as dashed chips so you can tell them apart from ones you set
yourself. Six sort modes; the default puts affordable stays first.

**Booking.** Every card links out to live search results on Booking.com,
Google Hotels, Expedia, Hotels.com and Trivago, built from the hotel name, city
and your selected dates and occupancy. The app never handles payment.

## Deploying to Vercel

The repo is deploy-ready: `vercel.json` pins the framework, build command and
output directory, and `api/hotels.js` is picked up automatically as a
serverless function.

1. Go to [vercel.com/new](https://vercel.com/new) and import
   `ajabbar12765-hash/Claude`.
2. Set **Root Directory** to `hotel-radar`. This is the only setting that
   matters — the repo holds several apps, and Vercel needs to know which one.
3. Deploy. Every push to the branch redeploys automatically from then on.

Framework preset, build command (`npm run build`) and output directory
(`dist`) are all read from `vercel.json`, so leave them on auto-detect.

### Environment variables

Set these in Vercel → Settings → Environment Variables, then redeploy. They
are read by `api/hotels.js` on the server and never reach the browser.

| Variable | Needed for |
|---|---|
| `TRAVELPAYOUTS_TOKEN` | live prices via Travelpayouts / Hotellook |
| `TRAVELPAYOUTS_MARKER` | your partner marker, for commission on bookings |
| `AMADEUS_KEY` / `AMADEUS_SECRET` | the Amadeus provider |

Without any of them the app runs on the built-in engine, which is the default.

## Getting an API key for free

Only you can do this part — the signups are tied to your identity, and none of
them issue keys programmatically.

**Travelpayouts / Hotellook — the one to start with.** Free to join, no fees,
and no minimum traffic requirement, which is the usual blocker. Real live
prices, and you earn commission if anyone books through your links.

1. Sign up at [travelpayouts.com](https://www.travelpayouts.com/en/offers/hotellook-affiliate-program)
2. Join the Hotellook programme
3. Request API access from the dashboard — it is granted free on request
4. Copy your API token and partner marker into the Vercel environment
   variables above
5. In the app: Settings → Data source → **Travelpayouts / Hotellook (live)**

**Amadeus Self-Service — instant key, but test data.** Free, no credit card,
key in about five minutes at [developers.amadeus.com](https://developers.amadeus.com).
Worth knowing before you invest time: the free test environment returns
*cached, limited* data, not live market prices. Good for proving the
integration works; it will not actually find you a deal. Live data needs a
commercial agreement.

**Booking.com Demand API — official, slower.** No minimum booking volume and
no advance payment, but you submit a website URL and traffic details and then
present your integration for approval, typically 1–5 business days. Apply at
[developers.booking.com/demand](https://developers.booking.com/demand) once
this app is deployed and you have a URL to point at.

### On scraping

Pulling prices straight off TripAdvisor, Booking.com or Expedia is not a
route worth building on. All three run bot detection that blocks datacentre
IPs — a Vercel function would be blocked almost immediately — the page markup
changes without notice, and it is against their terms of service. That is why
the proxy is built around APIs instead.

### Not burning the free tier

A 30-second scan loop is ~2,880 scans a day, which would exhaust any free tier
within the hour. Two things prevent that:

- The live provider scans at most **3 destinations per pass**, chosen from
  your active city chips or the place named in the filter box.
- `api/hotels.js` caches every upstream response for **4 minutes** in-instance
  and at the CDN, so several open tabs share one request.

Set scan frequency to 5 or 15 minutes in Settings and a free tier lasts
comfortably.

## Where the prices come from

The default data source is the built-in engine. It runs over a catalogue of
real hotels — real names, locations, star ratings, guest scores — and models
nightly rates with a random walk, a seasonality curve, weekend and lead-time
factors, and occasional flash drops. That makes the whole app work end to end
with no signup, and every booking link still lands on genuine inventory.

**Prices shown in-app are indicative, not quoted.** The booking site is always
the source of truth for the final price and availability. The card says so too.

### Switching to live prices

The data layer sits behind one adapter interface, so moving to real inventory
does not touch the filters, alerts or UI. A provider implements:

```js
scan(trip, config) -> [{ hotelId, nightly, reference, total, nights,
                         discount, flash, roomsLeft, seenAt, source }]
```

`src/lib/providers/amadeus.js` is a complete, working implementation against
the Amadeus Self-Service Hotel Search API. To use it:

1. Sign up at [developers.amadeus.com](https://developers.amadeus.com) — the
   test tier is free.
2. Create an app to get an API key and secret.
3. In the app: Settings → Data source → **Amadeus (live)**, paste both.

One caveat: Amadeus does not send permissive CORS headers on the test host, so
the two calls need to go through a small backend of your own in production.
Point `AMADEUS_BASE` at your proxy — the request and response mapping is
unchanged. If a live scan fails for any reason the app falls back to the
built-in engine and says so in a banner rather than going blank.

Booking.com and Expedia inventory needs an approved affiliate/partner account.
Scraping their pages is not an option worth building on: it needs a server,
gets blocked quickly, and is against their terms.

## Layout

```
src/
  App.jsx                    scan loop, alert evaluation, state
  lib/
    catalog.js               86 hotels, 12 destinations, landmark index
    nlq.js                   natural-language filter parser
    filters.js               filter evaluation, scoring, sorting
    alerts.js                which deals are worth a message
    provider.js              provider registry + fallback
    providers/simulated.js     built-in deal engine
    providers/travelpayouts.js live prices via the proxy
    providers/amadeus.js       live API adapter
  nlq.test.mjs               62-case filter-box test suite
    deeplinks.js             outbound booking URLs
    notify.js                browser notifications, chime
    storage.js  format.js
  components/
    TopBar  FilterPanel  DealGrid  DealCard  AlertsDrawer
    SettingsModal  Toasts
api/
  hotels.js                  serverless price proxy (keys stay server-side)
```

Run the filter-box tests with `node src/lib/nlq.test.mjs`.

Filters, budget, dates, alerts, saved deals and settings all persist to
`localStorage`. There is no backend and no account.

## Notes

- The radar only runs while the tab is open. Install it to your home screen
  (it is a PWA) to keep it one tap away.
- Notification permission is only requested from a button press — browsers
  block automatic prompts permanently.
- Prices are held in EUR and converted for display at a fixed reference rate.
- Works in light and dark, down to 390px wide.
