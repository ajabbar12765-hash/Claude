"""Core analysis engine for Scam Shield.

Given a URL, runs a series of offline heuristics (URL structure, brand
impersonation, lookalike domains) and live checks (DNS, HTTPS, domain age
via RDAP, page content) and produces a scored list of findings plus an
overall verdict.

Every finding is a dict:
    {"severity": "danger"|"warning"|"info"|"good",
     "title": str, "detail": str, "points": int}

Positive signals carry negative points. The final risk score is clamped
to 0-100.
"""

import ipaddress
import re
import socket
from datetime import datetime, timezone
from html import unescape as html_unescape
from urllib.parse import urlparse, parse_qs, unquote

import requests

from websearch import web_reputation

FETCH_TIMEOUT = 12
RDAP_TIMEOUT = 10
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)

# TLDs that are cheap/free and disproportionately used by scam shops.
SUSPICIOUS_TLDS = {
    "top", "xyz", "icu", "cfd", "sbs", "rest", "bond", "buzz", "cyou",
    "click", "quest", "monster", "beauty", "hair", "skin", "makeup",
    "boats", "mom", "lol", "work", "zip", "shop", "store", "online",
    "site", "space", "website", "fun", "pw", "tk", "ml", "ga", "cf", "gq",
}
# TLDs in this set are only mildly suspicious on their own (many legit
# shops use them), so they score lower than the rest.
MILD_TLDS = {"shop", "store", "online", "site"}

URL_SHORTENERS = {
    "bit.ly", "tinyurl.com", "t.co", "cutt.ly", "goo.gl", "is.gd",
    "rebrand.ly", "s.id", "rb.gy", "ow.ly", "buff.ly", "shorturl.at",
    "tiny.cc", "t.ly", "linktr.ee",
}

# Ad/social redirect wrappers: extract the real destination before analysis.
REDIRECT_WRAPPERS = {
    "l.facebook.com": "u",
    "lm.facebook.com": "u",
    "l.instagram.com": "u",
    "l.messenger.com": "u",
    "away.vk.com": "to",
    "www.google.com": "q",       # /url?q=
    "google.com": "q",
    "googleadservices.com": "adurl",
    "www.googleadservices.com": "adurl",
    "href.li": None,             # target is in the fragment/query as-is
}

# Well-known brands scammers imitate, mapped to their official domains.
KNOWN_BRANDS = {
    "amazon": ["amazon.com", "amazon.co.uk", "amazon.de", "amazon.in", "amazon.ae"],
    "ebay": ["ebay.com", "ebay.co.uk"],
    "walmart": ["walmart.com"],
    "nike": ["nike.com"],
    "adidas": ["adidas.com"],
    "apple": ["apple.com"],
    "samsung": ["samsung.com"],
    "paypal": ["paypal.com"],
    "netflix": ["netflix.com"],
    "daraz": ["daraz.pk", "daraz.com", "daraz.lk", "daraz.com.bd", "daraz.com.np"],
    "alibaba": ["alibaba.com"],
    "aliexpress": ["aliexpress.com", "aliexpress.us"],
    "temu": ["temu.com"],
    "shein": ["shein.com"],
    "zara": ["zara.com"],
    "ikea": ["ikea.com"],
    "rolex": ["rolex.com"],
    "gucci": ["gucci.com"],
    "louisvuitton": ["louisvuitton.com"],
    "fedex": ["fedex.com"],
    "dhl": ["dhl.com"],
    "ups": ["ups.com"],
    "costco": ["costco.com"],
    "target": ["target.com"],
    "bestbuy": ["bestbuy.com"],
    "flipkart": ["flipkart.com"],
    "noon": ["noon.com"],
}

