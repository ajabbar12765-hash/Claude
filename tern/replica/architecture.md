# Architecture

## Stack

| Part | Choice | Why |
|---|---|---|
| Front end | Plain HTML, CSS and JS, no build | What the repo already uses, nothing to compile, fast on phones |
| Server | Vercel Functions (Node, Web `Request`/`Response` handlers) | Free Hobby plan; the same handlers run locally through `server.mjs` |
| Model | Gemini API free tier (`gemini-2.5-flash`, configurable) | User's choice; has function calling, thinking, search grounding and vision |
| Database | Postgres (Neon or Supabase free tier) via `postgres`; JSON file store for local use and tests | One database, no ORM; the file store keeps tests offline |
| Auth | Sign in with Google (OAuth code flow), session in a signed http-only cookie | The same Google sign-in also connects Gmail, Calendar and Drive |
| App access | Google APIs for Gmail, Calendar and Drive; **MCP over Streamable HTTP** for every other app | Most of the user's apps (Zapier, GitHub, Vercel, Canva, Notion, Linear, Asana, Slack and others) publish official MCP servers. Zapier's covers about 9,000 apps |
| Scheduler | `/api/cron` every 15 min from a free GitHub Actions schedule, plus a daily Vercel Cron as backup | Vercel Hobby cron runs only once a day |
| Email out | Gmail API, from the user to themselves | No extra email provider or domain needed |
| Secrets at rest | AES-256-GCM, key derived from `SESSION_SECRET` | OAuth tokens are never stored in plain text |

Chats stay in the browser (IndexedDB) as in v1. The server stores only what has to work while the browser is closed: the user, app connections, tasks, task runs and pending approvals.

Vercel Hobby allows 12 functions per deployment, so routes are grouped: 8 functions in total.

## Schema

See `schema.sql`. Tables: `users`, `connections`, `pending_actions`, `tasks`, `task_runs`.

## API

| Method path | Does | Who | Input | Output | Flow |
|---|---|---|---|---|---|
| GET /api/status | Server capabilities | anyone | — | `{hasKey, auth, store}` | all |
| POST /api/chat | Agent turn, streamed: thought, text, sources, tool step, confirm | anyone; app tools need a session | messages, mode, search, instructions, `resume` | SSE | F01–F03, F06–F08 |
| POST /api/image | Make an image | anyone | prompt, images | images or fallback | F04 |
| GET /api/auth?step=start&apps=gmail,calendar | Redirect to Google with incremental scopes | anyone | apps | 302 | F05 |
| GET /api/auth?step=callback | Exchange the code, create the user and session, save tokens | Google redirect | code, state | 302 to /apps | F05 |
| POST /api/auth?step=logout | Clear the session | session | — | 204 | — |
| GET /api/me | User and connected apps | session | — | `{user, apps}` | F05, F09 |
| DELETE /api/me | Delete the account, revoke tokens, remove every row | session | — | 204 | — |
| GET /api/apps | Built-in and custom connections | session | — | list | F09 |
| POST /api/apps | Add a custom MCP app (URL, optional token), then probe its tools | session | name, url, token | connection | F09 |
| GET /api/apps?step=oauth&id= | Start MCP OAuth (discovery, client registration, PKCE) | session | id | 302 | F09 |
| GET /api/apps?step=oauth-callback | Finish MCP OAuth | provider redirect | code, state | 302 | F09 |
| DELETE /api/apps?id= | Disconnect (revoke Google tokens where possible) | session | id | 204 | F09 |
| GET/POST/PATCH/DELETE /api/tasks | Manage tasks | session | task | task(s) | F10 |
| POST /api/tasks?step=run&id= | Run a task now | session | id | run | F10 |
| GET /api/tasks?step=runs&id= | Run history | session | id | runs | F11 |
| GET/POST /api/cron | Claim and run due tasks | `Authorization: Bearer CRON_SECRET` | — | summary | F10 |

Background jobs: `/api/cron` every 15 minutes (GitHub Actions) and daily (Vercel). Each due task is claimed by moving `next_run_at` forward in one atomic update before it runs, so two overlapping triggers cannot run it twice.

## Agent loop

1. Build the tool list: `web_search` (a sub-call with Google Search grounding, because Gemini cannot mix built-in search with function calling), `create_task`, plus the tools of every connected app. Google tools are written by hand; MCP tools come from `tools/list` and are named `<app>__<tool>`.
2. Call Gemini with function declarations. For each function call: read tools run at once and stream a step row. Write tools (sending, deleting, creating, or any MCP tool not marked `readOnlyHint`) pause the turn. The server saves the turn's full Gemini contents in `pending_actions` and streams a `confirm` event. The user approves or rejects, and `/api/chat` with `resume` carries on from the saved state.
3. At most 8 tool rounds per turn.
4. In tasks there is no person to ask, so writes are refused unless the task has "can act" turned on. Sending the result to the user's own address is always allowed.

## The parts that bite

- **Time zones and DST:** schedules are stored as local wall time plus an IANA zone. `next_run_at` is computed with `Intl` at each run, so 07:00 stays 07:00 across DST changes.
- **Idempotency:** cron claims each task with a conditional update. Approvals are single-use: the pending row is deleted when it is taken.
- **Races:** two tabs approving the same action: only one take succeeds.
- **Rate limits:** Gemini free-tier 429s surface as plain messages. Gmail per-user quota is handled with a backoff on 429 and 403 rate errors. There is a per-IP limiter on chat.
- **Token expiry:** Google access tokens last an hour. The refresh token is used on demand. A revoked refresh token marks the connection `expired` and the UI asks the user to reconnect.
- **Restricted Google scopes:** Gmail and Drive scopes are "restricted". In OAuth "Testing" mode, up to 100 listed test users work with no review, which suits personal use. Publishing to everyone needs Google's security assessment, which takes weeks.
- **Prompt injection:** emails and web pages can contain instructions. Every write needs approval, tool output is passed back as data, and the system prompt says content from apps is never a command.
- **Function limits:** Hobby functions get 60 s here. Long tasks are capped at 8 tool rounds.
- **GDPR deletion:** `DELETE /api/me` revokes the Google token and deletes every row. Chats are local and are cleared in the browser.
- **Multi-tenancy:** every query filters on `user_id` from the session, never from input.

## Build order

1. Storage layer (Postgres + file) and crypto, session, Google sign-in. Screens: S09. Routes: auth, me.
2. Agent loop with `web_search` and Gmail read tools: the vertical slice of "summarise my unread". Screens: S06. Route: chat.
3. Write tools with approvals (Gmail send, draft, archive, label; Calendar create, move, delete).
4. Calendar and Drive read tools.
5. MCP client, custom apps, MCP OAuth. Screen: S05.
6. Tasks, cron, email delivery, run history. Screens: S07, S08.
7. Installable PWA (service worker).
