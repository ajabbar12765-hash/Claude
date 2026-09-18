"""Phishing/scam-email analysis for Scam Shield.

Given raw pasted email text (headers + body, or body-only), extracts the
sender, subject and any links, then runs the same kind of offline heuristics
as the website checker: sender/brand impersonation, lookalike sender
domains, urgency and prize-scam phrasing, credential-harvesting language,
risky-payment requests and suspicious links in the body.

Returns the SAME result shape as analyzer.analyze() ({url, domain, score,
verdict, findings, sources, page_title, page_text}) so the existing
frontend rendering and the AI Ask box work unchanged for either a website
or an email check.
"""

import re

from analyzer import (
    EMAIL_RE,
    KNOWN_BRANDS,
    URGENCY_PHRASES,
    PRIZE_PHRASES,
    RISKY_PAYMENT_PHRASES,
    finding,
    levenshtein_leq1,
    normalize_url,
    registrable_domain,
)

MAX_EMAIL_CHARS = 20000

# Free webmail providers: legitimate on their own, but a red flag when the
# sender is also claiming to be a well-known company.
FREE_MAIL_DOMAINS = {
    "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "live.com",
    "aol.com", "icloud.com", "protonmail.com", "mail.com", "gmx.com",
    "yandex.com", "zoho.com",
}

CREDENTIAL_PHRASES = [
    "verify your account", "verify your identity", "confirm your account",
    "confirm your password", "update your billing", "update your payment",
    "your account will be suspended", "your account has been suspended",
    "your account will be locked", "unusual activity", "unusual sign-in",
    "unusual login", "suspicious activity detected", "click here to verify",
    "click the link below to verify", "reset your password",
    "your account has been limited", "confirm your identity",
    "validate your account", "re-activate your account",
    "reactivate your account", "security alert", "immediate action required",
    "your payment could not be processed", "failed delivery attempt",
    "package could not be delivered", "confirm your details",
    "provide your social security", "provide your ssn", "provide your cnic",
    "enter your pin", "enter your otp", "share your otp", "one time password",
]

GENERIC_GREETINGS = [
    "dear customer", "dear valued customer", "dear user", "dear account holder",
    "dear sir/madam", "dear member", "attention customer", "dear winner",
]

ATTACHMENT_RISK_RE = re.compile(
    r"\.(exe|scr|bat|cmd|js|vbs|jar|zip|iso|msi)\b", re.IGNORECASE)

URL_IN_TEXT_RE = re.compile(r"https?://[^\s<>\"')\]]+", re.IGNORECASE)

HEADER_FROM_RE = re.compile(r"^from\s*:\s*(.+)$", re.IGNORECASE | re.MULTILINE)
HEADER_SUBJECT_RE = re.compile(r"^subject\s*:\s*(.+)$", re.IGNORECASE | re.MULTILINE)
HEADER_REPLYTO_RE = re.compile(r"^reply-to\s*:\s*(.+)$", re.IGNORECASE | re.MULTILINE)
DISPLAY_NAME_RE = re.compile(r'^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$')


def _split_display_and_address(header_value):
    """'"Amazon Support" <foo@bar.com>' -> ('Amazon Support', 'foo@bar.com').
    Falls back to (value, value) if it's a bare address, or ('', '') if no
    email address is present at all."""
    m = DISPLAY_NAME_RE.match(header_value.strip())
    if m:
        return m.group(1).strip(), m.group(2).strip()
    m2 = EMAIL_RE.search(header_value)
    if m2:
        return "", m2.group(0)
    return "", ""


def _extract_headers(raw_text):
    """Best-effort parse of From/Subject/Reply-To out of pasted email text.
    Works whether the user pasted full raw headers or just typed
    'From: ...' / 'Subject: ...' lines above the message body."""
    from_m = HEADER_FROM_RE.search(raw_text)
    subj_m = HEADER_SUBJECT_RE.search(raw_text)
    reply_m = HEADER_REPLYTO_RE.search(raw_text)

    sender_name, sender_addr = "", ""
    if from_m:
        sender_name, sender_addr = _split_display_and_address(from_m.group(1))
    if not sender_addr:
        # No 'From:' line found; fall back to the first email address
        # anywhere in the pasted text (covers a bare pasted address).
        any_addr = EMAIL_RE.search(raw_text)
        if any_addr:
            sender_addr = any_addr.group(0)

    subject = subj_m.group(1).strip() if subj_m else ""
    reply_to = ""
    if reply_m:
        _, reply_to = _split_display_and_address(reply_m.group(1))

    return sender_name, sender_addr, subject, reply_to


