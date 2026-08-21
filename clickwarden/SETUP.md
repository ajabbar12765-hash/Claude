# ClickWarden setup

ClickWarden needs several free accounts/API keys wired together. None of this
can be done on your behalf from a coding session -- each step below requires
you to sign in with your own accounts. Budget ~30-45 minutes the first time.

## 1. Deploy the backend + dashboard to Vercel

1. In Vercel, "Add New Project" from this GitHub repo.
2. Set **Root Directory** to `clickwarden` (this is a subfolder of a larger repo).
3. Framework preset: Vite (auto-detected from `vercel.json`).
4. Deploy once with no env vars set yet -- it'll build, but scanning will
   report "not configured" warnings until you add keys below.

## 2. Add Redis storage (scan history, cache, Gmail token)

1. Vercel project -> **Storage** tab -> **Marketplace Database Providers** -> add **Upstash** (Redis), free tier (500K commands/month).
2. This auto-adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`, both names are read) to your project's env vars.

## 3. Pick a shared API token

Anyone who finds your Vercel URL could otherwise spend your free-tier quota.
Generate a random string and use it everywhere below:

```
openssl rand -hex 32
```

Set it in Vercel -> Settings -> Environment Variables:

- `CLICKWARDEN_API_TOKEN` = the string you generated

You'll paste this same value into the dashboard's Settings panel and the
extension's options page later.

## 4. VirusTotal (file + URL reputation, ~70 AV engines)

1. Create a free account at https://www.virustotal.com/
2. Profile icon -> **API key** -> copy it.
3. Vercel env var: `VIRUSTOTAL_API_KEY`

Free tier: 4 requests/minute, 500/day. ClickWarden caches results for 30
minutes to stretch this.

## 5. Google Safe Browsing (the same list Chrome itself uses)

1. Go to https://console.cloud.google.com/ and create a project (or reuse the one from step 7).
2. **APIs & Services -> Library** -> enable **Safe Browsing API**.
3. **APIs & Services -> Credentials** -> **Create credentials -> API key**.
4. Vercel env var: `SAFE_BROWSING_API_KEY`

## 6. URLhaus (optional, confirmed-malware URL blocklist)

1. Free account at https://auth.abuse.ch/
2. Copy your Auth-Key.
3. Vercel env var: `URLHAUS_AUTH_KEY`

If you skip this, ClickWarden still works on VirusTotal + Safe Browsing alone.

## 7. Google OAuth client (lets the app read your Gmail)

Use the same Google Cloud project as step 5.

1. **APIs & Services -> Library** -> enable **Gmail API**.
2. **APIs & Services -> OAuth consent screen**: External, add your own Gmail
   address as a test user (you don't need to publish the app -- test mode is
   fine for personal use and avoids Google's review process).
3. **Credentials -> Create credentials -> OAuth client ID** -> type **Web application**.
   - Authorized redirect URI: `https://<your-app>.vercel.app/api/gmail/oauth-callback`
4. Vercel env vars:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` = the exact redirect URI from above

## 8. Pub/Sub (what makes new-mail scanning near-instant instead of daily)

Vercel's free Hobby plan caps cron jobs at once/day, so ClickWarden doesn't
poll Gmail -- it asks Gmail to push a notification the moment new mail
arrives. Same Google Cloud project:

1. **APIs & Services -> Library** -> enable **Cloud Pub/Sub API**.
2. **Pub/Sub -> Topics -> Create topic**, e.g. `clickwarden-gmail`.
3. On that topic, **Permissions -> Add principal**:
   - Principal: `gmail-api-push@system.gserviceaccount.com`
   - Role: `Pub/Sub Publisher`
   (This is Google's own service account that Gmail uses to publish -- it's
   documented at https://developers.google.com/gmail/api/guides/push.)
4. Generate another random secret (`openssl rand -hex 32`) -- this stops
   randoms from POSTing fake "new mail" events at your webhook.
5. **Pub/Sub -> Subscriptions -> Create subscription**:
   - Topic: the one from step 2
   - Delivery type: **Push**
   - Endpoint URL: `https://<your-app>.vercel.app/api/gmail/push?token=<your secret from step 4>`
6. Vercel env vars:
   - `GMAIL_PUBSUB_TOPIC` = `projects/<your-project-id>/topics/clickwarden-gmail`
   - `GMAIL_PUSH_SECRET` = the secret from step 4

## 9. Cron auth for the daily watch-renewal

Gmail's push subscription expires every 7 days; `vercel.json` already
schedules `/api/gmail/renew-watch` daily to refresh it (well within the
Hobby plan's once/day cron limit). Vercel automatically attaches
`Authorization: Bearer <CRON_SECRET>` to cron requests when this is set:

- `CRON_SECRET` = another random string (`openssl rand -hex 32`)

## 10. Redeploy

Once all the env vars above are set, redeploy (Vercel -> Deployments ->
redeploy, or push a commit). Local `vercel dev` works for the URL/file
scanning endpoints, but Gmail OAuth and Pub/Sub push both require a public
HTTPS URL, so that half is easiest to test against your live Vercel
deployment (or a tunnel like `ngrok` pointed at `vercel dev` if you want to
iterate locally).

## 11. Connect everything

1. Open `https://<your-app>.vercel.app`, click **Settings**, paste your
   `CLICKWARDEN_API_TOKEN`.
2. Click **Connect Gmail** and complete Google's consent screen.
3. Load the browser extension:
   - Chrome/Edge -> `chrome://extensions` -> enable **Developer mode** ->
     **Load unpacked** -> select the `clickwarden/extension` folder.
   - Click the extension icon -> **Settings** -> enter your backend URL
     (`https://<your-app>.vercel.app`) and the same API token.

You're done. New emails get scanned within seconds of arriving; links and
downloads get checked as you browse.

## Troubleshooting

- **"No threat-intel API keys configured yet"** on a scan result -- you're
  missing `VIRUSTOTAL_API_KEY` / `SAFE_BROWSING_API_KEY` / `URLHAUS_AUTH_KEY`.
- **Gmail connect redirects with an error about a missing refresh token** --
  Google only issues one on the *first* consent for an app. Revoke access at
  https://myaccount.google.com/permissions and connect again.
- **No emails showing up as scanned** -- check Vercel's function logs for
  `/api/gmail/push`; confirm the Pub/Sub subscription's push endpoint matches
  exactly (including `?token=...`), and that the topic has
  `gmail-api-push@system.gserviceaccount.com` as a Publisher.
