// background/service-worker.js
// Fetches the name list from Wikipedia and caches it in chrome.storage.local.
// Content scripts use this cache; falls back to hardcoded names if unavailable.

const WIKI_API =
  'https://en.wikipedia.org/w/api.php' +
  '?action=parse' +
  '&page=List_of_people_named_in_the_Epstein_files' +
  '&prop=sections' +
  '&format=json' +
  '&origin=*';

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Section headers and nav to skip (not people's names)
const SKIP_SECTIONS = new Set([
  'References', 'External links', 'Contents', 'See also', 'Notes',
  'Background', 'Releases', 'Redactions', 'Litigation', 'Names', 'Name',
]);
// Alphabet range headers from the Wikipedia list (e.g. "A-C", "D-F")
const ALPHABET_RANGE = /^[A-Za-z]-[A-Za-z]$/;

async function fetchAndCacheNames() {
  try {
    const resp = await fetch(WIKI_API);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    const sections = data?.parse?.sections ?? [];
    const names = [];

    for (const s of sections) {
      const name = s.line?.trim();
      const anchor = s.anchor?.trim();
      if (!name || !anchor) continue;
      // Skip single-letter alphabet grouping headers (A, B, C, ...)
      if (/^[A-Za-z]$/.test(name)) continue;
      // Skip alphabet range headers (A-C, D-F, ...) and other known section titles
      if (ALPHABET_RANGE.test(name) || SKIP_SECTIONS.has(name)) continue;
      // Split "X and Y" into two entries with the same anchor so both highlight and link to same section
      if (name.includes(' and ')) {
        const parts = name.split(' and ').map((p) => p.trim()).filter(Boolean);
        for (const part of parts) names.push({ name: part, anchor });
      } else {
        names.push({ name, anchor });
      }
    }

    // Sanity check — reject obviously broken responses
    if (names.length > 50) {
      await chrome.storage.local.set({
        epsteinNames: names,
        namesFetchedAt: Date.now(),
      });
      console.log(`[Epstein Highlighter] Cached ${names.length} names from Wikipedia`);
    }
  } catch (err) {
    console.warn('[Epstein Highlighter] Failed to refresh names from Wikipedia:', err.message);
    // Non-fatal: content scripts will use HARDCODED_NAMES as fallback
  }
}

// No fetch on install — Wikipedia is an optional permission, granted when user clicks "Refresh list".
chrome.runtime.onInstalled.addListener(() => {});

const ALARM_NAME = 'refreshEpsteinNames';
const ALARM_PERIOD_MINUTES = 1440; // 24 hours

// On startup: if permission + autoSync enabled, refresh if stale and ensure alarm exists.
chrome.runtime.onStartup.addListener(async () => {
  const granted = await chrome.permissions.contains({ origins: ['https://en.wikipedia.org/*'] });
  if (!granted) return;
  const { namesFetchedAt, autoSyncWiki } = await chrome.storage.local.get(['namesFetchedAt', 'autoSyncWiki']);
  if (autoSyncWiki) {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_PERIOD_MINUTES });
    if (!namesFetchedAt || Date.now() - namesFetchedAt > CACHE_MAX_AGE_MS) {
      await fetchAndCacheNames();
    }
  }
});

// Auto-sync: only runs when optional permission and autoSync are both enabled.
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  const granted = await chrome.permissions.contains({ origins: ['https://en.wikipedia.org/*'] });
  if (!granted) return;
  const { autoSyncWiki } = await chrome.storage.local.get('autoSyncWiki');
  if (!autoSyncWiki) return;
  const { namesFetchedAt } = await chrome.storage.local.get('namesFetchedAt');
  if (!namesFetchedAt || Date.now() - namesFetchedAt > CACHE_MAX_AGE_MS) {
    await fetchAndCacheNames();
  }
});

// ── Messages: badge + refresh names ───────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'refreshNames') {
    chrome.permissions.contains({ origins: ['https://en.wikipedia.org/*'] }).then((granted) => {
      if (!granted) {
        sendResponse({ ok: false, error: 'Permission not granted' });
        return;
      }
      fetchAndCacheNames()
        .then(async () => {
          const { epsteinNames, namesFetchedAt, autoSyncWiki } = await chrome.storage.local.get([
            'epsteinNames',
            'namesFetchedAt',
            'autoSyncWiki',
          ]);
          if (autoSyncWiki) {
            chrome.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_PERIOD_MINUTES });
          }
          sendResponse({ ok: true, count: epsteinNames?.length ?? 0, namesFetchedAt });
        })
        .catch((err) => sendResponse({ ok: false, error: err.message }));
    });
    return true; // keep channel open for async sendResponse
  }

  if (msg.type === 'setAutoSync') {
    const enabled = !!msg.enabled;
    if (enabled) {
      chrome.permissions.contains({ origins: ['https://en.wikipedia.org/*'] }).then((granted) => {
        if (granted) {
          chrome.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_PERIOD_MINUTES });
        }
      });
    } else {
      chrome.alarms.clear(ALARM_NAME);
    }
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type !== 'setBadge') return;
  const tabId = sender.tab?.id;
  if (!tabId) return;

  if (msg.count > 0) {
    const label = msg.count > 999 ? '999+' : String(msg.count);
    chrome.action.setBadgeText({ text: label, tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#1a3a5c', tabId });
    chrome.action.setBadgeTextColor({ color: '#ffe066', tabId });
  } else {
    chrome.action.setBadgeText({ text: '', tabId });
  }
});

// Clear badge when navigating to a new page
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    chrome.action.setBadgeText({ text: '', tabId });
  }
});
