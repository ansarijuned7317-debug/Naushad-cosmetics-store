/**
 * Naushad Cosmetics — Order Form Logic (1card.html)
 * ------------------------------------------------------------
 * 1. Loads the product picked on the shop page (via sessionStorage) as
 *    the first item in the order.
 * 2. Lets the customer add more products to the SAME order ("Add Another
 *    Product"), each with its own quantity — a lightweight multi-item cart
 *    without needing a login.
 * 3. Falls back to a manual "type your own product" mode if the visitor
 *    landed here directly (no product in sessionStorage).
 * 4. Live price calculation across all items, with a free-delivery threshold.
 * 5. Client-side validation with inline errors.
 * 6. Submits to the backend API (POST /api/guest-orders). If the API is
 *    unreachable (e.g. backend not deployed yet, or it's asleep on a
 *    free host), it still confirms the order over WhatsApp so the
 *    business flow never breaks.
 *
 * IMPORTANT: set API_BASE_URL below once your backend is deployed.
 * See backend/README.md for deployment steps.
 * ------------------------------------------------------------
 */

// TODO: replace with your deployed backend URL, e.g.
// const API_BASE_URL = 'https://naushad-cosmetics-api.onrender.com';
const API_BASE_URL = '';
const ORDER_ENDPOINT = '/api/guest-orders'; // matches backend/routes/guestOrderRoutes.js

const WHATSAPP_NUMBER = '916291195994';
const FREE_DELIVERY_THRESHOLD = 499;
const DELIVERY_FEE = 40;

