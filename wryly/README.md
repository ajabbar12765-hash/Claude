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
- **Zapier tools (optional, off by default)** — connects Wryly to whatever
  apps you've set up in your Zapier account (Calendar, Sheets, Slack,
  Notion, thousands more), through Zapier's hosted MCP server. Unlike
  Gmail, this can include actions that change things, not just read them —
  so **every single tool call is shown to you as an approval card in the
  chat before it runs**; nothing executes on a "maybe." See **Connecting
  Zapier** below.

Nothing above runs unattended by design: Gmail is read-only, and Zapier
actions always wait for an explicit approve/deny click. That's a
deliberate choice, not a current limitation — a bot that can act in your
real accounts should never get to guess.

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

## Connecting Zapier

Optional, off by default, and **only works with the OpenAI-compatible
provider** (`OPENAI_API_KEY` — OpenRouter, Gemini, etc.) — not with
`ANTHROPIC_API_KEY`. Requires your own Zapier account; I can't create that
for you.

> **Honest caveat:** I built this against the general MCP spec plus the one
> detail Zapier's own help pages confirm (their recommended auth method is
> an **Authorization header**, not a token embedded in the URL) — I wasn't
> able to reach Zapier's detailed docs from this deployment's sandbox to
> verify every last detail. If `Settings → Zapier tools` shows "configured
> but unreachable" after following the steps below, that's the first place
> to compare notes with Zapier's current docs and adjust — it likely just
> needs a small tweak to `api/_lib/mcp.js`, not a rebuild.

1. In Zapier, set up **Zapier MCP** and connect whichever apps you want
   Wryly to reach (Gmail, Calendar, Sheets, Slack, ...) — each action you
   enable there becomes a tool Wryly can ask to use.
2. Get your MCP server URL and a **connection token**, using
   **Authorization header** as the auth method (Zapier's recommended
   option over embedding the token in the URL).
3. Set these as environment variables on the Vercel project:
   ```
   MCP_SERVER_URL=<your Zapier MCP server URL>
   MCP_SERVER_TOKEN=<your connection token>
   ```
   Same advice as the Google credentials: add these directly in the Vercel
   dashboard rather than pasting a token into chat, if you'd rather not.
4. Redeploy. **Settings → Zapier tools** should show "Connected — N tools
   available." Flip on **Use Zapier tools**.

From then on, whenever Wryly wants to use one of those tools, it shows up
in the chat as a card with the exact action and arguments — you approve or
deny each one individually before anything actually happens.

## Deploying

This folder is a self-contained Vite app, same shape as the other projects
in this repo, deployed as its own Vercel project with **Root Directory**
set to `wryly`. It's already live at **https://wryly.vercel.app** — push to
the `claude/grok-bot-custom-features-4zrlyi` branch (or merge it to `main`
and repoint the project) to update it, or add the model-provider env var
above if you haven't yet.
