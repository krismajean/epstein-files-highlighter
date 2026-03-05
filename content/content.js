// content/content.js
// HARDCODED_NAMES is defined by names.js, which is loaded first.

const WIKI_BASE = 'https://en.wikipedia.org/wiki/List_of_people_named_in_the_Epstein_files#';
const ICON_CLASS = 'epstein-ref-link';
const SPAN_CLASS = 'epstein-name-span';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Tags whose text content we never scan
const BLOCKED_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT',
  'SELECT', 'BUTTON', 'CODE', 'PRE', 'A', 'LABEL', 'OPTION',
]);

// --- State ---
let namePattern = null;
let nameMap = new Map();     // lowercase name -> { name, anchor }
let isProcessing = false;
let pendingRoots = new Set();
const processedNodes = new WeakSet();
const pageCounts = new Map(); // canonical name -> count
let previewEnabled = false;
const previewCache = new Map(); // anchor -> html
let previewTooltip = null;
let previewHideTimer = null;

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  const stored = await chrome.storage.local.get([
    'epsteinNames', 'namesFetchedAt', 'enabled', 'showIcon', 'showHighlight',
    'highlightColor', 'iconColor', 'showPreview',
  ]);

  if (stored.enabled === false) return;

  const names = (
    stored.epsteinNames &&
    stored.namesFetchedAt &&
    Date.now() - stored.namesFetchedAt < CACHE_MAX_AGE_MS
  ) ? stored.epsteinNames : HARDCODED_NAMES;

  buildPattern(names);
  injectStyles();
  applyDisplayPrefs(stored);
  applyColors(stored);
  previewEnabled = stored.showPreview === true;
  queueScan(document.body);
  setupObserver();

  // React to setting changes from popup
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
      if (changes.enabled.newValue === false) {
        undoHighlighting();
      } else {
        init();
      }
    }
    if (changes.showIcon || changes.showHighlight) {
      chrome.storage.local.get(['showIcon', 'showHighlight'], applyDisplayPrefs);
    }
    if (changes.highlightColor || changes.iconColor || changes.showHighlight) {
      chrome.storage.local.get(['highlightColor', 'iconColor', 'showHighlight'], applyColors);
    }
    if (changes.showPreview) {
      previewEnabled = changes.showPreview.newValue === true;
      updateAllIconTitles();
    }
  });
}

function applyDisplayPrefs(prefs) {
  const body = document.body;
  if (!body) return;
  body.classList.toggle('manifest-hide-icon',      prefs.showIcon      === false);
  body.classList.toggle('manifest-hide-highlight', prefs.showHighlight === false);
}

/** When preview is on, hide native title so it doesn't cover the custom tooltip; when off, show it. */
function updateAllIconTitles() {
  document.querySelectorAll(`.${ICON_CLASS}`).forEach((link) => {
    if (previewEnabled) {
      link.removeAttribute('title');
    } else {
      const name = link.dataset.epName || link.previousElementSibling?.textContent?.trim() || '';
      link.title = `${name} — named in Epstein files · Epstein Files Highlighter`;
    }
  });
}

function applyColors(prefs) {
  const highlightColor = prefs.highlightColor || '#ffe066';
  const iconColor      = prefs.iconColor      || '#ffe066';
  const isRedact       = highlightColor === '#000000';
  const showHighlight  = prefs.showHighlight !== false;

  document.body.classList.toggle('manifest-redact', isRedact);

  let colorStyle = document.getElementById('manifest-color-styles');
  if (!colorStyle) {
    colorStyle = document.createElement('style');
    colorStyle.id = 'manifest-color-styles';
    (document.head || document.documentElement).appendChild(colorStyle);
  }

  // Icon is an inline SVG data URI so we can swap the fill color directly
  const svgIcon = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 16" width="14" height="16">` +
    `<rect x="0" y="5" width="14" height="6" rx="1.5" fill="${iconColor}"/>` +
    `<rect x="1" y="7.5" width="12" height="1.5" rx="0.75" fill="#5a4800" opacity="0.75"/>` +
    `</svg>`
  );

  // The hide rule must come AFTER the color rule in the same style element
  // so it wins the cascade when showHighlight is off.
  colorStyle.textContent = `
    .${SPAN_CLASS}.manifest-highlighted {
      background: ${highlightColor} !important;
    }
    .${ICON_CLASS} {
      background-image: url('data:image/svg+xml,${svgIcon}') !important;
    }
    ${!showHighlight ? `
    .${SPAN_CLASS}.manifest-highlighted {
      background: none !important;
      color: inherit !important;
    }` : ''}
  `;
}