# Common multi-part public suffixes so we can find the registrable domain
# without pulling in the full public-suffix list.
TWO_PART_SUFFIXES = {
    "co.uk", "org.uk", "ac.uk", "gov.uk", "com.au", "net.au", "org.au",
    "com.pk", "net.pk", "org.pk", "edu.pk", "gov.pk", "com.bd", "com.np",
    "co.in", "com.in", "net.in", "org.in", "co.nz", "com.sg", "com.my",
    "com.ph", "co.za", "com.br", "com.mx", "com.ar", "com.tr", "com.eg",
    "com.sa", "com.cn", "com.hk", "co.jp", "co.kr", "com.tw", "com.vn",
}

URGENCY_PHRASES = [
    "hurry", "limited time", "today only", "ends today", "last chance",
    "closing down", "going out of business", "store closing", "final sale",
    "clearance sale", "only a few left", "selling fast", "flash sale",
    "act now", "don't miss out", "while stocks last", "while supplies last",
]

PRIZE_PHRASES = [
    "you have been selected", "you've been selected", "congratulations you",
    "claim your prize", "you are a winner", "you're a winner", "free gift",
    "spin the wheel", "claim your reward",
]

RISKY_PAYMENT_PHRASES = [
    "western union", "moneygram", "gift card only", "gift cards only",
    "wire transfer only", "bank transfer only", "bitcoin only",
    "crypto only", "pay with bitcoin", "zelle only", "cash app only",
]

TRUSTED_PAYMENT_MARKERS = [
    "visa", "mastercard", "paypal", "stripe", "klarna", "american express",
    "apple pay", "google pay", "shop pay", "afterpay", "cash on delivery",
]

TRUST_PAGE_MARKERS = [
    ("return policy", ["return policy", "returns policy", "refund policy",
                       "returns & refunds", "returns and refunds"]),
    ("contact information", ["contact us", "contact-us", "customer service",
                             "customer support", "get in touch"]),
    ("terms & privacy pages", ["privacy policy", "terms of service",
                               "terms and conditions", "terms & conditions"]),
]

DEEP_DISCOUNT_RE = re.compile(r"\b([5-9][0-9])\s*%\s*off\b", re.IGNORECASE)
PHONE_RE = re.compile(r"(\+?\d[\d\s().-]{8,}\d)")
EMAIL_RE = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")


def finding(severity, title, detail, points):
    return {"severity": severity, "title": title, "detail": detail,
            "points": points}


def normalize_url(raw):
    """Clean up user input into a parseable URL."""
    url = raw.strip()
    if not url:
        raise ValueError("Please paste a link to check.")
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", url):
        url = "https://" + url
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError(f"Unsupported link type '{parsed.scheme}:'. "
                         "Paste a normal web address (http/https).")
    if not parsed.hostname:
        raise ValueError("That doesn't look like a valid web address.")
    return url, parsed


def unwrap_redirect(url, parsed):
    """If the URL is a Facebook/Instagram/Google ad redirect, pull out the
    real destination so we analyze the shop, not the wrapper."""
    host = (parsed.hostname or "").lower()
    param = REDIRECT_WRAPPERS.get(host)
    if host not in REDIRECT_WRAPPERS:
        return url, parsed, False
    qs = parse_qs(parsed.query)
    if param and param in qs and qs[param]:
        target = unquote(qs[param][0])
        try:
            new_url, new_parsed = normalize_url(target)
            return new_url, new_parsed, True
        except ValueError:
            pass
    return url, parsed, False


def registrable_domain(hostname):
    """Best-effort registrable domain (example.co.uk from shop.example.co.uk)."""
    labels = hostname.lower().rstrip(".").split(".")
    if len(labels) <= 2:
        return hostname.lower()
    last_two = ".".join(labels[-2:])
    if last_two in TWO_PART_SUFFIXES and len(labels) >= 3:
        return ".".join(labels[-3:])
    return last_two


def is_ip_address(hostname):
    try:
        ipaddress.ip_address(hostname)
        return True
    except ValueError:
        return False


