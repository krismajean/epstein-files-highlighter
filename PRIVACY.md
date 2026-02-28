# Privacy Policy — Epstein Files Highlighter

*Last updated: February 2026*

## Overview

Epstein Files Highlighter is a free, open-source Chrome extension built for public interest. This policy explains what data the extension accesses, how it is used, and what is never collected.

---

## What the extension accesses

When you visit a webpage, Epstein Files Highlighter reads the **text content of that page** locally in your browser to check whether any names from the Epstein files Wikipedia list appear on it. This processing happens entirely on your device.

---

## What the extension does NOT do

- Does not collect, store, or transmit any personal data
- Does not track your browsing history
- Does not send page content to any server
- Does not use analytics or telemetry of any kind
- Does not display advertising
- Does not sell or share any data with third parties

---

## External network requests

The extension does **not** request access to any website at install time. It works immediately using a built-in name list.

The only external request Epstein Files Highlighter can make is to the **Wikipedia API** to fetch and locally cache an updated list of names from the article *List of people named in the Epstein files*. This happens only if you click **Sync from Wikipedia** in the popup (or turn on **Auto-sync from Wikipedia**) and grant access to en.wikipedia.org when prompted. If you never grant it, the extension never contacts Wikipedia. If you do grant it:

- The request contains no personal information
- The list is refreshed on browser startup when the cache is older than 24 hours (only while you have granted access)
- If you enable **Auto-sync**, the extension may also refresh the list every 24 hours (no additional permission; it uses the same Wikipedia access)
- The request is made directly to Wikipedia's public API (`en.wikipedia.org`)

No other network requests are made.

---

## Local storage

Epstein Files Highlighter stores the following in your browser's local extension storage (`chrome.storage.local`):

- The cached name list fetched from Wikipedia
- Your display preferences (highlight color, icon visibility, auto-sync on/off, etc.)

This data never leaves your device.

---

## Permissions explained

| Permission | Why it's needed |
|---|---|
| `<all_urls>` (content script) | To scan text on any webpage you visit for matching names |
| `storage` | To save the name list cache and your preferences locally |
| `activeTab` | When you click the extension icon, to get the current tab so the popup can show "On this page" and the badge can update (no access to other tabs) |
| `https://en.wikipedia.org/*` (optional) | Not requested at install. Only requested when you click "Sync from Wikipedia" or turn on "Auto-sync from Wikipedia"; if you grant it, the extension can fetch the name list from Wikipedia and refresh it on startup when stale (and every 24 hours if auto-sync is on). |

---

## Open source

Epstein Files Highlighter is fully open source. You can inspect all code at:
[https://github.com/krismajean/epstein-files-highlighter](https://github.com/krismajean/epstein-files-highlighter)

---

## Contact

If you have questions about this privacy policy, please open an issue on the GitHub repository above.
