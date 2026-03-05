#!/usr/bin/env python3
"""
Fetch Wikipedia section previews for the promo page demo and write docs/demo-previews.json.
Run from repo root: python3 scripts/fetch_demo_previews.py

Uses the same Wikipedia API as the extension: parse the list page, get section index
by anchor, then fetch that section's HTML and take the first paragraph.
"""

import json
import os
import re
import sys
import urllib.request

WIKI_SECTIONS_URL = (
    "https://en.wikipedia.org/w/api.php"
    "?action=parse"
    "&page=List_of_people_named_in_the_Epstein_files"
    "&prop=sections"
    "&format=json"
    "&origin=*"
)

WIKI_TEXT_URL = (
    "https://en.wikipedia.org/w/api.php"
    "?action=parse"
    "&page=List_of_people_named_in_the_Epstein_files"
    "&prop=text"
    "&format=json"
    "&origin=*"
)

# Anchors for the three names in the demo article
DEMO_ANCHORS = ["Howard_Lutnick", "Alan_Dershowitz", "Ghislaine_Maxwell"]


def fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "EpsteinFilesHighlighter/1.0"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.load(r)


def get_section_index(sections, anchor):
    for s in sections:
        if (s.get("anchor") or "").strip() == anchor:
            return s.get("index")
    return None


def fetch_section_html(anchor):
    data = fetch_json(WIKI_SECTIONS_URL)
    sections = data.get("parse", {}).get("sections", [])
    idx = get_section_index(sections, anchor)
    if idx is None:
        return None
    url = WIKI_TEXT_URL + "&section=" + str(idx)
    data = fetch_json(url)
    html = data.get("parse", {}).get("text", {}).get("*", "")
    if not html:
        return None
    # First paragraph only, like the extension
    m = re.search(r"<p[^>]*>[\s\S]*?</p>", html, re.IGNORECASE)
    return m.group(0) if m else html[:500]


def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_path = os.path.join(repo_root, "docs", "demo-previews.json")

    previews = {}
    for anchor in DEMO_ANCHORS:
        sys.stderr.write("Fetching %s...\n" % anchor)
        try:
            html = fetch_section_html(anchor)
            previews[anchor] = html or ""
        except Exception as e:
            sys.stderr.write("  Error: %s\n" % e)
            previews[anchor] = ""

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(previews, f, indent=2, ensure_ascii=False)

    print("Wrote %s" % out_path)
    return 0


if __name__ == "__main__":
    sys.exit(main() or 0)
