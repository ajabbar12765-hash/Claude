# Recon: Grok (xAI), web app, assistant and connected apps slice

Date read: 2026-11-17. Read as a member of the public. No login, no scraping, no use of the original's servers. docs.x.ai and most third-party pages were blocked by this session's network, so the sources below are search-result summaries (marked "summary") unless marked "read". Confidence is set to match.

## 1. Scope (agreed with the user)

- **App and platform:** Grok on the web, plus its installable phone experience.
- **Slice:** the core assistant loop (ask, stream, think, search, images) plus the parts the user asked for: **connected apps** ("every app I already have"), an **email manager**, and **auto tasks** that run on their own.
- **For:** one person running their own assistant on free tiers, for their own accounts.
- **Out of scope:** listed in section 8.

## 2. Sources

| # | Source | URL | Read how | Value |
|---|---|---|---|---|
| 1 | xAI connectors docs | https://docs.x.ai/grok/connectors | summary (blocked) | high |
| 2 | xAI Gmail and Calendar connector docs | https://docs.x.ai/grok/connectors/gmail-google-calendar | summary (blocked) | high |
| 3 | xAI connectors announcement | https://x.ai/news/grok-connectors | summary | high |
| 4 | App Store listing "Grok - AI Chat & Video" | https://apps.apple.com/app/grok/id6670324846 | summary | medium |
| 5 | Grok automations explainer (third party) | https://www.basenor.com/blogs/news/grok-automations-explained-in-5-points | summary (blocked) | low |
| 6 | Scheduled tasks tutorial (third party) | https://dupple.com/tutorial/schedule-tasks-to-automate-actions-using-grok-4 | summary | low |
| 7 | Feature guide (third party) | https://suprmind.ai/hub/grok/grok-features/ | summary | low |
| 8 | eWeek cheat sheet | https://www.eweek.com/news/grok-cheat-sheet-complete-guide/ | summary | medium |
| 9 | Connectors guide (third party) | https://www.usecarly.com/blog/grok-connectors/ | summary | low |
| 10 | Connectors overview (third party) | https://porteden.com/blog/grok-connectors/ | summary | low |

What these sources agree on: Gmail and Google Calendar are separate connectors, each with its own OAuth sign-in. Calendar search and listing are documented. Write access (draft, send, create events) shows up only in third-party sources, so it is medium confidence. Drive, GitHub and Notion connectors and custom connectors launched around May 2026 (sources 3, 9 and 10). Tasks, later called Automations, are scheduled prompts whose results arrive by notification or email (sources 5, 6 and 7). Workspaces/Projects hold files and instructions (source 7).

## 3. Screen inventory

| ID | Screen | Route | Purpose | Key components | States seen |
|---|---|---|---|---|---|
| S01 | Home / new chat | `/` | Start a conversation | composer, mode toggles, history sidebar | empty, mobile |
| S02 | Conversation | `/c/:id` | Read and continue a chat | messages, thinking panel, sources, actions | streaming, filled, error, stopped, long |
| S03 | Image result | inside S02 | Make and view images | image grid, lightbox, download | loading, filled, error |
| S04 | Settings | modal | Instructions, theme, key | fields, danger action | default |
| S05 | Connectors | `/apps` (modal in clone) | Connect and disconnect apps | app list, connect button, status | none connected, connected, expired, error |
| S06 | Tool activity | inside S02 | Show what the assistant did in an app | step rows, confirm card | running, needs approval, done, failed, denied |
| S07 | Tasks | `/tasks` (panel in clone) | Create and manage scheduled jobs | task list, schedule picker, run history | empty, active, paused, failed run |
| S08 | Task result | inside S07 | Read what a run produced | result card, email delivery note | new, read |
| S09 | Sign in | modal | Identify the user for apps and tasks | Google button | signed out, signed in |

## 4. User flows

| ID | Goal | Screens | Happy-path clicks | Edge cases |
|---|---|---|---|---|
| F01 | Ask and get a streamed answer | S01→S02 | 1 (type + Enter) | empty input, very long, stop mid-stream, offline, quota hit |
| F02 | Reason before answering (Think) | S01→S02 | 2 | thought panel empty, long thought |
| F03 | Answer from the web with sources | S01→S02 | 2 | no sources returned |
| F04 | Make an image | S01→S03 | 2 | provider down, edit of attached image |
| F05 | Connect Gmail and Calendar | S04/S05→Google→S05 | 3 | user denies a scope, token expired, wrong account |
| F06 | Triage inbox: "summarise unread and draft replies" | S02→S06 | 1 | 0 unread, huge thread, rate limit |
| F07 | Send an email the assistant drafted | S06 confirm | 2 (ask + Approve) | user rejects, edits first, send fails |
| F08 | Schedule something: "find a free hour Thursday and book gym" | S02→S06 | 2 | no free slot, time zones, DST |
| F09 | Connect any other app (custom connector) | S05 | 3 + provider sign-in | server down, OAuth unsupported, tool error |
| F10 | Create an auto task: "every weekday 7am, email me an inbox digest" | S07 | 4 | invalid time, app disconnected, run fails |
| F11 | Read past task runs | S07→S08 | 2 | no runs yet |
| F12 | Manage history (search, rename, delete) | S01 sidebar | 2 | no matches |

## 5. Components

| Component | Variants | States | Screens |
|---|---|---|---|
| Composer | default, image mode | empty, typing, attachments, busy | S01, S02 |
| Toggle chip | Search, Think, Image | off, on, hover, focus | S01, S02 |
| Message | user, assistant | streaming, done, error, editing | S02 |
| Thinking panel | live, done | open, closed | S02 |
| Tool step row | read, write | running, done, failed, denied | S06 |
| Confirm card | email, event, generic | pending, approved, rejected | S06 |
| App row | built-in, custom | disconnected, connecting, connected, error | S05 |
| Task row | — | active, paused, failing | S07 |
| Modal | settings, apps, tasks | open, closed | S04, S05, S07 |
| Toast | — | shown | all |

## 6. Inferred data model

| Entity | Fields | Relationships | Evidence | Confidence |
|---|---|---|---|---|
| User | id, email, name, created | owns everything | sign-in required for connectors | high |
| Conversation | id, title, messages, updated | user 1–n | visible UI | high |
| Message | role, text, images, thought, sources, tool steps | conversation 1–n | visible UI | high |
| Connection | provider, account, scopes, tokens, status | user 1–n | per-connector OAuth (source 2) | high |
| Task | prompt, schedule, timezone, delivery, enabled, next_run | user 1–n | sources 5–7 | medium |
| TaskRun | started, finished, status, output | task 1–n | "results by email/notification" | medium |

## 7. Feature matrix

See `features.csv`.

## 8. What cannot be cloned

- xAI's own models, X/Twitter real-time firehose, and posts data (owned data and network). Tern uses Gemini and Google Search grounding instead.
- Companions with animated avatars (licensed characters and art).
- Video generation in Imagine (no free API with a usable quota).
- Paid tiers and SuperGrok limits (business, not product).
- xAI's verified connector partnerships. Tern uses each app's official API or that app's own public MCP server, with the user's own accounts.

## 9. Size

9 screens, 12 flows, 6 entities. Hard parts: (1) a server-side agent loop with function calling, where write actions pause for approval; (2) OAuth for Google plus generic MCP OAuth (discovery, dynamic client registration, PKCE) for "any app"; (3) scheduled tasks that run with the browser closed, on free hosting where Vercel Hobby cron fires only once a day. **Size: L.** The assistant core is done. Connectors and tasks are the bulk of the remaining work.