// ── Pattern Building ──────────────────────────────────────────────────────────
function buildPattern(names) {
  // If cached list is empty or too small (e.g. bad API response), use hardcoded list so extension still works
  if (!names?.length || names.length < 10) {
    names = HARDCODED_NAMES;
  }
  // Sort longest-first so "Donald Trump Jr. and Eric Trump" is tried before "Donald Trump"
  const sorted = [...names].sort((a, b) => b.name.length - a.name.length);

  nameMap.clear();
  for (const entry of sorted) {
    nameMap.set(entry.name.toLowerCase(), entry);
  }

  const escaped = sorted.map(e =>
    e.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );

  // Use lookbehind/lookahead instead of \b to correctly handle hyphens,
  // periods, and other non-word chars that appear in some names.
  namePattern = new RegExp(
    '(?<!\\w)(' + escaped.join('|') + ')(?!\\w)',
    'gi'
  );
}

// ── Style Injection ───────────────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('epstein-highlighter-styles')) return;

  const iconUrl = chrome.runtime.getURL('icons/epstein-files-highlighter.svg');
  const style = document.createElement('style');
  style.id = 'epstein-highlighter-styles';
  style.textContent = `
    .${ICON_CLASS} {
      display: inline-block;
      width: 13px;
      height: 13px;
      margin-left: 2px;
      vertical-align: middle;
      background-image: url('${iconUrl}');
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      opacity: 0.65;
      text-decoration: none !important;
      border: none;
      cursor: pointer;
      position: relative;
      top: -1px;
    }
    .${ICON_CLASS}:hover {
      opacity: 1.0;
    }
    .manifest-hide-icon .${ICON_CLASS} {
      display: none !important;
    }
    /* hide-highlight is re-applied via applyColors to ensure correct cascade */
    .${SPAN_CLASS}.manifest-highlighted {
      background: #ffe066;
      color: #000;
      border-radius: 2px;
      padding: 0 1px;
    }
    /* Redact mode */
    .manifest-redact .${SPAN_CLASS}.manifest-highlighted {
      background: #000 !important;
      color: transparent !important;
      border-radius: 2px;
      padding: 0 1px;
      cursor: pointer;
      outline: 1.5px solid #cc0000;
      outline-offset: 1px;
      transition: color 0.2s, background 0.2s;
      user-select: none;
    }
    .manifest-redact .${SPAN_CLASS}.manifest-highlighted:hover {
      background: #333 !important;
      color: #fff !important;
      outline-color: #ff4444;
    }
    /* Preview tooltip: force light text; name (links/bold) white and bold */
    #epstein-preview-tooltip,
    #epstein-preview-tooltip * {
      color: #f8f9ff !important;
    }
    #epstein-preview-tooltip a,
    #epstein-preview-tooltip b,
    #epstein-preview-tooltip strong {
      font-weight: bold !important;
      color: #f8f9ff !important;
    }
    #epstein-preview-tooltip a {
      text-decoration: none;
    }
    .epstein-preview-footer {
      font-size: 10px;
      color: rgba(248, 249, 255, 0.65);
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .epstein-preview-footer svg {
      flex-shrink: 0;
      opacity: 0.85;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

// ── Scanning Queue ────────────────────────────────────────────────────────────
let debounceTimer = null;

function queueScan(root) {
  if (!root) return;
  pendingRoots.add(root);
  scheduleScan();
}

function scheduleScan() {
  if (isProcessing) return;
  // Debounce: wait 120ms after the last mutation before scanning.
  // This lets sites that add a node then fill its text in a subsequent
  // task (e.g. Time.com lazy-loaded cards) settle before we walk the DOM.
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runPendingScans, 120);
}

function runPendingScans() {
  isProcessing = true;
  observer.disconnect();
  try {
    for (const root of pendingRoots) scanSubtree(root);
    pendingRoots.clear();
  } finally {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
    isProcessing = false;
  }
  reportBadge();
}

function reportBadge() {
  if (!chrome.runtime?.id) return; // extension context invalidated
  try {
    chrome.runtime.sendMessage({ type: 'setBadge', count: pageCounts.size }, () => {
      void chrome.runtime.lastError;
    });
  } catch (_) {}
}

// ── TreeWalker Scan ───────────────────────────────────────────────────────────
function scanSubtree(root) {
  if (!root || typeof root.nodeType === 'undefined') return;

  // If root is a text node, scan its parent instead
  if (root.nodeType === Node.TEXT_NODE) {
    root = root.parentNode;
    if (!root) return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (processedNodes.has(node)) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;

      // Walk up ancestors to check for blocked tags or already-processed spans
      let ancestor = node.parentNode;
      while (ancestor && ancestor !== root) {
        const tag = ancestor.tagName;
        if (tag && BLOCKED_TAGS.has(tag)) return NodeFilter.FILTER_REJECT;
        if (ancestor.classList?.contains(SPAN_CLASS)) return NodeFilter.FILTER_REJECT;
        ancestor = ancestor.parentNode;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  // Snapshot all matching text nodes before mutating the DOM
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue.length > 100000) continue; // skip pathologically long nodes
    namePattern.lastIndex = 0;
    if (namePattern.test(node.nodeValue)) textNodes.push(node);
  }
  namePattern.lastIndex = 0;

  for (const tn of textNodes) processTextNode(tn);
}

// ── Text Node Replacement ─────────────────────────────────────────────────────
function processTextNode(textNode) {
  if (!textNode.parentNode) return;

  const text = textNode.nodeValue;
  namePattern.lastIndex = 0;

  const matches = [];
  let m;
  while ((m = namePattern.exec(text)) !== null) {
    const raw = m[1];
    // Reject if the matched text starts with a lowercase letter
    // (avoids false positives like "bill gates" in casual text)
    if (raw[0] !== raw[0].toUpperCase()) continue;

    const entry = nameMap.get(raw.toLowerCase());
    if (!entry) continue;

    matches.push({ start: m.index, end: m.index + raw.length, raw, entry });
    pageCounts.set(entry.name, (pageCounts.get(entry.name) ?? 0) + 1);
  }
  if (!matches.length) return;

  const frag = document.createDocumentFragment();
  let cursor = 0;

  for (const { start, end, raw, entry } of matches) {
    if (start > cursor) {
      frag.appendChild(document.createTextNode(text.slice(cursor, start)));
    }

    // Wrap name in a span — highlighted class applied via CSS toggle on body
    const nameSpan = document.createElement('span');
    nameSpan.className = `${SPAN_CLASS} manifest-highlighted`;
    nameSpan.textContent = raw;
    frag.appendChild(nameSpan);

    // Wikipedia icon link
    const link = document.createElement('a');
    link.className = ICON_CLASS;
    link.href = WIKI_BASE + entry.anchor;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    if (!previewEnabled) {
      link.title = `${entry.name} — named in Epstein files · Epstein Files Highlighter`;
    }
    link.setAttribute('aria-label', `${entry.name} named in Epstein files`);
    link.dataset.epAnchor = entry.anchor;
    link.dataset.epName = entry.name;
    if (previewEnabled) {
      link.addEventListener('mouseenter', handlePreviewEnter);
      link.addEventListener('mouseleave', handlePreviewLeave);
      link.addEventListener('focus', handlePreviewEnter);
      link.addEventListener('blur', handlePreviewLeave);
    }
    frag.appendChild(link);

    cursor = end;
  }

  if (cursor < text.length) {
    frag.appendChild(document.createTextNode(text.slice(cursor)));
  }

  processedNodes.add(textNode);
  textNode.parentNode.replaceChild(frag, textNode);
}

// ── MutationObserver ──────────────────────────────────────────────────────────
const observer = new MutationObserver((mutations) => {
  for (const mut of mutations) {
    for (const added of mut.addedNodes) {
      queueScan(added);
    }
  }
});

function setupObserver() {
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }
}

// ── Undo Highlighting ─────────────────────────────────────────────────────────
function undoHighlighting() {
  observer.disconnect();
  pageCounts.clear();
  if (!chrome.runtime?.id) return;
  try {
    chrome.runtime.sendMessage({ type: 'setBadge', count: 0 }, () => {
      void chrome.runtime.lastError;
    });
  } catch (_) {}
  document.querySelectorAll(`.${SPAN_CLASS}`).forEach(span => {
    const parent = span.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(span.textContent), span);
    parent.normalize();
  });
  document.querySelectorAll(`.${ICON_CLASS}`).forEach(a => a.remove());
  const styleEl = document.getElementById('epstein-highlighter-styles');
  if (styleEl) styleEl.remove();
}

function ensurePreviewTooltip() {
  if (previewTooltip && previewTooltip.isConnected) return previewTooltip;
  const tip = document.createElement('div');
  tip.id = 'epstein-preview-tooltip';
  tip.style.position = 'absolute';
  tip.style.zIndex = '2147483647';
  tip.style.maxWidth = '340px';
  tip.style.background = 'rgba(10, 16, 28, 0.96)';
  tip.style.color = '#f8f9ff';
  tip.style.fontSize = '12px';
  tip.style.lineHeight = '1.45';
  tip.style.padding = '8px 10px';
  tip.style.borderRadius = '4px';
  tip.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.45)';
  tip.style.pointerEvents = 'none';
  tip.style.display = 'none';
  tip.style.maxHeight = '240px';
  tip.style.overflow = 'hidden';
  tip.style.display = 'flex';
  tip.style.flexDirection = 'column';

  const content = document.createElement('div');
  content.className = 'epstein-preview-content';
  content.style.overflow = 'auto';
  content.style.flex = '1 1 auto';
  content.style.minHeight = '0';
  tip.appendChild(content);

  const footer = document.createElement('div');
  footer.className = 'epstein-preview-footer';
  const svgNs = 'http://www.w3.org/2000/svg';
  const wikiSvg = document.createElementNS(svgNs, 'svg');
  wikiSvg.setAttribute('viewBox', '0 0 16 16');
  wikiSvg.setAttribute('width', '10');
  wikiSvg.setAttribute('height', '10');
  wikiSvg.setAttribute('aria-hidden', 'true');
  const circle = document.createElementNS(svgNs, 'circle');
  circle.setAttribute('cx', '8');
  circle.setAttribute('cy', '8');
  circle.setAttribute('r', '7');
  circle.setAttribute('fill', 'none');
  circle.setAttribute('stroke', 'currentColor');
  circle.setAttribute('stroke-width', '1.1');
  const text = document.createElementNS(svgNs, 'text');
  text.setAttribute('x', '8');
  text.setAttribute('y', '12');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('font-size', '9');
  text.setAttribute('font-weight', 'bold');
  text.setAttribute('fill', 'currentColor');
  text.textContent = 'W';
  wikiSvg.appendChild(circle);
  wikiSvg.appendChild(text);
  footer.appendChild(wikiSvg);
  tip.appendChild(footer);

  tip.style.display = 'none';
  (document.body || document.documentElement).appendChild(tip);
  previewTooltip = tip;
  return tip;
}

function positionPreviewTooltip(target) {
  const tip = ensurePreviewTooltip();
  const rect = target.getBoundingClientRect();
  const top = window.scrollY + rect.bottom + 6;
  let left = window.scrollX + rect.left;
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
  const estimatedWidth = Math.min(340, viewportWidth - 16);
  if (left + estimatedWidth > window.scrollX + viewportWidth) {
    left = window.scrollX + viewportWidth - estimatedWidth - 8;
  }
  tip.style.left = `${Math.max(left, window.scrollX + 8)}px`;
  tip.style.top = `${top}px`;
}

function requestWikiPreview(anchor) {
  return new Promise((resolve) => {
    if (!chrome.runtime?.id) {
      resolve({ ok: false, error: 'Extension context invalidated' });
      return;
    }
    try {
      chrome.runtime.sendMessage({ type: 'getWikiPreview', anchor }, (res) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(res || { ok: false, error: 'No response' });
        }
      });
    } catch (err) {
      resolve({ ok: false, error: err.message });
    }
  });
}

async function handlePreviewEnter(event) {
  if (!previewEnabled) return;
  const target = event.currentTarget;
  const anchor = target?.dataset?.epAnchor;
  if (!anchor) return;

  if (previewHideTimer) {
    clearTimeout(previewHideTimer);
    previewHideTimer = null;
  }

  const tip = ensurePreviewTooltip();
  const body = tip.querySelector('.epstein-preview-content');
  const footer = tip.querySelector('.epstein-preview-footer');
  positionPreviewTooltip(target);
  tip.style.display = 'flex';
  footer.style.display = 'none';
  body.textContent = 'Loading preview…';

  const cached = previewCache.get(anchor);
  if (cached) {
    body.innerHTML = cached;
    footer.style.display = 'block';
    return;
  }

  const res = await requestWikiPreview(anchor);
  if (!res?.ok || !res.html) {
    body.textContent = res?.error || 'Preview unavailable';
    return;
  }
  previewCache.set(anchor, res.html);
  body.innerHTML = res.html;
  footer.style.display = 'block';
}

function handlePreviewLeave() {
  if (!previewTooltip) return;
  if (previewHideTimer) clearTimeout(previewHideTimer);
  previewHideTimer = setTimeout(() => {
    if (previewTooltip) previewTooltip.style.display = 'none';
  }, 120);
}

// ── Message listener (popup asks for page counts) ─────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'getPageCounts') {
    // Convert map to sorted array: { name, anchor, count }
    const entries = [];
    for (const [name, count] of pageCounts) {
      const entry = nameMap.get(name.toLowerCase());
      entries.push({ name, anchor: entry?.anchor ?? '', count });
    }
    entries.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    sendResponse({ entries });
  }
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────
init().catch(err => console.error('[Epstein Files Highlighter] Init failed:', err));
