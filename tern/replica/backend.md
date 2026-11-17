# Backend

Test mode until stage 11. The user creates every account. Claude never handles live keys.

## Accounts the user creates (all free)

| Service | What for | Where | Env vars |
|---|---|---|---|
| Google AI Studio | Gemini model | aistudio.google.com/apikey | `GEMINI_API_KEY` |
| Google Cloud project, OAuth client (Web) | Sign in with Google, Gmail, Calendar, Drive | console.cloud.google.com → APIs & Services | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Neon or Supabase Postgres | Users, connections, tasks | neon.tech or supabase.com | `DATABASE_URL` |
| Vercel | Hosting, daily cron | vercel.com | all of the above + `SESSION_SECRET`, `CRON_SECRET` |
| GitHub repository secrets | 15-minute task schedule | repo → Settings → Secrets → Actions | `TERN_URL`, `TERN_CRON_SECRET` |

Google Cloud steps: enable the Gmail API, Google Calendar API and Google Drive API. On the OAuth consent screen, choose External and stay in **Testing**, then add your own Google address under Test users. Gmail and Drive scopes are restricted: Testing mode allows up to 100 listed users with no Google review, which suits personal use. Opening the app to anyone needs Google's verification and a security assessment, which takes weeks. Add `https://<your-domain>/api/auth?step=callback` as an authorised redirect URI.

## Checklist

- [x] **Auth:** Google sign-in (OAuth code flow, state in a signed 10-minute cookie, ID-token audience and issuer checked), session in an HMAC-signed http-only Secure SameSite=Lax cookie, 30 days
- [x] **Authorisation:** every store query is filtered by `user_id` from the session. Tested with a second user getting nothing back from both backends (`tests/unit.test.mjs`)
- [x] **Account deletion** revokes the Google token and deletes every row (`DELETE /api/me`). Chats are only in the browser and are cleared there
- [x] **Database:** schema in `replica/schema.sql`, applied idempotently on cold start and by `npm run migrate`. Backups: Neon and Supabase take daily backups on their free tiers, so turn on point-in-time restore if you upgrade
- [x] **Secrets at rest:** OAuth tokens, MCP URLs and saved agent state are encrypted with AES-256-GCM, using a key derived from `SESSION_SECRET` with HKDF
- [x] **Jobs:** `/api/cron` is protected by `CRON_SECRET` and claims each task atomically before running it. A failed run is stored with its error; there is no automatic retry, and the next scheduled run tries again
- [x] **Email:** task results go out through the user's own Gmail to themselves. No sending domain is needed
- [x] **Integrations:** official APIs only (Gmail, Calendar, Drive, MCP). Google scopes are requested per app (incremental auth)
- [x] **Input validation:** every route checks body types, lengths, URLs (https only, no private addresses), email addresses, schedules and time zones
- [x] **CSRF:** writes require a same-origin `Origin` header; cookies are SameSite=Lax
- [x] **Rate limits:** per-IP limits on chat (30/min) and images (10/min); at most 25 tasks per user; 8 tool rounds per turn
- [x] **Prompt injection:** content from apps is labelled as data in the system prompt; every write needs approval, or "can act" on a task
- [x] **No user data in URLs or logs:** errors are logged without content; MCP URLs with embedded keys stay encrypted
- [x] **Upload limits:** images are resized to 1536px in the browser, at most 4 per message, and the server checks MIME type and size
- [x] `npm audit`: 0 vulnerabilities (run 2026-11-17)
- [ ] **Payments:** not needed. Tern is free and has no Stripe
- [ ] **Privacy policy:** lists Google (Gemini, OAuth, Gmail, Calendar, Drive), the database host, Vercel, Pollinations (image fallback), and any MCP apps the user connects. A draft is in `replica/launch/landing.md`
