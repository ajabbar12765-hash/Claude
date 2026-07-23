"""Offline unit tests for the Scam Shield analyzer (no network needed).

Run with:  python3 -m unittest test_analyzer -v
"""

import unittest

from analyzer import (
    analyze,
    levenshtein_leq1,
    normalize_url,
    registrable_domain,
    unwrap_redirect,
)


def titles(result):
    return [f["title"] for f in result["findings"]]


class NormalizeUrlTests(unittest.TestCase):
    def test_adds_https_scheme(self):
        url, parsed = normalize_url("example.com/deal")
        self.assertEqual(url, "https://example.com/deal")
        self.assertEqual(parsed.hostname, "example.com")

    def test_rejects_empty(self):
        with self.assertRaises(ValueError):
            normalize_url("   ")

    def test_rejects_non_http_scheme(self):
        with self.assertRaises(ValueError):
            normalize_url("ftp://example.com")


class RegistrableDomainTests(unittest.TestCase):
    def test_simple(self):
        self.assertEqual(registrable_domain("shop.example.com"), "example.com")

    def test_two_part_suffix(self):
        self.assertEqual(registrable_domain("www.shop.example.co.uk"),
                         "example.co.uk")

    def test_bare_domain(self):
        self.assertEqual(registrable_domain("example.com"), "example.com")


class LevenshteinTests(unittest.TestCase):
    def test_one_substitution(self):
        self.assertTrue(levenshtein_leq1("amazom", "amazon"))

    def test_one_insertion(self):
        self.assertTrue(levenshtein_leq1("amazoon", "amazon"))

    def test_identical_not_typo(self):
        self.assertFalse(levenshtein_leq1("amazon", "amazon"))

    def test_distance_two(self):
        self.assertFalse(levenshtein_leq1("amqzom", "amazon"))


class RedirectUnwrapTests(unittest.TestCase):
    def test_facebook_wrapper(self):
        url, parsed = normalize_url(
            "https://l.facebook.com/l.php?u=https%3A%2F%2Fcheap-deals.top%2F")
        url, parsed, unwrapped = unwrap_redirect(url, parsed)
        self.assertTrue(unwrapped)
        self.assertEqual(parsed.hostname, "cheap-deals.top")

    def test_plain_url_untouched(self):
        url, parsed = normalize_url("https://example.com")
        _, parsed2, unwrapped = unwrap_redirect(url, parsed)
        self.assertFalse(unwrapped)
        self.assertEqual(parsed2.hostname, "example.com")


class OfflineAnalysisTests(unittest.TestCase):
    """live=False exercises only the URL-structure heuristics."""

    def test_brand_typosquat_flagged(self):
        result = analyze("https://amazom.top/deal", live=False)
        self.assertIn("Pretends to be Amazon", titles(result))
        self.assertIn(result["verdict"]["level"], ("suspicious", "high-risk"))

    def test_brand_in_subdomain_flagged(self):
        result = analyze("https://amazon.com.big-sale.xyz/offer", live=False)
        self.assertTrue(any("subdomain" in t.lower() for t in titles(result)))

    def test_official_brand_domain_positive(self):
        result = analyze("https://www.amazon.com", live=False)
        self.assertIn("This is the official Amazon domain", titles(result))
        self.assertEqual(result["verdict"]["level"], "low-risk")

    def test_http_flagged(self):
        result = analyze("http://someshop.com", live=False)
        self.assertIn("No secure connection (HTTP)", titles(result))

    def test_ip_address_flagged(self):
        result = analyze("http://203.0.113.9/shop", live=False)
        self.assertTrue(any("IP number" in t for t in titles(result)))
        self.assertEqual(result["verdict"]["level"], "high-risk")

    def test_punycode_flagged(self):
        result = analyze("https://xn--mazon-3ve.com", live=False)
        self.assertTrue(any("lookalike" in t.lower() for t in titles(result)))

    def test_shortener_flagged(self):
        result = analyze("https://bit.ly/3xyzabc", live=False)
        self.assertTrue(any("Shortened link" in t for t in titles(result)))

    def test_plain_domain_low_risk(self):
        result = analyze("https://example.com", live=False)
        self.assertEqual(result["verdict"]["level"], "low-risk")

    def test_score_bounds(self):
        result = analyze(
            "http://amazon.com.mega-90-percent-off-1234.top/win", live=False)
        self.assertLessEqual(result["score"], 100)
        self.assertGreaterEqual(result["score"], 0)
        self.assertEqual(result["verdict"]["level"], "high-risk")


