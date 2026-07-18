# Maps Business Outreach Agent

Finds local businesses that **have a phone number but no website** — the
warmest possible leads if you sell websites. A business already taking phone
calls with zero web presence is losing every customer who searches online
first. That's your entire pitch, handed to you.

It uses the **Google Places API (New)** and has **no npm dependencies** —
just Node.js 18+ (built-in `fetch`).

---

## 1. Get a Google API key (one time, free tier is generous)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or pick an existing one).
3. Enable **Places API (New)**.
4. Create an **API key** under *APIs & Services → Credentials*.
5. Make sure billing is enabled on the project (required, but there's a large
   monthly free credit — casual prospecting stays free).

## 2. Add your key

```bash
cd maps-outreach-agent
cp .env.example .env
# then edit .env and paste your key
```

Your `.env` is gitignored — the key never gets committed.

## 3. Run it

```bash
node agent.js --query "restaurants" --location "Austin, TX"
```

Common variations:

```bash
# Trades are gold — often phone-only:
node agent.js -q "plumbers" -l "Brooklyn, NY" --min-reviews 10 --csv

# Cast a wide net and save everything:
node agent.js -q "coffee shops" -l "Miami, FL" --pages 3 --limit 30 --csv --json

# Just want the single best lead? Limit to 1:
node agent.js -q "barber shops" -l "Denver, CO" --limit 1
```

---

## Options

| Flag | Meaning | Default |
|------|---------|---------|
| `-q, --query <text>` | What to search for | **required** |
| `-l, --location <text>` | City / area to focus on | *(none)* |
| `-n, --limit <n>` | Max leads to return | 20 |
| `-p, --pages <n>` | Result pages to fetch (20/page) | 3 |
| `--min-reviews <n>` | Keep only businesses with ≥ N reviews | 0 |
| `--open-only` | Skip permanently closed businesses | off |
| `--csv` | Also write `leads.csv` | off |
| `--json` | Also write `leads.json` | off |
| `--quiet` | Hide the pitch tips | off |
| `-h, --help` | Show help | — |

---

## How it decides what's a lead

A business is a lead when it **has a phone number** and **has no `websiteUri`**
in Google's data. Results are ranked by review count (busiest first) — the more
customers a place already has without a website, the more obviously it's leaving
money on the table, and the easier your pitch.

> Note: Google occasionally lists a Facebook/Instagram page in the website
> field. Always glance at the top pick before calling — but "no site at all" is
> exactly what this filters for.

## Output

Prints a ranked list to the console, flags a **TOP PICK** to call first, and
(optionally) writes `leads.csv` / `leads.json` you can drop into a spreadsheet
or CRM.

## Closing tips

- **Lead with the loss:** "When someone Googles you, they find nothing."
- **Bring a mockup.** A one-page demo of *their* business closes deals.
- **Keep the first site cheap**, then charge monthly for hosting/updates —
  that recurring revenue is how this becomes a real income, not one paycheck.
