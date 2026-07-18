#!/usr/bin/env node
/**
 * Maps Business Outreach Agent
 * -----------------------------
 * Finds local businesses that HAVE a phone number but DO NOT have a website,
 * so you can pitch them a website. Uses the Google Places API (New) v1.
 *
 * These are warm leads: a business already fielding phone calls but with no
 * web presence is losing customers who search online first. That's your pitch.
 *
 * Usage:
 *   node agent.js --query "restaurants" --location "Austin, TX"
 *   node agent.js -q "plumbers" -l "Brooklyn, NY" --limit 25 --min-reviews 10
 *   node agent.js --query "coffee shops" --location "Miami" --pages 3 --csv
 *
 * Requires an API key in the environment:
 *   export GOOGLE_MAPS_API_KEY="your_key"   (or put it in a .env file)
 *
 * Enable "Places API (New)" in Google Cloud Console for the key.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Tiny .env loader (no dependencies). Reads KEY=VALUE lines from ./.env
// ---------------------------------------------------------------------------
function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const rawLine of fs.readFileSync(envPath, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadDotEnv();

// ---------------------------------------------------------------------------
// CLI argument parsing (no dependencies)
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const aliases = {
    q: "query",
    l: "location",
    n: "limit",
    p: "pages",
    h: "help",
  };
  const flags = new Set(["csv", "json", "help", "quiet"]);
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    let token = argv[i];
    if (!token.startsWith("-")) continue;
    let key = token.replace(/^--?/, "");
    if (aliases[key]) key = aliases[key];
    if (flags.has(key)) {
      args[key] = true;
      continue;
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

const HELP = `
Maps Business Outreach Agent — find businesses with a phone but no website.

Options:
  -q, --query <text>       What to search for (e.g. "restaurants", "plumbers").   [required]
  -l, --location <text>    City / area to bias the search (e.g. "Austin, TX").     [recommended]
  -n, --limit <number>     Max leads to return. Default: 20.
  -p, --pages <number>     Result pages to fetch (20 results/page). Default: 3.
      --min-reviews <n>    Only keep businesses with at least N reviews. Default: 0.
      --open-only          Only keep operational businesses (skip closed).
      --csv                Also write results to leads.csv.
      --json               Also write results to leads.json.
      --quiet              Suppress the pitch tips at the end.
  -h, --help               Show this help.

Environment:
  GOOGLE_MAPS_API_KEY      Your Google Places API (New) key. Put it in .env.

Examples:
  node agent.js -q "coffee shops" -l "Miami, FL"
  node agent.js -q "landscapers" -l "Phoenix, AZ" --min-reviews 15 --csv
`;

if (args.help) {
  console.log(HELP);
  process.exit(0);
}

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!API_KEY) {
  console.error(
    "\n❌ No API key found.\n" +
      "   Set GOOGLE_MAPS_API_KEY in your environment or in a .env file.\n" +
      "   See .env.example and the README for setup.\n"
  );
  process.exit(1);
}

const query = args.query;
if (!query || query === true) {
  console.error(
    '\n❌ Missing --query. Try:  node agent.js -q "restaurants" -l "Austin, TX"\n' +
      "   Run with --help for all options.\n"
  );
  process.exit(1);
}

const location = typeof args.location === "string" ? args.location : "";
const limit = Number.parseInt(args.limit, 10) || 20;
const maxPages = Number.parseInt(args.pages, 10) || 3;
const minReviews = Number.parseInt(args["min-reviews"], 10) || 0;
const openOnly = Boolean(args["open-only"]);

// ---------------------------------------------------------------------------
// Places API (New) — Text Search
// Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
// We request only the fields we need (field mask) to keep cost down.
// ---------------------------------------------------------------------------
const FIELD_MASK = [
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
  "places.primaryTypeDisplayName",
  "places.businessStatus",
  "nextPageToken",
].join(",");

async function searchPage(pageToken) {
  const body = {
    textQuery: location ? `${query} in ${location}` : query,
    pageSize: 20,
  };
  if (pageToken) body.pageToken = pageToken;

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      msg = JSON.parse(text)?.error?.message || text;
    } catch {
      /* keep raw text */
    }
    throw new Error(`Places API error (${res.status}): ${msg}`);
  }
  return res.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function collectPlaces() {
  const all = [];
  let pageToken = undefined;
  for (let page = 0; page < maxPages; page++) {
    const data = await searchPage(pageToken);
    if (Array.isArray(data.places)) all.push(...data.places);
    pageToken = data.nextPageToken;
    if (!pageToken) break;
    // The next page token needs a moment to become valid.
    await sleep(2000);
  }
  return all;
}