def _body_without_headers(raw_text):
    """Strip a leading block of 'Header: value' lines so phrase-matching
    runs on the message body, not on header text."""
    lines = raw_text.splitlines()
    i = 0
    header_re = re.compile(r"^[A-Za-z-]{2,20}\s*:\s")
    while i < len(lines) and (header_re.match(lines[i]) or not lines[i].strip()):
        i += 1
    body = "\n".join(lines[i:]) if i < len(lines) else raw_text
    return body if body.strip() else raw_text


def analyze_email(raw_text):
    """Analyze pasted email text for phishing/scam signals.

    Returns the same result shape as analyzer.analyze()."""
    text = (raw_text or "").strip()
    if not text:
        raise ValueError("Please paste the email's text to check.")
    text = text[:MAX_EMAIL_CHARS]

    findings = []
    sender_name, sender_addr, subject, reply_to = _extract_headers(text)
    body = _body_without_headers(text)
    body_lower = body.lower()
    full_lower = text.lower()

    sender_domain = ""
    if "@" in sender_addr:
        sender_domain = registrable_domain(sender_addr.rsplit("@", 1)[-1].lower())

    # ---- Sender / brand impersonation -------------------------------
    claimed_brand = None
    haystack = (sender_name + " " + subject + " " + body[:2000]).lower()
    haystack_compact = haystack.replace("-", "").replace(" ", "")
    for brand, official in KNOWN_BRANDS.items():
        if brand in haystack_compact:
            claimed_brand = (brand, official)
            break

    if claimed_brand:
        brand, official = claimed_brand
        if sender_domain and sender_domain not in official:
            if sender_domain in FREE_MAIL_DOMAINS:
                findings.append(finding(
                    "danger", f"Claims to be {brand.title()} but sent from "
                    f"a free email address",
                    f"This message presents itself as {brand.title()}, but "
                    f"it was sent from '{sender_domain}' — a free personal "
                    f"email provider, not {brand.title()}'s own domain "
                    f"({official[0]}). Real companies do not email customers "
                    "from Gmail/Yahoo/Outlook addresses.", 40))
            elif levenshtein_leq1(sender_domain.split(".")[0],
                                  official[0].split(".")[0]):
                findings.append(finding(
                    "danger", f"Sender domain is a lookalike of {brand.title()}",
                    f"'{sender_domain}' is one letter away from "
                    f"{official[0]}, {brand.title()}'s real domain. This is "
                    "a classic phishing trick.", 40))
            else:
                findings.append(finding(
                    "danger", f"Claims to be {brand.title()} from the wrong domain",
                    f"This message presents itself as {brand.title()}, but "
                    f"was sent from '{sender_domain}', not "
                    f"{official[0]}.", 35))
        elif sender_domain and sender_domain in official:
            findings.append(finding(
                "good", f"Sent from {brand.title()}'s real domain",
                f"The sender address matches {brand.title()}'s official "
                f"domain ({sender_domain}). Note: sender addresses can "
                "still be spoofed, so this alone isn't proof.", -15))

    if sender_addr and reply_to:
        reply_domain = registrable_domain(reply_to.rsplit("@", 1)[-1].lower()) \
            if "@" in reply_to else ""
        if reply_domain and sender_domain and reply_domain != sender_domain:
            findings.append(finding(
                "warning", "Reply-To address doesn't match the sender",
                f"Replies would go to '{reply_domain}', a different domain "
                f"than the sender address '{sender_domain}'. Scammers use "
                "this to redirect your reply away from the real company.",
                20))

    # ---- Language patterns -------------------------------------------
    urgency_hits = [p for p in URGENCY_PHRASES if p in body_lower]
    if urgency_hits:
        findings.append(finding(
            "warning", "Urgency pressure tactics",
            "The message pushes urgency (" +
            ", ".join(f"'{h}'" for h in urgency_hits[:4]) +
            "). Manufactured time pressure is a top scam-email tactic.", 12))

    cred_hits = [p for p in CREDENTIAL_PHRASES if p in body_lower]
    if cred_hits:
        findings.append(finding(
            "danger", "Asks you to 'verify' or 'confirm' account details",
            "The message says things like '" + cred_hits[0] + "'. "
            "Legitimate companies don't ask you to click a link to "
            "re-enter your password or personal details — this is the "
            "core trick of phishing emails.", 30))

    prize_hits = [p for p in PRIZE_PHRASES if p in body_lower]
    if prize_hits:
        findings.append(finding(
            "danger", "Prize / giveaway bait",
            f"The message says '{prize_hits[0]}'. Unsolicited prize "
            "notifications exist to harvest personal or card details.", 30))

    risky_pay = [p for p in RISKY_PAYMENT_PHRASES if p in body_lower]
    if risky_pay or "gift card" in body_lower and (
            "purchase" in body_lower or "send" in body_lower or "buy" in body_lower):
        findings.append(finding(
            "danger", "Asks for untraceable payment",
            "The message asks for payment by gift card, wire transfer or "
            "crypto. No legitimate company or refund process ever requires "
            "this — it is close to a guaranteed scam.", 40))

    greeting_hits = [g for g in GENERIC_GREETINGS if g in body_lower]
    if greeting_hits:
        findings.append(finding(
            "info", "Generic greeting, not addressed to you by name",
            f"The message opens with '{greeting_hits[0]}' instead of your "
            "actual name. Bulk phishing sent to thousands of people often "
            "can't personalize the greeting.", 6))

    if ATTACHMENT_RISK_RE.search(full_lower):
        findings.append(finding(
            "danger", "Mentions a risky attachment type",
            "The message references a file type (.exe, .zip, .js, .scr, "
            "etc.) commonly used to deliver malware. Don't open attachments "
            "from unexpected or unverified senders.", 25))

    # ---- Links in the body ---------------------------------------------
    urls = URL_IN_TEXT_RE.findall(body)[:8]
    seen_domains = set()
    link_findings_added = False
    for raw_url in urls:
        try:
            _, parsed = normalize_url(raw_url)
        except ValueError:
            continue
        host = (parsed.hostname or "").lower()
        reg_dom = registrable_domain(host)
        if reg_dom in seen_domains:
            continue
        seen_domains.add(reg_dom)
        host_compact = host.replace("-", "").replace(".", "")
        sld = reg_dom.split(".")[0]
        for brand, official in KNOWN_BRANDS.items():
            if reg_dom in official:
                continue
            brand_in_host = brand in host_compact
            typo_of_brand = levenshtein_leq1(sld, brand)
            if brand_in_host or typo_of_brand:
                how = ("contains the brand name" if brand_in_host
                       else "is one letter away from the brand name")
                findings.append(finding(
                    "danger", f"Link in the email impersonates {brand.title()}",
                    f"A link in the message points to '{reg_dom}', whose "
                    f"address {how} '{brand}', but the real site is "
                    f"{official[0]}.", 35))
                link_findings_added = True
                break
    if urls and not link_findings_added and not any(
            f["title"].startswith("Link in the email") for f in findings):
        findings.append(finding(
            "info", f"Contains {len(seen_domains)} link(s) to review",
            "No brand-impersonation pattern was found in the links, but "
            "always hover/preview a link before tapping it, and check it "
            "with the website checker above if you're unsure.", 0))

    if not any(f["severity"] in ("danger", "warning") for f in findings) \
            and not urgency_hits and not cred_hits:
        findings.append(finding(
            "good", "No strong phishing patterns detected",
            "This message doesn't match the common scam-email patterns "
            "(brand spoofing, credential requests, urgency, prize bait). "
            "Not a guarantee — targeted scams can still slip through.", -5))

    score = max(0, min(100, sum(f["points"] for f in findings)))
    level, title, advice = _email_verdict_for(score, findings)

    severity_rank = {"danger": 0, "warning": 1, "info": 2, "good": 3}
    findings.sort(key=lambda f: (severity_rank[f["severity"]], -f["points"]))

    who = sender_name or sender_addr or "unknown sender"
    label = f"Email from {who}" + (f" <{sender_addr}>" if sender_name and sender_addr else "")
    page_title = subject or "(no subject)"

    return {
        "url": label,
        "domain": sender_domain or "unknown",
        "score": score,
        "verdict": {"level": level, "title": title, "advice": advice},
        "findings": findings,
        "sources": [],
        "page_title": page_title,
        "page_text": body[:4000],
        "kind": "email",
    }


def _email_verdict_for(score, findings):
    dangers = sum(1 for f in findings if f["severity"] == "danger")
    if score >= 55 or dangers >= 2:
        return ("high-risk", "High risk — likely phishing/scam",
                "This email shows multiple strong phishing signals. Don't "
                "click any links, don't reply, and don't enter any details. "
                "If it claims to be a company you use, contact them "
                "directly through their real app or website instead.")
    if score >= 25 or dangers == 1:
        return ("suspicious", "Suspicious — treat with caution",
                "This email shows real warning signs. Don't click links or "
                "provide information until you've verified it directly with "
                "the sender through a known, trusted channel.")
    if score >= 8:
        return ("caution", "Mixed signals — some caution advised",
                "Nothing damning was found, but there are a few yellow "
                "flags. Verify anything asking for personal or payment "
                "details before acting on it.")
    return ("low-risk", "No major phishing red flags found",
            "This check found no strong phishing signals. That's not a "
            "guarantee — no automated tool can promise an email is safe — "
            "but nothing here matches common scam-email patterns.")
