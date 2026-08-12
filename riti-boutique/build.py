#!/usr/bin/env python3
"""Render index.html for the Riti Boutique demo site from the scraped Apify data.

Usage:  python3 build.py
Reads:  data/scraped-raw.json, template.html
Writes: index.html
"""

import html
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).parent
DATA = json.loads((ROOT / "data" / "scraped-raw.json").read_text())

GM = DATA["googleMaps"]

# Reviews we surface on the page: substantial, 4-5 star, deduplicated by author.
MIN_LEN = 90


def pick_reviews(limit=9):
    seen, out = set(), []
    for r in GM["reviews"]:
        text = (r.get("text") or "").strip()
        if not text or len(text) < MIN_LEN:
            continue
        if r.get("stars", 0) < 4:
            continue
        name = (r.get("name") or "").strip()
        if name in seen:
            continue
        seen.add(name)
        out.append(
            {
                "name": name,
                "stars": r["stars"],
                "date": (r.get("publishedAtDate") or "")[:10],
                "text": re.sub(r"\s+", " ", text),
                "url": r.get("reviewUrl") or "",
            }
        )
        if len(out) >= limit:
            break
    return out


def esc(s):
    return html.escape(s, quote=True)


def trim(s, n):
    s = s.strip()
    return s if len(s) <= n else s[: n - 1].rsplit(" ", 1)[0] + "…"


def review_cards(reviews):
    parts = []
    for r in reviews:
        stars = "★" * int(r["stars"])
        link = (
            f'<a class="rev-src" href="{esc(r["url"])}" target="_blank" rel="noopener">Google review</a>'
            if r["url"]
            else ""
        )
        parts.append(
            f"""        <figure class="rev">
          <div class="rev-stars" aria-label="{int(r['stars'])} out of 5 stars">{stars}</div>
          <blockquote>{esc(trim(r["text"], 340))}</blockquote>
          <figcaption><span class="rev-name">{esc(r["name"])}</span><span class="rev-date">{esc(r["date"])}</span>{link}</figcaption>
        </figure>"""
        )
    return "\n".join(parts)


def gallery_tiles(urls):
    parts = []
    for i, u in enumerate(urls):
        # Google's image host accepts a size suffix; ask for a lighter grid image.
        thumb = re.sub(r"=w\d+-h\d+", "=w800-h800", u)
        hidden = ' data-extra="1" hidden' if i >= 12 else ""
        parts.append(
            f'        <a class="tile" href="{esc(u)}" target="_blank" rel="noopener"{hidden}>'
            f'<img src="{esc(thumb)}" alt="Riti Boutique outfit {i + 1}" loading="lazy" decoding="async" width="800" height="800"></a>'
        )
    return "\n".join(parts)


def rating_bars(dist_counts, total):
    rows = []
    for stars in (5, 4, 3, 2, 1):
        n = dist_counts[stars]
        pct = (n / total * 100) if total else 0
        rows.append(
            f'          <div class="bar-row"><span class="bar-label">{stars}★</span>'
            f'<span class="bar"><span class="bar-fill" style="width:{pct:.1f}%"></span></span>'
            f'<span class="bar-n">{n}</span></div>'
        )
    return "\n".join(rows)


reviews = pick_reviews()
imgs = GM["imageUrls"]
hero_img = imgs[0]
about_img = imgs[10] if len(imgs) > 10 else hero_img
# Four cinematic "chapter" images for the scroll showcase — distinct from
# the hero and from each other so the story doesn't repeat a frame.
chapter_imgs = [imgs[i] for i in (3, 6, 13, 17) if i < len(imgs)]
while len(chapter_imgs) < 4:
    chapter_imgs.append(hero_img)

# Rating distribution comes from the Google Maps listing itself.
DIST = {5: 121, 4: 2, 3: 1, 2: 2, 1: 1}
TOTAL_REVIEWS = sum(DIST.values())

template = (ROOT / "template.html").read_text()
out = (
    template.replace("{{HERO_IMG}}", esc(hero_img))
    .replace("{{ABOUT_IMG}}", esc(about_img))
    .replace("{{CH1_IMG}}", esc(chapter_imgs[0]))
    .replace("{{CH2_IMG}}", esc(chapter_imgs[1]))
    .replace("{{CH3_IMG}}", esc(chapter_imgs[2]))
    .replace("{{CH4_IMG}}", esc(chapter_imgs[3]))
    .replace("{{GALLERY}}", gallery_tiles(imgs))
    .replace("{{REVIEWS}}", review_cards(reviews))
    .replace("{{RATING_BARS}}", rating_bars(DIST, TOTAL_REVIEWS))
)

(ROOT / "index.html").write_text(out)
print(
    f"index.html written — {len(GM['imageUrls'])} gallery images, "
    f"{len(reviews)} reviews, {TOTAL_REVIEWS} ratings charted"
)
