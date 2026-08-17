/**
 * Naushad Cosmetics — Product Manager (admin-products.html)
 * ------------------------------------------------------------
 * Full product CRUD against the backend's Product API. Adding a product
 * here saves it to MongoDB, and it immediately appears on the live
 * storefront (see dynamic-products.js on cosmetics.html) — no code
 * changes needed on the website side.
 *
 * Brands and categories are typed as plain text (with autocomplete
 * suggestions from what already exists) — if you type a new one, it's
 * created automatically behind the scenes so you never have to manage
 * a separate "categories" screen.
 * ------------------------------------------------------------
 */

let API_BASE = '';
let accessToken = null;
let allProducts = [];
let allBrands = [];
let allCategories = [];
let deleteTargetId = null;
let deleteTargetName = '';

const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  $('apApiUrl').value = localStorage.getItem('nc_admin_api_url') || '';
  $('apEmail').value = localStorage.getItem('nc_admin_email') || '';

  $('loginBtn').addEventListener('click', login);
  $('apPassword').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  $('logoutBtn').addEventListener('click', logout);

  $('addNewBtn').addEventListener('click', () => openModal());
  $('modalClose').addEventListener('click', closeModal);
  $('cancelModalBtn').addEventListener('click', closeModal);
  $('modalBackdrop').addEventListener('click', (e) => { if (e.target.id === 'modalBackdrop') closeModal(); });

  $('productForm').addEventListener('submit', saveProduct);
  $('pImage').addEventListener('change', previewImage);

  $('searchBox').addEventListener('input', renderTable);

  $('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
  $('deleteBackdrop').addEventListener('click', (e) => { if (e.target.id === 'deleteBackdrop') closeDeleteModal(); });
  $('confirmDeleteBtn').addEventListener('click', doDelete);
});

// ---------- Auth ----------
async function login() {
  const apiUrl = $('apApiUrl').value.trim().replace(/\/$/, '');
  const email = $('apEmail').value.trim();
  const password = $('apPassword').value;
  const status = $('loginStatus');

  if (!apiUrl || !email || !password) {
    status.textContent = 'Fill in the API URL, email, and password.';
    status.className = 'ap-status error';
    return;
  }

  localStorage.setItem('nc_admin_api_url', apiUrl);
  localStorage.setItem('nc_admin_email', email);
  status.textContent = 'Logging in…';
  status.className = 'ap-status';

  try {
    const res = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      status.textContent = data.message || `Login failed (${res.status})`;
      status.className = 'ap-status error';
      return;
    }
    if (data.data.user.role !== 'admin') {
      status.textContent = 'This account is not an admin account.';
      status.className = 'ap-status error';
      return;
    }

    API_BASE = apiUrl;
    accessToken = data.data.accessToken;

    $('loginScreen').style.display = 'none';
    $('mainPanel').style.display = 'block';

    await Promise.all([loadBrandsAndCategories(), loadProducts()]);
  } catch (err) {
    status.textContent = `Couldn't reach the API: ${err.message}`;
    status.className = 'ap-status error';
  }
}

function logout() {
  accessToken = null;
  $('mainPanel').style.display = 'none';
  $('loginScreen').style.display = 'flex';
  $('apPassword').value = '';
  $('loginStatus').textContent = '';
}

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${accessToken}`, ...extra };
}

// ---------- Load data ----------
async function loadBrandsAndCategories() {
  try {
    const [brandsRes, catsRes] = await Promise.all([
      fetch(`${API_BASE}/api/admin/brands`, { headers: authHeaders() }),
      fetch(`${API_BASE}/api/admin/categories`, { headers: authHeaders() })
    ]);
    const brandsData = await brandsRes.json();
    const catsData = await catsRes.json();

    allBrands = brandsData.data || [];
    allCategories = catsData.data || [];

    $('brandList').innerHTML = allBrands.map(b => `<option value="${escapeHtml(b.name)}">`).join('');
    $('categoryList').innerHTML = allCategories.map(c => `<option value="${escapeHtml(c.name)}">`).join('');
  } catch (err) {
    console.warn('Could not load brands/categories:', err.message);
  }
}

async function loadProducts() {
  $('productCount').textContent = 'Loading…';
  try {
    const res = await fetch(`${API_BASE}/api/admin/products?limit=200`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok || !data.success) {
      $('productCount').textContent = data.message || 'Failed to load products.';
      return;
    }
    allProducts = data.data || [];
    renderTable();
  } catch (err) {
    $('productCount').textContent = `Couldn't reach the API: ${err.message}`;
  }
}

