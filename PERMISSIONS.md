# Permission Justifications — Epstein Files Highlighter

This document explains why each permission and capability in the extension manifest is required. Use for Chrome Web Store submission or review.

---

## Declared permissions

### `storage`

**Purpose:** Store data locally in the browser; no data is sent to any server.

**Use in the extension:**
- **Cached name list** — If the user has granted the optional Wikipedia permission, the list from the Wikipedia article is fetched and saved in `chrome.storage.local` so the content script can use it on every page. It is refreshed on browser startup when older than 24 hours, when the user clicks “Sync from Wikipedia,” and every 24 hours if the user has enabled “Auto-sync from Wikipedia.” Without that permission, the extension uses only the built-in list (no cache).
- **User preferences** — Display settings (highlight on/off, icon on/off, highlight color, icon color, master on/off) are saved in `chrome.storage.local` so they persist across sessions and apply to all tabs.

**Why it’s needed:** Without `storage`, we could not cache the name list or remember user choices. All processing stays on the user’s device.

---

### `activeTab`

**Purpose:** Access the currently active tab only when the user invokes the extension (e.g. by clicking the toolbar icon). No access to other tabs or to tab URLs when the user has not clicked.

**Use in the extension:**
- **Popup “On this page”** — When the user opens the popup, we need to know the current tab so we can ask the content script in that tab for the list of names found on the page. We use this to show “On this page” and the count per name.
- **Toolbar badge** — The content script in the active tab sends the match count to the background script, which sets the badge. The badge is scoped to the tab that sent the message (the active tab). We do not use broad `tabs` permission; we rely on the content script’s existing presence in the tab and `activeTab` when the user opens the popup.

**Why it’s needed:** To show which names appear on the current page in the popup and to show the badge count for that tab, we need to interact with the active tab. `activeTab` limits that to the single tab the user is viewing when they click the extension, instead of requesting access to all tabs.

---

### `alarms`

**Purpose:** Schedule a single periodic task (24-hour refresh) only when the user has opted in.

**Use in the extension:**
- Used only when the user has turned on **“Auto-sync from Wikipedia”** in the popup and granted the optional Wikipedia host permission. In that case, we create an alarm that runs every 24 hours to refresh the cached name list. If the user has not enabled auto-sync, no alarm is created and there is no background scheduling.

**Why it’s needed:** To offer an optional “auto-sync every 24 hours” feature without requiring any host permission at install; the alarm runs only when the user has both granted Wikipedia access and enabled the toggle.

---

## Optional host permissions

### `https://en.wikipedia.org/*` (optional_host_permissions)

**Purpose:** Allow the extension to make network requests to Wikipedia’s API when the user has granted this permission.

**Use in the extension:**
- The extension does **not** request this at install. It runs using a built-in name list until the user clicks **“Sync from Wikipedia”** or turns on **“Auto-sync from Wikipedia”** in the popup. At that point, Chrome prompts for access to en.wikipedia.org. If the user grants it, the background service worker can fetch the list from the public Wikipedia API (`en.wikipedia.org/w/api.php`), parse it, and store it locally via `storage`. After that, the list is also refreshed on browser startup when the cache is older than 24 hours and, if auto-sync is on, every 24 hours (while the permission remains granted).
- If the user never grants the permission, the extension never contacts Wikipedia and continues using the built-in list.

**Why it’s optional:** We use `optional_host_permissions` so the install flow does not require any host access. Users who want an up-to-date list from Wikipedia can grant access on demand; others keep the built-in list only.

---

## Content script match pattern

### `content_scripts[].matches`: `["<all_urls>"]`

**Purpose:** Allow the content script to run on web pages so it can scan visible text for matching names.

**Use in the extension:**
- The content script runs on pages the user visits. It reads text in the DOM, matches it against the cached name list, and wraps matches with a highlight and a link to the Wikipedia list. Matching is done entirely in the browser; no page text is sent off the device.

**Why it’s needed:** The extension is designed to work on any website. Restricting the content script to fewer URLs would prevent highlighting on most sites. We do not use this for any purpose other than local text matching and adding the highlight/link UI.

