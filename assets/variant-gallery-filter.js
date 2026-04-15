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
    // The selected variant JSON is inside variant-picker > script[type="application/json"]
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
})();
