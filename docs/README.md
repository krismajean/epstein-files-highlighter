# Promo site (GitHub Pages)

This folder is the landing page for [Epstein Files Highlighter](https://github.com/krismajean/epstein-files-highlighter).

**To publish:** In the repo go to **Settings → Pages**. Under "Build and deployment", set **Source** to "Deploy from a branch", choose your branch (e.g. `main`), and set **Folder** to **/docs**. Save. The site will be at `https://<username>.github.io/epstein-files-highlighter/`.

To change the Chrome Web Store link, edit the `href` of the "Add to Chrome" button and the footer link in `index.html`.

**Attribution:** Use `?ref=source` (or `?utm_source=source`) when sharing the promo URL so you can tell where traffic comes from (e.g. `.../epstein-files-highlighter/?ref=reddit`). The page shows "Referred from the support site." in the footer when the param is present. To log refs somewhere you control, set `window.ATTRIBUTION_PING_URL` before the attribution script runs and uncomment the fetch line in `index.html`.

**Wikipedia preview in the demo:** The hero demo shows a preview tooltip on hover over the icon next to each name. The text is loaded from `demo-previews.json` (no live request to Wikipedia when visitors view the page). To refresh that text, run from the repo root: `python3 scripts/update.py` (which also updates the name list and zip) or `python3 scripts/update.py --previews` to only update `docs/demo-previews.json`. Commit and push to update the live site.
