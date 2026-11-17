# Tern

A free assistant that answers, thinks, searches, draws and **gets work done in your apps**. It reads and triages your Gmail, books time on your calendar, reads your Drive, works in Notion, Linear, GitHub, Canva or anything else Zapier reaches, and runs automatic tasks on a schedule. Everything runs on free tiers: Gemini's free API, Vercel Hobby, and a free Postgres. Plain HTML, CSS and JS, with Vercel functions and no build step.

## What it does

- Streaming answers with Markdown, tables, code blocks with copy buttons, and LaTeX maths (KaTeX)
- **Think** mode: Gemini reasons before it answers. You can open the reasoning summary, and it shows how long the model thought
- **Search** mode: answers grounded in Google Search, with numbered sources
- **Image** mode: makes images (you can also type "draw…", "generate an image of…" or `/imagine …`). It uses Gemini's image model when your key has quota for it. If not, it falls back to Pollinations, a free service that needs no key
- Image understanding: attach, paste or drag up to 4 images
- Chat history kept in the browser (IndexedDB), with search, rename and delete. Every chat has its own link (`/c/<id>`)
- Edit a sent message, regenerate an answer, stop a reply mid-stream, copy, read aloud, dictate by voice
- Custom instructions, dark, light or system theme, and a layout that works on phones. It installs to your home screen as an app
- **Apps:** sign in with Google, then connect Gmail, Calendar and Drive. Add other apps through MCP: one-click presets for Notion, Linear, Vercel, Canva, Jira/Confluence and Apify, a GitHub token, or your Zapier MCP URL, which reaches thousands of apps, including Spotify, Zoho Books, Slack and Sheets. You can also paste any MCP server URL
- **It acts:** "summarise my unread and draft replies", "find an hour Thursday and book gym", "archive the receipts". Tern reads on its own. Anything that sends, changes or deletes shows an approval card you can edit first
- **Tasks:** "every weekday at 7, email me what needs a reply today". Tasks run on a schedule with the app closed and email you the result. By default they only read; turn on "can act" to let a task send or change things
- Shortcuts: Enter sends, Shift+Enter adds a new line, ⌘/Ctrl+Shift+O starts a new chat, ⌘/Ctrl+K searches chats, Esc stops a reply

## Get a free key

1. Go to https://aistudio.google.com/apikey and create a key. No card is needed.
2. Either put it on the server as `GEMINI_API_KEY`, so everyone who uses your site can chat with no setup, or paste it into **Settings** in the app, where it stays in that browser.

On the free tier, Google may use your prompts to improve its products, and there are per-minute and per-day request limits. When you hit a limit, Tern says so and asks you to wait.

## Connect apps and tasks (optional, about 10 minutes)

Chat works with just a Gemini key. To use apps and tasks, the server needs Google sign-in and a database:

1. **Database:** create a free Postgres on neon.tech or supabase.com and copy its connection string into `DATABASE_URL`. Tables are created automatically, or run `npm run migrate`.
2. **Google OAuth client:** in console.cloud.google.com, create a project and enable the **Gmail API**, **Google Calendar API** and **Google Drive API**. Under OAuth consent screen, choose External and leave it in **Testing**, then add your own Google address as a test user. Under Credentials, create an OAuth client ID (Web application) with the redirect URI `https://YOUR-DOMAIN/api/auth?step=callback` (and `http://localhost:5180/api/auth?step=callback` for local use). Put the ID and secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
3. **Secrets:** set `SESSION_SECRET` and `CRON_SECRET` to two different long random strings (`openssl rand -base64 32`).
4. **Every 15 minutes:** in this GitHub repo, add the Actions secrets `TERN_URL` (your site) and `TERN_CRON_SECRET` (same as `CRON_SECRET`). `.github/workflows/tern-cron.yml` then runs due tasks. Vercel's free cron also runs once a day as a backup.

Gmail and Drive are "restricted" Google scopes. In Testing mode they work for up to 100 people you list, with no review. Opening the app to the public needs Google's verification, which takes weeks.

## Run locally

```bash
cd tern
cp .env.example .env    # then paste your key into .env
node server.mjs         # http://localhost:5180
```

`TERN_MOCK=1 node server.mjs` runs an offline stand-in with a fake model, a fake inbox and a fake calendar. It never calls Google or Gemini. Use it for UI work and tests.

Tests: `npm test` runs the unit tests (schedules across clock changes, encryption, and both storage backends, including a second user seeing nothing). `node --test tests/e2e.test.mjs` drives the app in Chromium through sign-in, inbox triage, an edited and approved send, tasks and a custom app, with an accessibility scan on each screen.

## Deploy to Vercel (free Hobby plan)

1. Import this repository in Vercel and set **Root Directory** to `tern`. Framework preset: Other. Leave the build command empty.
2. Under Environment Variables, add `GEMINI_API_KEY`. For apps and tasks, also add `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET` and `CRON_SECRET` (see above).
3. Deploy. `vercel.json` already has the `/c/:id` rewrite and the function timeouts.

Optional settings: `TERN_MODEL` (default `gemini-2.5-flash`) and `TERN_IMAGE_MODEL` (default `gemini-2.5-flash-image`). Change these when Google releases newer free models.

## Files

| Path | What it is |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | The app |
| `api/chat.js` | One agent turn, streamed: thinking, text, sources, app actions, approval requests |
| `api/image.js` | Makes images with Gemini, or tells the app to fall back |
| `api/auth.js`, `api/me.js` | Google sign-in, session, account deletion |
| `api/apps.js` | Connect and disconnect Google apps and MCP apps (including MCP OAuth) |
| `api/tasks.js`, `api/cron.js` | Automatic tasks and the scheduler endpoint |
| `api/status.js` | Tells the app what the server can do |
| `api/_lib/` | Agent loop, Gmail/Calendar/Drive tools, MCP client, storage (Postgres or a local file), crypto, schedules |
| `replica/` | Recon, architecture, schema, design tokens, test plan, parity, brand and launch notes |
| `tests/` | Unit and browser tests, plus a fake MCP server |
| `server.mjs` | Local server that runs the same handlers |
| `vendor/` | marked, DOMPurify and KaTeX, bundled here so no CDN is needed |
| `icons.js` | Lucide icons (ISC licence) |

## Notes

- If the server has a key, anyone with the link spends your free quota. A simple per-IP limit is built in: 30 chats and 10 images a minute. Keep the URL private, or leave the server key unset so each visitor uses their own. Apps and tasks only reach the accounts of people who sign in, and only Google test users you list can sign in at all.
- Email, web pages and documents can contain text written to trick an assistant. Tern treats app content as data, and nothing is sent, changed or deleted without your OK unless you turned on "can act" for a task.
- Tern is an original app. It does not use xAI's or Grok's name, logo, code or assets. Check the trademark yourself before you launch it publicly under any name.

UI direction follows [unslop](https://github.com/heydamir/unslop) by Damir Sokolovsky (CC BY 4.0).
