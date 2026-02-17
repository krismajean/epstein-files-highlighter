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

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  const stored = await chrome.storage.local.get([
    'epsteinNames', 'namesFetchedAt', 'enabled', 'showIcon', 'showHighlight',
    'highlightColor', 'iconColor',
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
    if (changes.highlightColor || changes.iconColor) {
      chrome.storage.local.get(['highlightColor', 'iconColor'], applyColors);
    }
  });
}

function applyDisplayPrefs(prefs) {
  const body = document.body;
  if (!body) return;
  body.classList.toggle('manifest-hide-icon',      prefs.showIcon      === false);
  body.classList.toggle('manifest-hide-highlight', prefs.showHighlight === false);
}

function applyColors(prefs) {
  const highlightColor = prefs.highlightColor || '#ffe066';
  const iconColor      = prefs.iconColor      || '#ffe066';

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

  colorStyle.textContent = `
    .${SPAN_CLASS}.manifest-highlighted {
      background: ${highlightColor} !important;
    }
    .${ICON_CLASS} {
      background-image: url('data:image/svg+xml,${svgIcon}') !important;
    }
  `;
}

// ── Pattern Building ──────────────────────────────────────────────────────────
function buildPattern(names) {
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

  const iconUrl = chrome.runtime.getURL('icons/manifest.svg');
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
    .manifest-hide-highlight .${SPAN_CLASS} {
      background: none !important;
      color: inherit !important;
    }
    .${SPAN_CLASS}.manifest-highlighted {
      background: #ffe066;
      color: #000;
      border-radius: 2px;
      padding: 0 1px;
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
  chrome.runtime.sendMessage({ type: 'setBadge', count: pageCounts.size });
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
    link.title = `${entry.name} — named in Epstein files · Manifest`;
    link.setAttribute('aria-label', `${entry.name} named in Epstein files`);
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
  chrome.runtime.sendMessage({ type: 'setBadge', count: 0 });
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
init().catch(err => console.error('[Epstein Highlighter] Init failed:', err));