// ---------- Render table ----------
function renderTable() {
  const query = $('searchBox').value.trim().toLowerCase();
  const filtered = query
    ? allProducts.filter(p => p.name.toLowerCase().includes(query))
    : allProducts;

  $('productCount').textContent = `${allProducts.length} product${allProducts.length === 1 ? '' : 's'} total`;

  const tbody = $('productsTableBody');
  const emptyState = $('emptyState');

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  tbody.innerHTML = filtered.map(p => {
    const primaryImage = (p.images || []).find(i => i.isPrimary) || (p.images || [])[0];
    const thumb = primaryImage
      ? `<img src="${escapeHtml(primaryImage.url)}" alt="">`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2 4 6v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6l-2-4Z"/><path d="M4 6h16M9 10a3 3 0 0 0 6 0"/></svg>`;

    const brandName = (allBrands.find(b => b._id === (p.brand?._id || p.brand)) || p.brand || {}).name || '—';
    const catName = (allCategories.find(c => c._id === (p.category?._id || p.category)) || p.category || {}).name || '—';

    const priceHtml = p.discountPrice && p.discountPrice < p.price
      ? `₹${p.discountPrice}<span class="was">₹${p.price}</span>`
      : `₹${p.price}`;

    const statusClass = p.stock === 0 ? 'inactive' : p.status;
    const statusLabel = p.stock === 0 ? 'Out of Stock' : p.status;

    return `
      <tr data-id="${p._id}">
        <td>
          <div class="ap-prod-cell">
            <div class="ap-prod-thumb">${thumb}</div>
            <div>
              <div class="ap-prod-name">${escapeHtml(p.name)}</div>
              <div class="ap-prod-sku">${escapeHtml(p.sku || '')}</div>
            </div>
          </div>
        </td>
        <td>${escapeHtml(catName)}</td>
        <td>${escapeHtml(brandName)}</td>
        <td class="ap-price-cell">${priceHtml}</td>
        <td>${p.stock}</td>
        <td><span class="ap-status-pill ${statusClass}">${escapeHtml(statusLabel)}</span></td>
        <td>
          <div class="ap-row-actions">
            <button type="button" class="ap-icon-btn" data-action="edit" aria-label="Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
            <button type="button" class="ap-icon-btn danger" data-action="delete" aria-label="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.closest('tr').dataset.id;
      const product = allProducts.find(p => p._id === id);
      if (product) openModal(product);
    });
  });
  tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.closest('tr').dataset.id;
      const product = allProducts.find(p => p._id === id);
      if (product) openDeleteModal(product);
    });
  });
}

// ---------- Add/Edit modal ----------
let pendingImageFile = null;

function openModal(product) {
  $('formError').style.display = 'none';
  $('productForm').reset();
  $('imagePreview').style.display = 'none';
  pendingImageFile = null;

  if (product) {
    $('modalTitle').textContent = 'Edit Product';
    $('productId').value = product._id;
    $('pName').value = product.name || '';
    $('pBrand').value = (allBrands.find(b => b._id === (product.brand?._id || product.brand)) || {}).name || '';
    $('pCategory').value = (allCategories.find(c => c._id === (product.category?._id || product.category)) || {}).name || '';
    $('pShortDesc').value = product.shortDescription || '';
    $('pDescription').value = product.description || '';
    $('pHowTo').value = product.howToUse || '';
    $('pPrice').value = product.price || '';
    $('pDiscountPrice').value = product.discountPrice || '';
    $('pSku').value = product.sku || '';
    $('pStock').value = product.stock ?? '';
    $('pStatus').value = product.status || 'active';

    const primaryImage = (product.images || []).find(i => i.isPrimary) || (product.images || [])[0];
    if (primaryImage) {
      $('imagePreviewImg').src = primaryImage.url;
      $('imagePreview').style.display = 'block';
    }
  } else {
    $('modalTitle').textContent = 'Add New Product';
    $('productId').value = '';
  }

  $('modalBackdrop').classList.add('show');
}

function closeModal() {
  $('modalBackdrop').classList.remove('show');
}

function previewImage() {
  const file = $('pImage').files[0];
  if (!file) return;
  pendingImageFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    $('imagePreviewImg').src = e.target.result;
    $('imagePreview').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

/** Finds a brand/category by name, or creates it if it doesn't exist yet. */
async function findOrCreate(kind, name) {
  const list = kind === 'brand' ? allBrands : allCategories;
  const existing = list.find(item => item.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing._id;

  const endpoint = kind === 'brand' ? 'brands' : 'categories';
  const res = await fetch(`${API_BASE}/api/admin/${endpoint}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name })
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message || `Could not create ${kind}.`);

  if (kind === 'brand') allBrands.push(data.data);
  else allCategories.push(data.data);

  return data.data._id;
}

