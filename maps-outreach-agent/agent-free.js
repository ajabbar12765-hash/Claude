#!/usr/bin/env node
/**
 * Maps Business Outreach Agent — FREE edition
 * -------------------------------------------
 * Same goal as agent.js (find businesses with a phone but no website so you
 * can sell them one), but uses OpenStreetMap instead of Google.
 *
 *   ✅ No API key
 *   ✅ No billing / no credit card
 *   ✅ Free forever
 *
 * How it works:
 *   1. Geocode your location with Nominatim (free OSM geocoder).
 *   2. Query the Overpass API for named businesses that have a phone tag
 *      but NO website tag, inside that area.
 *   3. Rank and print the leads, flag a TOP PICK, optionally export CSV/JSON.
 *
 * Honest caveat: OSM coverage is thinner than Google, and "no website" here
 * means no website is recorded in OSM — always glance at the top pick before
 * you call. But it costs nothing and needs no card.
 *
 * Usage:
 *   node agent-free.js --location "Austin, TX"
 *   node agent-free.js -l "Brooklyn, NY" --query restaurant --limit 25 --csv
 *   node agent-free.js -l "Miami, FL" --type shop
 *
 * Needs only Node.js 18+ (built-in fetch). No npm install.
 */

import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// CLI argument parsing (no dependencies)
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const aliases = { q: "query", l: "location", n: "limit", h: "help", t: "type" };
  const flags = new Set(["csv", "json", "help", "quiet"]);
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("-")) continue;
    let key = token.replace(/^--?/, "");
    if (aliases[key]) key = aliases[key];
    if (flags.has(key)) {
      args[key] = true;
      continue;
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) args[key] = true;
    else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

const HELP = `
Maps Business Outreach Agent (FREE / OpenStreetMap) — no API key needed.

Options:
  -l, --location <text>    City / area to search (e.g. "Austin, TX").   [required]
  -q, --query <text>       Keyword filter on name or category (e.g. "cafe"). Optional.
  -t, --type <key>         Limit to an OSM category key: shop | amenity | craft |
                           office | tourism | leisure | healthcare. Optional.
  -n, --limit <number>     Max leads to return. Default: 25.
      --csv                Also write leads.csv.
      --json               Also write leads.json.
      --quiet              Hide the pitch tips.
  -h, --help               Show this help.

Examples:
  node agent-free.js -l "Denver, CO"
  node agent-free.js -l "Miami, FL" -q barber --csv
  node agent-free.js -l "Brooklyn, NY" -t shop --limit 40
`;

if (args.help) {
  console.log(HELP);
  process.exit(0);
}

const location = typeof args.location === "string" ? args.location : "";
if (!location) {
  console.error(
    '\n❌ Missing --location. Try:  node agent-free.js -l "Austin, TX"\n' +
      "   Run with --help for all options.\n"
  );
  process.exit(1);
}
const keyword = typeof args.query === "string" ? args.query.toLowerCase() : "";
const typeFilter = typeof args.type === "string" ? args.type.toLowerCase() : "";
const limit = Number.parseInt(args.limit, 10) || 25;

// Be a polite API citizen — both services ask for a descriptive User-Agent.
const USER_AGENT =
  "maps-outreach-agent/1.0 (free lead finder; contact: local user)";

// Business-ish OSM keys we treat as sellable categories.
const CATEGORY_KEYS = [
  "shop",
  "amenity",
  "craft",
  "office",
  "tourism",
  "leisure",
  "healthcare",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// 1. Geocode the location to a bounding box (Nominatim)
// ---------------------------------------------------------------------------
async function geocode(place) {
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
    encodeURIComponent(place);
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Geocoding failed (${res.status}).`);
  const data = await res.json();
  if (!data.length) throw new Error(`Couldn't find location "${place}".`);
  // boundingbox = [south, north, west, east] as strings
  const [south, north, west, east] = data[0].boundingbox.map(Number);
  return { south, north, west, east, label: data[0].display_name };
}

// ---------------------------------------------------------------------------
// 2. Query Overpass for named places with a phone but no website
// ---------------------------------------------------------------------------
function buildOverpassQuery({ south, west, north, east }) {
  const bbox = `${south},${west},${north},${east}`;
  // Two phone tag conventions exist: "phone" and "contact:phone".
  // Exclude both website conventions: "website" and "contact:website".
  return `[out:json][timeout:120];
(
  nwr["name"]["phone"][!"website"][!"contact:website"](${bbox});
  nwr["name"]["contact:phone"][!"website"][!"contact:website"](${bbox});
);
out center tags ${Math.max(limit * 6, 200)};`;
}

async function queryOverpass(query) {
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];
  let lastErr;
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
        },
        body: "data=" + encodeURIComponent(query),
      });
      if (res.status === 429 || res.status === 504) {
        lastErr = new Error(`Overpass busy (${res.status}) at ${endpoint}.`);
        await sleep(2000);
        continue;
      }
      if (!res.ok) {
        lastErr = new Error(`Overpass error (${res.status}) at ${endpoint}.`);
        continue;
      }
      return res.json();
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("Overpass request failed.");
}