def levenshtein_leq1(a, b):
    """True if edit distance between a and b is exactly 1."""
    if a == b:
        return False
    la, lb = len(a), len(b)
    if abs(la - lb) > 1:
        return False
    if la > lb:
        a, b, la, lb = b, a, lb, la
    # la <= lb, differ by 0 or 1
    i = j = diffs = 0
    while i < la and j < lb:
        if a[i] == b[j]:
            i += 1
            j += 1
            continue
        diffs += 1
        if diffs > 1:
            return False
        if la == lb:
            i += 1
        j += 1
    diffs += (lb - j) + (la - i)
    return diffs == 1


# ---------------------------------------------------------------------------
# Offline checks
# ---------------------------------------------------------------------------

def check_url_structure(parsed, findings):
    host = (parsed.hostname or "").lower()
    reg_dom = registrable_domain(host)
    sld = reg_dom.split(".")[0]

    if parsed.scheme == "http":
        findings.append(finding(
            "danger", "No secure connection (HTTP)",
            "The link uses plain HTTP. Anything you type, including card "
            "details, can be read in transit. Legitimate shops always use "
            "HTTPS.", 20))

    if is_ip_address(host):
        findings.append(finding(
            "danger", "Website address is a raw IP number",
            f"The link points to {host} instead of a named website. Real "
            "shops don't do this; scam and phishing pages often do.", 30))
        return reg_dom

    if host.startswith("xn--") or ".xn--" in host:
        findings.append(finding(
            "danger", "Disguised lookalike characters in address",
            "The address uses international characters that can imitate "
            "letters of a well-known brand (e.g. 'аmazon' with a Cyrillic "
            "'а'). This is a classic phishing trick.", 35))

    if host in URL_SHORTENERS:
        findings.append(finding(
            "warning", "Shortened link hides the real destination",
            f"{host} is a link shortener, so you can't see where it really "
            "goes. Expand it first (paste it into a link-expander) or avoid "
            "it.", 15))

    tld = host.rsplit(".", 1)[-1]
    if tld in SUSPICIOUS_TLDS:
        pts = 6 if tld in MILD_TLDS else 15
        sev = "info" if tld in MILD_TLDS else "warning"
        findings.append(finding(
            sev, f"Domain ends in '.{tld}'",
            f"The '.{tld}' ending is cheap to register and shows up in scam "
            "shops far more often than in established stores. Not proof of a "
            "scam on its own, but worth extra caution.", pts))

    hyphens = sld.count("-")
    digits = sum(c.isdigit() for c in sld)
    if hyphens >= 3 or digits >= 4:
        findings.append(finding(
            "warning", "Oddly constructed domain name",
            f"The domain '{reg_dom}' has an unusual mix of hyphens/numbers, "
            "a pattern common in throwaway scam domains.", 10))
    if len(host) > 45:
        findings.append(finding(
            "warning", "Unusually long web address",
            "Very long addresses are often used to bury a fake brand name "
            "where you won't notice it.", 8))

    # Brand impersonation: brand name in the host but not on the brand's
    # own domain, or a one-letter typo of a brand.
    host_compact = host.replace("-", "").replace(".", "")
    for brand, official in KNOWN_BRANDS.items():
        if reg_dom in official:
            findings.append(finding(
                "good", f"This is the official {brand.title()} domain",
                f"'{reg_dom}' is {brand.title()}'s real website address.",
                -25))
            break
        brand_in_host = brand in host_compact
        typo_of_brand = levenshtein_leq1(sld, brand)
        if brand_in_host or typo_of_brand:
            how = ("contains the brand name" if brand_in_host
                   else "is one letter away from the brand name")
            findings.append(finding(
                "danger", f"Pretends to be {brand.title()}",
                f"The address {how} '{brand}', but the real site is "
                f"{official[0]}. Fake-brand domains are one of the most "
                "common scam-ad tricks.", 35))
            break

    # Brand-as-subdomain trick: amazon.com.cheap-deals.top
    labels = host.split(".")
    reg_labels = reg_dom.split(".")
    subdomain_part = ".".join(labels[:len(labels) - len(reg_labels)])
    for brand in KNOWN_BRANDS:
        if brand in subdomain_part.replace("-", "."):
            findings.append(finding(
                "danger", "Brand name hidden in the subdomain",
                f"'{brand}' appears at the start of the address, but the "
                f"site actually belongs to '{reg_dom}'. Scammers put a "
                "famous name up front hoping you won't read the whole "
                "address.", 35))
            break

    return reg_dom


