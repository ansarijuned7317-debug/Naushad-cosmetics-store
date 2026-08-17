/**
 * Naushad Cosmetics — Live Products from Admin Panel
 * ------------------------------------------------------------
 * Fetches products that were added through the Admin Panel (stored in
 * MongoDB via the backend's Product API) and renders them as real product
 * cards on the storefront — same look, same Purchase/wishlist/share
 * behaviour as the rest of the catalog.
 *
 * This only runs once ADMIN_API_BASE_URL below is set to your deployed
 * backend. Until then it does nothing, and the rest of the site is
 * completely unaffected (progressive enhancement, not a hard dependency).
 * ------------------------------------------------------------
 */

// TODO: set this once your backend is deployed, e.g.
// const ADMIN_API_BASE_URL = 'https://naushad-cosmetics-api.onrender.com';
const ADMIN_API_BASE_URL = '';

document.addEventListener('DOMContentLoaded', () => {
  if (!ADMIN_API_BASE_URL) return; // backend not connected yet - nothing to do

  const section = document.getElementById('liveProductsSection');
  const grid = document.getElementById('liveProductsGrid');
  if (!section || !grid) return;

  loadLiveProducts();

  async function loadLiveProducts() {
    try {
      const res = await fetch(`${ADMIN_API_BASE_URL}/api/products?sort=newest&limit=24`);
      const data = await res.json();
      if (!res.ok || !data.success || !Array.isArray(data.data) || data.data.length === 0) return;

      grid.innerHTML = data.data.map(productToCardHtml).join('');
      section.style.display = '';

      grid.querySelectorAll('.card').forEach(card => {
        if (window.ncWireDynamicCard) window.ncWireDynamicCard(card);
      });
    } catch (err) {
      console.warn('Could not load live products from admin panel:', err.message);
      // Silent fail - the static catalog below still works fine on its own.
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function stars(rating) {
    const full = Math.round(rating || 0);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }

  function productToCardHtml(p) {
    const primaryImage = (p.images || []).find(i => i.isPrimary) || (p.images || [])[0];
    const brandName = p.brand && p.brand.name ? p.brand.name : '';
    const categoryName = p.category && p.category.name ? p.category.name : '';
    const price = p.discountPrice && p.discountPrice < p.price ? p.discountPrice : p.price;
    const hasDiscount = p.discountPrice && p.discountPrice < p.price;

    const media = primaryImage
      ? `<img src="${escapeHtml(primaryImage.url)}" alt="${escapeHtml(p.name)}" loading="lazy">`
      : `<div class="icon-tile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2 4 6v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6l-2-4Z"/><path d="M4 6h16M9 10a3 3 0 0 0 6 0"/></svg></div>`;

    return `
        <div class="card">
          <div class="card-media">
            ${media}
            <button type="button" class="btn-wishlist" data-wishlist-name="${escapeHtml(p.name)}" aria-label="Add to wishlist"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6.7-4.35-9.3-8.1C1 10 1.5 6.5 4.5 5 7 3.8 9.5 4.8 12 7.5 14.5 4.8 17 3.8 19.5 5c3 1.5 3.5 5 1.8 7.9C18.7 16.65 12 21 12 21Z"/></svg></button>
            <span class="tag-new">New</span>
            ${brandName ? `<span class="tag-brand">${escapeHtml(brandName)}</span>` : ''}
          </div>
          <div class="card-body">
            ${categoryName ? `<span class="card-cat">${escapeHtml(categoryName)}</span>` : ''}
            <h3>${escapeHtml(p.name)}</h3>
            <p class="card-desc">${escapeHtml(p.shortDescription || p.description || '')}</p>
            <div class="card-meta"><span class="stars">${stars(p.ratingAverage)}</span><span>${(p.ratingAverage || 0).toFixed(1)} (${p.ratingCount || 0})</span></div>
            <div class="price-row">
              <span class="price">₹${price}</span>
              ${hasDiscount ? `<span class="price-was">₹${p.price}</span>` : ''}
            </div>
            <div class="card-actions">
              <a href="product.html" class="btn-order" data-product="${escapeHtml(p.name)}" data-howto="${escapeHtml(p.howToUse || '')}" data-benefits="${escapeHtml(p.shortDescription || '')}">View &amp; Order</a>
              <button type="button" class="btn-share" data-share-name="${escapeHtml(p.name)}" aria-label="Share this product">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg>
              </button>
            </div>
          </div>
        </div>`;
  }
});
