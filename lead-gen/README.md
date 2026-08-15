# Lead Gen — Dubai Restaurants Without Websites

Apify scrape → ranked lead list → a finished demo site for the best lead → a WhatsApp script to sell it.

```
lead-gen/
├── leads/
│   ├── LEADS.md                          # how the scrape ran, ranking method, why lead #1 wins
│   └── dubai-restaurants-no-website.csv  # 35 rows, phone numbers + wa.me links
├── demo-sites/
│   └── food-by-punjabi/index.html        # the demo site — single self-contained file
└── sales/
    └── whatsapp-script.md                # opener, price, objections, 4-message follow-up
```

## The pitch in one line

**Food by Punjabi Restaurant** — Meena Bazaar, Bur Dubai. 4.8 ★, 1,073 reviews, 538 customer photos, five languages in the review feed, and **no website at all**. Owner is Harpreet Singh. WhatsApp: [+971 56 403 7062](https://wa.me/971564037062).

## The demo is live

**https://food-by-punjabi.vercel.app**

Vercel project `food-by-punjabi`, production target, deployment protection disabled so anyone can open it without a Vercel login. Verified 200 with the full page served.

To redeploy after editing `demo-sites/food-by-punjabi/index.html`:

```bash
npx vercel deploy lead-gen/demo-sites/food-by-punjabi --prod
# or check it locally first:
python3 -m http.server 8000 --directory lead-gen/demo-sites/food-by-punjabi
```

## Site notes

- Scroll-driven full-viewport chapters, cinematic dark ground, a different accent glow per section — built to the `3d-website` pattern.
- Design system from `ui-ux-pro-max`: Modern Dark, Playfair Display SC + Karla, luxury navy/gold, adapted to a warm gold-on-near-black palette for food.
- Every fact on the page is real scraped data: rating, review count, hours, price band, amenities, dish names from review tags, and four verbatim Google reviews.
- **The dish visuals are hand-built SVG illustrations, not his photos.** That's deliberate — swapping in his real photos is the close ("send me 10 photos and it's live Sunday").
- Accessible: keyboard focus rings, 44px touch targets, `prefers-reduced-motion` honoured, no horizontal scroll at 390px.