class PageContentTests(unittest.TestCase):
    def test_scammy_page_content(self):
        from analyzer import check_page_content
        findings = []
        html = """
        <html><body>
          <h1>Closing down sale! 90% OFF everything - today only, hurry!</h1>
          <p>Congratulations you have been selected for a free gift.</p>
          <p>Payment: western union only.</p>
          <script>startCountdown(timer, expire)</script>
        </body></html>
        """
        check_page_content(html, findings)
        ts = [f["title"] for f in findings]
        self.assertTrue(any("pressure" in t.lower() for t in ts))
        self.assertTrue(any("Too-good-to-be-true" in t for t in ts))
        self.assertTrue(any("Prize" in t for t in ts))
        self.assertTrue(any("untraceable payment" in t for t in ts))

    def test_trustworthy_page_content(self):
        from analyzer import check_page_content
        findings = []
        html = """
        <html><body>
          <a href="/contact-us">Contact us</a>
          <a href="/returns">Return policy</a>
          <a href="/privacy">Privacy policy</a> <a href="/tos">Terms of service</a>
          <p>We accept Visa, Mastercard and PayPal.</p>
          <p>support@example.com | +1 415 555 0100</p>
        </body></html>
        """
        check_page_content(html, findings)
        self.assertTrue(all(f["severity"] in ("good", "info")
                            for f in findings))


class WebReputationTests(unittest.TestCase):
    def _titles(self, findings):
        return [f["title"] for f in findings]

    def test_search_unavailable(self):
        from websearch import analyze_search_results
        findings, sources = analyze_search_results("example.com", None)
        self.assertIn("Web reputation check unavailable", self._titles(findings))
        self.assertEqual(sources, [])
        self.assertEqual(findings[0]["points"], 0)

    def test_no_web_presence(self):
        from websearch import analyze_search_results
        findings, sources = analyze_search_results("obscure-shop.top", [])
        self.assertTrue(any("web presence" in t.lower()
                            for t in self._titles(findings)))

    def test_scam_reports_on_platform_flagged(self):
        from websearch import analyze_search_results
        results = [
            {"title": "Is bestdeals-shop.top a scam? - ScamAdviser",
             "snippet": "Users report this fake store never delivers orders.",
             "url": "https://www.scamadviser.com/check-website/bestdeals-shop.top"},
            {"title": "bestdeals-shop.top reviews",
             "snippet": "Total scam, they took my money and no refund.",
             "url": "https://www.trustpilot.com/review/bestdeals-shop.top"},
        ]
        findings, sources = analyze_search_results("bestdeals-shop.top", results)
        self.assertIn("Scam reports found online", self._titles(findings))
        self.assertTrue(findings[0]["points"] > 0)
        self.assertTrue(len(sources) >= 1)
        self.assertTrue(any("scamadviser" in s["url"] for s in sources))

    def test_clean_reviews_positive(self):
        from websearch import analyze_search_results
        results = [
            {"title": "MyShop reviews", "snippet": "Great service, fast "
             "delivery, highly recommend.",
             "url": "https://www.trustpilot.com/review/myshop.com"},
        ]
        findings, sources = analyze_search_results("myshop.com", results)
        self.assertIn("Reviewed online with no scam reports",
                      self._titles(findings))
        self.assertTrue(findings[0]["points"] < 0)

    def test_wikipedia_established(self):
        from websearch import analyze_search_results
        results = [
            {"title": "Amazon - Wikipedia", "snippet": "Amazon.com is an "
             "American multinational technology company.",
             "url": "https://en.wikipedia.org/wiki/Amazon_(company)"},
        ]
        findings, sources = analyze_search_results("amazon.com", results)
        self.assertIn("Recognized, established website",
                      self._titles(findings))

    def test_ddg_href_decoding(self):
        from websearch import _decode_ddg_href
        href = "//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.trustpilot.com%2Freview%2Fx.com&rut=abc"
        self.assertEqual(_decode_ddg_href(href),
                         "https://www.trustpilot.com/review/x.com")


class AnalyzeContractTests(unittest.TestCase):
    def test_offline_analyze_includes_sources_key(self):
        # web_search is skipped when live=False; sources stays a list.
        result = analyze("https://example.com", live=False)
        self.assertIn("sources", result)
        self.assertEqual(result["sources"], [])


if __name__ == "__main__":
    unittest.main()
