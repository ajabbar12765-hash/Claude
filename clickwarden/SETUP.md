# ClickWarden setup

Every step below is free with **no credit card required anywhere** -- that
was a hard constraint, and two services that would have violated it
(Google Cloud Pub/Sub, and Vercel's Marketplace billing wrapper for Upstash)
were deliberately avoided; see the note in Part 2 and Part 7 for why. None of
this can be done on your behalf -- each step needs you to sign in with your
own accounts. Budget ~20-30 minutes the first time.

## 1. Deploy the backend + dashboard to Vercel

1. In Vercel, "Add New Project" from this GitHub repo. Vercel's free Hobby
   plan needs no payment method to sign up or deploy.
2. Set **Root Directory** to `clickwarden` (this is a subfolder of a larger repo).
3. Framework preset: Vite (auto-detected from `vercel.json`).
4. Deploy once with no env vars set yet -- it'll build, but scanning will
   report "not configured" warnings until you add keys below.

## 2. Add Redis storage (scan history, cache, Gmail token)

Don't use Vercel's Storage tab / Marketplace for this -- installing a
Marketplace integration (including the Upstash one) requires putting a
payment method on file with Vercel, even though the database itself is free.
Sign up with Upstash directly instead, which has no such requirement:

1. Go to https://upstash.com/ -> sign up with GitHub or Google (no card asked).
2. Create a Redis database, free tier (256MB, 500K commands/month) -- pick any region.
3. On the database's page, copy the **REST URL** and **REST Token**.
4. Vercel -> Settings -> Environment Variables:
   - `KV_REST_API_URL` = the REST URL
   - `KV_REST_API_TOKEN` = the REST Token

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

1. Create a free account at https://www.virustotal.com/ (email signup, no card).
2. Profile icon -> **API key** -> copy it.
3. Vercel env var: `VIRUSTOTAL_API_KEY`

Free tier: 4 requests/minute, 500/day. ClickWarden caches results for 30
minutes to stretch this.

## 5. Google Safe Browsing (the same list Chrome itself uses)

This and the Gmail setup in Part 7 use a Google Cloud project. Creating a
project and enabling these two APIs does **not** require linking a billing
account -- only some other Google Cloud products (notably Pub/Sub, which
this app avoids) force that.

1. Go to https://console.cloud.google.com/ and create a project (reuse it for Part 7 too).
2. **APIs & Services -> Library** -> enable **Safe Browsing API**.
3. **APIs & Services -> Credentials** -> **Create credentials -> API key**.
4. Vercel env var: `SAFE_BROWSING_API_KEY`

(Google is sunsetting this v4 API on 2027-03-31 in favor of v5 -- fine for
now, just something to revisit later.)

## 6. URLhaus (optional, confirmed-malware URL blocklist)

1. Free account at https://auth.abuse.ch/ (no card).
2. Copy your Auth-Key.
3. Vercel env var: `URLHAUS_AUTH_KEY`

If you skip this, ClickWarden still works on VirusTotal + Safe Browsing alone.

## 7. Google OAuth client (lets the app read your Gmail)

Use the same Google Cloud project as step 5. This step -- creating an OAuth
client and using the Gmail API within its free daily quota -- does not
require billing either.

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

**No Pub/Sub setup needed.** An earlier version of this used Gmail's
Pub/Sub push notifications for instant scanning, but Google requires a
billing account (credit card on file) to enable Pub/Sub at all, even to stay
within its free tier -- a dealbreaker for a zero-cost tool. Instead, new mail
is checked by *polling*:

- The browser extension pings `/api/gmail/poll` roughly once a minute while
  it's running (Chrome's alarm-period minimum).
- A once-daily Vercel Cron job hits the same endpoint as a backstop for when
  the browser was closed (see `vercel.json`; this fits inside the Hobby
  plan's once/day cron limit).
- The dashboard also has a manual **Check now** button.

None of that needs any extra setup beyond what's already above.

## 8. Cron auth for the daily catch-up poll

Vercel automatically attaches `Authorization: Bearer <CRON_SECRET>` to cron
requests when this env var is set:

- `CRON_SECRET` = another random string (`openssl rand -hex 32`)

## 9. Redeploy

Once all the env vars above are set, redeploy (Vercel -> Deployments ->
redeploy, or push a commit). Local `vercel dev` works for the URL/file
scanning endpoints. Gmail OAuth needs a public HTTPS redirect URI, so that
part is easiest to test against your live Vercel deployment.

## 10. Connect everything

1. Open `https://<your-app>.vercel.app`, click **Settings**, paste your
   `CLICKWARDEN_API_TOKEN`.
2. Click **Connect Gmail** and complete Google's consent screen.
3. Load the browser extension:
   - Chrome/Edge -> `chrome://extensions` -> enable **Developer mode** ->
     **Load unpacked** -> select the `clickwarden/extension` folder.
   - Click the extension icon -> **Settings** -> enter your backend URL
     (`https://<your-app>.vercel.app`) and the same API token.

You're done, at $0 and with no card on file anywhere. New emails get checked
roughly every minute while your browser is open (or immediately if you click
**Check now**); links and downloads get checked as you browse.

## Troubleshooting

- **"No threat-intel API keys configured yet"** on a scan result -- you're
  missing `VIRUSTOTAL_API_KEY` / `SAFE_BROWSING_API_KEY` / `URLHAUS_AUTH_KEY`.
- **Gmail connect redirects with an error about a missing refresh token** --
  Google only issues one on the *first* consent for an app. Revoke access at
  https://myaccount.google.com/permissions and connect again.
- **No emails showing up as scanned** -- click **Check now** on the
  dashboard first to rule out the extension alarm just not having fired yet;
  if that also shows nothing, check Vercel's function logs for
  `/api/gmail/poll` for the actual error.
