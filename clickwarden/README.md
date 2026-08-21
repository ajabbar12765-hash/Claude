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
- **Gmail auto-scan** -- once connected, new emails' links and attachments
  are checked automatically, roughly once a minute while the browser
  extension is running (plus a daily catch-up and a manual "Check now"
  button). This polls rather than using Gmail's push-notification API,
  specifically to avoid Google Cloud Pub/Sub's billing-account requirement
  -- see "What it doesn't do" below.
- **Browser extension** -- redirects you away from flagged links and cancels
  downloads that come back malicious/suspicious, with a system notification.

## Cost: $0, no credit card, anywhere

Every account this needs -- Vercel, Upstash (signed up directly, *not*
through Vercel's Marketplace), VirusTotal, Google Cloud/Safe Browsing/Gmail,
URLhaus -- has a free tier that asks for nothing but an email or an existing
Google/GitHub login. The one thing that would have broken this
(Gmail push notifications via Google Cloud Pub/Sub, which requires a linked
billing account even at $0 usage) was deliberately designed around: new mail
is checked by polling instead, from the browser extension's periodic alarm
plus a daily server-side catch-up. See SETUP.md for exactly what each
service requires.

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
- **Gmail scanning is "about once a minute," not instant.** It depends on
  the browser extension being loaded and running (Chrome enforces a 1-minute
  floor on alarm periods); without it, new mail only gets picked up by the
  once-daily catch-up cron or a manual "Check now" click.
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
    oauth-callback.js        stores refresh token, records the starting historyId
    poll.js                   checks for new mail since last poll, scans links + attachments
    status.js / disconnect.js
  _lib/                    virustotal.js, safeBrowsing.js, urlhaus.js, gmail.js, kv.js, verdict.js
```

Gmail scanning is polled, not push-based: real-time push would need Gmail's
Pub/Sub notifications, which require linking a Google Cloud billing account
even to stay free -- ruled out by the no-credit-card constraint. Instead,
`/api/gmail/poll` compares the mailbox's current Gmail History API cursor
against the last one it saw and scans whatever's new. Three things call it:
the browser extension's ~1-minute alarm (near-real-time while your browser
is running), a once-a-day Vercel Cron job as a catch-up (within the free
plan's cron limit), and the dashboard's "Check now" button.

## Setup

See [SETUP.md](./SETUP.md) -- it walks through every account and API key
needed (VirusTotal, Google Safe Browsing, URLhaus, Google OAuth for Gmail,
Upstash Redis signed up directly) and how to load the browser extension. All
of it is free with no credit card required anywhere.

## Local development

```
npm install
npm run dev        # frontend only, proxies /api to localhost:3000
vercel dev          # in another terminal, for the API routes
```

Gmail OAuth needs a public HTTPS redirect URI, so that part is easiest to
exercise against a real Vercel deployment.
