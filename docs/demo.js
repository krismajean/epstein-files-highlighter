/**
 * Hero demo: wire popup-style controls to the article facsimile
 * so visitors can toggle highlight, color, redact, and icon visibility.
 * Loads demo-previews.json for Wikipedia preview-on-hover tooltips.
 */
(function () {
  const container = document.getElementById('heroDemo');
  const showHighlight = document.getElementById('demoShowHighlight');
  const showIcon = document.getElementById('demoShowIcon');
  const previewToggle = document.getElementById('demoShowPreview');
  const redactBtn = document.getElementById('demoRedact');
  const swatchContainer = document.getElementById('demoHighlightSwatches');

  if (!container) return;

  // Load preview snippets (from docs/demo-previews.json, updated by scripts/fetch_demo_previews.py)
  let demoPreviews = null;
  const tooltipEl = document.getElementById('demoPreviewTooltip');
  const tooltipContent = tooltipEl && tooltipEl.querySelector('.demo-preview-tooltip-content');
  let previewHideTimer = null;

  fetch('demo-previews.json')
    .then(function (r) { return r.ok ? r.json() : {}; })
    .then(function (obj) { demoPreviews = obj || {}; })
    .catch(function () { demoPreviews = {}; })
    .then(function () { wirePreviewHover(); });

  function makeLinksAbsolute(html) {
    if (!html) return html;
    return html.replace(/href="\/wiki\//gi, 'href="https://en.wikipedia.org/wiki/');
  }

  function getAnchorFromLink(link) {
    const href = link.getAttribute('href') || '';
    const hash = href.indexOf('#');
    return hash >= 0 ? href.slice(hash + 1) : '';
  }

  function showPreview(link, anchor) {
    if (!previewToggle || !previewToggle.checked) return;
    if (!demoPreviews || !tooltipEl || !tooltipContent) return;
    const html = demoPreviews[anchor];
    if (!html) return;
    tooltipContent.innerHTML = makeLinksAbsolute(html);
    const rect = link.getBoundingClientRect();
    tooltipEl.style.left = Math.max(8, Math.min(rect.left, (window.innerWidth || document.documentElement.clientWidth) - 348)) + 'px';
    tooltipEl.style.top = (rect.bottom + 6) + 'px';
    tooltipEl.setAttribute('aria-hidden', 'false');
    tooltipEl.classList.add('demo-preview-tooltip-visible');
  }

  function hidePreview() {
    if (!tooltipEl) return;
    tooltipEl.setAttribute('aria-hidden', 'true');
    tooltipEl.classList.remove('demo-preview-tooltip-visible');
  }

  function updateDemoLinkTitles() {
    const previewOn = previewToggle && previewToggle.checked;
    container.querySelectorAll('.epstein-ref-link').forEach(function (link) {
      const name = link.getAttribute('aria-label') ? link.getAttribute('aria-label').replace(' named in Epstein files', '') : 'Name';
      if (previewOn) {
        link.removeAttribute('title');
      } else {
        link.setAttribute('title', name + ' — named in Epstein files · Epstein Files Highlighter');
      }
    });
  }

  function wirePreviewHover() {
    if (!tooltipEl || !tooltipContent) return;
    container.querySelectorAll('.epstein-ref-link').forEach(function (link) {
      link.addEventListener('mouseenter', function () {
        clearTimeout(previewHideTimer);
        previewHideTimer = setTimeout(function () {
          showPreview(link, getAnchorFromLink(link));
        }, 200);
      });
      link.addEventListener('mouseleave', function () {
        clearTimeout(previewHideTimer);
        previewHideTimer = setTimeout(hidePreview, 100);
      });
    });
    tooltipEl.addEventListener('mouseenter', function () { clearTimeout(previewHideTimer); });
    tooltipEl.addEventListener('mouseleave', function () { previewHideTimer = setTimeout(hidePreview, 100); });
    updateDemoLinkTitles();
  }

  if (previewToggle) {
    previewToggle.addEventListener('change', function () {
      if (!previewToggle.checked) hidePreview();
      updateDemoLinkTitles();
    });
  }

  swatchContainer.querySelectorAll('.demo-swatch').forEach(function (btn) {
    btn.style.background = btn.dataset.hex || '#ffe066';
  });

  function setDemoHighlight(hex) {
    container.style.setProperty('--demo-highlight', hex);
    container.style.setProperty('--demo-icon', hex);
  }

  function updateSwatchActive(hex) {
    swatchContainer.querySelectorAll('.demo-swatch').forEach(function (el) {
      el.classList.toggle('active', el.dataset.hex === hex);
    });
  }

  // Highlight on/off
  showHighlight.addEventListener('change', function () {
    container.classList.toggle('manifest-hide-highlight', !showHighlight.checked);
  });

  // Icon on/off
  showIcon.addEventListener('change', function () {
    container.classList.toggle('manifest-hide-icon', !showIcon.checked);
  });

  let lastHighlightColor = '#ffe066';

  // Color swatches (and remember for restore after redact)
  swatchContainer.querySelectorAll('.demo-swatch').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const hex = this.dataset.hex;
      lastHighlightColor = hex;
      redactBtn.classList.remove('active');
      container.classList.remove('manifest-redact');
      setDemoHighlight(hex);
      updateSwatchActive(hex);
    });
  });

  // Redact toggle
  redactBtn.addEventListener('click', function () {
    const nowRedact = this.classList.toggle('active');
    container.classList.toggle('manifest-redact', nowRedact);
    if (nowRedact) {
      setDemoHighlight('#000000');
      swatchContainer.querySelectorAll('.demo-swatch').forEach(function (el) {
        el.classList.remove('active');
      });
    } else {
      setDemoHighlight(lastHighlightColor);
      updateSwatchActive(lastHighlightColor);
    }
  });
})();
