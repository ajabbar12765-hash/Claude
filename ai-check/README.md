# Is This Real?

A phone app that helps an older adult check whether a picture or video they were sent is
genuine, made by a computer, or part of a scam.

It's a web app, so there's no app store and no developer account. You text her one link,
she taps **Add to Home Screen**, and it behaves like a normal app — its own icon, full
screen, works from the home screen.

## What it does

- **Check a picture** — she takes a photo or picks one from her messages.
- **Check a video** — the app pulls four still frames from across the video and looks at
  them together.
- **A plain-English verdict** — one of *This looks genuine*, *I honestly can't tell*, or
  *This looks made by a computer*, with two to four short reasons in everyday words
  ("her hand has six fingers", "the writing on the sign is jumbled").
- **A separate scam warning** — judged independently of whether the image is real. A real
  photo can still be bait, and an AI picture can be harmless.
- **Read this to me** — reads the whole verdict aloud using the phone's built-in voice.
- **Ask my family** — one tap to call, or to text with the verdict already written out.

Built for limited eyesight and unsteady taps: 20px base text (24px with *Extra large text*
on), 60px+ tap targets, high contrast, and a light and dark theme that follow the phone.

## An honest caveat, stated up front

**No tool can reliably tell you whether an image was made by AI.** Image detectors miss new
generators, and confident-sounding percentage scores are mostly noise. This app deliberately
does not show one.

Instead it does what a sharp-eyed relative would do: describe what it can actually see, say
plainly when it isn't sure, and flag the scam patterns — which are usually the part that
matters. The prompt instructs the model to answer *"I can't tell"* whenever the evidence is
thin, and never to invent a detail to justify a verdict. Treat it as a well-informed second
opinion, not a verdict.

## Setting it up

Two ways to supply the Anthropic API key. Pick one.

### Option A — server function (recommended)

The key lives on a server and never touches her phone.

1. Deploy this folder to Vercel (or anywhere that runs a Node function).
2. Set the environment variable `ANTHROPIC_API_KEY` to your key.
3. Open the app, tap **⚙**, and paste your function's address into **Server address** —
   e.g. `https://your-app.vercel.app/api/analyze`. Leave the key field blank.
4. Fill in the family member's name and phone number. Tap **Save**.

```sh
cd ai-check
npx vercel deploy --prod
npx vercel env add ANTHROPIC_API_KEY production
```

`api/analyze.js` is a plain `(req, res)` handler, so it also drops into Netlify Functions or
an Express route with minor edits. It validates image count, format, and size before
forwarding, and returns Anthropic's response unchanged.

If you host the page at a fixed address, tighten `Access-Control-Allow-Origin` in
`api/analyze.js` from `*` to that origin.

### Option B — key on the phone

Simpler, no deployment. Open the app, tap **⚙**, paste an Anthropic API key into
**Anthropic API key**, leave the server address blank, and **Save**.

The key is stored in that phone's local storage and sent directly to Anthropic (this uses
the `anthropic-dangerous-direct-browser-access` header, which is what makes browser calls
possible). **Anyone who can unlock the phone can read the key**, so use a key with a
spending limit set in the Anthropic console, and rotate it if the phone is lost. Option A
avoids this entirely.

## Installing it on her phone

Host the folder anywhere static (Vercel, Netlify, GitHub Pages) and send her the link.

- **iPhone** — open in Safari → Share → *Add to Home Screen*
- **Android** — open in Chrome → ⋮ → *Add to Home screen* / *Install app*

Do the ⚙ setup once yourself before handing it over. If nothing is configured, the app opens
straight to Settings; once it is, she'll never see that screen.

## Running it locally

```sh
cd ai-check
python3 -m http.server 8080
# then open http://localhost:8080
```

A plain static server is enough for Option B. Option A needs `vercel dev` (or your own
server) so `/api/analyze` exists.

## What's in here

| File | Purpose |
|---|---|
| `index.html` | The whole app — markup, styles, and logic in one file, no build step |
| `api/analyze.js` | Optional server function that keeps the API key off the phone |
| `sw.js` | Service worker; caches the shell so the app opens without a signal |
| `manifest.webmanifest` | Makes it installable to the home screen |
| `icon-192.png`, `icon-512.png` | App icon |
| `vercel.json` | Raises the function timeout to 60s for video checks |

## How it works

Pictures are resized to 1568px on the long edge before being sent; video frames to 1024px,
four of them, taken at even intervals. Both go up as base64 JPEG in a single
`/v1/messages` call to `claude-opus-5` with `output_config.effort: "medium"`.

The reply is constrained with `output_config.format` (a JSON schema), so the verdict, the
reasons, the scam flag, and the advice always come back as separate fields — the app never
has to parse prose. Nothing is stored or uploaded anywhere else; images go to Anthropic and
the result is rendered on the phone.

Cost is roughly a cent or two per check at current pricing — a picture is around 1,500
input tokens, a four-frame video check around 4,000.
