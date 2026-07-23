"""Web-reputation search for Scam Shield.

Searches the web for what people say about a shop's domain and turns the
results into scored findings plus a short list of clickable sources.

Providers, in order of preference (first one configured wins):
  1. Serper.dev  -> set SERPER_API_KEY   (Google results, most reliable)
  2. Brave API   -> set BRAVE_API_KEY
  3. DuckDuckGo  -> no key, scraped HTML  (default; may be rate-limited
                                           from cloud IPs)

Everything here is wrapped so that a failed/blocked search degrades to an
informational "couldn't check" finding rather than breaking the report.
"""

import html as html_lib
import os
import re
from urllib.parse import urlparse, unquote, quote_plus

import requests

SEARCH_TIMEOUT = 9
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)

# Sites whose whole reason to exist is reviews / scam reports / complaints.
# A hit here is far more meaningful than a scam word in a random blog.
REPUTATION_PLATFORMS = (
    "scamadviser", "scamdoc", "trustpilot", "sitejabber", "reddit",
    "bbb.org", "scamwatch", "ripoffreport", "mywot", "urlvoid",
    "scam-detector", "malwaretips", "complaintsboard", "quora",
    "trustedreviews", "scamminder", "gridinsoft", "web.paranoid",
)

# Phrases that, when they appear next to the shop's name, signal trouble.
SCAM_KEYWORDS = (
    "scam", "scammer", "fraud", "fraudulent", "fake", "counterfeit",
    "ripoff", "rip-off", "rip off", "phishing", "do not buy", "don't buy",
    "avoid this", "never received", "did not arrive", "didn't arrive",
    "stole my", "chargeback", "fake store", "scam site", "scam website",
    "not legit", "is it a scam", "scam alert", "fake website",
    "money back", "no refund", "won't refund", "took my money",
)


def _strip_html(text):
    text = re.sub(r"<[^>]+>", "", text)
    return html_lib.unescape(text).strip()


# ---------------------------------------------------------------------------
# Search providers
# ---------------------------------------------------------------------------