**Narrowing:** We use `exclude_matches` so the content script does **not** run on the Wikipedia list page itself: `*://en.wikipedia.org/wiki/List_of_people_named_in_the_Epstein_files*`.

---

## Web accessible resources

### `web_accessible_resources`: `icons/epstein-files-highlighter.svg` with `matches`: `["<all_urls>"]`

**Purpose:** Let the content script inject and display the small “highlighter” icon next to matched names on any page.

**Use in the extension:**
- The content script adds an inline icon (or a reference to this resource) next to each highlighted name. The icon is loaded from the extension via `chrome.runtime.getURL('icons/epstein-files-highlighter.svg')`. For the browser to allow that resource to be used in page context, it must be listed in `web_accessible_resources` with matching `matches`.

**Why it’s needed:** Without declaring this resource as web-accessible for the pages where the content script runs, the icon would not load on many sites due to extension resource restrictions.

---

## Summary table

| Permission / capability | Justification |
|------------------------|---------------|
| `storage` | Cache the Wikipedia name list and save user preferences locally; all data stays on device. |
| `activeTab` | Interact only with the current tab when the user opens the popup (e.g. show “On this page” and badge count); no access to other tabs. |
| `alarms` | Schedule a 24-hour refresh only when the user enables “Auto-sync from Wikipedia” and has granted the optional host permission; no background activity otherwise. |
| `https://en.wikipedia.org/*` (optional) | Fetch the name list from Wikipedia only when the user clicks “Sync from Wikipedia” or turns on “Auto-sync” and grants access; no user or page data is sent. |
| Content script `<all_urls>` | Run the highlighter on any site; exclude the Wikipedia list page. Text is processed only locally. |
| Web accessible: `icons/epstein-files-highlighter.svg` | Allow the highlighter icon to be shown next to names on any page. |

---

## Reply to “Broad Host Permissions” feedback

If the store or a reviewer asks you to use **activeTab** or **specific sites** instead of broad host permissions, you can respond as follows.

**What we already do:**

- We use the **`activeTab`** permission (no broad `tabs` or host access for the popup).
- We request **no host permissions at install**. We use **optional_host_permissions** for `https://en.wikipedia.org/*` only; that permission is requested when the user clicks “Sync from Wikipedia” or turns on “Auto-sync from Wikipedia.” We do not use `*://*/*` or similar.

**Why the extension still needs to “run on all sites”:**

- The extension’s **single purpose** is to highlight names from the Epstein files list **on any webpage the user visits**. That only works if our content script can run on those pages.
- So we declare **content_scripts** with `"matches": ["<all_urls>"]`. That is **not** the same as broad **host_permissions**: we do not request host permission to read/change data on every site. We only inject our script so it can run the highlighter locally; we do not send page content anywhere.
- We **cannot** replace this with `activeTab` for the highlighter, because `activeTab` only grants access when the user clicks the icon. We need the highlighter to run as the user browses, on each page.
- We **cannot** narrow to a fixed list of sites (e.g. `["https://example.com/*"]`) without breaking the feature, since the extension is designed to work on any site.

**Text you can paste in the dashboard or in a reply to the reviewer:**

> We have implemented the suggested approach where possible:
> - We use the **activeTab** permission for popup/badge interaction (no broad tabs or host access).
> - We request **no host permissions at install**. Wikipedia is in **optional_host_permissions** and is only requested when the user clicks “Sync from Wikipedia” or turns on “Auto-sync from Wikipedia” to fetch the public name list.
> - The only “broad” capability is our **content script** match pattern `<all_urls>`, which is required for our single purpose: highlighting names from the Epstein files list on any webpage the user visits. We do not use broad host permissions; page text is processed only locally and is never sent off the device. We cannot narrow to specific sites or to activeTab for this functionality without removing the core feature. Our PERMISSIONS.md and PRIVACY.md document this in detail.

---

*Epstein Files Highlighter extension — permission justifications. For full privacy details see [PRIVACY.md](PRIVACY.md).*
