#!/usr/bin/env python3
"""
Example script that imports from the scripts package (re-exports from scripts/__init__.py).

Run from the manifest-extension directory:

  python3 example_import.py

Uses fetch_sections and build_names from scripts without naming scripts.update.
"""

from scripts import fetch_sections, build_names

def main():
    print("Fetching sections from Wikipedia (via scripts package)...")
    sections = fetch_sections()
    names_with_anchors = build_names(sections)
    print(f"Built {len(names_with_anchors)} names.")
    print("First 3:", [n for n, _ in names_with_anchors[:3]])

if __name__ == "__main__":
    main()
