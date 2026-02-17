# Manifest

> *Bringing light to the darkness*

Manifest is a Chrome extension that highlights names from the [Epstein files](https://en.wikipedia.org/wiki/List_of_people_named_in_the_Epstein_files) as you browse the web, so you can see how often these people appear on the pages you read.

---

## How it works

When you visit any webpage, Manifest scans the text for names listed in the Wikipedia article *List of people named in the Epstein files*. When a name is found:

- A small **highlighter icon** appears next to the name
- Optionally, the **name itself is highlighted** in yellow
- The extension's **toolbar badge** shows a count of total mentions on the page
- Clicking the icon opens that person's section on the Wikipedia list in a new tab

The name list is fetched from Wikipedia and cached locally, refreshing automatically once a day.

---

## Features

- **Toolbar badge** — at-a-glance count of Epstein file name mentions on the current page
- **Popup** — shows which names appear on the page and how many times each occurs
- **Toggle icon** — show or hide the highlighter icon next to names
- **Toggle highlight** — show or hide the yellow background on matched names
- **Master on/off switch** — disable entirely with one click
- Works on any website, including dynamically loaded content (SPAs, infinite scroll)

---

## A note on matching

Matching is by name only. Someone who shares a name with a person listed in the Epstein files may occasionally be tagged. Click the icon to visit their Wikipedia entry and judge for yourself.

---

## Installation

Manifest is not yet on the Chrome Web Store. To install it manually:

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top right)
4. Click **Load unpacked**
5. Select the folder containing this repository

---

## Project structure

```
manifest-extension/
├── manifest.json              # Extension manifest (MV3)
├── background/
│   └── service-worker.js      # Fetches & caches name list, manages toolbar badge
├── content/
│   ├── names.js               # Hardcoded fallback name list (~155 people)
│   └── content.js             # Page scanner, DOM injection, highlight logic
├── icons/
│   ├── wiki-w.svg             # Inline icon shown next to names
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── popup/
    ├── popup.html             # Extension popup UI
    └── popup.js               # Popup logic
```

---

## Source

Name list sourced from Wikipedia:
[List of people named in the Epstein files](https://en.wikipedia.org/wiki/List_of_people_named_in_the_Epstein_files)
