# Brand

## Name

The user chose **Tern**.

Candidates considered, across styles: Tern, Quill, Lumen, Errand, Runner, Steward, Ledger, Dispatch, Plover, Kestrel, Relay, Upkeep, Handled, Tidy, Proxi, Valet, Aide, Wren, Courier, Sorted.

Shortlist, judged against the original (not confusable in sound, look or meaning; short; spellable after one hearing):

| Name | Style | Why |
|---|---|---|
| **Tern** | metaphor | A seabird that covers long distances quickly: fast, light, goes and comes back. One syllable, no shared sound with "Grok" |
| Errand | descriptive | Says what it does; common word, so harder to own |
| Wren | metaphor | Small and quick; several apps already use it |
| Relay | verb | Passing work along; crowded in developer tools |
| Upkeep | compound | Fits tasks; weaker for chat |

## Screening checks (to run, by the user)

None of these were run: the hosts are blocked from this session. These are screening checks, not legal clearance; see a lawyer before selling.

| Check | Tern |
|---|---|
| USPTO, classes 9 and 42 (tmsearch.uspto.gov) | to run |
| EUIPO / TMview | to run |
| Canada (CIPO) | to run |
| WIPO Global Brand Database | to run |
| Domain (tern.app, usetern.com, tern.chat) | to run |
| App Store and Play exact-name search | to run |
| Social handles | to run |
| Web search for other software called Tern | to run. There is at least one open-source project and a bike brand named Tern, so expect overlap and consider a two-word form such as "Tern Assistant" |

## Palette

The original's identity is monochrome black and white, so there is no hue to steer away from (its exact values were not recorded; `colors` in `brand.json` is empty). Tern's identity comes from an ink-blue neutral ramp plus one ember orange (`#ff7a45` dark, `#c2410c` light), the colour of a tern's bill. It passes `contrast.py` with 0 AA failures in both themes.

## Logo brief

- **Idea:** a tern's swept wings in flight, as one continuous stroke, the way you'd draw a distant seabird.
- **Mark type:** a single-stroke glyph plus the lowercase wordmark "tern" in Geist 500.
- **Must work** at 16px (favicon: the stroke alone, thickened) and 1024px.
- **Deliverables:** SVG mark and wordmark, a 1024×1024 app icon with no transparency (ember stroke on #0b0d14), the favicon set (16, 32, 180, 192, 512), and a 1200×630 social image.
- **Must not** resemble the original's mark. No slashes, no black-hole or "G"-like circle, no monochrome-only treatment.
- **Current placeholder:** `favicon.svg` and the CSS mark in the app are a first pass of this brief.

## Voice

Three words: **direct** (not curt), **dry** (not snarky), **quick** (not rushed).

| Do | Don't |
|---|---|
| "Sent your reply to Lena" | "Awesome! Your email has been successfully sent! 🎉" |
| "Needs your OK" | "Are you absolutely sure you want to proceed?" |
| "The free Gemini quota is used up for the moment. Wait a minute and try again." | "Oops! Something went wrong." |
| "Ask anything" | "What can I help you with today? ✨" |
| "Tasks run on their own and email you what they find" | "Supercharge your productivity with AI automations" |

The 10 most-seen strings, as shipped: "Ask anything", "Search", "Think", "Image", "New chat", "Needs your OK", "Send", "Approve", "Cancel", "Tern can be wrong. Check anything important."

## Sweep

`python3 sweep.py tern --config tern/replica/brand.json` on 2026-11-17: see `deploy.md`.
