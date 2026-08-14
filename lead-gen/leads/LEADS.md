# Dubai Restaurant Leads — No Website

Scraped **14 Aug 2026** via Apify `compass/crawler-google-places`.

## Search parameters

| Setting | Value |
|---|---|
| Location | Dubai, United Arab Emirates |
| Search terms | `restaurant`, `cafe` |
| Website filter | **`withoutWebsite`** — every business here has a Google listing and no site |
| Minimum rating | 4.0 ★ |
| Closed places | Skipped |
| Detail pages | Scraped (hours, popular times, amenities, review tags) |
| Results | 80 places |
| Apify dataset | `weTjeRQ1V9JYBNTIu` |
| Reviews dataset (top lead) | `eKer4ceCjDz2jdI2O` |

## What came back

- **80** restaurants and cafés in Dubai with a Google presence and no website
- **25** have a **UAE mobile number** (`+9715…`) → reachable on WhatsApp
- **~23** have a **landline only** (`+9714…`) → call or walk in, WhatsApp won't work
- The rest have no listed number at all — skipped

Concentration is heavy in **Bur Dubai (Meena Bazaar / Al Fahidi / Al Souq Al Kabeer), Al Karama, Deira and Oud Metha**. These are the old, dense, high-footfall districts where businesses run on walk-ins and word of mouth. That is exactly the profile that has never bought a website — and exactly why they're sellable.

## Ranking method

Leads are ranked on four things, in this order:

1. **WhatsApp reachable** — a mobile number is worth more than a bigger business you can't message
2. **Review count** — proves the place is real, busy, and has money
3. **Rating** — high ratings mean a proud owner, and proud owners buy things that show off the business
4. **Photo count** — assets you can build with, and proof customers already market them for free

## Top 5

| # | Business | ★ | Reviews | WhatsApp | Area |
|---|---|---|---|---|---|
| 1 | **Food by Punjabi Restaurant** | 4.8 | 1,073 | [+971 56 403 7062](https://wa.me/971564037062) | Meena Bazaar |
| 2 | Tau's Restaurant | 4.6 | 1,006 | [+971 52 399 8069](https://wa.me/971523998069) | Oud Metha |
| 3 | Gorkha Spices Restaurant | 4.9 | 363 | [+971 52 442 6629](https://wa.me/971524426629) | Al Souq Al Kabeer |
| 4 | Al Nawaz Restaurant | 4.9 | 246 | [+971 56 538 7723](https://wa.me/971565387723) | Al Fahidi Souq |
| 5 | PINKY RESTAURANT | 4.4 | 443 | [+971 58 580 1199](https://wa.me/971585801199) | Meena Bazaar |

Full list, including the landline-only high-volume businesses, is in
[`dubai-restaurants-no-website.csv`](dubai-restaurants-no-website.csv).

## Why #1 is the pick

**Food by Punjabi Restaurant** is the only lead that scores top-tier on all four criteria at once — 4.8 ★, over a thousand reviews, a WhatsApp-reachable mobile, and 538 customer photos. Then the detail scrape added three things nothing else on the list has:

1. **The owner's name.** Four reviewers thank "Harpreet" / "Harpeet ji" / "Sardar ji" by name for personally looking after their table. Opening a cold message with the right name changes the reply rate more than anything else in the script.
2. **Tourist demand in five languages.** Reviews in English, Russian, Spanish, Polish and French. Tourists search before they eat — and there is nothing to find.
3. **A measurable business problem.** The popular-times data shows 8–17% occupancy on weekday mornings against 92–100% at 9–10 PM on Tue/Sat. That's a specific, provable gap to sell into, not a vague "you need a website".

He also has **not replied to a single review** in 1,073 — nobody has ever sold this man anything digital. The field is open.

## Notes on the data

- `claimThisBusiness: true` in the raw dataset means the Google listing is **unclaimed** — harder to reach the right person, but a strong extra pitch ("your listing isn't even claimed").
- Landline-only businesses are still worth working. LIZ restaurant (2,823 reviews) and Shri Krishna Bhavan (2,573 reviews, 1,400 photos) are far bigger businesses than lead #1 — they just need a phone call or a visit instead of a WhatsApp.
- Re-run the scrape with different `searchStringsArray` terms (`salon`, `barber`, `car rental`, `gym`) to widen the list; same filter, same cost, different niche.