document.addEventListener('DOMContentLoaded', () => {

  // ---------- State ----------
  // items[0] is always the "primary" item shown in the big product-detail
  // card at the top; items[1+] are extras added via "Add Another Product".
  let items = [{ name: '', price: 0, meta: '', brand: '', image: '', icon: '', category: '', desc: '', howto: '', benefits: '', quantity: 1 }];
  let usingManualPrimary = false;

  // ---------- Elements ----------
  const pdMedia = document.getElementById('pdMedia');
  const pdName = document.getElementById('pdName');
  const pdMeta = document.getElementById('pdMeta');
  const pdPrice = document.getElementById('pdPrice');
  const pdDesc = document.getElementById('pdDesc');

  const primaryQtyRow = document.getElementById('primaryQtyRow');
  const qtyValueEl = document.getElementById('qtyValue');
  const qtyMinusBtn = document.getElementById('qtyMinus');
  const qtyPlusBtn = document.getElementById('qtyPlus');

  const productPicker = document.getElementById('productPicker');
  const manualProduct = document.getElementById('manualProduct');
  const manualPrice = document.getElementById('manualPrice');

  const extraItemsList = document.getElementById('extraItemsList');
  const addAnotherBtn = document.getElementById('addAnotherBtn');
  const addItemForm = document.getElementById('addItemForm');
  const newItemName = document.getElementById('newItemName');
  const newItemPrice = document.getElementById('newItemPrice');
  const confirmAddItem = document.getElementById('confirmAddItem');
  const cancelAddItem = document.getElementById('cancelAddItem');

  const summaryItemsList = document.getElementById('summaryItemsList');
  const sumItemCount = document.getElementById('sumItemCount');
  const sumSubtotal = document.getElementById('sumSubtotal');
  const sumDelivery = document.getElementById('sumDelivery');
  const sumTotal = document.getElementById('sumTotal');

  const form = document.getElementById('orderForm');
  const submitBtn = document.getElementById('submitBtn');

  const successOverlay = document.getElementById('successOverlay');
  const successOrderId = document.getElementById('successOrderId');
  const successWhatsapp = document.getElementById('successWhatsapp');

  const toast = document.getElementById('toast');

  // ---------- Helpers ----------
  function parsePrice(str) {
    if (!str) return 0;
    const n = parseFloat(String(str).replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // ---------- 1. Load primary product from sessionStorage ----------
  function loadSelectedProduct() {
    let stored = null;
    try {
      const raw = sessionStorage.getItem('nc_selected_product_data');
      if (raw) stored = JSON.parse(raw);
    } catch (e) { /* ignore malformed data */ }

    if (!stored) {
      const nameOnly = (() => {
        try { return sessionStorage.getItem('nc_selected_product'); } catch (e) { return null; }
      })();
      if (nameOnly) stored = { name: nameOnly, price: '', meta: '', brand: '', image: '', category: '' };
    }

    if (stored && stored.name) {
      items[0] = {
        name: stored.name,
        price: parsePrice(stored.price),
        meta: stored.meta || '',
        brand: stored.brand || '',
        image: stored.image || '',
        icon: stored.icon || '',
        category: stored.category || '',
        desc: stored.desc || '',
        howto: stored.howto || '',
        benefits: stored.benefits || '',
        quantity: 1
      };
      renderPrimaryProduct();
    } else {
      showManualPicker();
    }
    renderSummary();
  }

  function renderPrimaryProduct() {
    const primary = items[0];
    pdName.textContent = primary.name;
    const metaParts = [primary.meta, primary.brand].filter(Boolean);
    pdMeta.textContent = metaParts.length ? metaParts.join(' · ') : 'Selected item';

    if (primary.price) {
      pdPrice.textContent = `₹${primary.price.toLocaleString('en-IN')}`;
      pdPrice.style.display = '';
    } else {
      pdPrice.style.display = 'none';
    }

    if (primary.desc) {
      pdDesc.textContent = primary.desc;
      pdDesc.style.display = '';
    } else {
      pdDesc.style.display = 'none';
    }

    if (primary.image) {
      pdMedia.innerHTML = `<img src="${primary.image}" alt="${escapeHtml(primary.name)}">`;
    } else if (primary.icon) {
      pdMedia.innerHTML = primary.icon;
    }

    productPicker.classList.remove('show');
    primaryQtyRow.style.display = '';
    qtyValueEl.textContent = primary.quantity;
  }

  function showManualPicker() {
    usingManualPrimary = true;
    pdName.textContent = 'No product selected';
    pdMeta.textContent = 'Type in the item you\u2019d like to order below';
    pdPrice.style.display = 'none';
    pdDesc.style.display = 'none';
    productPicker.classList.add('show');
    primaryQtyRow.style.display = '';
  }

  manualProduct.addEventListener('input', () => {
    items[0].name = manualProduct.value.trim();
    items[0].meta = 'Custom order';
    clearFieldError('manualProduct');
    renderSummary();
  });

  manualPrice.addEventListener('input', () => {
    items[0].price = parseFloat(manualPrice.value) || 0;
    clearFieldError('manualPrice');
    renderSummary();
  });

  // ---------- 2. Primary item quantity ----------
  qtyMinusBtn.addEventListener('click', () => {
    if (items[0].quantity > 1) { items[0].quantity -= 1; qtyValueEl.textContent = items[0].quantity; renderSummary(); }
  });
  qtyPlusBtn.addEventListener('click', () => {
    if (items[0].quantity < 20) { items[0].quantity += 1; qtyValueEl.textContent = items[0].quantity; renderSummary(); }
  });

  // ---------- 3. Add Another Product ----------
  addAnotherBtn.addEventListener('click', () => {
    addItemForm.style.display = addItemForm.style.display === 'none' ? 'block' : 'none';
    if (addItemForm.style.display === 'block') newItemName.focus();
  });

  cancelAddItem.addEventListener('click', () => {
    addItemForm.style.display = 'none';
    newItemName.value = '';
    newItemPrice.value = '';
    clearFieldError('newItemName');
    clearFieldError('newItemPrice');
  });

  confirmAddItem.addEventListener('click', () => {
    const name = newItemName.value.trim();
    const price = parseFloat(newItemPrice.value);

    let ok = true;
    if (!name) { document.getElementById('field-newItemName').classList.add('invalid'); ok = false; }
    if (!Number.isFinite(price) || price <= 0) { document.getElementById('field-newItemPrice').classList.add('invalid'); ok = false; }
    if (!ok) return;

    items.push({ name, price, meta: 'Added item', brand: '', image: '', icon: '', category: '', desc: '', howto: '', benefits: '', quantity: 1 });

    newItemName.value = '';
    newItemPrice.value = '';
    addItemForm.style.display = 'none';
    renderExtraItems();
    renderSummary();
    showToast(`${name} added to your order.`);
  });

  function renderExtraItems() {
    extraItemsList.innerHTML = '';
    items.slice(1).forEach((item, idx) => {
      const realIndex = idx + 1;
      const card = document.createElement('div');
      card.className = 'extra-item-card';
      card.innerHTML = `
        <div class="ei-media">${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.name)}">` : (item.icon || defaultIconSvg())}</div>
        <div class="ei-info">
          <div class="ei-name">${escapeHtml(item.name)}</div>
          <div class="ei-price">₹${item.price.toLocaleString('en-IN')} each</div>
        </div>
        <div class="ei-controls">
          <div class="qty-stepper">
            <button type="button" class="ei-qty-minus" aria-label="Decrease quantity">−</button>
            <span class="ei-qty-value">${item.quantity}</span>
            <button type="button" class="ei-qty-plus" aria-label="Increase quantity">+</button>
          </div>
          <button type="button" class="ei-remove" aria-label="Remove item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>`;

      card.querySelector('.ei-qty-minus').addEventListener('click', () => {
        if (items[realIndex].quantity > 1) { items[realIndex].quantity -= 1; renderExtraItems(); renderSummary(); }
      });
      card.querySelector('.ei-qty-plus').addEventListener('click', () => {
        if (items[realIndex].quantity < 20) { items[realIndex].quantity += 1; renderExtraItems(); renderSummary(); }
      });
      card.querySelector('.ei-remove').addEventListener('click', () => {
        items.splice(realIndex, 1);
        renderExtraItems();
        renderSummary();
      });

      extraItemsList.appendChild(card);
    });
  }

  function defaultIconSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2 4 6v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6l-2-4Z"/><path d="M4 6h16M9 10a3 3 0 0 0 6 0"/></svg>';
  }

  // ---------- 4. Summary ----------
  function renderSummary() {
    const validItems = items.filter(i => i.name);
    const subtotal = Math.round(validItems.reduce((sum, i) => sum + (i.price * i.quantity), 0) * 100) / 100;
    const delivery = subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    const total = subtotal + delivery;
    const itemCount = validItems.reduce((sum, i) => sum + i.quantity, 0);

    summaryItemsList.innerHTML = validItems.map(i => `
      <div class="summary-item-row">
        <span class="si-name">${escapeHtml(i.name)} × ${i.quantity}</span>
        <span>₹${(i.price * i.quantity).toLocaleString('en-IN')}</span>
      </div>`).join('');

    sumItemCount.textContent = itemCount;
    sumSubtotal.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
    sumDelivery.textContent = delivery === 0 ? 'FREE' : `₹${delivery}`;
    sumTotal.textContent = `₹${total.toLocaleString('en-IN')}`;
  }

  // ---------- 5. Validation ----------
  const validators = {
    customerName: v => v.trim().length > 0 && v.trim().length <= 80,
    phone: v => /^[6-9]\d{9}$/.test(v.trim()),
    address: v => v.trim().length > 0 && v.trim().length <= 300,
    city: v => v.trim().length > 0,
    pincode: v => /^\d{6}$/.test(v.trim())
  };

  function setFieldState(id, valid) {
    const wrap = document.getElementById(`field-${id}`);
    if (!wrap) return;
    wrap.classList.toggle('invalid', !valid);
    wrap.classList.toggle('valid', valid);
  }

  function clearFieldError(id) {
    const wrap = document.getElementById(`field-${id}`);
    if (wrap) wrap.classList.remove('invalid');
  }

  Object.keys(validators).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur', () => setFieldState(id, validators[id](el.value)));
    el.addEventListener('input', () => clearFieldError(id));
  });

  function validateForm() {
    let ok = true;
    const values = {};

    Object.keys(validators).forEach(id => {
      const el = document.getElementById(id);
      const isValid = validators[id](el.value);
      values[id] = el.value.trim();
      setFieldState(id, isValid);
      if (!isValid) ok = false;
    });

    if (!items[0].name) {
      document.getElementById('field-manualProduct')?.classList.add('invalid');
      ok = false;
    }
    if (usingManualPrimary && (!items[0].price || items[0].price <= 0)) {
      document.getElementById('field-manualPrice')?.classList.add('invalid');
      ok = false;
    }

    return { ok, values };
  }

  // ---------- 6. Toast ----------
  let toastTimer = null;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  // ---------- 7. Submit ----------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const { ok, values } = validateForm();
    if (!ok) {
      showToast('Please fix the highlighted fields.');
      const firstInvalid = document.querySelector('.field.invalid');
      if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const notes = document.getElementById('notes').value.trim();
    const validItems = items.filter(i => i.name);

    const orderItems = validItems.map(i => ({
      productName: i.name,
      productCategory: i.category || i.meta || '',
      quantity: i.quantity,
      unitPrice: i.price || 0
    }));

    // Backward-compatible payload: top-level productName/quantity/unitPrice
    // mirror the FIRST item (so a backend expecting a single product still
    // works), while `items` carries the full multi-product list.
    const payload = {
      customerName: values.customerName,
      phone: values.phone,
      email: '',
      address: values.address,
      city: values.city,
      pincode: values.pincode,
      productName: orderItems[0].productName,
      productCategory: orderItems[0].productCategory,
      quantity: orderItems[0].quantity,
      unitPrice: orderItems[0].unitPrice,
      items: orderItems,
      paymentMethod: 'cod',
      notes
    };

    setLoading(true);

    let orderId = null;
    let apiSucceeded = false;

    if (API_BASE_URL) {
      try {
        const res = await fetchWithTimeout(`${API_BASE_URL}${ORDER_ENDPOINT}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }, 12000);

        const data = await res.json();
        if (res.ok && data.ok) {
          orderId = data.order.id;
          apiSucceeded = true;
        }
      } catch (err) {
        console.warn('Order API unavailable, falling back to WhatsApp:', err.message);
      }
    }

    if (!orderId) {
      orderId = `NC-${Date.now().toString(36).toUpperCase()}`;
      try {
        const backups = JSON.parse(localStorage.getItem('nc_order_backups') || '[]');
        backups.push({ id: orderId, createdAt: new Date().toISOString(), ...payload });
        localStorage.setItem('nc_order_backups', JSON.stringify(backups.slice(-50)));
      } catch (e) { /* ignore */ }
    }

    setLoading(false);
    showSuccess(orderId, payload, orderItems, apiSucceeded);
  });

  function fetchWithTimeout(url, options, timeoutMs) {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timer = setTimeout(() => { controller.abort(); reject(new Error('Request timed out')); }, timeoutMs);
      fetch(url, { ...options, signal: controller.signal })
        .then(res => { clearTimeout(timer); resolve(res); })
        .catch(err => { clearTimeout(timer); reject(err); });
    });
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle('loading', isLoading);
    submitBtn.querySelector('.btn-label').textContent = isLoading ? 'Placing your order…' : 'Place Order & Confirm on WhatsApp';
  }

  function showSuccess(orderId, payload, orderItems, apiSucceeded) {
    successOrderId.textContent = orderId;

    // Remember these details so a future order can skip re-typing everything.
    saveCustomer({
      customerName: payload.customerName,
      phone: payload.phone,
      address: payload.address,
      city: payload.city,
      pincode: payload.pincode
    });

    const itemLines = orderItems.map(i => `• ${i.productName} x${i.quantity} — ₹${i.unitPrice * i.quantity}`);
    const total = document.getElementById('sumTotal').textContent;

    const lines = [
      `Hi Naushad Cosmetics, I've placed an order (${orderId}):`,
      ...itemLines,
      `Total: ${total}`,
      `Name: ${payload.customerName}`,
      `Phone: ${payload.phone}`,
      `Address: ${payload.address}, ${payload.city} - ${payload.pincode}`,
      `Payment: COD`,
      payload.notes ? `Notes: ${payload.notes}` : ''
    ].filter(Boolean).join('\n');

    successWhatsapp.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines)}`;

    const note = successOverlay.querySelector('.success-note');
    note.textContent = apiSucceeded
      ? 'We\u2019ve saved your order. Tap below to confirm it instantly on WhatsApp.'
      : 'Please tap below to send your order details on WhatsApp so we can confirm it right away.';

    successOverlay.classList.add('show');
    form.reset();

    items = [{ name: '', price: 0, meta: '', brand: '', image: '', icon: '', category: '', desc: '', howto: '', benefits: '', quantity: 1 }];
    loadSelectedProduct();
    extraItemsList.innerHTML = '';
    applySavedCustomer(); // re-fill contact/address for a possible next order in this same session
  }

  document.getElementById('successOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'successOverlay') successOverlay.classList.remove('show');
  });

  // ---------- 8. Scroll reveal ----------
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in-view'));
  }

  // ---------- Saved customer details (returning customer, one-tap reorder) ----------
  const CUSTOMER_KEY = 'nc_customer_details';

  function getSavedCustomer() {
    try { return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || 'null'); }
    catch (e) { return null; }
  }

  function saveCustomer(data) {
    try { localStorage.setItem(CUSTOMER_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
  }

  function applySavedCustomer() {
    const saved = getSavedCustomer();
    if (!saved) return;

    const nameEl = document.getElementById('customerName');
    const phoneEl = document.getElementById('phone');
    const addressEl = document.getElementById('address');
    const cityEl = document.getElementById('city');
    const pincodeEl = document.getElementById('pincode');

    nameEl.value = saved.customerName || '';
    phoneEl.value = saved.phone || '';
    addressEl.value = saved.address || '';
    if (saved.city) cityEl.value = saved.city;
    pincodeEl.value = saved.pincode || '';

    // Mark fields as pre-validated so the green "looks good" state shows immediately.
    ['customerName', 'phone', 'address', 'city', 'pincode'].forEach(id => {
      const wrap = document.getElementById(`field-${id}`);
      if (wrap && document.getElementById(id).value) wrap.classList.add('valid');
    });

    const banner = document.getElementById('savedDetailsBanner');
    const sdbName = document.getElementById('sdbName');
    const sdbAddressPreview = document.getElementById('sdbAddressPreview');
    if (banner) {
      sdbName.textContent = saved.customerName ? `, ${saved.customerName.split(' ')[0]}` : '';
      sdbAddressPreview.textContent = `${saved.address}, ${saved.city} - ${saved.pincode} · ${saved.phone}`;
      banner.style.display = 'flex';
    }
  }

  const sdbEditBtn = document.getElementById('sdbEditBtn');
  if (sdbEditBtn) {
    sdbEditBtn.addEventListener('click', () => {
      document.getElementById('savedDetailsBanner').style.display = 'none';
      document.getElementById('customerName').focus();
    });
  }

  // ---------- Init ----------
  loadSelectedProduct();
  applySavedCustomer();
});
