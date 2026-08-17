/**
 * Naushad Cosmetics - Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {

  // ---------- 1. Mobile Menu Functionality ----------
  const navToggle = document.getElementById('navToggle');
  const navMobile = document.getElementById('navMobile');

  function closeMobileNav() {
    if (!navToggle || !navMobile) return;
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    navMobile.classList.remove('open');
  }

  if (navToggle && navMobile) {
    navToggle.addEventListener('click', () => {
      const isOpen = navMobile.classList.toggle('open');
      navToggle.classList.toggle('open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    navMobile.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMobileNav);
    });
  }

  // ---------- 2. Dynamic Category Filtering ----------
  const filterContainers = document.querySelectorAll('.filters');

  filterContainers.forEach(container => {
    const buttons = container.querySelectorAll('.filter-btn');
    const parentSection = container.closest('.section');
    const cards = parentSection ? parentSection.querySelectorAll('.grid .card') : [];

    buttons.forEach(button => {
      button.addEventListener('click', () => {
        buttons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const filterValue = button.getAttribute('data-filter');

        cards.forEach(card => {
          const tags = card.getAttribute('data-tags');
          if (!tags || filterValue === 'all' || tags.includes(filterValue)) {
            card.style.display = 'flex';
            card.style.opacity = '1';
          } else {
            card.style.display = 'none';
            card.style.opacity = '0';
          }
        });
      });
    });
  });

  // ---------- 3. Purchase Buttons -> Product Detail Page ----------
  // Captures everything the product page (product.html) and order form
  // (1card.html) need: name, price, category/size, brand, image, rating.
  function captureProductData(link) {
    const productName = link.getAttribute('data-product');
    const card = link.closest('.card');

    const priceEl = card ? card.querySelector('.price') : null;
    const priceWasEl = card ? card.querySelector('.price-was') : null;
    const catEl = card ? card.querySelector('.card-cat') : null;
    const brandEl = card ? card.querySelector('.tag-brand') : null;
    const imgEl = card ? card.querySelector('.card-media img') : null;
    const iconTileEl = card ? card.querySelector('.card-media .icon-tile') : null;
    const section = card ? card.closest('.section') : null;
    const sectionTitle = section && section.querySelector('h2') ? section.querySelector('h2').textContent.trim() : '';
    const descEl = card ? card.querySelector('.card-desc') : null;
    const starsEl = card ? card.querySelector('.card-meta .stars') : null;
    const ratingTextEl = card ? card.querySelector('.card-meta span:last-child') : null;

    return {
      name: productName,
      price: priceEl ? priceEl.textContent.trim() : '',
      priceWas: priceWasEl ? priceWasEl.textContent.trim() : '',
      meta: catEl ? catEl.textContent.trim() : '',
      brand: brandEl ? brandEl.textContent.trim() : '',
      image: imgEl ? imgEl.getAttribute('src') : '',
      icon: (!imgEl && iconTileEl) ? iconTileEl.innerHTML : '',
      category: sectionTitle,
      desc: descEl ? descEl.textContent.trim() : '',
      stars: starsEl ? starsEl.textContent.trim() : '',
      ratingText: ratingTextEl ? ratingTextEl.textContent.trim() : '',
      howto: link.getAttribute('data-howto') || '',
      benefits: link.getAttribute('data-benefits') || ''
    };
  }

  function goToProductPage(link) {
    const order = captureProductData(link);
    try {
      sessionStorage.setItem('nc_selected_product', order.name);
      sessionStorage.setItem('nc_selected_product_data', JSON.stringify(order));
    } catch (e) { /* sessionStorage unavailable - safe to ignore */ }
    window.location.href = 'product.html';
  }

  document.querySelectorAll('.btn-order[data-product]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      goToProductPage(link);
    });

    // Clicking the product image or title also opens the product page,
    // not just the button — matches how most shopping sites behave.
    const card = link.closest('.card');
    if (card) {
      const img = card.querySelector('.card-media img, .card-media .icon-tile');
      const title = card.querySelector('h3');
      [img, title].forEach(el => {
        if (!el) return;
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => goToProductPage(link));
      });
    }
  });


  // ---------- 4. Site-wide Live Product Search ----------
  const searchInput = document.getElementById('siteSearch');
  const searchResultsBox = document.getElementById('searchResults');
  const searchClearBtn = document.getElementById('searchClear');
  const allCards = Array.from(document.querySelectorAll('.section .grid .card'));

  // Build a lightweight index of every product card on the page, whichever
  // section (skincare / haircare / bodycare / fashion) it lives in, and
  // whichever HTML file its Purchase button points to.
  const productIndex = allCards.map(card => {
    const nameEl = card.querySelector('h3');
    const catEl = card.querySelector('.card-cat');
    const brandEl = card.querySelector('.tag-brand');
    const priceEl = card.querySelector('.price');
    const ratingEl = card.querySelector('.card-meta span:last-child');
    const imgEl = card.querySelector('.card-media img');
    const linkEl = card.querySelector('.btn-order');
    const section = card.closest('.section');

    const priceNum = priceEl ? parseFloat(priceEl.textContent.replace(/[^\d.]/g, '')) || 0 : 0;
    const ratingNum = ratingEl ? parseFloat(ratingEl.textContent) || 0 : 0;

    return {
      card,
      section,
      sectionId: section ? section.id : '',
      name: nameEl ? nameEl.textContent.trim() : '',
      category: catEl ? catEl.textContent.trim() : '',
      brand: brandEl ? brandEl.textContent.trim() : '',
      price: priceEl ? priceEl.textContent.trim() : '',
      priceNum,
      ratingNum,
      img: imgEl ? imgEl.getAttribute('src') : '',
      link: linkEl ? linkEl.getAttribute('href') : '#',
      searchText: [
        nameEl ? nameEl.textContent : '',
        catEl ? catEl.textContent : '',
        brandEl ? brandEl.textContent : '',
        section ? (section.querySelector('h2') ? section.querySelector('h2').textContent : '') : ''
      ].join(' ').toLowerCase()
    };
  });

  function clearHighlights() {
    productIndex.forEach(p => p.card.classList.remove('highlight'));
  }

  function resetFilter() {
    productIndex.forEach(p => p.card.classList.remove('no-match'));
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('no-results'));
    clearHighlights();
  }

  function renderDropdown(matches, query) {
    if (!searchResultsBox) return;

    if (!query) {
      searchResultsBox.classList.remove('show');
      searchResultsBox.innerHTML = '';
      return;
    }

    if (matches.length === 0) {
      searchResultsBox.innerHTML = `<div class="search-empty">No products found for "${escapeHtml(query)}"</div>`;
      searchResultsBox.classList.add('show');
      return;
    }

    const html = matches.slice(0, 8).map((p, i) => `
      <div class="search-result-item" data-index="${i}" role="button" tabindex="0">
        <div class="search-result-thumb">
          ${p.img
            ? `<img src="${p.img}" alt="${escapeHtml(p.name)}" loading="lazy">`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>`}
        </div>
        <div class="search-result-info">
          <div class="search-result-name">${escapeHtml(p.name)}</div>
          <div class="search-result-meta">${escapeHtml(p.category || p.brand)}</div>
        </div>
        <div class="search-result-price">${escapeHtml(p.price)}</div>
      </div>
    `).join('');

    searchResultsBox.innerHTML = html;
    searchResultsBox.classList.add('show');

    searchResultsBox.querySelectorAll('.search-result-item').forEach(item => {
      const idx = Number(item.getAttribute('data-index'));
      item.addEventListener('click', () => goToProduct(matches[idx]));
      item.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') goToProduct(matches[idx]);
      });
    });
  }

  function goToProduct(product) {
    clearHighlights();
    product.card.classList.add('highlight');
    product.card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (searchResultsBox) searchResultsBox.classList.remove('show');
    window.setTimeout(() => product.card.classList.remove('highlight'), 2200);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function filterGrids(query) {
    applyAllFilters(query);
  }

  // ---------- Advanced filters (category / price / sort) ----------
  const filterToggle = document.getElementById('filterToggle');
  const filterPanel = document.getElementById('filterPanel');
  const filterDot = document.getElementById('filterDot');
  const filterCategory = document.getElementById('filterCategory');
  const filterPrice = document.getElementById('filterPrice');
  const filterSort = document.getElementById('filterSort');
  const filterApplyBtn = document.getElementById('filterApplyBtn');
  const filterClearBtn = document.getElementById('filterClearBtn');

  function activeFiltersCount() {
    let n = 0;
    if (filterCategory && filterCategory.value) n++;
    if (filterPrice && filterPrice.value) n++;
    if (filterSort && filterSort.value) n++;
    return n;
  }

  function updateFilterUI() {
    const n = activeFiltersCount();
    if (filterToggle) filterToggle.classList.toggle('active', n > 0);
    if (filterDot) filterDot.style.display = n > 0 ? 'block' : 'none';
  }

  function applySort() {
    const sortVal = filterSort ? filterSort.value : '';
    if (!sortVal) return;

    const bySection = new Map();
    productIndex.forEach(p => {
      if (!bySection.has(p.section)) bySection.set(p.section, []);
      bySection.get(p.section).push(p);
    });

    bySection.forEach((items, section) => {
      const grid = section.querySelector('.grid');
      if (!grid) return;
      const sorted = [...items].sort((a, b) => {
        if (sortVal === 'price-asc') return a.priceNum - b.priceNum;
        if (sortVal === 'price-desc') return b.priceNum - a.priceNum;
        if (sortVal === 'rating-desc') return b.ratingNum - a.ratingNum;
        return 0;
      });
      sorted.forEach(p => grid.appendChild(p.card));
    });
  }

  function applyAllFilters(query) {
    const category = filterCategory ? filterCategory.value : '';
    const priceRange = filterPrice ? filterPrice.value : '';
    let minPrice = -Infinity, maxPrice = Infinity;
    if (priceRange) {
      const [lo, hi] = priceRange.split('-').map(Number);
      minPrice = lo; maxPrice = hi;
    }

    const hasQuery = !!query;
    const hasCategory = !!category;
    const hasPrice = !!priceRange;

    if (!hasQuery && !hasCategory && !hasPrice) {
      resetFilter();
      applySort();
      return;
    }

    const bySection = new Map();
    productIndex.forEach(p => {
      const matchesQuery = !hasQuery || p.searchText.includes(query);
      const matchesCategory = !hasCategory || p.sectionId === category;
      const matchesPrice = !hasPrice || (p.priceNum >= minPrice && p.priceNum <= maxPrice);
      const match = matchesQuery && matchesCategory && matchesPrice;

      p.card.classList.toggle('no-match', !match);
      if (!bySection.has(p.section)) bySection.set(p.section, 0);
      if (match) bySection.set(p.section, bySection.get(p.section) + 1);
    });

    bySection.forEach((count, section) => {
      section.classList.toggle('no-results', count === 0);
    });

    applySort();
  }

  if (filterToggle && filterPanel) {
    filterToggle.addEventListener('click', () => {
      filterPanel.classList.toggle('show');
    });
    document.addEventListener('click', (e) => {
      if (!filterPanel.contains(e.target) && !filterToggle.contains(e.target)) {
        filterPanel.classList.remove('show');
      }
    });
  }

  if (filterApplyBtn) {
    filterApplyBtn.addEventListener('click', () => {
      updateFilterUI();
      applyAllFilters((searchInput?.value || '').trim().toLowerCase());
      filterPanel.classList.remove('show');
    });
  }

  if (filterClearBtn) {
    filterClearBtn.addEventListener('click', () => {
      if (filterCategory) filterCategory.value = '';
      if (filterPrice) filterPrice.value = '';
      if (filterSort) filterSort.value = '';
      updateFilterUI();
      applyAllFilters((searchInput?.value || '').trim().toLowerCase());
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const raw = searchInput.value.trim();
      const query = raw.toLowerCase();

      if (searchClearBtn) searchClearBtn.classList.toggle('show', raw.length > 0);

      const matches = query
        ? productIndex.filter(p => p.searchText.includes(query))
        : [];

      renderDropdown(matches, raw);
      filterGrids(query);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchInput.blur();
        if (searchClearBtn) searchClearBtn.classList.remove('show');
        renderDropdown([], '');
        resetFilter();
      }
    });

    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim()) {
        searchResultsBox.classList.add('show');
      }
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchClearBtn.classList.remove('show');
      renderDropdown([], '');
      resetFilter();
      searchInput.focus();
    });
  }

  document.addEventListener('click', (e) => {
    if (!searchResultsBox) return;
    const wrap = document.querySelector('.search-wrap');
    if (wrap && !wrap.contains(e.target)) {
      searchResultsBox.classList.remove('show');
    }
  });

  // ---------- 5. Hero Background Video Handling ----------
  // Plays the vintage-TV clip behind the hero copy, but stays considerate of
  // battery, data and accessibility: pauses off-screen, respects reduced
  // motion / data-saver, and falls back cleanly to the poster + gold veil
  // if the video can't play at all.
  const heroEl = document.querySelector('.hero');
  const heroVideo = document.querySelector('.hero-video');

  if (heroEl && heroVideo) {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const conn = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
    const saveData = !!(conn && conn.saveData);
    const slowConnection = !!(conn && /2g/.test(conn.effectiveType || ''));

    function disableHeroVideo() {
      heroEl.classList.add('video-off');
      heroVideo.pause();
      heroVideo.removeAttribute('autoplay');
      heroVideo.src = '';
      heroVideo.load();
    }

    if (prefersReducedMotion || saveData || slowConnection) {
      disableHeroVideo();
    } else {
      // Play/pause based on visibility so the clip doesn't burn battery
      // once the visitor has scrolled past the hero.
      const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            heroVideo.play().catch(() => { /* autoplay blocked - poster stays visible */ });
          } else {
            heroVideo.pause();
          }
        });
      }, { threshold: 0.15 });

      heroObserver.observe(heroEl);

      // If the browser can't actually play the file, drop back to the
      // static poster + gradient so the hero never looks broken.
      heroVideo.addEventListener('error', disableHeroVideo);

      heroVideo.play().catch(() => { /* will retry once it enters the viewport */ });
    }
  }

  // ---------- Share: product cards + whole site ----------
  const SITE_URL = 'https://naushadcosmetics.com'; // update once the site has a live domain
  const SITE_SHARE_TEXT = 'Check out Naushad Cosmetics — authentic skincare, haircare, bodycare, makeup and fashion jewellery, delivered in Kolkata.';

  function flashShareState(btn) {
    btn.classList.add('copied');
    const svg = btn.querySelector('svg');
    const original = svg ? svg.outerHTML : '';
    if (svg) {
      svg.outerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
    }
    setTimeout(() => {
      btn.classList.remove('copied');
      const cur = btn.querySelector('svg');
      if (cur && original) cur.outerHTML = original;
    }, 1800);
  }

  async function shareContent(title, text, url, btn) {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // user cancelled - do nothing
        // fall through to clipboard fallback on other errors
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      if (btn) flashShareState(btn);
      else showToastGlobal('Link copied to clipboard!');
    } catch (err) {
      // last resort: open a WhatsApp share link
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    }
  }

  function showToastGlobal(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3200);
  }

  document.querySelectorAll('.btn-share').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const name = btn.getAttribute('data-share-name') || 'this product';
      const url = `${SITE_URL}/cosmetics.html?product=${encodeURIComponent(name)}`;
      shareContent(
        `${name} — Naushad Cosmetics`,
        `Check out ${name} on Naushad Cosmetics!`,
        url,
        btn
      );
    });
  });

  const navShareBtn = document.getElementById('navShareBtn');
  if (navShareBtn) {
    navShareBtn.addEventListener('click', () => {
      shareContent('Naushad Cosmetics', SITE_SHARE_TEXT, `${SITE_URL}/cosmetics.html`, navShareBtn);
    });
  }

  // ---------- Wishlist ----------
  const WISHLIST_KEY = 'nc_wishlist';

  function getWishlist() {
    try { return JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function saveWishlist(list) {
    try { localStorage.setItem(WISHLIST_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }

  function isWishlisted(name) {
    return getWishlist().some(item => item.name === name);
  }

  function escapeHtmlWish(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function collectProductData(card, name) {
    const priceEl = card.querySelector('.price');
    const imgEl = card.querySelector('.card-media img');
    const iconTileEl = card.querySelector('.card-media .icon-tile');
    const linkEl = card.querySelector('.btn-order');
    return {
      name,
      price: priceEl ? priceEl.textContent.trim() : '',
      image: imgEl ? imgEl.getAttribute('src') : '',
      icon: (!imgEl && iconTileEl) ? iconTileEl.innerHTML : '',
      howto: linkEl ? linkEl.getAttribute('data-howto') || '' : '',
      benefits: linkEl ? linkEl.getAttribute('data-benefits') || '' : '',
      category: linkEl ? linkEl.closest('.section')?.querySelector('h2')?.textContent.trim() || '' : ''
    };
  }

  function updateWishlistButtonStates() {
    const list = getWishlist();
    document.querySelectorAll('.btn-wishlist').forEach(btn => {
      const name = btn.getAttribute('data-wishlist-name');
      btn.classList.toggle('active', list.some(item => item.name === name));
    });
  }

  function updateWishlistCount() {
    const count = getWishlist().length;
    const badge = document.getElementById('wishlistCount');
    const navBtn = document.getElementById('navWishlistBtn');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
    if (navBtn) navBtn.classList.toggle('has-items', count > 0);
  }

  document.querySelectorAll('.btn-wishlist').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-wishlist-name');
      const card = btn.closest('.card');
      let list = getWishlist();
      const exists = list.some(item => item.name === name);

      if (exists) {
        list = list.filter(item => item.name !== name);
        showToastGlobal('Removed from wishlist');
      } else {
        list.push(collectProductData(card, name));
        showToastGlobal('Added to wishlist ♡');
        btn.classList.add('pulse');
        setTimeout(() => btn.classList.remove('pulse'), 400);
      }

      saveWishlist(list);
      updateWishlistButtonStates();
      updateWishlistCount();
      if (document.getElementById('wishlistPanel')?.classList.contains('open')) renderWishlistPanel();
    });
  });

  // ---------- Wishlist panel open/close ----------
  const wishlistPanel = document.getElementById('wishlistPanel');
  const wishlistBackdrop = document.getElementById('wishlistBackdrop');
  const wishlistBody = document.getElementById('wishlistBody');
  const navWishlistBtn = document.getElementById('navWishlistBtn');
  const wishlistCloseBtn = document.getElementById('wishlistClose');

  function openWishlistPanel() {
    renderWishlistPanel();
    wishlistBackdrop.classList.add('show');
    wishlistPanel.classList.add('open');
    document.body.classList.add('offcanvas-locked');
  }

  function closeWishlistPanel() {
    wishlistBackdrop.classList.remove('show');
    wishlistPanel.classList.remove('open');
    document.body.classList.remove('offcanvas-locked');
  }

  function renderWishlistPanel() {
    const list = getWishlist();
    if (!wishlistBody) return;

    if (list.length === 0) {
      wishlistBody.innerHTML = `
        <div class="wishlist-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 21s-6.7-4.35-9.3-8.1C1 10 1.5 6.5 4.5 5 7 3.8 9.5 4.8 12 7.5 14.5 4.8 17 3.8 19.5 5c3 1.5 3.5 5 1.8 7.9C18.7 16.65 12 21 12 21Z"/></svg>
          <p>Your wishlist is empty.<br>Tap the heart on any product to save it here.</p>
        </div>`;
      return;
    }

    wishlistBody.innerHTML = list.map(item => {
      const media = item.image
        ? `<img src="${item.image}" alt="${escapeHtmlWish(item.name)}">`
        : (item.icon || '');
      return `
        <div class="wishlist-item">
          <div class="wi-media">${media}</div>
          <div class="wi-info">
            <div class="wi-name">${escapeHtmlWish(item.name)}</div>
            <div class="wi-price">${escapeHtmlWish(item.price)}</div>
          </div>
          <div class="wi-actions">
            <button type="button" class="wi-buy-btn" data-buy-name="${escapeHtmlWish(item.name)}">Buy Now</button>
            <button type="button" class="wi-remove-btn" data-remove-name="${escapeHtmlWish(item.name)}">Remove</button>
          </div>
        </div>`;
    }).join('');

    wishlistBody.querySelectorAll('.wi-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-remove-name');
        saveWishlist(getWishlist().filter(item => item.name !== name));
        updateWishlistButtonStates();
        updateWishlistCount();
        renderWishlistPanel();
      });
    });

    wishlistBody.querySelectorAll('.wi-buy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-buy-name');
        const item = getWishlist().find(i => i.name === name);
        if (!item) return;
        try {
          sessionStorage.setItem('nc_selected_product', item.name);
          sessionStorage.setItem('nc_selected_product_data', JSON.stringify(item));
        } catch (e) { /* ignore */ }
        window.location.href = '1card.html';
      });
    });
  }

  if (navWishlistBtn) navWishlistBtn.addEventListener('click', openWishlistPanel);
  if (wishlistCloseBtn) wishlistCloseBtn.addEventListener('click', closeWishlistPanel);
  if (wishlistBackdrop) wishlistBackdrop.addEventListener('click', closeWishlistPanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && wishlistPanel?.classList.contains('open')) closeWishlistPanel();
  });

  updateWishlistButtonStates();
  updateWishlistCount();

  // ---------- Scroll-reveal animation ----------
  // Section headers and trust items fade up once; product cards fade up
  // in a gentle stagger as each grid scrolls into view (delay resets per
  // section so every grid restarts its own stagger rhythm).
  const revealTargets = [
    ...document.querySelectorAll('.section-head'),
    ...document.querySelectorAll('.trust-item')
  ];
  revealTargets.forEach(el => el.classList.add('reveal-up'));

  document.querySelectorAll('.grid').forEach(grid => {
    const cardsInGrid = grid.querySelectorAll('.card');
    cardsInGrid.forEach((card, i) => {
      card.classList.add('reveal-up');
      card.style.setProperty('--reveal-delay', `${(i % 4) * 0.08}s`);
    });
  });

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal-up').forEach(el => revealObserver.observe(el));
  } else {
    document.querySelectorAll('.reveal-up').forEach(el => el.classList.add('in-view'));
  }

  // ---------- Hero stat count-up ----------
  function animateCountUp(el) {
    const raw = el.textContent.trim();
    const match = raw.match(/^([\d.]+)(.*)$/);
    if (!match) return; // e.g. "100%" without a leading number - skip safely
    const target = parseFloat(match[1]);
    const suffix = match[2];
    const isDecimal = match[1].includes('.');
    const duration = 1100;
    const startTime = performance.now();

    el.classList.add('counting');

    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = target * eased;
      el.textContent = (isDecimal ? current.toFixed(1) : Math.round(current)) + suffix;

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = raw; // land exactly on the original value
        el.classList.remove('counting');
      }
    }
    requestAnimationFrame(tick);
  }

  const statEls = document.querySelectorAll('.hero-stats .stat b');
  if (statEls.length && 'IntersectionObserver' in window) {
    const statsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          statEls.forEach(el => animateCountUp(el));
          statsObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    const statsWrap = document.querySelector('.hero-stats');
    if (statsWrap) statsObserver.observe(statsWrap);
  }

});

/**
 * ---------- Dynamic product cards (added from the Admin Panel) ----------
 * Cards fetched live from the backend and injected into the page (see
 * dynamic-products.js) are not present when the block above runs, so they
 * need their own click wiring for Purchase/View, wishlist and share. This
 * is called once per card right after it's inserted into the DOM.
 * (Kept outside the DOMContentLoaded closure above so other scripts can call it.)
 */
window.ncWireDynamicCard = function ncWireDynamicCard(card) {
  if (!card || card.dataset.ncWired === '1') return;
  card.dataset.ncWired = '1';

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function captureProductData(link) {
    const productName = link.getAttribute('data-product');
    const priceEl = card.querySelector('.price');
    const priceWasEl = card.querySelector('.price-was');
    const catEl = card.querySelector('.card-cat');
    const brandEl = card.querySelector('.tag-brand');
    const imgEl = card.querySelector('.card-media img');
    const iconTileEl = card.querySelector('.card-media .icon-tile');
    const section = card.closest('.section');
    const sectionTitle = section && section.querySelector('h2') ? section.querySelector('h2').textContent.trim() : '';
    const descEl = card.querySelector('.card-desc');
    const starsEl = card.querySelector('.card-meta .stars');
    const ratingTextEl = card.querySelector('.card-meta span:last-child');

    return {
      name: productName,
      price: priceEl ? priceEl.textContent.trim() : '',
      priceWas: priceWasEl ? priceWasEl.textContent.trim() : '',
      meta: catEl ? catEl.textContent.trim() : '',
      brand: brandEl ? brandEl.textContent.trim() : '',
      image: imgEl ? imgEl.getAttribute('src') : '',
      icon: (!imgEl && iconTileEl) ? iconTileEl.innerHTML : '',
      category: sectionTitle,
      desc: descEl ? descEl.textContent.trim() : '',
      stars: starsEl ? starsEl.textContent.trim() : '',
      ratingText: ratingTextEl ? ratingTextEl.textContent.trim() : '',
      howto: link.getAttribute('data-howto') || '',
      benefits: link.getAttribute('data-benefits') || ''
    };
  }

  function goToProductPage(link) {
    const order = captureProductData(link);
    try {
      sessionStorage.setItem('nc_selected_product', order.name);
      sessionStorage.setItem('nc_selected_product_data', JSON.stringify(order));
    } catch (e) { /* ignore */ }
    window.location.href = 'product.html';
  }

  const orderLink = card.querySelector('.btn-order[data-product]');
  if (orderLink) {
    orderLink.addEventListener('click', (e) => {
      e.preventDefault();
      goToProductPage(orderLink);
    });
    const img = card.querySelector('.card-media img, .card-media .icon-tile');
    const title = card.querySelector('h3');
    [img, title].forEach(el => {
      if (!el) return;
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => goToProductPage(orderLink));
    });
  }

  // ---------- Wishlist (shares the same localStorage key as the rest of the site) ----------
  const WISHLIST_KEY = 'nc_wishlist';
  const wishlistBtn = card.querySelector('.btn-wishlist');
  if (wishlistBtn) {
    const name = wishlistBtn.getAttribute('data-wishlist-name');

    function getWishlist() {
      try { return JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'); }
      catch (e) { return []; }
    }
    function isWishlisted() { return getWishlist().some(item => item.name === name); }
    if (isWishlisted()) wishlistBtn.classList.add('active');

    wishlistBtn.addEventListener('click', () => {
      let list = getWishlist();
      const exists = list.some(item => item.name === name);
      if (exists) {
        list = list.filter(item => item.name !== name);
        wishlistBtn.classList.remove('active');
      } else {
        list.push(captureProductData(orderLink || { getAttribute: () => '' }));
        wishlistBtn.classList.add('active');
        wishlistBtn.classList.add('pulse');
        setTimeout(() => wishlistBtn.classList.remove('pulse'), 400);
      }
      try { localStorage.setItem(WISHLIST_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
    });
  }

  // ---------- Share ----------
  const shareBtn = card.querySelector('.btn-share');
  if (shareBtn) {
    shareBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const name = shareBtn.getAttribute('data-share-name') || 'this product';
      const url = `${window.location.origin}${window.location.pathname.replace('cosmetics.html', '')}cosmetics.html`;
      const shareData = { title: `${name} — Naushad Cosmetics`, text: `Check out ${name} on Naushad Cosmetics!`, url };
      if (navigator.share) {
        try { await navigator.share(shareData); return; } catch (err) { /* fall through */ }
      }
      try {
        await navigator.clipboard.writeText(url);
        const toast = document.getElementById('toast');
        if (toast) { toast.textContent = 'Link copied to clipboard!'; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3200); }
      } catch (err) { /* ignore */ }
    });
  }

  // ---------- Reveal animation ----------
  card.classList.add('reveal-up');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('in-view'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.08 });
    io.observe(card);
  } else {
    card.classList.add('in-view');
  }
};