# Wryly

A Grok-style AI chat bot with its own identity: witty by default, real-time
web search, keyless image generation, voice in/out, a step-by-step
reasoning trace, multi-chat history, and slash-command shortcuts.

## Features

- **Personality with a dial** — Fun Mode toggle + a 0–100 snark slider,
  baked into the system prompt server-side.
- **Think Mode** — reasoning trace shown in a collapsible panel above the
  final answer, streamed live.
- **Real-time search** — `/api/search` scrapes DuckDuckGo's keyless lite
  endpoint and feeds results to the model before it answers.
- **Image generation** — `/image <prompt>` (or `/img`) renders straight
  from Pollinations.ai, no API key required.
- **Voice mode** — mic input and spoken replies via the browser's built-in
  Web Speech API (no key, no server round trip).
- **Multi-chat history** — saved locally per browser, with per-chat export
  to Markdown.
- **Slash commands** — `/roast`, `/eli5`, `/debate`, `/fact`, `/joke`,
  `/help`.
- **The Crew** — a squad of specialist agents you can send a message to:
  Scout (research), Quill (writing/essays), Crunch (math/code, auto-enables
  Think Mode), Ledger (budgeting), Herald (message/email drafts), Keeper
  (planning), and Artisan (image prompts). Pick one from the chip next to
  the composer, or leave it on **Auto** and Wryly routes each message to
  the right specialist itself, instantly and for free (keyword matching,
  no extra model call).
- **Real task list** — the one thing worth actually letting a bot "control"
  without real-world side effects. `/task <thing>` adds to a to-do list
  that lives in the sidebar and persists locally; `/tasks` lists what's
  open. Keeper points people at it instead of pretending to remember
  things it can't.
- **Gmail (optional, off by default)** — read-only access to your real
  inbox, connected via Google OAuth from Settings. Once connected, flip on
  "Use Gmail for context" or just type `/inbox <what you're looking for>`
  and Wryly searches your mail and answers from it. It only ever requests
  the `gmail.readonly` scope — it cannot send, delete, or modify anything.
  The connection lives in an httpOnly cookie tied to whichever browser
  completed the OAuth flow, not shared globally by the app. See
  **Connecting Gmail** below to set it up.

Wryly intentionally does **not** connect to calendars, banks, or
e-commerce accounts — those involve money and actions taken on your
behalf, which deserve their own explicit setup and an approval step before
anything actually sends or spends, rather than being bundled in by default.

## Running locally

```bash
npm install
npm run dev
```

The dev server proxies `/api/*` to `http://localhost:3000` — run
`vercel dev` in this folder (or just `npm run build && npm run preview`
for a production-mode check) to serve the API functions locally too.

## Configuring a model

Wryly needs an LLM to actually talk. Pick one:

**Free option — OpenRouter (default):**

```
OPENAI_API_KEY=<your free OpenRouter key>
```

Grab a key at [openrouter.ai](https://openrouter.ai) — no payment needed.
It defaults to a free model (`meta-llama/llama-3.3-70b-instruct:free`);
override with `OPENAI_MODEL` and `OPENAI_BASE_URL` if you want a different
OpenAI-compatible provider (Groq, Together, Fireworks, etc. all work the
same way).

**Or — Anthropic's Claude API:**

```
ANTHROPIC_API_KEY=<your key>
```

If both are set, `ANTHROPIC_API_KEY` wins. With neither set, the app still
runs — it just replies with setup instructions instead of crashing.

## Connecting Gmail

Optional, read-only, off by default. There's no way around doing this part
yourself once — Google requires the OAuth client to belong to a Google
Cloud project you control, so I can't provision it for you.

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and
   create a new project (any name — e.g. "Wryly").
2. **APIs & Services → Library** → search for and enable the **Gmail API**.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External**.
   - App name: `Wryly` (or whatever you like), your email as support +
     developer contact.
   - **Scopes**: add `.../auth/gmail.readonly`.
   - **Test users**: add your own Gmail address. (Leaving the app in
     "Testing" mode is fine and avoids Google's verification review —
     this app is just for you.)
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized redirect URIs**: add exactly
     `https://wryly.vercel.app/api/auth/google/callback` (swap in your own
     domain if you deployed somewhere else).
5. Copy the **Client ID** and **Client Secret** it gives you.
6. Set them as environment variables on the Vercel project:
   ```
   GOOGLE_CLIENT_ID=<client id>
   GOOGLE_CLIENT_SECRET=<client secret>
   ```
   You can add these directly in the Vercel dashboard
   (Project → Settings → Environment Variables) instead of handing the
   secret to anyone else, including in chat — that's the safer default.
7. Redeploy. **Settings → Gmail → Connect** will now work.

Only the browser that completes the Google consent screen gets the
connection (it's stored in an httpOnly cookie, not a database) — visiting
the site from another device or browser starts disconnected.

## Deploying

This folder is a self-contained Vite app, same shape as the other projects
in this repo, deployed as its own Vercel project with **Root Directory**
set to `wryly`. It's already live at **https://wryly.vercel.app** — push to
the `claude/grok-bot-custom-features-4zrlyi` branch (or merge it to `main`
and repoint the project) to update it, or add the model-provider env var
above if you haven't yet.
