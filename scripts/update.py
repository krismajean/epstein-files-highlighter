#!/usr/bin/env python3
"""
Update the Epstein Files Highlighter extension: refresh the name list and/or create the store zip.

  python3 scripts/update.py             # update list + create zip
  python3 scripts/update.py --list      # only update content/names.js from Wikipedia
  python3 scripts/update.py --zip       # only create epstein-files-highlighter.zip in project dir

List update: fetches Wikipedia "List of people named in the Epstein files", applies
the same scrub rules as the service worker, splits "X and Y" into two entries with
the same anchor, and overwrites content/names.js.

Zip: packages manifest.json, background/, content/, icons/, popup/ into
epstein-files-highlighter.zip (in the project root).
"""

import argparse
import json
import os
import sys
import urllib.request
import zipfile

WIKI_URL = (
    "https://en.wikipedia.org/w/api.php"
    "?action=parse"
    "&page=List_of_people_named_in_the_Epstein_files"
    "&prop=sections"
    "&format=json"
    "&origin=*"
)

SKIP_SECTIONS = {
    "References", "External links", "Contents", "See also", "Notes",
    "Background", "Releases", "Redactions", "Litigation", "Names", "Name",
}

ZIP_INCLUDE = ("manifest.json", "background", "content", "icons", "popup")
ZIP_EXCLUDE_SUFFIXES = (".DS_Store", ".zip", ".new")
ZIP_EXCLUDE_DIRS = (".git", ".claude", "scripts")


def is_letter_range(s):
    return len(s) == 3 and s[1] == "-" and s[0].isalpha() and s[2].isalpha()


def expand_and_names(names_with_anchors):
    """Split 'X and Y' into two entries, same anchor for both."""
    out = []
    for name, anchor in names_with_anchors:
        if " and " in name:
            parts = [p.strip() for p in name.split(" and ") if p.strip()]
            for part in parts:
                out.append((part, anchor))
        else:
            out.append((name, anchor))
    return out


def fetch_sections():
    req = urllib.request.Request(WIKI_URL, headers={"User-Agent": "EpsteinFilesHighlighter/1.0"})
    with urllib.request.urlopen(req) as r:
        data = json.load(r)
    return data.get("parse", {}).get("sections", [])


def build_names(sections):
    names_with_anchors = []
    for s in sections:
        name = (s.get("line") or "").strip()
        anchor = (s.get("anchor") or "").strip()
        if not name or not anchor:
            continue
        if len(name) == 1 and name.isalpha():
            continue
        if name in SKIP_SECTIONS or is_letter_range(name):
            continue
        names_with_anchors.append((name, anchor))

    names_with_anchors = expand_and_names(names_with_anchors)
    names_with_anchors.sort(key=lambda x: -len(x[0]))
    return names_with_anchors


def js_escape(s):
    return s.replace("\\", "\\\\").replace('"', '\\"')


def write_names_js(names_with_anchors, out_path):
    lines = [
        f'  {{ name: "{js_escape(n)}", anchor: "{js_escape(a)}" }},'
        for n, a in names_with_anchors
    ]
    content = """// content/names.js
// Hardcoded fallback list generated from Wikipedia.
// The background service worker refreshes this daily via chrome.storage.local.
// Sorted longest-first so the regex engine tries longer names before shorter ones.
// Run scripts/update.py to refresh this file.

const HARDCODED_NAMES = [
""" + "\n".join(lines) + """
];
"""
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content)


def cmd_update_list(repo_root):
    out_path = os.path.join(repo_root, "content", "names.js")
    if not os.path.isdir(os.path.join(repo_root, "content")):
        print("Expected content/ under repo root:", repo_root, file=sys.stderr)
        return False
    print("Fetching from Wikipedia...")
    sections = fetch_sections()
    names_with_anchors = build_names(sections)
    print(f"Writing {len(names_with_anchors)} names to {out_path}")
    write_names_js(names_with_anchors, out_path)
    return True


def _should_exclude(arcname):
    if any(arcname.endswith(s) for s in ZIP_EXCLUDE_SUFFIXES):
        return True
    parts = arcname.split(os.sep)
    if os.altsep:
        parts = arcname.replace(os.altsep, os.sep).split(os.sep)
    for part in parts:
        if part in ZIP_EXCLUDE_DIRS:
            return True
    return False


def cmd_zip(repo_root):
    zip_path = os.path.join(repo_root, "epstein-files-highlighter.zip")

    to_add = []
    for entry in ZIP_INCLUDE:
        path = os.path.join(repo_root, entry)
        if not os.path.exists(path):
            print(f"Missing for zip: {path}", file=sys.stderr)
            return False
        if os.path.isfile(path):
            to_add.append((path, entry))
        else:
            for dirpath, dirnames, filenames in os.walk(path):
                for d in list[str](dirnames):
                    if d in ZIP_EXCLUDE_DIRS or d.startswith("."):
                        dirnames.remove(d)
                for f in filenames:
                    if f.endswith(ZIP_EXCLUDE_SUFFIXES):
                        continue
                    full = os.path.join(dirpath, f)
                    rel = os.path.relpath(full, repo_root)
                    to_add.append((full, rel))

    print(f"Creating {zip_path}")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for full, rel in to_add:
            if _should_exclude(rel):
                continue
            zf.write(full, rel)
    print("Done.")
    return True


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.dirname(script_dir)

    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--list", action="store_true", help="Only update content/names.js from Wikipedia")
    ap.add_argument("--zip", action="store_true", help="Only create epstein-files-highlighter.zip")
    args = ap.parse_args()

    do_list = args.list or (not args.list and not args.zip)
    do_zip = args.zip or (not args.list and not args.zip)

    ok = True
    
    if do_list:
        ok = cmd_update_list(repo_root) and ok
    if do_zip:
        ok = cmd_zip(repo_root) and ok
    if not ok:
        sys.exit(1)
    print("Done.")


if __name__ == "__main__":
    main()
