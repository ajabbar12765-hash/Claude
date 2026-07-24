"""Offline unit tests for the Scam Shield analyzer (no network needed).

Run with:  python3 -m unittest test_analyzer -v
"""

import os
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

    def test_scam_complaints_on_platform_flagged(self):
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
        self.assertIn("Scam complaints found online", self._titles(findings))
        self.assertTrue(findings[0]["points"] > 0)
        self.assertTrue(len(sources) >= 1)

    def test_auto_checker_page_not_flagged(self):
        # ScamAdviser/ScamDoc publish an "is it a scam?" page for EVERY
        # domain. With no genuine complaint language it must NOT be flagged.
        from websearch import analyze_search_results
        results = [
            {"title": "Is Capconnect.net legit or a scam? - ScamAdviser",
             "snippet": "Is capconnect.net a scam or legit? Check the trust "
             "score and read reviews to find out if this website is safe.",
             "url": "https://www.scamadviser.com/check-website/capconnect.net"},
            {"title": "capconnect.net Review - ScamDoc",
             "snippet": "Is capconnect.net safe? Website review and trust "
             "score for capconnect.net.",
             "url": "https://www.scamdoc.com/view/capconnect.net"},
        ]
        findings, sources = analyze_search_results("capconnect.net", results)
        self.assertIn("No scam complaints found online",
                      self._titles(findings))
        self.assertEqual(findings[0]["points"], 0)

    def test_obscure_site_generic_homepages_not_flagged(self):
        # An unpopular site: the search only returns GENERIC homepages of
        # review/checker platforms that don't actually name the domain, plus
        # a checker page. None of this is a complaint about the site, so it
        # must NOT be flagged as unsafe. (Regression: freshleafpk.com.)
        from websearch import analyze_search_results
        results = [
            {"title": "Trustpilot Reviews: Experience the power of customer "
             "reviews", "snippet": "Read reviews. Write reviews. Find "
             "companies. | Trustpilot",
             "url": "https://www.trustpilot.com/"},
            {"title": "Better Business Bureau | BBB Start with Trust",
             "snippet": "BBB helps consumers find businesses they can trust.",
             "url": "https://www.bbb.org/"},
            {"title": "freshleafpk.com Review - ScamDoc",
             "snippet": "Is freshleafpk.com safe? Trust score and website "
             "review for freshleafpk.com.",
             "url": "https://www.scamdoc.com/view/freshleafpk.com"},
        ]
        findings, sources = analyze_search_results("freshleafpk.com", results)
        titles = self._titles(findings)
        self.assertNotIn("Scam complaints found online", titles)
        self.assertNotIn("A possible complaint online", titles)
        self.assertEqual(findings[0]["points"], 0)

    def test_complaint_only_counts_when_it_names_the_site(self):
        # A genuine complaint phrase on a generic homepage that does NOT name
        # the domain must not be attributed to this site.
        from websearch import analyze_search_results
        results = [
            {"title": "Trustpilot", "snippet": "People say they never "
             "received their order and got no refund from various shops.",
             "url": "https://www.trustpilot.com/"},
        ]
        findings, sources = analyze_search_results("freshleafpk.com", results)
        self.assertNotIn("Scam complaints found online", self._titles(findings))

    def test_clean_reviews_positive(self):
        from websearch import analyze_search_results
        results = [
            {"title": "MyShop reviews", "snippet": "Great service, fast "
             "delivery, highly recommend.",
             "url": "https://www.trustpilot.com/review/myshop.com"},
        ]
        findings, sources = analyze_search_results("myshop.com", results)
        self.assertIn("Reviewed online, no complaints found",
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


class QaTests(unittest.TestCase):
    """qa.answer_question with no API key uses the rule-based fallback."""

    def setUp(self):
        self._saved = {k: os.environ.pop(k, None)
                       for k in ("ANTHROPIC_API_KEY", "GEMINI_API_KEY")}

    def tearDown(self):
        for k, v in self._saved.items():
            if v is not None:
                os.environ[k] = v

    def test_empty_question_rejected(self):
        import qa
        with self.assertRaises(ValueError):
            qa.answer_question("   ", {})

    def test_fallback_without_key(self):
        import qa
        analysis = analyze("https://amazom.top/deal", live=False)
        out = qa.answer_question("Is this safe to order from?", analysis)
        self.assertFalse(out["ai"])
        self.assertIn("GEMINI_API_KEY", out["answer"])
        # The verdict title should be reflected in the fallback answer.
        self.assertIn(analysis["verdict"]["title"].split(" —")[0],
                      out["answer"])

    def test_fallback_with_reason_surfaces_error(self):
        import qa
        analysis = analyze("https://amazom.top/deal", live=False)
        out = qa._fallback_answer("Is this safe?", analysis,
                                  reason="HTTP 400: API key not valid")
        self.assertIn("API key not valid", out)
        self.assertIn("couldn't answer", out)

    def test_context_builder_is_compact_text(self):
        import qa
        analysis = analyze("https://amazom.top/deal", live=False)
        ctx = qa._context_from_analysis(analysis)
        self.assertIn("Domain:", ctx)
        self.assertIn("Verdict:", ctx)
        self.assertIsInstance(ctx, str)

    def test_context_builder_handles_junk(self):
        import qa
        self.assertIsInstance(qa._context_from_analysis(None), str)
        self.assertIsInstance(qa._context_from_analysis({}), str)


if __name__ == "__main__":
    unittest.main()
