// @ts-nocheck
/**
 * Variant Gallery Filter
 * Filters product gallery images based on selected color variant.
 * Images must have alt text containing their color variant name (e.g. "crimson-navy-stripe").
 */

(function () {
  function toHandle(str) {
    return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  function filterGallery(colorHandle) {
    // The product media gallery uses a <media-gallery> custom element
    const gallery = document.querySelector('media-gallery');
    if (!gallery) return;

    const slides = gallery.querySelectorAll('slideshow-slide');
    if (!slides.length) return;

    let matchCount = 0;
    let firstMatchIndex = -1;

    slides.forEach((slide, i) => {
      const img = slide.querySelector('img');
      if (!img) {
        // Non-image media (video/model) — always show
        slide.style.display = '';
        slide.removeAttribute('hidden');
        return;
      }

      const altHandle = toHandle(img.alt || '');

      // Show if: no alt text set, alt contains color, or color contains alt
      if (!altHandle || altHandle.includes(colorHandle) || colorHandle.includes(altHandle)) {
        slide.style.display = '';
        slide.removeAttribute('hidden');
        if (firstMatchIndex === -1) firstMatchIndex = i;
        matchCount++;
      } else {
        slide.style.display = 'none';
        slide.setAttribute('hidden', '');
      }
    });

    // No matches found — fall back to showing all slides
    if (matchCount === 0) {
      slides.forEach((slide) => {
        slide.style.display = '';
        slide.removeAttribute('hidden');
      });
      return;
    }

    // Sync thumbnail visibility with slide visibility
    const thumbs = gallery.querySelectorAll('.slideshow-controls__thumbnail, [ref="thumbnailButton[]"]');
    if (thumbs.length) {
      slides.forEach((slide, i) => {
        const thumb = thumbs[i];
        if (!thumb) return;
        thumb.style.display = slide.style.display === 'none' ? 'none' : '';
      });
    }

    // Navigate to first matching slide
    if (firstMatchIndex !== -1) {
      const slideshowEl = gallery.querySelector('slideshow-component');
      if (slideshowEl && typeof slideshowEl.select === 'function') {
        slideshowEl.select(firstMatchIndex, undefined, { animate: false });
      }
    }

    // Scroll gallery into view so user can see the filtered images
    gallery.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function getColorFromVariant(variant) {
    if (!variant) return null;
    // option1 is typically Color in this store
    const color = variant.option1 || (variant.options && variant.options[0]);
    return color ? toHandle(color) : null;
  }

  // Listen for variant change events (bubbles from variant-picker to document)
  document.addEventListener('variant:update', function (e) {
    const variant = e.detail && e.detail.resource;
    if (!variant) return;
    const colorHandle = getColorFromVariant(variant);
    if (colorHandle) filterGallery(colorHandle);
  });

  // Also handle initial page load — filter based on selected variant
  document.addEventListener('DOMContentLoaded', function () {
    const variantDataEl = document.querySelector('variant-picker script[type="application/json"]');
    if (!variantDataEl) return;

    try {
      const variant = JSON.parse(variantDataEl.textContent);
      if (variant) {
        const colorHandle = getColorFromVariant(variant);
        if (colorHandle) {
          setTimeout(() => filterGallery(colorHandle), 300);
        }
      }
    } catch (e) {}
  });

  // ── Swatch Quick-Pick Bar ───────────────────────────────────────────────────
  // Shows at bottom when real swatches are below viewport (page load or scroll back up)
  // Hides when real swatches are visible or above viewport (scrolled past them)

  function createSwatchBar() {
    const colorFieldset = document.querySelector('.variant-option--swatches');
    if (!colorFieldset) return;

    const bar = document.createElement('div');
    bar.id = 'swatch-quickpick';
    Object.assign(bar.style, {
      position: 'fixed',
      bottom: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(8px)',
      borderRadius: '50px',
      padding: '6px 12px',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      zIndex: '98',
      boxShadow: '0 2px 12px rgba(0,0,0,0.20)',
      width: 'auto',
    });

    const label = document.createElement('span');
    Object.assign(label.style, {
      fontSize: '11px',
      fontWeight: '600',
      color: '#fff',
      whiteSpace: 'nowrap',
      marginRight: '2px',
    });
    label.textContent = 'Color:';
    bar.appendChild(label);

    const realLabels = colorFieldset.querySelectorAll('label.variant-option__button-label--has-swatch');

    realLabels.forEach(function (realLabel) {
      const btn = document.createElement('button');
      btn.type = 'button';
      Object.assign(btn.style, {
        background: 'none',
        border: 'none',
        padding: '0',
        cursor: 'pointer',
        borderRadius: '6px',
        flexShrink: '0',
      });

      const swatchEl = realLabel.querySelector('.swatch');
      if (swatchEl) btn.appendChild(swatchEl.cloneNode(true));

      const realInput = realLabel.querySelector('input');
      if (realInput && realInput.checked) {
        btn.style.outline = '2px solid #000';
        btn.style.outlineOffset = '3px';
      }

      btn.addEventListener('click', function () {
        const input = realLabel.querySelector('input');
        if (input && !input.checked) input.click();
      });

      bar.appendChild(btn);
    });

    document.body.appendChild(bar);

    // Keep selected outline in sync
    document.addEventListener('variant:update', function () {
      const buttons = bar.querySelectorAll('button');
      realLabels.forEach(function (realLabel, idx) {
        const input = realLabel.querySelector('input');
        const btn = buttons[idx];
        if (!btn) return;
        const selected = input && input.checked;
        btn.style.outline = selected ? '2px solid #000' : '';
        btn.style.outlineOffset = selected ? '3px' : '';
      });
    });

    // Show/hide based on where real swatches are relative to viewport
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          // Real swatches are visible — hide bar
          bar.style.display = 'none';
        } else if (entry.boundingClientRect.top > 0) {
          // Swatches are BELOW viewport (not yet reached, or scrolled back above) — show bar
          bar.style.display = 'flex';
        } else {
          // Swatches are ABOVE viewport (scrolled past them going down) — hide bar
          bar.style.display = 'none';
        }
      });
    }, { threshold: 0 });

    observer.observe(colorFieldset);
  }

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(createSwatchBar, 500);
  });
})();
