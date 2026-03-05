# Reddit promo posts — Epstein Files Highlighter

Use the post that matches the subreddit. The promo page link is already in each post; optional links are listed at the bottom.

---

## r/cursor

**Title:** Built a Chrome extension with Cursor (started in Claude Code) and got it on the store — here’s how

**Post:**

After a friend was surprised I hadn’t started using Claude Code — I installed it and started playing around. I wanted to make a project start to finish and had the idea for [Epstein Files Highlighter](https://krismajean.github.io/epstein-files-highlighter/): a Chrome extension that highlights names from the Epstein files on any webpage and links them to the Wikipedia list. Below is the tool and how I made it, with the tools, process, and a few build insights.

**Tools:** I started in Claude Code — had the idea a couple weeks ago and wanted a project to try it on. As the project grew (content script, popup, background worker, options, store submission), I moved to Cursor. I’ve used Cursor before; having the whole repo in one place made it easier to see how the pieces fit and to iterate without losing context.

**Process:** Just plain JavaScript — no framework. I’m very project-based when it comes to learning: I learn by building. I didn’t know MV3 or content scripts before this; I learned them by doing the project and reading through the generated code so I understood how it worked. That paid off when something broke and I had to debug. Before writing any code I had the agent work with me to define requirements and possible approaches, and I asked it to act as both developer and teacher. That step helped me find gaps in my plan and end up with something more coherent.

**One concrete choice:** The extension can sync its name list from Wikipedia — that meant requesting the Wikipedia host permission. To keep the Chrome Web Store review smooth and permissions minimal, I made Wikipedia sync optional. The extension comes with a built-in list; users can click “Sync from Wikipedia” if they want the latest list. No extra permissions required to install.

**Why:** Interest in the files dropped a lot after other news took over. I wanted a simple way to keep this information visible while people browse — so names don’t just disappear. I also wanted to take a project end-to-end and get it out there. For me the takeaway is that when used appropriately, these tools are powerful for both learning and production: I learned MV3 and extension architecture by building, and I actually put something real on the store.

https://krismajean.github.io/epstein-files-highlighter/

---

## r/SideProject

**Title:** I built a Chrome extension that highlights names from the Epstein files as you browse — and actually got it on the store

**Post:**

After a friend was surprised I hadn’t started using Claude Code — I installed it and started playing around. I wanted to make a project start to finish and had the idea for [Epstein Files Highlighter](https://krismajean.github.io/epstein-files-highlighter/): a Chrome extension that highlights names from the Epstein files on any webpage and links them to the Wikipedia list. I kept having the same problem — there are a lot of people in those files I wouldn’t recognize unless I had a simple way to notice them while reading. So I built it and put it on the Chrome Web Store.

**What it does:** On any webpage it highlights names that appear on the Wikipedia “List of people named in the Epstein files” and adds a small icon that links to that person’s entry. You can turn highlighting on/off, change colors, use a “redact” mode (black bar, hover to reveal), and optionally sync the list from Wikipedia.

**How I built it:** Plain JS, no framework. Chrome extension (MV3): content script that scans the page, popup for settings, background worker for the badge and optional Wikipedia fetch. I’m project-based when it comes to learning — I didn’t know MV3 or content scripts before this; I learned them by building. I started with Claude Code to get the idea off the ground, then moved to Cursor as the codebase grew. I went through the code so I understood it, which made debugging and changing things much easier.

**Process that helped:** Before writing code I had the AI work with me to define requirements and options, and to ask me questions about how I wanted things to work. That caught a lot of holes early. I also ran into Chrome Web Store permission friction, so I made Wikipedia sync optional and kept the default install to zero extra host permissions. Get it out there first, add the rest later.

**Why it matters to me:** After interest in the files dropped sharply when other events took over, I wanted something that could keep the context present without requiring people to go look for it. And I wanted to prove to myself I could finish and put something out there. I learn by doing projects — when these tools are used appropriately they’re powerful for both learning and actually getting things live. They didn’t replace thinking; they accelerated it and helped me actually finish instead of leaving it in the “someday” pile.

https://krismajean.github.io/epstein-files-highlighter/

---

## r/chrome_extensions

**Title:** Put an MV3 extension on the store that highlights text from a Wikipedia list — build notes

**Post:**

After a friend was surprised I hadn’t started using Claude Code — I installed it and started playing around. I wanted to make a project start to finish and had the idea for [Epstein Files Highlighter](https://krismajean.github.io/epstein-files-highlighter/): a Chrome extension that highlights names from the Epstein files on any webpage and links them to the Wikipedia list. Below is how I built it and a few choices that might be useful for others.

**Stack:** Plain JavaScript, Manifest V3. Content script does the scanning and DOM updates; popup holds settings and “on this page” list; background service worker handles the badge and optional Wikipedia list fetch. I didn’t know any of this before the project — I’m very project-based when it comes to learning, so I learned MV3 and the extension architecture by building.

**Scanning:** Single regex over the name list, with names sorted longest-first so “Donald Trump Jr.” matches before “Donald Trump.” TreeWalker over text nodes, skip script/style/links etc., then wrap matches in a span + icon link. MutationObserver to handle dynamic content and infinite scroll. Styles and colors are injected so the user can toggle highlight on/off and switch colors (including a redact mode) from the popup.

**Permissions:** I wanted the smallest permission footprint for store review and user trust. The name list can be synced from Wikipedia, but that’s optional and requires the user to grant access. By default the extension uses a hardcoded list baked at build time (generated from the same Wikipedia page via a small Python script). So install needs no host permissions; only users who click “Sync from Wikipedia” get the permission prompt.

**Naming:** I originally called it “Manifest” (as in flight manifest). I renamed to “Epstein Files Highlighter” so it’s easier to find when people search for it.

**Promo site:** Static HTML/CSS/JS on GitHub Pages with a small interactive demo that mimics the popup (color swatches, redact, show/hide icon). Took about 30 minutes to throw together so I had a clean link to share.

**Learning + production:** When used appropriately these tools are powerful for both — I learned extension dev by doing the project, and I got something real on the store. Project-based learning plus the right tools got me there.

https://krismajean.github.io/epstein-files-highlighter/

---

## r/vibecoding

**Title:** Here’s the tool, here’s how I made it — Chrome extension for the Epstein files list

**Post:**

After a friend was surprised I hadn’t started using Claude Code — I installed it and started playing around. I wanted to make a project start to finish and had the idea for [Epstein Files Highlighter](https://krismajean.github.io/epstein-files-highlighter/): a Chrome extension that highlights names from the Epstein files on any webpage and links them to the Wikipedia list. Below is the tool and how I made it, with the tools, process, and a few build insights.

**What it does:** Scans the current page for names from the Wikipedia “List of people named in the Epstein files,” wraps them in a highlight (color configurable) and a small icon that links to that person’s section. Popup shows who’s on the page, toggles for icon/highlight, color picker, and optional “redact” mode (black bar, hover to reveal). Optional sync from Wikipedia to refresh the list.

**Tools I used:** Started in **Claude Code** — I had the idea and wanted a concrete project to try it. Once the extension had multiple parts (content script, popup, background, store submission), I switched to **Cursor**. I already knew the IDE; having the full repo there made it easier to see how everything connected and to iterate. Just plain JavaScript and Chrome extension APIs — no framework. I didn’t know MV3 or content scripts before this; I’m project-based — I learn by building, and this project was how I learned extension architecture.

**Process and workflow:** I made a point not to start coding until the agent and I had defined requirements and possible approaches. I asked it to act as both developer and teacher and to ask me questions about how I wanted things to work. That step surfaced a lot of gaps and made the later build more coherent. I also read through the generated code as we went so I understood it; when something broke, that made debugging much faster.

**Design / build insights:**  
- **Permissions:** Auto-syncing the list from Wikipedia meant requesting that host permission up front, which I was told could slow store review. I made Wikipedia sync optional. The extension comes with a built-in list; “Sync from Wikipedia” is a button that triggers the permission prompt only if the user wants it.  
- **Naming:** I’d called it “Manifest” (like a plane manifest). I renamed to “Epstein Files Highlighter” so people could actually find it when searching.  
- **Promo page:** I wanted a clean link to share. I put together a static promo page on GitHub Pages with a small demo that mimics the popup (change colors, redact, toggle icon). Took about 30 minutes.

**Why I made it:** Interest in the files dropped a lot after other events took over. I wanted a low-friction way to keep that context visible while browsing — so names don’t just fall through the cracks. I also wanted to finish and put something out there. For me the takeaway is that when used appropriately, these tools are powerful for both learning and production: I learned by doing the project, and I got something real on the store. Vibe coding got this from idea to “live on the Chrome Web Store” instead of another abandoned side project.

https://krismajean.github.io/epstein-files-highlighter/

---

## More design / build insights (from the codebase)

Use these where they fit — for r/chrome_extensions, longer posts, or follow-up comments.

- **Don’t run on the source.** The content script uses `exclude_matches` so it never runs on the Wikipedia list page itself. No point highlighting names on the page that *is* the list — and it avoids noise and potential loops.

- **Longest-first matching.** The name list is sorted by name length (longest first) before building the regex. That way “Donald Trump Jr.” matches before “Donald Trump” and you don’t get two overlapping highlights. Same idea in the background script when syncing from Wikipedia.

- **Debounce the scanner.** A MutationObserver fires on every DOM change. Instead of scanning immediately, the code waits 120ms after the last mutation. Sites that add a node and then fill in text later (e.g. lazy-loaded cards) get one scan after they settle, not a bunch of partial scans.

- **Snapshot then mutate.** The TreeWalker collects all matching text nodes into an array, then processes them. That way the walker isn’t invalidated by replacing nodes mid-walk. Avoids missing nodes or double-processing.

- **Skip links and code.** There’s a `BLOCKED_TAGS` set: SCRIPT, STYLE, A, CODE, PRE, etc. We only scan text in “real” content, not inside nav links, ads, or code blocks. Cuts false positives and keeps the DOM changes minimal.

- **Capital letter check.** After the regex matches, the code rejects matches whose first character is lowercase (e.g. “bill gates” in casual text). Reduces false positives when the list has “Bill Gates” but the page has lowercase.

- **Optional host permission.** Wikipedia is in `optional_host_permissions` in the manifest. The extension works with zero host permissions; only “Sync from Wikipedia” (and optional preview) asks for access. Cleaner store listing and user trust.

- **Fallback when cache is bad.** If the synced list is empty or too small (e.g. bad API response), the content script falls back to the hardcoded `names.js` list. The extension keeps working even when the network or Wikipedia is flaky.

- **Same logic in two places.** The background worker and the Python `scripts/update.py` both fetch the Wikipedia list and apply the same scrub rules (skip sections, split “X and Y”, etc.). The hardcoded list and the synced list stay in sync with the same behavior.

- **Promo site base URL.** On GitHub Pages the site lives at `.../epstein-files-highlighter/`. Relative asset paths broke when the URL had no trailing slash. Adding `<base href="https://.../epstein-files-highlighter/">` fixed CSS, JS, and images loading on the live site.

---

## Links (promo page is already in the posts above)

- **Promo page:** https://krismajean.github.io/epstein-files-highlighter/
- **Chrome Web Store:** https://chromewebstore.google.com/detail/epstein-files-highlighter/aiijlechhdpdnjihmmdkidckengecdlj
- **GitHub:** https://github.com/krismajean/epstein-files-highlighter

You can swap the promo link for the Chrome Web Store or GitHub link in any post if you prefer.