# ---------------------------------------------------------------------------
# Live checks
# ---------------------------------------------------------------------------

def check_dns(hostname, findings):
    try:
        socket.getaddrinfo(hostname, None)
        return True
    except socket.gaierror:
        findings.append(finding(
            "danger", "Website does not exist right now",
            f"'{hostname}' does not resolve to any server. The site may "
            "already have been taken down — scam shops often vanish within "
            "weeks.", 25))
        return False


def check_domain_age(reg_dom, findings):
    """Look up registration date via RDAP (free, no API key)."""
    try:
        resp = requests.get(
            f"https://rdap.org/domain/{reg_dom}",
            timeout=RDAP_TIMEOUT,
            headers={"Accept": "application/rdap+json",
                     "User-Agent": USER_AGENT},
        )
        if resp.status_code == 404:
            findings.append(finding(
                "warning", "Domain not found in public registry",
                "The public registration database has no record of this "
                "domain, so its age could not be verified.", 5))
            return
        resp.raise_for_status()
        data = resp.json()
    except (requests.RequestException, ValueError):
        findings.append(finding(
            "info", "Could not check domain age",
            "The public registration database did not respond, so the "
            "domain's age is unknown.", 0))
        return

    reg_date = None
    for event in data.get("events", []):
        if event.get("eventAction") == "registration":
            try:
                reg_date = datetime.fromisoformat(
                    event.get("eventDate", "").replace("Z", "+00:00"))
            except ValueError:
                pass
            break
    if reg_date is None:
        findings.append(finding(
            "info", "Domain age unknown",
            "The registry record does not reveal when this domain was "
            "created.", 0))
        return

    age_days = (datetime.now(timezone.utc) - reg_date).days
    created = reg_date.strftime("%B %Y")
    if age_days < 90:
        findings.append(finding(
            "danger", f"Brand-new website (registered {created})",
            f"This domain is only about {age_days} days old. The vast "
            "majority of scam shops advertised on social media use domains "
            "under 3 months old, so they can disappear before complaints "
            "pile up.", 30))
    elif age_days < 365:
        findings.append(finding(
            "warning", f"Young website (registered {created})",
            f"This domain is about {age_days // 30} months old. Young "
            "doesn't mean fraudulent, but most scam shops are under a year "
            "old — check reviews before paying.", 12))
    elif age_days > 5 * 365:
        findings.append(finding(
            "good", f"Long-established domain (registered {created})",
            f"This domain has existed for over {age_days // 365} years. "
            "Scam shops almost never survive that long.", -15))
    else:
        findings.append(finding(
            "good", f"Domain registered {created}",
            f"About {age_days // 365} year(s) old — past the typical "
            "lifespan of a throwaway scam domain.", -5))


def fetch_page(url, findings):
    """Fetch the page; report TLS/redirect problems. Returns (html, final_url)."""
    try:
        resp = requests.get(
            url, timeout=FETCH_TIMEOUT, headers={"User-Agent": USER_AGENT},
            allow_redirects=True)
    except requests.exceptions.SSLError:
        findings.append(finding(
            "danger", "Broken or invalid security certificate",
            "The site's HTTPS certificate failed verification. Do not enter "
            "personal or payment details on this site.", 30))
        return None, url
    except requests.RequestException as exc:
        findings.append(finding(
            "warning", "Could not load the page",
            f"The site did not respond normally ({exc.__class__.__name__}). "
            "The page content could not be inspected.", 5))
        return None, url

    if resp.status_code >= 400:
        findings.append(finding(
            "warning", f"Page returned an error (HTTP {resp.status_code})",
            "The advertised page is missing or blocked — common once a scam "
            "campaign has been taken down.", 8))
        return None, resp.url

    start = registrable_domain(urlparse(url).hostname or "")
    end = registrable_domain(urlparse(resp.url).hostname or "")
    if start and end and start != end:
        findings.append(finding(
            "warning", f"Link silently redirects to a different site",
            f"You start at '{start}' but end up on '{end}'. Redirect chains "
            "like this are used to slip past ad-platform reviews.", 15))
    if resp.url.startswith("http://"):
        findings.append(finding(
            "danger", "Final page is not encrypted",
            "After redirects, the page loads over plain HTTP. Never enter "
            "card details here.", 20))
    return resp.text, resp.url


