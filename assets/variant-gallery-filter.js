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

  // ── Sticky Swatch Bar ──────────────────────────────────────────────────────

  function createStickySwatch() {
    const colorFieldset = document.querySelector('.variant-option--swatches');
    if (!colorFieldset) return;

    const sticky = document.createElement('div');
    sticky.id = 'sticky-swatches';
    Object.assign(sticky.style, {
      position: 'fixed',
      bottom: '72px',
      left: '0',
      right: '0',
      background: '#fff',
      borderTop: '1px solid #e5e7eb',
      padding: '8px 16px',
      display: 'none',
      alignItems: 'center',
      gap: '8px',
      zIndex: '98',
      boxShadow: '0 -2px 8px rgba(0,0,0,0.08)',
      overflowX: 'auto',
      justifyContent: 'center',
    });

    const label = document.createElement('span');
    Object.assign(label.style, {
      fontSize: '12px',
      fontWeight: '600',
      color: '#666',
      whiteSpace: 'nowrap',
      marginRight: '4px',
    });
    label.textContent = 'Color:';
    sticky.appendChild(label);

    // Clone each swatch label (without the radio input to avoid form conflicts)
    const realLabels = colorFieldset.querySelectorAll('label.variant-option__button-label--has-swatch');
    realLabels.forEach((realLabel, idx) => {
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

      // Copy just the swatch visual element
      const swatchEl = realLabel.querySelector('.swatch');
      if (swatchEl) {
        const clonedSwatch = swatchEl.cloneNode(true);
        wrapper.appendChild(clonedSwatch);
      }

      // Mark initially selected
      const realInput = realLabel.querySelector('input');
      if (realInput && realInput.checked) {
        wrapper.style.outline = '2px solid #000';
        wrapper.style.outlineOffset = '3px';
      }

      wrapper.addEventListener('click', function () {
        const input = realLabel.querySelector('input');
        if (input && !input.checked) {
          input.click();
        }
      });

      sticky.dataset['label' + idx] = idx;
      sticky.appendChild(wrapper);
    });

    document.body.appendChild(sticky);

    // Update selected outline when variant changes
    document.addEventListener('variant:update', function () {
      const buttons = sticky.querySelectorAll('button');
      realLabels.forEach((realLabel, idx) => {
        const input = realLabel.querySelector('input');
        const btn = buttons[idx];
        if (!btn) return;
        if (input && input.checked) {
          btn.style.outline = '2px solid #000';
          btn.style.outlineOffset = '3px';
        } else {
          btn.style.outline = '';
          btn.style.outlineOffset = '';
        }
      });
    });

    // Adjust bottom when sticky add-to-cart activates
    const stickyBar = document.querySelector('.sticky-add-to-cart__bar');
    function updateBottom() {
      if (stickyBar && stickyBar.getAttribute('data-stuck') === 'true') {
        sticky.style.bottom = (stickyBar.offsetHeight + 2) + 'px';
      } else {
        sticky.style.bottom = '72px';
      }
    }
    if (stickyBar) {
      new MutationObserver(updateBottom).observe(stickyBar, { attributes: true, attributeFilter: ['data-stuck'] });
    }

    // Only show sticky bar AFTER user has scrolled down to see the real swatches once
    let userHasSeenSwatches = false;

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          // User scrolled down to see real swatches — mark seen, hide sticky
          userHasSeenSwatches = true;
          sticky.style.display = 'none';
        } else if (userHasSeenSwatches) {
          // Real swatches are off screen AND user has seen them before — show sticky
          sticky.style.display = 'flex';
          updateBottom();
        }
        // If !isIntersecting and !userHasSeenSwatches → initial load above fold, do nothing
      });
    }, { threshold: 0.1 });

    observer.observe(colorFieldset);
  }

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(createStickySwatch, 500);
  });
})();
