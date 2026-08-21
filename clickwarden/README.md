# ClickWarden

Know before you click. ClickWarden checks links, files, and Gmail against
real threat-intelligence feeds (VirusTotal, Google Safe Browsing, URLhaus)
and warns you before something dangerous opens -- all on free API tiers.

It is **not** a Bitdefender clone. It doesn't use Bitdefender's name, code,
or proprietary detection engine (that's licensed, closed-source, and built by
a large team over years -- no personal project reproduces it). What it does
instead: aggregate the same class of public threat-intelligence signal real
security products draw on, and surface it fast, for free.

## What it does

- **Link scanning** -- paste any URL into the dashboard, or let the browser
  extension check every link and download automatically as you browse.
- **File scanning** -- hashes a file locally in your browser (the file never
  leaves your device unless you explicitly opt in to a full VirusTotal
  upload) and checks that hash against VirusTotal.
- **Gmail auto-scan** -- once connected, every new email's links and
  attachments are checked automatically, usually within seconds of arriving,
  using Gmail's push-notification API (not polling).
- **Browser extension** -- redirects you away from flagged links and cancels
  downloads that come back malicious/suspicious, with a system notification.

## What it doesn't do (read this before trusting it)

- **No OS-level real-time protection.** There's no kernel driver, no
  filesystem hook, no process/memory scanning. It only sees what you
  explicitly check, what the extension observes in the browser, and what
  arrives in the connected Gmail account.
- **No offline/signature-based detection engine.** Every verdict comes from
  three external APIs. If they're down, rate-limited, or haven't seen a
  given file/URL before, ClickWarden says "unknown," not "safe."
- **The browser extension can't guarantee a link never loads.** Manifest V3
  removed blocking `webRequest` for most extensions, so navigation checks
  race the page load rather than pre-empting it. Downloads are handled more
  reliably (cancelled server-side via the Downloads API within about a
  second of starting).
- **Free-tier rate limits are real.** VirusTotal's free key allows 4
  requests/minute and 500/day. Results are cached for 30 minutes to help,
  but a burst of unique links/files can still hit the limit.
- **No ransomware rollback, no VPN, no password manager, no firewall** --
  none of the other things a full security suite bundles. This is
  specifically a "check before you click" tool.

If you need real device-level antivirus, keep using one alongside this --
ClickWarden is a complement, not a replacement.

## Architecture

```
extension/         Manifest V3 browser extension
  background.js       checks links (webNavigation) + downloads before they land
  blocked.html/js      interstitial warning page
  popup / options       status, recent activity, backend URL + token config

src/                React dashboard (Vite)
  ScanBox               paste a URL or pick a file to check on demand
  GmailPanel             connect Gmail, view auto-scanned emails
  HistoryList             recent scans

api/                Vercel serverless functions (Node.js)
  scan-url.js            aggregates VirusTotal + Safe Browsing + URLhaus for a URL
  scan-file.js            VirusTotal hash lookup (+ opt-in upload)
  history.js               recent scans from Redis
  gmail/
    oauth-start.js          -> Google consent screen
    oauth-callback.js        stores refresh token, starts the watch subscription
    push.js                   Pub/Sub webhook: new mail -> scan links + attachments
    renew-watch.js             daily cron, renews the 7-day watch subscription
    status.js / disconnect.js
  _lib/                    virustotal.js, safeBrowsing.js, urlhaus.js, gmail.js, kv.js, verdict.js
```

Gmail scanning is event-driven, not polled: Gmail calls a Cloud Pub/Sub topic
on every mailbox change, Pub/Sub pushes that to `/api/gmail/push`, which
fetches just the new messages via the History API. A once-a-day Vercel Cron
job (within the free plan's limit) just renews the subscription before its
7-day expiration -- it isn't what triggers scanning.

## Setup

See [SETUP.md](./SETUP.md) -- it walks through every account and API key
needed (VirusTotal, Google Safe Browsing, URLhaus, Google OAuth + Pub/Sub,
Upstash Redis) and how to load the browser extension.

## Local development

```
npm install
npm run dev        # frontend only, proxies /api to localhost:3000
vercel dev          # in another terminal, for the API routes
```

Gmail OAuth and Pub/Sub push both require a public HTTPS URL, so that part
is easiest to exercise against a real Vercel deployment.
