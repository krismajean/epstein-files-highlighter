// popup.js
const WIKI_BASE = 'https://en.wikipedia.org/wiki/List_of_people_named_in_the_Epstein_files#';

const COLORS = [
  { hex: '#ffe066', label: 'Yellow' },
  { hex: '#90ee90', label: 'Green' },
  { hex: '#da90f5', label: 'Purple' },
];

/** Returns the number of entries in the built-in content/names.js list. */
async function getBuiltinListCount() {
  const url = chrome.runtime.getURL('content/names.js');
  const text = await fetch(url).then((r) => r.text());
  const matches = text.match(/\{\s*name:\s*"/g);
  return matches ? matches.length : 0;
}

// ── Storage: prefs + status ───────────────────────────────────────────────────
chrome.storage.local.get(
  ['epsteinNames', 'namesFetchedAt', 'enabled', 'showIcon', 'showHighlight',
   'highlightColor', 'iconColor', 'autoSyncWiki'],
  async (result) => {
    const count = result.epsteinNames?.length ?? await getBuiltinListCount();
    const fetched = result.namesFetchedAt;

    let sourceStr;
    if (!fetched) {
      sourceStr = 'using built-in list';
    } else {
      const mins = Math.round((Date.now() - fetched) / 60_000);
      sourceStr = mins < 60 ? `updated ${mins}m ago` : `updated ${Math.round(mins / 60)}h ago`;
    }

    document.getElementById('status').textContent = `${count} names tracked · ${sourceStr}`;

    // Main enable toggle
    const cbEnabled = document.getElementById('enabled');
    cbEnabled.checked = result.enabled !== false;
    updateSubToggles(cbEnabled.checked);
    cbEnabled.addEventListener('change', () => {
      chrome.storage.local.set({ enabled: cbEnabled.checked });
      updateSubToggles(cbEnabled.checked);
    });

    // Show icon toggle
    const cbIcon = document.getElementById('showIcon');
    cbIcon.checked = result.showIcon !== false;
    cbIcon.addEventListener('change', () => {
      chrome.storage.local.set({ showIcon: cbIcon.checked });
    });

    // Highlight name toggle
    const cbHL = document.getElementById('showHighlight');
    cbHL.checked = result.showHighlight !== false;
    cbHL.addEventListener('change', () => {
      chrome.storage.local.set({ showHighlight: cbHL.checked });
    });

    // Color swatches
    const iconColor      = result.iconColor      || '#ffe066';
    const highlightColor = result.highlightColor || '#ffe066';
    const isRedact       = highlightColor === '#000000';

    updateIconPreview(iconColor);
    buildSwatches('iconSwatches', iconColor, (color) => {
      chrome.storage.local.set({ iconColor: color });
      updateIconPreview(color);
    });
    buildSwatches('highlightSwatches', highlightColor, (color) => {
      chrome.storage.local.set({ highlightColor: color });
      document.getElementById('redactRow').classList.remove('active');
    });

    // Auto-sync from Wikipedia (turning ON requests Wikipedia permission first)
    const cbAutoSync = document.getElementById('autoSyncWiki');
    const statusEl = document.getElementById('status');
    cbAutoSync.checked = result.autoSyncWiki === true;
    cbAutoSync.addEventListener('change', async () => {
      const enabled = cbAutoSync.checked;
      if (enabled) {
        const granted = await chrome.permissions.request({ origins: ['https://en.wikipedia.org/*'] });
        if (!granted) {
          cbAutoSync.checked = false;
          statusEl.textContent = statusEl.textContent.replace(/^(\d+ names tracked)/, '$1 · auto-sync needs Wikipedia access');
          return;
        }
      }
      chrome.storage.local.set({ autoSyncWiki: enabled });
      chrome.runtime.sendMessage({ type: 'setAutoSync', enabled }, () => { void chrome.runtime.lastError; });
    });

    // Redact row
    const redactRow = document.getElementById('redactRow');
    if (isRedact) redactRow.classList.add('active');
    redactRow.addEventListener('click', () => {
      const nowRedact = !redactRow.classList.contains('active');
      redactRow.classList.toggle('active', nowRedact);
      const newColor = nowRedact ? '#000000' : '#ffe066';
      chrome.storage.local.set({ highlightColor: newColor });
      // Deselect all highlight swatches when redact is active
      document.querySelectorAll('#highlightSwatches .swatch')
        .forEach(s => s.classList.toggle('active', s.dataset.hex === newColor));
    });
  }
);

function buildSwatches(containerId, activeColor, onChange) {
  const container = document.getElementById(containerId);
  for (const { hex, label } of COLORS) {
    const swatch = document.createElement('div');
    swatch.className = 'swatch' + (hex === activeColor ? ' active' : '');
    swatch.style.background = hex;
    swatch.style.boxShadow = hex === '#ffffff' ? 'inset 0 0 0 1px #ccc' : 'none';
    swatch.dataset.hex = hex;
    swatch.title = label;
    swatch.addEventListener('click', () => {
      container.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      onChange(hex);
    });
    container.appendChild(swatch);
  }
}

function updateIconPreview(color) {
  const band = document.getElementById('iconPreviewBand');
  if (band) band.setAttribute('fill', color);
}

const DEFAULTS = {
  enabled: true,
  showHighlight: true,
  showIcon: true,
  highlightColor: '#ffe066',
  iconColor: '#ffe066',
  autoSyncWiki: false,
};

document.getElementById('resetBtn').addEventListener('click', () => {
  chrome.storage.local.set(DEFAULTS, () => window.location.reload());
});

// Sync from Wikipedia (one-time). Requests optional host permission first; if auto-sync is on, background will schedule alarm.
document.getElementById('refreshListBtn').addEventListener('click', async () => {
  const btn = document.getElementById('refreshListBtn');
  const statusEl = document.getElementById('status');
  btn.disabled = true;
  btn.textContent = 'Syncing…';
  try {
    const granted = await chrome.permissions.request({ origins: ['https://en.wikipedia.org/*'] });
    if (!granted) {
      statusEl.textContent = 'Wikipedia access was denied. Using built-in name list.';
      btn.disabled = false;
      btn.textContent = 'Sync from Wikipedia';
      return;
    }
    const res = await chrome.runtime.sendMessage({ type: 'refreshNames' });
    if (res?.ok) {
      statusEl.textContent = `${res.count} names tracked · just updated`;
    } else {
      statusEl.textContent = res?.error === 'Permission not granted'
        ? 'Permission not granted. Using built-in list.'
        : `${res?.count ?? '?'} names · update failed`;
    }
  } catch (_) {
    statusEl.textContent = 'Sync failed (reopen popup to retry)';
  }
  btn.disabled = false;
  btn.textContent = 'Sync from Wikipedia';
});

function updateSubToggles(enabled) {
  const el = document.getElementById('subToggles');
  el.style.opacity = enabled ? '' : '0.4';
  el.style.pointerEvents = enabled ? '' : 'none';
}

// ── Page hits: ask the active tab's content script ────────────────────────────
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab?.id) return showNone('No active tab');

  chrome.tabs.sendMessage(tab.id, { type: 'getPageCounts' }, (response) => {
    if (chrome.runtime.lastError || !response) {
      return showNone('Not available on this page');
    }
    renderHits(response.entries);
  });
});

function renderHits(entries) {
  const list = document.getElementById('hitsList');

  if (!entries || entries.length === 0) {
    list.innerHTML = '<span class="none">No matches on this page</span>';
    return;
  }

  list.innerHTML = '';
  for (const { name, anchor, count } of entries) {
    const row = document.createElement('div');
    row.className = 'hit-row';

    const link = document.createElement('a');
    link.className = 'hit-name';
    link.href = WIKI_BASE + anchor;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = name;

    const badge = document.createElement('span');
    badge.className = 'hit-badge';
    badge.textContent = count;

    row.appendChild(link);
    row.appendChild(badge);
    list.appendChild(row);
  }
}

function showNone(msg) {
  document.getElementById('hitsList').innerHTML = `<span class="none">${msg}</span>`;
}