def _search_serper(query, api_key):
    resp = requests.post(
        "https://google.serper.dev/search",
        headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
        json={"q": query, "num": 10},
        timeout=SEARCH_TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()
    results = []
    for item in data.get("organic", []):
        results.append({
            "title": item.get("title", ""),
            "snippet": item.get("snippet", ""),
            "url": item.get("link", ""),
        })
    return results


def _search_brave(query, api_key):
    resp = requests.get(
        "https://api.search.brave.com/res/v1/web/search",
        headers={"X-Subscription-Token": api_key,
                 "Accept": "application/json"},
        params={"q": query, "count": 10},
        timeout=SEARCH_TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()
    results = []
    for item in data.get("web", {}).get("results", []):
        results.append({
            "title": item.get("title", ""),
            "snippet": item.get("description", ""),
            "url": item.get("url", ""),
        })
    return results


def _decode_ddg_href(href):
    """DuckDuckGo wraps external links as /l/?uddg=<encoded-real-url>."""
    if "uddg=" in href:
        frag = href.split("uddg=", 1)[1].split("&", 1)[0]
        return unquote(frag)
    if href.startswith("//"):
        return "https:" + href
    return href


def _search_duckduckgo(query):
    headers = {"User-Agent": USER_AGENT,
               "Accept-Language": "en-US,en;q=0.9"}
    for endpoint in ("https://html.duckduckgo.com/html/",
                     "https://lite.duckduckgo.com/lite/"):
        try:
            resp = requests.post(endpoint, data={"q": query},
                                 headers=headers, timeout=SEARCH_TIMEOUT)
            resp.raise_for_status()
        except requests.RequestException:
            continue
        results = _parse_ddg_html(resp.text)
        if results:
            return results
    # Keyless scraping can be silently blocked (challenge page with no
    # results) from cloud IPs. Return None ("unavailable") rather than an
    # empty list so a block never masquerades as "no web presence".
    return None


def _parse_ddg_html(page):
    results = []
    for m in re.finditer(
            r'<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
            page, re.S):
        results.append({
            "url": _decode_ddg_href(m.group(1)),
            "title": _strip_html(m.group(2)),
            "snippet": "",
        })
    snippets = re.findall(
        r'class="result__snippet"[^>]*>(.*?)</a>', page, re.S)
    for i, snip in enumerate(snippets):
        if i < len(results):
            results[i]["snippet"] = _strip_html(snip)

    if not results:  # lite endpoint: plain table of <a> result links
        for m in re.finditer(
                r'<a[^>]*class="result-link"[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
                page, re.S):
            results.append({
                "url": _decode_ddg_href(m.group(1)),
                "title": _strip_html(m.group(2)),
                "snippet": "",
            })
    return results


def run_search(query):
    """Dispatch to whichever provider is configured. Returns a list of
    result dicts, or None if the search could not be run at all."""
    serper = os.environ.get("SERPER_API_KEY")
    brave = os.environ.get("BRAVE_API_KEY")
    try:
        if serper:
            return _search_serper(query, serper)
        if brave:
            return _search_brave(query, brave)
        return _search_duckduckgo(query)
    except requests.RequestException:
        return None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Analysis
# ---------------------------------------------------------------------------

def _finding(severity, title, detail, points):
    return {"severity": severity, "title": title, "detail": detail,
            "points": points}


def analyze_search_results(reg_dom, results):
    """Turn raw search results into (findings, sources)."""
    if results is None:
        return ([_finding(
            "info", "Web reputation check unavailable",
            "An automated web search for this shop couldn't be completed "
            "right now, so its online reputation wasn't factored into the "
            "score. Try searching the shop's name plus 'scam' yourself.",
            0)], [])

    if not results:
        return ([_finding(
            "warning", "Almost no web presence",
            "A web search turned up virtually nothing about this site. "
            "Established shops usually have reviews, listings or mentions; "
            "a blank footprint is common for brand-new throwaway scam "
            "shops.", 8)], [])

    sld = reg_dom.split(".")[0]
    scam_sources = []
    platform_clean = []
    wiki = False
    seen = set()
    sources = []

    def add_source(r):
        u = r.get("url", "")
        if not u or u in seen:
            return
        seen.add(u)
        host = (urlparse(u).hostname or "").replace("www.", "")
        sources.append({"title": r.get("title") or host, "url": u,
                        "site": host})

    for r in results[:12]:
        host = (urlparse(r.get("url", "")).hostname or "").lower()
        text = (r.get("title", "") + " " + r.get("snippet", "")).lower()
        neg = [k for k in SCAM_KEYWORDS if k in text]
        platform = next((p for p in REPUTATION_PLATFORMS if p in host), None)
        if "wikipedia.org" in host:
            wiki = True
        if platform:
            if neg:
                scam_sources.append(r)
            else:
                platform_clean.append(r)
        elif neg and (sld in text or reg_dom in text):
            scam_sources.append(r)

    for r in scam_sources:
        add_source(r)
    for r in platform_clean:
        add_source(r)
    sources = sources[:5]

    findings = []
    if len(scam_sources) >= 2 or any(
            next((p for p in REPUTATION_PLATFORMS
                  if p in (urlparse(r.get("url", "")).hostname or "").lower()),
                 None)
            for r in scam_sources):
        findings.append(_finding(
            "danger", "Scam reports found online",
            "A web search surfaced pages describing this site as a scam or "
            "reporting problems (fake goods, orders never arriving, no "
            "refunds). See the sources below and read them before ordering.",
            25))
    elif scam_sources:
        findings.append(_finding(
            "warning", "Possible scam mentions online",
            "A web search found at least one page linking this site to scam "
            "or complaint language. It's not conclusive, so read the source "
            "and look for more reviews before paying.", 12))
    elif platform_clean:
        findings.append(_finding(
            "good", "Reviewed online with no scam reports",
            "This site shows up on independent review platforms and the "
            "search found no scam or fraud reports. Reassuring, though you "
            "should still skim the reviews yourself.", -8))
    elif wiki:
        findings.append(_finding(
            "good", "Recognized, established website",
            "This site has a Wikipedia entry / broad web presence, which "
            "throwaway scam shops never do.", -10))
    else:
        findings.append(_finding(
            "info", "No scam reports found online",
            "A web search found some mentions of this site but no scam or "
            "fraud reports. Absence of complaints isn't proof it's safe, "
            "but it's a mildly good sign.", 0))

    return findings, sources


def web_reputation(reg_dom):
    """Public entry point: search the web about reg_dom and return
    (findings, sources). Never raises."""
    try:
        query = f"{reg_dom} reviews scam legit safe"
        results = run_search(query)
        return analyze_search_results(reg_dom, results)
    except Exception:
        return ([_finding(
            "info", "Web reputation check unavailable",
            "An automated web search for this shop couldn't be completed "
            "right now, so its online reputation wasn't factored in.",
            0)], [])