// ---------------------------------------------------------------------------
// 3. Shape, filter, rank
// ---------------------------------------------------------------------------
function categoryOf(tags) {
  for (const key of CATEGORY_KEYS) {
    if (tags[key]) return `${key}: ${tags[key]}`;
  }
  return "";
}

function addressOf(tags) {
  const parts = [
    [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" "),
    tags["addr:city"],
    tags["addr:state"],
    tags["addr:postcode"],
  ].filter(Boolean);
  return parts.join(", ");
}

function toLead(el) {
  const tags = el.tags || {};
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  const name = tags.name || "(unknown)";
  const mapsUrl =
    lat != null && lon != null
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${name} ${lat},${lon}`
        )}`
      : "";
  return {
    name,
    phone: tags.phone || tags["contact:phone"] || "",
    address: addressOf(tags),
    category: categoryOf(tags),
    hours: tags.opening_hours || "",
    mapsUrl,
    _tags: tags,
  };
}

function isBusiness(lead) {
  return CATEGORY_KEYS.some((k) => lead._tags[k]);
}

function matchesFilters(lead) {
  if (typeFilter && !lead._tags[typeFilter]) return false;
  if (keyword) {
    const hay = `${lead.name} ${lead.category}`.toLowerCase();
    if (!hay.includes(keyword)) return false;
  }
  return true;
}

// A more "complete" OSM entry (address + hours) usually means a real,
// established business — a better lead than a bare pin.
function completeness(lead) {
  return (lead.address ? 2 : 0) + (lead.hours ? 1 : 0);
}

function dedupe(leads) {
  const seen = new Map();
  for (const lead of leads) {
    const key = `${lead.name}|${lead.phone}`.toLowerCase();
    if (!seen.has(key)) seen.set(key, lead);
  }
  return [...seen.values()];
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------
function csvEscape(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeCsv(leads, file) {
  const headers = ["name", "phone", "address", "category", "hours", "mapsUrl"];
  const lines = [headers.join(",")];
  for (const lead of leads)
    lines.push(headers.map((h) => csvEscape(lead[h])).join(","));
  fs.writeFileSync(file, lines.join("\n"));
}

function printLeads(leads) {
  leads.forEach((lead, i) => {
    console.log(
      `\n${i + 1}. ${lead.name}` +
        `\n   📞 ${lead.phone}` +
        (lead.address ? `\n   📍 ${lead.address}` : "") +
        (lead.category ? `\n   🏷️  ${lead.category}` : "") +
        (lead.hours ? `\n   🕑 ${lead.hours}` : "") +
        (lead.mapsUrl ? `\n   🔗 ${lead.mapsUrl}` : "")
    );
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
(async () => {
  console.log(`\n🔎 Geocoding "${location}" (free, OpenStreetMap) ...`);
  let box;
  try {
    box = await geocode(location);
  } catch (err) {
    console.error(`\n❌ ${err.message}\n`);
    process.exit(1);
  }
  console.log(`   Area: ${box.label}`);
  console.log(`🔎 Searching OpenStreetMap for phone-but-no-website businesses ...`);

  let data;
  try {
    data = await queryOverpass(buildOverpassQuery(box));
  } catch (err) {
    console.error(
      `\n❌ ${err.message}\n   The free Overpass servers are sometimes busy — wait a minute and retry.\n`
    );
    process.exit(1);
  }

  const elements = Array.isArray(data.elements) ? data.elements : [];
  console.log(`   Scanned ${elements.length} map entries.`);

  const leads = dedupe(
    elements.map(toLead).filter(isBusiness).filter(matchesFilters)
  )
    .sort((a, b) => completeness(b) - completeness(a))
    .slice(0, limit);

  if (leads.length === 0) {
    console.log(
      "\n😕 No phone-but-no-website businesses matched here.\n" +
        "   Try dropping --query/--type, or a bigger/denser --location.\n"
    );
    process.exit(0);
  }

  console.log(
    `\n✅ Found ${leads.length} business(es) with a phone and NO website — your leads:`
  );
  printLeads(leads);

  const top = leads[0];
  console.log(
    `\n⭐ TOP PICK: ${top.name} — ${top.phone}` +
      `\n   Verify they truly have no site (quick Google), then call them first.`
  );

  if (args.csv) {
    const file = path.join(process.cwd(), "leads.csv");
    writeCsv(leads, file);
    console.log(`\n💾 Wrote ${leads.length} leads to ${file}`);
  }
  if (args.json) {
    const file = path.join(process.cwd(), "leads.json");
    const clean = leads.map(({ _tags, ...rest }) => rest);
    fs.writeFileSync(file, JSON.stringify(clean, null, 2));
    console.log(`💾 Wrote ${leads.length} leads to ${file}`);
  }

  if (!args.quiet) {
    console.log(
      "\n📣 Pitch tips:\n" +
        "   • Lead with the loss: customers who search for them find nothing.\n" +
        "   • Bring a 1-page mockup of THEIR business. Show, don't tell.\n" +
        "   • Cheap first site + small monthly hosting = recurring income.\n"
    );
  }
})();
