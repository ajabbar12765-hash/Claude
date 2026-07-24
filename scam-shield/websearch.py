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

IMPORTANT: sites like ScamAdviser / ScamDoc / Scam-Detector auto-generate
a page titled "Is <domain> a scam?" for EVERY domain that exists. The mere
word "scam" on such a page is not a complaint. So we only treat genuine
complaint language (never received, took my money, do not buy, ...) as a
scam signal, and we ignore the neutral "is it a scam / scam or legit"
checker phrasing.
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

# Real user-review / complaint sites: a complaint here is meaningful, and a
# clean listing here is mildly reassuring.
REVIEW_PLATFORMS = (
    "trustpilot", "sitejabber", "reddit", "bbb.org", "quora",
    "trustedreviews", "complaintsboard", "ripoffreport",
)

# Automated "scam checker" aggregators. They publish a page for every domain
# on earth, so a *clean* result here means little; only a genuine complaint
# phrase on one of these counts.
CHECKER_AGGREGATORS = (
    "scamadviser", "scamdoc", "scam-detector", "scamminder", "gridinsoft",
    "urlvoid", "mywot", "web.paranoid", "malwaretips", "scamwatch",
)

# Actual complaint / fraud language. Deliberately does NOT include the bare
# words "scam", "fake" or "legit", which appear on every auto-checker page.
STRONG_SCAM_PHRASES = (
    "do not buy", "don't buy", "do not order", "don't order",
    "never received", "did not receive", "didn't receive", "never got my",
    "did not arrive", "didn't arrive", "never arrived", "never delivered",
    "never shipped", "order never", "took my money", "stole my", "money stolen",
    "chargeback", "charged me", "won't refund", "wouldn't refund", "no refund",
    "never refund", "refused to refund", "ripoff", "rip-off", "rip off",
    "scammed", "i was scammed", "got scammed", "is a scam", "it's a scam",
    "its a scam", "total scam", "complete scam", "obvious scam",
    "confirmed scam", "known scam", "reported scam", "definitely a scam",
    "this is a scam", "avoid this", "avoid at all", "stay away", "steer clear",
    "counterfeit", "fake products", "fake goods", "fake store", "fake site",
    "fake website", "fraudulent", "phishing", "waste of money", "lost my money",
    "they stole", "beware", "do not trust", "don't trust", "not trustworthy",
)

# Neutral phrasing found on auto-generated checker/review pages. Stripped out
# before we look for complaint phrases, so "is it a scam" never counts.
NEUTRAL_CHECKER_PHRASES = (
    "is it a scam", "is it legit", "is it safe", "is it real",
    "scam or legit", "scam or not", "legit or scam", "scam or trustworthy",
    "scam check", "scam detector", "scam checker", "check website",
    "website review", "reviews & ratings", "reviews and ratings",
    "trust score", "trustscore", "safety score", "how to recognize",
    "is this website", "is this site", "should i buy from",
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


def _complaint_phrases(text_lower):
    """Return the genuine complaint phrases in the text, after removing the
    neutral 'is it a scam / scam checker' phrasing that appears on every
    auto-generated checker page."""
    cleaned = text_lower
    for phrase in NEUTRAL_CHECKER_PHRASES:
        cleaned = cleaned.replace(phrase, " ")
    return [p for p in STRONG_SCAM_PHRASES if p in cleaned]


def analyze_search_results(reg_dom, results):
    """Turn raw search results into (findings, sources)."""
    if results is None:
        return ([_finding(
            "info", "Web reputation check unavailable",
            "An automated web search for this shop couldn't be completed "
            "right now, so its online reputation wasn't factored into the "
            "score. Try searching the shop's name plus 'reviews' yourself.",
            0)], [])

    if not results:
        return ([_finding(
            "warning", "Almost no web presence",
            "A web search turned up virtually nothing about this site. "
            "Established shops usually have reviews, listings or mentions; "
            "a blank footprint is common for brand-new throwaway scam "
            "shops.", 8)], [])

    sld = reg_dom.split(".")[0]
    complaint_sources = []   # non-checker results with genuine complaints
    review_clean = []        # real review sites, no complaints found
    checker_pages = []       # auto-checker aggregator pages (display only)
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
        url_l = (r.get("url", "") or "").lower()
        host = (urlparse(url_l).hostname or "")
        text = (r.get("title", "") + " " + r.get("snippet", "")).lower()
        is_review = any(p in host for p in REVIEW_PLATFORMS)
        is_checker = any(p in host for p in CHECKER_AGGREGATORS)
        complaints = _complaint_phrases(text)
        # Only count a result if it is actually ABOUT this domain: the domain
        # must appear in the result URL or in the title/snippet text. A generic
        # Trustpilot/BBB/ScamDoc homepage that doesn't name the site is noise.
        mentions_site = (reg_dom in url_l or reg_dom in text
                         or (len(sld) >= 5 and sld in text))
        if "wikipedia.org" in host:
            wiki = True
        if is_checker:
            # Auto-checkers publish a page for every domain; never a complaint
            # signal on their own. Keep as a display-only source if on-topic.
            if mentions_site:
                checker_pages.append(r)
            continue
        if complaints and mentions_site:
            complaint_sources.append((r, is_review))
        elif is_review and mentions_site:
            review_clean.append(r)

    for r, _ in complaint_sources:
        add_source(r)
    for r in review_clean:
        add_source(r)
    for r in checker_pages:
        add_source(r)
    sources = sources[:5]

    strong_on_review = any(is_rev for _, is_rev in complaint_sources)
    n = len(complaint_sources)

    findings = []
    if n >= 2 or strong_on_review:
        findings.append(_finding(
            "danger", "Scam complaints found online",
            "A web search surfaced pages with real complaints about this "
            "site (orders never arriving, no refunds, fake goods, or people "
            "saying they were scammed). Read the sources below before "
            "ordering.", 22))
    elif n == 1:
        findings.append(_finding(
            "warning", "A possible complaint online",
            "A web search found one page with complaint-style wording about "
            "this site. It's not conclusive on its own — read it and look "
            "for more reviews before paying.", 10))
    elif review_clean:
        findings.append(_finding(
            "good", "Reviewed online, no complaints found",
            "This site appears on genuine review platforms and the search "
            "found no complaint or scam reports. Reassuring, though you "
            "should still skim the reviews yourself.", -8))
    elif wiki:
        findings.append(_finding(
            "good", "Recognized, established website",
            "This site has a Wikipedia entry / broad web presence, which "
            "throwaway scam shops never do.", -10))
    else:
        findings.append(_finding(
            "info", "No scam complaints found online",
            "A web search found mentions of this site (including automatic "
            "'is it a scam?' checker pages, which exist for every website) "
            "but no genuine complaints. Absence of complaints isn't proof "
            "it's safe, but nothing bad turned up.", 0))

    return findings, sources


def web_reputation(reg_dom):
    """Public entry point: search the web about reg_dom and return
    (findings, sources). Never raises."""
    try:
        # Neutral query: "reviews complaints" surfaces both real reviews and
        # genuine complaint threads, without the word "scam" biasing results
        # toward auto-generated scam-checker template pages.
        query = f"{reg_dom} reviews complaints"
        results = run_search(query)
        return analyze_search_results(reg_dom, results)
    except Exception:
        return ([_finding(
            "info", "Web reputation check unavailable",
            "An automated web search for this shop couldn't be completed "
            "right now, so its online reputation wasn't factored in.",
            0)], [])
