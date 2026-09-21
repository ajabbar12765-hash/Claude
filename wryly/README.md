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

Wryly intentionally does **not** connect to real email, calendars, banks,
or e-commerce accounts — those integrations involve real money and real
messages sent on your behalf, which deserves its own explicit setup (OAuth,
scoped API keys, an approval step before anything actually sends) rather
than being bundled in by default.

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

## Deploying

This folder is a self-contained Vite app, same shape as the other projects
in this repo. Point a Vercel project at the `wryly/` directory, add the
env var above, and deploy.
