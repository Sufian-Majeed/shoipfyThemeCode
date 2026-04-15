// @ts-nocheck
/**
 * Variant Gallery Filter + Sticky Swatch Bar
 * - Filters gallery images by selected color (via img alt text)
 * - Shows a sticky swatch bar when color swatches scroll out of view
 */

(function () {
  function toHandle(str) {
    return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  function filterGallery(colorHandle, scrollToGallery) {
    const gallery = document.querySelector('media-gallery');
    if (!gallery) return;

    const slides = gallery.querySelectorAll('slideshow-slide');
    if (!slides.length) return;

    let matchCount = 0;
    let firstMatchIndex = -1;

    slides.forEach((slide, i) => {
      const img = slide.querySelector('img');
      if (!img) {
        slide.style.display = '';
        slide.removeAttribute('hidden');
        return;
      }

      const altHandle = toHandle(img.alt || '');

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

    if (matchCount === 0) {
      slides.forEach((slide) => {
        slide.style.display = '';
        slide.removeAttribute('hidden');
      });
      return;
    }

    // Sync thumbnail visibility
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

    // Scroll gallery into view (only on user swatch click, not on initial load)
    if (scrollToGallery) {
      gallery.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function getColorFromVariant(variant) {
    if (!variant) return null;
    const color = variant.option1 || (variant.options && variant.options[0]);
    return color ? toHandle(color) : null;
  }

  // Listen for variant change events
  document.addEventListener('variant:update', function (e) {
    const variant = e.detail && e.detail.resource;
    if (!variant) return;
    const colorHandle = getColorFromVariant(variant);
    if (colorHandle) filterGallery(colorHandle, true);
  });

  // Initial page load — retry until slideshow is ready
  function tryInitialFilter(attempts) {
    const variantDataEl = document.querySelector('variant-picker script[type="application/json"]');
    if (!variantDataEl) return;

    try {
      const variant = JSON.parse(variantDataEl.textContent);
      if (!variant) return;
      const colorHandle = getColorFromVariant(variant);
      if (!colorHandle) return;

      const gallery = document.querySelector('media-gallery');
      const slides = gallery && gallery.querySelectorAll('slideshow-slide');

      if (!slides || !slides.length) {
        // Gallery not ready yet — retry up to 10 times
        if (attempts < 10) {
          setTimeout(() => tryInitialFilter(attempts + 1), 200);
        }
        return;
      }

      filterGallery(colorHandle, false);
    } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(() => tryInitialFilter(0), 300);
  });

  // ── Swatch Overlay (visible on page load, disappears when user scrolls to real swatches) ──

  function createSwatchOverlay() {
    const colorFieldset = document.querySelector('.variant-option--swatches');
    if (!colorFieldset) return;

    const overlay = document.createElement('div');
    overlay.id = 'swatch-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      background: '#fff',
      borderTop: '1px solid #e5e7eb',
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      zIndex: '98',
      boxShadow: '0 -2px 8px rgba(0,0,0,0.10)',
    });

    const label = document.createElement('span');
    Object.assign(label.style, {
      fontSize: '12px',
      fontWeight: '600',
      color: '#444',
      whiteSpace: 'nowrap',
      marginRight: '4px',
    });
    label.textContent = 'Color:';
    overlay.appendChild(label);

    const realLabels = colorFieldset.querySelectorAll('label.variant-option__button-label--has-swatch');
    realLabels.forEach((realLabel) => {
      const wrapper = document.createElement('button');
      wrapper.type = 'button';
      Object.assign(wrapper.style, {
        background: 'none',
        border: 'none',
        padding: '0',
        cursor: 'pointer',
        borderRadius: '6px',
        flexShrink: '0',
      });

      const swatchEl = realLabel.querySelector('.swatch');
      if (swatchEl) {
        wrapper.appendChild(swatchEl.cloneNode(true));
      }

      const realInput = realLabel.querySelector('input');
      if (realInput && realInput.checked) {
        wrapper.style.outline = '2px solid #000';
        wrapper.style.outlineOffset = '3px';
      }

      wrapper.addEventListener('click', function () {
        const input = realLabel.querySelector('input');
        if (input && !input.checked) input.click();
      });

      overlay.appendChild(wrapper);
    });

    document.body.appendChild(overlay);

    // Update selected outline on variant change
    document.addEventListener('variant:update', function () {
      const buttons = overlay.querySelectorAll('button');
      realLabels.forEach((realLabel, idx) => {
        const input = realLabel.querySelector('input');
        const btn = buttons[idx];
        if (!btn) return;
        btn.style.outline = (input && input.checked) ? '2px solid #000' : '';
        btn.style.outlineOffset = (input && input.checked) ? '3px' : '';
      });
    });

    // Permanently hide overlay once real swatches scroll into view
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          overlay.style.display = 'none';
          observer.disconnect(); // no need to watch anymore
        }
      });
    }, { threshold: 0.1 });

    observer.observe(colorFieldset);
  }

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(createSwatchOverlay, 500);
  });
})();
