# Tern

A free chat assistant that runs on Google's free Gemini API tier. Plain HTML, CSS and JS, with three small serverless functions. There is no build step.

## What it does

- Streaming answers with Markdown, tables, code blocks with copy buttons, and LaTeX maths (KaTeX)
- **Think** mode: Gemini reasons before it answers. You can open the reasoning summary, and it shows how long the model thought
- **Search** mode: answers grounded in Google Search, with numbered sources
- **Image** mode: makes images (you can also type "draw…", "generate an image of…" or `/imagine …`). It uses Gemini's image model when your key has quota for it. If not, it falls back to Pollinations, a free service that needs no key
- Image understanding: attach, paste or drag up to 4 images
- Chat history kept in the browser (IndexedDB), with search, rename and delete. Every chat has its own link (`/c/<id>`)
- Edit a sent message, regenerate an answer, stop a reply mid-stream, copy, read aloud, dictate by voice
- Custom instructions, dark, light or system theme, and a layout that works on phones
- Shortcuts: Enter sends, Shift+Enter adds a new line, ⌘/Ctrl+Shift+O starts a new chat, ⌘/Ctrl+K searches chats, Esc stops a reply

## Get a free key

1. Go to https://aistudio.google.com/apikey and create a key. No card is needed.
2. Either put it on the server as `GEMINI_API_KEY`, so everyone who uses your site can chat with no setup, or paste it into **Settings** in the app, where it stays in that browser.

On the free tier, Google may use your prompts to improve its products, and there are per-minute and per-day request limits. When you hit a limit, Tern says so and asks you to wait.

## Run locally

```bash
cd tern
cp .env.example .env    # then paste your key into .env
node server.mjs         # http://localhost:5180
```

`TERN_MOCK=1 node server.mjs` runs an offline stand-in that never calls Gemini. Use it for UI work.

## Deploy to Vercel (free Hobby plan)

1. Import this repository in Vercel and set **Root Directory** to `tern`. Framework preset: Other. Leave the build command empty.
2. Under Environment Variables, add `GEMINI_API_KEY`.
3. Deploy. `vercel.json` already has the `/c/:id` rewrite and the function timeouts.

Optional settings: `TERN_MODEL` (default `gemini-2.5-flash`) and `TERN_IMAGE_MODEL` (default `gemini-2.5-flash-image`). Change these when Google releases newer free models.

## Files

| Path | What it is |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | The app |
| `api/chat.js` | Streams answers from Gemini as server-sent events (thinking, text, sources) |
| `api/image.js` | Makes images with Gemini, or tells the app to fall back |
| `api/status.js` | Tells the app whether the server has a key |
| `server.mjs` | Local server that runs the same handlers |
| `vendor/` | marked, DOMPurify and KaTeX, bundled here so no CDN is needed |
| `icons.js` | Lucide icons (ISC licence) |

## Notes

- If the server has a key, anyone with the link spends your free quota. A simple per-IP limit is built in: 30 chats and 10 images a minute. Keep the URL private, or leave the server key unset so each visitor uses their own.
- Tern is an original app. It does not use xAI's or Grok's name, logo, code or assets. Check the trademark yourself before you launch it publicly under any name.

UI direction follows [unslop](https://github.com/heydamir/unslop) by Damir Sokolovsky (CC BY 4.0).