# Cap on how much of the page's visible text we keep to feed the AI Q&A.
PAGE_EXCERPT_CHARS = 6000


def extract_page_text(html):
    """Return (title, cleaned_visible_text) from raw HTML.

    Strips scripts/styles/tags and collapses whitespace so the AI Q&A can
    read what the site actually says (products, contact info, policies,
    payment methods) rather than only the summarized findings."""
    if not html:
        return "", ""
    title = ""
    m = re.search(r"<title[^>]*>(.*?)</title>", html,
                  flags=re.DOTALL | re.IGNORECASE)
    if m:
        title = html_unescape(
            re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", m.group(1)))).strip()
    body = re.sub(r"<script.*?</script>|<style.*?</style>|<!--.*?-->", " ",
                  html, flags=re.DOTALL | re.IGNORECASE)
    body = re.sub(r"<[^>]+>", " ", body)
    body = html_unescape(body)
    body = re.sub(r"\s+", " ", body).strip()
    return title[:300], body[:PAGE_EXCERPT_CHARS]


def check_page_content(html, findings):
    text = re.sub(r"<script.*?</script>|<style.*?</style>", " ", html,
                  flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text_lower = re.sub(r"\s+", " ", text).lower()
    html_lower = html.lower()

    hits = [p for p in URGENCY_PHRASES if p in text_lower]
    if len(hits) >= 2:
        findings.append(finding(
            "warning", "Heavy pressure tactics on the page",
            "The page pushes urgency (" + ", ".join(f"'{h}'" for h in hits[:4])
            + "). Manufactured time pressure is the number-one tactic in "
            "scam ads — real stores rarely need it.", 15))
    elif len(hits) == 1:
        findings.append(finding(
            "info", "Some urgency language on the page",
            f"The page uses '{hits[0]}'. Mild on its own, but combined with "
            "other flags it fits the scam-ad pattern.", 5))

    discounts = DEEP_DISCOUNT_RE.findall(text_lower)
    big = [d for d in discounts if int(d) >= 70]
    if big:
        findings.append(finding(
            "warning", f"Too-good-to-be-true discounts ({max(big)}% off)",
            "Discounts of 70-90% on brand goods are the classic bait in "
            "fake-shop ads. If the price looks impossible, it usually is.",
            15))

    prize_hits = [p for p in PRIZE_PHRASES if p in text_lower]
    if prize_hits:
        findings.append(finding(
            "danger", "Prize / giveaway bait detected",
            f"The page says things like '{prize_hits[0]}'. 'You've won' "
            "pages exist to harvest your card details or sign you up for "
            "hidden subscriptions.", 30))

    risky_pay = [p for p in RISKY_PAYMENT_PHRASES if p in text_lower]
    if risky_pay:
        findings.append(finding(
            "danger", "Asks for untraceable payment",
            f"The page mentions '{risky_pay[0]}'. Wire transfers, gift "
            "cards and crypto have no buyer protection — no legitimate shop "
            "requires them.", 35))

    trusted = [m for m in TRUSTED_PAYMENT_MARKERS if m in text_lower]
    if trusted:
        findings.append(finding(
            "good", "Mentions mainstream payment methods",
            "The page references " + ", ".join(trusted[:4]) + ". Card and "
            "PayPal payments can be disputed if the goods never arrive. "
            "(Note: scam sites can also display these logos falsely.)", -5))

    missing = []
    present = []
    for label, markers in TRUST_PAGE_MARKERS:
        if any(m in text_lower or m.replace(" ", "-") in html_lower
               for m in markers):
            present.append(label)
        else:
            missing.append(label)
    has_contact_detail = bool(EMAIL_RE.search(text)) or bool(
        PHONE_RE.search(text))
    if len(missing) >= 2 and not has_contact_detail:
        findings.append(finding(
            "warning", "No way to contact the seller",
            "The page shows no " + " or ".join(missing) + " and no email or "
            "phone number. If something goes wrong with an order, you'd "
            "have no recourse.", 15))
    elif len(present) == len(TRUST_PAGE_MARKERS):
        findings.append(finding(
            "good", "Has contact, returns and policy pages",
            "The site links to contact, returns and privacy/terms pages — "
            "basic hygiene that throwaway scam shops usually skip.", -8))

    if "countdown" in html_lower and ("timer" in html_lower
                                      or "expire" in html_lower):
        findings.append(finding(
            "warning", "Countdown timer on the page",
            "A ticking countdown is manufactured pressure. On scam shops "
            "the timer resets every visit.", 10))


# ---------------------------------------------------------------------------
# Verdict
# ---------------------------------------------------------------------------

def verdict_for(score, findings):
    dangers = sum(1 for f in findings if f["severity"] == "danger")
    if score >= 60 or dangers >= 2:
        return ("high-risk", "High risk — do not order",
                "This link shows multiple strong scam signals. Ordering or "
                "entering card details here is very likely to end badly.")
    if score >= 30 or dangers == 1:
        return ("suspicious", "Suspicious — be very careful",
                "This link shows real warning signs. Before ordering, search "
                "the shop's name plus the word 'scam', look for independent "
                "reviews, and never pay by bank transfer.")
    if score >= 12:
        return ("caution", "Mixed signals — do some homework",
                "Nothing damning was found, but there are a few yellow "
                "flags. Check independent reviews and pay with a method "
                "that offers buyer protection.")
    return ("low-risk", "No major red flags found",
            "This check found no strong scam signals. That is not a "
            "guarantee — no automated tool can promise a site is safe — but "
            "nothing here matches the usual scam-ad patterns. Still pay "
            "with a protected method (card or PayPal).")


def analyze(raw_url, live=True, web_search=True):
    url, parsed = normalize_url(raw_url)
    findings = []
    sources = []

    url, parsed, unwrapped = unwrap_redirect(url, parsed)
    if unwrapped:
        findings.append(finding(
            "info", "Ad redirect unwrapped",
            f"The link was a social-media/ad redirect; the real destination "
            f"is {parsed.hostname}. The analysis below is for that site.",
            0))

    host = (parsed.hostname or "").lower()
    reg_dom = check_url_structure(parsed, findings)

    resolvable = True
    page_title = ""
    page_text = ""
    if live:
        resolvable = check_dns(host, findings)
        if resolvable and not is_ip_address(host):
            check_domain_age(reg_dom, findings)
        if resolvable:
            html, final_url = fetch_page(url, findings)
            if html:
                check_page_content(html, findings)
                page_title, page_text = extract_page_text(html)
        if web_search and not is_ip_address(host):
            rep_findings, sources = web_reputation(reg_dom)
            findings.extend(rep_findings)

    score = max(0, min(100, sum(f["points"] for f in findings)))
    level, title, advice = verdict_for(score, findings)

    severity_rank = {"danger": 0, "warning": 1, "info": 2, "good": 3}
    findings.sort(key=lambda f: (severity_rank[f["severity"]], -f["points"]))

    return {
        "url": url,
        "domain": reg_dom,
        "score": score,
        "verdict": {"level": level, "title": title, "advice": advice},
        "findings": findings,
        "sources": sources,
        "page_title": page_title,
        "page_text": page_text,
    }