// ---------------------------------------------------------------------------
// Filtering + ranking
// ---------------------------------------------------------------------------
function isLead(place) {
  const hasPhone = Boolean(
    place.nationalPhoneNumber || place.internationalPhoneNumber
  );
  const hasWebsite = Boolean(place.websiteUri);
  if (!hasPhone || hasWebsite) return false;
  if ((place.userRatingCount || 0) < minReviews) return false;
  if (openOnly && place.businessStatus && place.businessStatus !== "OPERATIONAL")
    return false;
  return true;
}

/**
 * Hotter lead = more customer activity (reviews) but still no website.
 * These are the businesses most obviously leaving money on the table.
 */
function rank(a, b) {
  const ra = a.userRatingCount || 0;
  const rb = b.userRatingCount || 0;
  if (rb !== ra) return rb - ra;
  return (b.rating || 0) - (a.rating || 0);
}

function toLead(place) {
  return {
    name: place.displayName?.text || "(unknown)",
    phone: place.nationalPhoneNumber || place.internationalPhoneNumber || "",
    address: place.formattedAddress || "",
    category: place.primaryTypeDisplayName?.text || "",
    rating: place.rating ?? "",
    reviews: place.userRatingCount ?? 0,
    status: place.businessStatus || "",
    mapsUrl: place.googleMapsUri || "",
  };
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------
function csvEscape(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeCsv(leads, file) {
  const headers = [
    "name",
    "phone",
    "address",
    "category",
    "rating",
    "reviews",
    "status",
    "mapsUrl",
  ];
  const lines = [headers.join(",")];
  for (const lead of leads) {
    lines.push(headers.map((h) => csvEscape(lead[h])).join(","));
  }
  fs.writeFileSync(file, lines.join("\n"));
}

function printLeads(leads) {
  leads.forEach((lead, i) => {
    const stars = lead.rating ? `⭐ ${lead.rating}` : "no rating";
    console.log(
      `\n${i + 1}. ${lead.name}` +
        `\n   📞 ${lead.phone}` +
        `\n   📍 ${lead.address}` +
        (lead.category ? `\n   🏷️  ${lead.category}` : "") +
        `\n   ${stars} · ${lead.reviews} reviews` +
        (lead.mapsUrl ? `\n   🔗 ${lead.mapsUrl}` : "")
    );
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
(async () => {
  const where = location ? ` in ${location}` : "";
  console.log(`\n🔎 Searching Google Maps for "${query}"${where} ...`);

  let places;
  try {
    places = await collectPlaces();
  } catch (err) {
    console.error(`\n❌ ${err.message}\n`);
    if (/API key|not authorized|PERMISSION_DENIED|403/i.test(err.message)) {
      console.error(
        "   Make sure 'Places API (New)' is enabled for this key in Google Cloud Console\n" +
          "   and that billing is turned on (there's a generous free tier).\n"
      );
    }
    process.exit(1);
  }

  console.log(`   Scanned ${places.length} businesses.`);

  const leads = places.filter(isLead).map(toLead).sort(rank).slice(0, limit);

  if (leads.length === 0) {
    console.log(
      "\n😕 No phone-but-no-website businesses in this batch.\n" +
        "   Try a broader --query, a different --location, or more --pages.\n"
    );
    process.exit(0);
  }

  console.log(
    `\n✅ Found ${leads.length} business(es) with a phone and NO website — your leads:`
  );
  printLeads(leads);

  // Highlight the single best lead — the "go call this one first" pick.
  const top = leads[0];
  console.log(
    `\n⭐ TOP PICK: ${top.name} — ${top.phone}` +
      `\n   ${top.reviews} reviews and no website. Call this one first.`
  );

  if (args.csv) {
    const file = path.join(process.cwd(), "leads.csv");
    writeCsv(leads, file);
    console.log(`\n💾 Wrote ${leads.length} leads to ${file}`);
  }
  if (args.json) {
    const file = path.join(process.cwd(), "leads.json");
    fs.writeFileSync(file, JSON.stringify(leads, null, 2));
    console.log(`💾 Wrote ${leads.length} leads to ${file}`);
  }

  if (!args.quiet) {
    console.log(
      "\n📣 Pitch tips:\n" +
        "   • Lead with what they lose: customers who Google them find nothing.\n" +
        "   • Bring a mockup. Show, don't tell. A 1-page demo closes deals.\n" +
        "   • Keep it concrete: menu/services, hours, click-to-call, a map.\n" +
        "   • First site cheap + monthly hosting = recurring income for you.\n"
    );
  }
})();
