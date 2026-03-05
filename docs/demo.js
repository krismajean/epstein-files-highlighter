/**
 * Hero demo: wire popup-style controls to the article facsimile
 * so visitors can toggle highlight, color, redact, and icon visibility.
 */
(function () {
  const container = document.getElementById('heroDemo');
  const showHighlight = document.getElementById('demoShowHighlight');
  const showIcon = document.getElementById('demoShowIcon');
  const redactBtn = document.getElementById('demoRedact');
  const swatchContainer = document.getElementById('demoHighlightSwatches');

  if (!container) return;

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
