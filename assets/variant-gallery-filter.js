/**
 * Variant Gallery Filter
 * Filters product gallery images based on selected color variant
 * Images must have alt text matching their color variant name (e.g. "crimson-navy-stripe")
 */

(function () {
  function toHandle(str) {
    return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  function filterGallery(colorHandle) {
    const gallery = document.querySelector('.product-media-gallery');
    if (!gallery) return;

    const slides = gallery.querySelectorAll('slideshow-slide');
    if (!slides.length) return;

    let matchCount = 0;
    let firstMatch = null;

    slides.forEach((slide) => {
      const img = slide.querySelector('img');
      if (!img) return;

      const altHandle = toHandle(img.alt || '');

      // If image has no alt text or alt matches color — show it
      if (!altHandle || altHandle.includes(colorHandle) || colorHandle.includes(altHandle)) {
        slide.style.display = '';
        slide.removeAttribute('hidden');
        if (!firstMatch) firstMatch = slide;
        matchCount++;
      } else {
        slide.style.display = 'none';
        slide.setAttribute('hidden', '');
      }
    });

    // If no matches found (alt text not set up) — show all slides
    if (matchCount === 0) {
      slides.forEach((slide) => {
        slide.style.display = '';
        slide.removeAttribute('hidden');
      });
    }

    // Also filter thumbnails if present
    const thumbs = gallery.querySelectorAll('.slideshow-controls__thumbnail');
    if (thumbs.length) {
      let thumbIndex = 0;
      slides.forEach((slide, i) => {
        const thumb = thumbs[i];
        if (!thumb) return;
        if (slide.style.display === 'none') {
          thumb.style.display = 'none';
        } else {
          thumb.style.display = '';
        }
      });
    }

    // Go to first visible slide
    if (firstMatch) {
      const slideshowEl = gallery.querySelector('slideshow-component');
      if (slideshowEl && typeof slideshowEl.goToSlide === 'function') {
        const index = Array.from(slides).indexOf(firstMatch);
        slideshowEl.goToSlide(index);
      }
    }
  }

  function getColorFromVariant(variant) {
    if (!variant) return null;
    // option1 is typically Color in this store
    const color = variant.option1 || (variant.options && variant.options[0]);
    return color ? toHandle(color) : null;
  }

  // Listen for variant change events
  document.addEventListener('variant:update', function (e) {
    const variant = e.detail && e.detail.resource;
    if (!variant) return;
    const colorHandle = getColorFromVariant(variant);
    if (colorHandle) filterGallery(colorHandle);
  });

  // Also handle initial page load — filter based on selected variant
  document.addEventListener('DOMContentLoaded', function () {
    const selectedInput = document.querySelector(
      'input[name="id"][data-selected], form[action="/cart/add"] input[name="id"]'
    );
    if (!selectedInput) return;

    const variantId = selectedInput.value;
    if (!variantId) return;

    // Try to get variant data from page JSON
    const variantDataEl = document.querySelector('[data-product-json], script[type="application/json"][data-product-json]');
    if (!variantDataEl) return;

    try {
      const productData = JSON.parse(variantDataEl.textContent);
      const variant = productData.variants && productData.variants.find(v => String(v.id) === String(variantId));
      if (variant) {
        const colorHandle = getColorFromVariant(variant);
        if (colorHandle) {
          setTimeout(() => filterGallery(colorHandle), 300);
        }
      }
    } catch (e) {}
  });
})();
