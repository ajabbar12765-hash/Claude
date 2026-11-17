# Deploy

**Status: not deployed. Waiting for the user's go and their accounts.** Nothing goes live without it.

## Preflight (run 2026-11-17)

| Check | Result |
|---|---|
| Unit tests (`npm test`) | # pass 12 # fail 0  |
| Browser e2e (`node --test tests/e2e.test.mjs`) | # pass 6 # fail 0  |
| Feature parity | features 98.6  (27 counted, must-haves 19 of 19 done) |
| Rebrand sweep | Clean. Nothing of the original's name, domain or colours found. exit 0  |
| Store listing limits | 0 errors, 0 warnings |
| Build (no bundler; syntax check of every file) | syntax ok |
| Contrast, dark and light |   13 pairs, 0 failing AA   13 pairs, 0 failing AA  |
| npm audit | found 0 vulnerabilities |
| Open S1 or S2 bugs | none (`bugs.md`) |
| Privacy policy and terms live | **no**: needed before anyone but you signs in. Draft points in `backend.md` |
| Cookie banner | not needed: only strictly necessary session cookies, no tracking |
| Account deletion | works (`DELETE /api/me`, unit tested) |
| Favicon, titles, OG image are your own | favicon and titles yes; OG image not made yet (see the logo brief) |
| Real-account hand checklist | **not run**: needs your Google and Gemini accounts (`test-plan.md`) |

## Production services (you do these; about 15 minutes)

1. Postgres on Neon or Supabase (free) → `DATABASE_URL`. Turn backups on.
2. Google Cloud OAuth client and APIs, in Testing mode with yourself as a test user (README, "Connect apps and tasks"). Add the production redirect `https://YOUR-DOMAIN/api/auth?step=callback`.
3. Vercel: import the repo, set Root Directory to `tern`, and add the env vars from `.env.example`. `main` deploys and pull requests get previews.
4. GitHub Actions secrets `TERN_URL` and `TERN_CRON_SECRET` for the 15-minute schedule.
5. No Stripe and no sending domain needed: email goes out through your own Gmail.

## Domain (optional)

If you use your own domain: an A record at the apex to Vercel's IP (shown in Vercel), and a CNAME for `www` to `cname.vercel-dns.com`. Pick one canonical host and redirect the other. HTTPS is automatic. SPF, DKIM and DMARC are not needed, because Tern does not send from your domain.

## Watch in the first week

- Vercel function logs for `/api/chat` errors and 429s (Gemini free quota)
- GitHub Actions runs of "Tern tasks": any red run means tasks did not fire
- `/api/status` uptime
- Your own inbox: each task email arriving on time, in your time zone
- Google Account → Security → Third-party access: Tern listed with only the scopes you chose