function showFormError(message) {
  const errEl = $('formError');
  errEl.textContent = message;
  errEl.style.display = 'block';
}

async function saveProduct(e) {
  e.preventDefault();
  $('formError').style.display = 'none';

  const id = $('productId').value;
  const name = $('pName').value.trim();
  const brandName = $('pBrand').value.trim();
  const categoryName = $('pCategory').value.trim();
  const shortDescription = $('pShortDesc').value.trim();
  const description = $('pDescription').value.trim();
  const howToUse = $('pHowTo').value.trim();
  const price = Number($('pPrice').value);
  const discountPrice = $('pDiscountPrice').value ? Number($('pDiscountPrice').value) : undefined;
  let sku = $('pSku').value.trim();
  const stock = Number($('pStock').value);
  const status = $('pStatus').value;

  if (!name || !brandName || !categoryName || !shortDescription || !description || !Number.isFinite(price) || !Number.isFinite(stock)) {
    showFormError('Please fill in all required fields.');
    return;
  }

  const saveBtn = $('saveProductBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    const [brandId, categoryId] = await Promise.all([
      findOrCreate('brand', brandName),
      findOrCreate('category', categoryName)
    ]);

    if (!sku) sku = `NC-${Date.now().toString(36).toUpperCase()}`;

    const payload = {
      name, brand: brandId, category: categoryId,
      shortDescription, description, howToUse,
      price, discountPrice, sku, stock, status
    };

    let productId = id;
    let res, data;

    if (id) {
      res = await fetch(`${API_BASE}/api/admin/products/${id}`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(`${API_BASE}/api/admin/products`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });
    }
    data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Could not save product.');

    productId = data.data._id;

    if (pendingImageFile) {
      const formData = new FormData();
      formData.append('images', pendingImageFile);
      const imgRes = await fetch(`${API_BASE}/api/admin/products/${productId}/images`, {
        method: 'POST',
        headers: authHeaders(), // no Content-Type - browser sets multipart boundary
        body: formData
      });
      if (!imgRes.ok) console.warn('Image upload failed, but the product itself was saved.');
    }

    closeModal();
    showToast(id ? 'Product updated!' : 'Product added!');
    await loadProducts();
  } catch (err) {
    showFormError(err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Product';
  }
}

// ---------- Delete ----------
function openDeleteModal(product) {
  deleteTargetId = product._id;
  deleteTargetName = product.name;
  $('deleteProductName').textContent = product.name;
  $('deleteBackdrop').classList.add('show');
}

function closeDeleteModal() {
  $('deleteBackdrop').classList.remove('show');
  deleteTargetId = null;
}

async function doDelete() {
  if (!deleteTargetId) return;
  const btn = $('confirmDeleteBtn');
  btn.disabled = true;
  btn.textContent = 'Deleting…';

  try {
    const res = await fetch(`${API_BASE}/api/admin/products/${deleteTargetId}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Could not delete product.');

    closeDeleteModal();
    showToast(`"${deleteTargetName}" deleted.`);
    await loadProducts();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Delete Product';
  }
}

// ---------- Helpers ----------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

let toastTimer = null;
function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}
