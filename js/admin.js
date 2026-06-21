// db, auth, fsServerTimestamp, fsIncrement are set by js/firebase-db-init.js

// ===== State =====
let currentOrderFilter = 'all';
let allOrders = [];
let allProducts = [];
let allInventory = [];
let allCustomers = [];

// ===== In-memory cache (90s TTL) — prevents repeated Firestore reads =====
const _cache = {};
const _CACHE_TTL = 90_000;
async function _cachedGet(name, queryFn) {
    const now = Date.now();
    if (_cache[name] && (now - _cache[name].ts) < _CACHE_TTL) return _cache[name].data;
    const snap = await queryFn();
    _cache[name] = { data: snap, ts: now };
    return snap;
}
function _invalidateCache(...names) {
    names.forEach(n => { if (_cache[n]) _cache[n].ts = 0; });
}

// ===== API helper — use backend API when available, else Firestore =====
// For admin reads we use the API; writes always go direct to Firestore
// (writes are low-volume and need the admin auth token only Firestore checks).
async function _adminApiOr(apiMethod, firestoreFn) {
    if (window.ssaApi && window.ssaApi.enabled) {
        try { return await window.ssaApi[apiMethod](); }
        catch (e) { console.warn('[admin-api] falling back to Firestore:', e.message); }
    }
    return firestoreFn();
}

// ===== Wait for Firebase to initialize =====
let authInitAttempts = 0;
function initializeAuthListener() {
    authInitAttempts++;
    console.log(`[admin.js] Init attempt ${authInitAttempts}:`, {
        _ready: typeof window._firebaseReady,
        auth: typeof window.auth,
        db: typeof window.db
    });
    
    if (typeof auth === 'undefined' || !auth || !window._firebaseReady) {
        if (authInitAttempts > 100) {
            const loginErr = document.getElementById('loginError');
            if (loginErr) loginErr.textContent = 'Firebase initialization failed. Please refresh the page.';
            return;
        }
        setTimeout(initializeAuthListener, 50);
        return;
    }
    auth.onAuthStateChanged(user => {
        // Only treat as admin if user has an email (not anonymous)
        if (user && user.email) {
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'flex';
            const name = user.email.split('@')[0];
            document.getElementById('adminName').textContent = name;
            if (document.getElementById('adminNameTop')) document.getElementById('adminNameTop').textContent = name;
            const av = document.getElementById('sidebarAvatar');
            if (av) av.textContent = name.charAt(0).toUpperCase();
            // Wait for Firestore (window.db) to be ready before loading data
            waitForDbThenLoad();
        } else {
            // No user, or anonymous user - show login screen
            if (user && !user.email) {
                auth.signOut();
            }
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('adminPanel').style.display = 'none';
        }
    });
}
// Wait for window.db to be ready then load dashboard
function waitForDbThenLoad(attempts) {
    attempts = attempts || 0;
    if (window.db && window._firebaseReady) {
        console.log('[admin.js] Firestore ready — loading dashboard');
        loadDashboard();
    } else if (attempts > 60) {
        console.error('[admin.js] Firestore not ready after 3s');
        showAdminToast('Database connection failed. Please refresh.', 'error');
    } else {
        setTimeout(() => waitForDbThenLoad(attempts + 1), 50);
    }
}

// Start listening for auth changes
initializeAuthListener();

function handleAdminLogin(e) {
    e.preventDefault();
    if (typeof auth === 'undefined' || !auth || !window._firebaseReady) {
        alert('Firebase is still loading. Please wait a moment and try again.');
        return;
    }
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    const btn = document.getElementById('loginBtn');
    const error = document.getElementById('loginError');
    error.textContent = '';
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

    auth.signInWithEmailAndPassword(email, password)
        .then(() => { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In'; })
        .catch(err => {
            error.textContent = err.message.includes('invalid') ? 'Invalid email or password' : err.message;
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        });
}

function handleAdminLogout() {
    auth.signOut();
}

// ===== Navigation =====
function navigateTo(page) {
    const item = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (item) item.click();
}
window.navigateTo = navigateTo;

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-' + page).classList.add('active');
        document.getElementById('pageTitle').textContent = item.textContent.trim();
        if (page === 'orders') loadOrders();
        if (page === 'products') loadProducts();
        if (page === 'inventory') loadInventory();
        if (page === 'customers') loadCustomers();
        if (page === 'messages') loadMessages();
        if (page === 'dashboard') loadDashboard();
        // Update subtitle
        const subtitles = {dashboard:'Overview & analytics',orders:'Manage customer orders',products:'Product catalogue',inventory:'Stock levels',customers:'Registered users',messages:'Contact form submissions'};
        const sub = document.getElementById('pageSubtitle');
        if (sub) { const n = document.getElementById('adminNameTop')?.textContent||'Admin'; sub.innerHTML = (subtitles[page]||page)+', <span id="adminNameTop">'+n+'</span>'; }
        // Close sidebar on mobile
        if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
    });
});

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// ===== Dashboard =====
async function loadDashboard() {
    try {
        // ── Try backend API (1 HTTP call vs 4 Firestore reads) ──
        if (window.ssaApi && window.ssaApi.enabled) {
            try {
                const d = await window.ssaApi.adminDashboard();
                _renderDashboard(d.totalOrders, d.pending, d.revenue, d.customers, d.unreadMsgs, d.recentOrders || [], d.stockAlerts || []);
                return;
            } catch (e) { console.warn('[dashboard] API failed, using Firestore:', e.message); }
        }

        // ── Sequential Firestore fallback (cached 90s) ────────
        const ordersSnap    = await _cachedGet('orders',    () => db.collection('orders').get());
        const customersSnap = await _cachedGet('customers', () => db.collection('customers').get());
        const invSnap       = await _cachedGet('inventory', () => db.collection('inventory').get());
        const messagesSnap  = await _cachedGet('messages',  () => db.collection('messages').get());

        const orders     = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const unreadMsgs = messagesSnap.docs.filter(d => !d.data().read).length;
        const invDocs    = invSnap.docs.map(d => d.data());
        const alerts     = invDocs.filter(i => { const st = i.status || (i.quantity === 0 ? 'out_of_stock' : i.quantity <= 10 ? 'low_stock' : 'in_stock'); return st !== 'in_stock'; })
                                   .map(i => ({ productName: i.productName, size: i.size, color: i.color, status: i.status }));
        const recent     = orders.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 5);

        _renderDashboard(
            orders.length,
            orders.filter(o => o.status === 'Processing').length,
            orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.total || 0), 0),
            customersSnap.size,
            unreadMsgs,
            recent,
            alerts
        );
    } catch (err) { console.error('Dashboard error:', err); }
}

function _renderDashboard(totalOrders, pending, revenue, customers, unreadMsgs, recentOrders, stockAlerts) {
    document.getElementById('statTotalOrders').textContent = totalOrders;
    document.getElementById('statPending').textContent     = pending;
    document.getElementById('statRevenue').textContent     = '\u20b9' + revenue.toLocaleString();
    document.getElementById('statCustomers').textContent   = customers;
    document.getElementById('statMessages').textContent    = unreadMsgs;
    const badge = document.getElementById('msgBadge');
    if (badge) { badge.textContent = unreadMsgs; badge.style.display = unreadMsgs > 0 ? 'inline' : 'none'; }

    // Recent orders
    const recentHtml = recentOrders.length ? recentOrders.map(o => `
        <div class="list-item">
            <div class="list-item-info">
                <strong>#${o.orderId || (o.docId || '').slice(0, 8)}</strong>
                <span>${o.customerName || 'Guest'} &bull; ${o.createdAt ? new Date(o.createdAt.seconds*1000).toLocaleDateString('en-IN') : ''}</span>
            </div>
            <div class="list-item-right">
                <span class="amount">\u20b9${(o.total || 0).toLocaleString()}</span>
                <span class="status-badge ${(o.status || '').toLowerCase()}">${o.status}</span>
            </div>
        </div>`).join('') : '<p class="empty">No orders yet</p>';
    document.getElementById('recentOrdersList').innerHTML = recentHtml;

    // Stock alerts
    const alertHtml = stockAlerts.length ? stockAlerts.map(s => `
        <div class="list-item">
            <div class="list-item-info"><strong>${s.productName}</strong><span>Size: ${s.size}${s.color ? ' | ' + s.color : ''}</span></div>
            <div class="list-item-right"><span class="status-badge ${s.status === 'out_of_stock' ? 'cancelled' : 'processing'}">${s.status === 'out_of_stock' ? 'Out of Stock' : 'Low Stock'}</span></div>
        </div>`).join('') : '<p class="empty">All stock levels OK \u2705</p>';
    document.getElementById('lowStockList').innerHTML = alertHtml;
}

// ===== Orders =====
async function loadOrders() {
    const tbody = document.getElementById('ordersTableBody');
    try {
        const data = await _adminApiOr('adminOrders',
            () => _cachedGet('orders', () => db.collection('orders').get()).then(snap => {
                const docs = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
                docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                return docs;
            })
        );
        // data is either an array (from API) or needs extraction from snap
        allOrders = Array.isArray(data) ? data : data.docs.map(d => ({ docId: d.id, ...d.data() }));
        allOrders.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        renderOrders();
    } catch (err) {
        console.error('Orders error:', err);
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="empty" style="color:red">Failed to load orders.<br><small>' + err.message + '</small></td></tr>';
    }
}

function renderOrders() {
    let filtered = currentOrderFilter === 'all' ? allOrders : allOrders.filter(o => o.status === currentOrderFilter);
    const search = (document.getElementById('orderSearch')?.value || '').toLowerCase();
    if (search) filtered = filtered.filter(o => (o.orderId || '').toLowerCase().includes(search) || (o.customerName || '').toLowerCase().includes(search) || (o.customerEmail || '').toLowerCase().includes(search));

    const tbody = document.getElementById('ordersTableBody');
    if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty">No orders found</td></tr>'; return; }

    tbody.innerHTML = filtered.map(o => `
        <tr>
            <td><strong>#${o.orderId || o.docId.slice(0, 8)}</strong></td>
            <td>${o.customerName || 'Guest'}<br><small>${o.customerEmail || ''}</small></td>
            <td>${(o.items || []).length} item(s)</td>
            <td><strong>\u20b9${(o.total || 0).toLocaleString()}</strong></td>
            <td><span class="status-badge ${(o.status || '').toLowerCase()}">${o.status}</span></td>
            <td>${o.createdAt ? new Date(o.createdAt.seconds * 1000).toLocaleDateString('en-IN') : 'N/A'}</td>
            <td>
                <button class="btn-icon" onclick="viewOrder('${o.docId}')" title="View"><i class="fas fa-eye"></i></button>
                <button class="btn-icon" onclick="editOrderModal('${o.docId}')" title="Edit Order"><i class="fas fa-edit"></i></button>
            </td>
        </tr>
    `).join('');
}

// Order filter buttons
document.querySelectorAll('#page-orders .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#page-orders .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentOrderFilter = btn.dataset.status;
        renderOrders();
    });
});

document.getElementById('orderSearch')?.addEventListener('input', renderOrders);

async function viewOrder(docId) {
    const o = allOrders.find(x => x.docId === docId);
    if (!o) return;
    const modal = document.getElementById('orderModalBody');
    const statuses = ['Processing','Approved','Shipped','Delivered'];
    const curIdx = statuses.indexOf(o.status);
    const timelineHTML = `
        <div class="order-timeline">
            ${statuses.map((s, i) => `
                <div class="tl-step">
                    <div class="tl-dot ${i < curIdx ? 'done' : i === curIdx && o.status !== 'Cancelled' ? 'active' : ''}">
                        <i class="fas fa-${i===0?'clock':i===1?'check':i===2?'truck':'home'}"></i>
                    </div>
                    <span class="tl-label">${s}</span>
                </div>
            `).join('')}
        </div>
    `;
    modal.innerHTML = `
        <div class="order-detail">
            <div class="od-header">
                <div><h4>Order #${o.orderId || docId.slice(0, 8)}</h4><span class="status-badge ${(o.status || '').toLowerCase()}">${o.status}</span></div>
                <span>${o.createdAt ? new Date(o.createdAt.seconds * 1000).toLocaleString('en-IN') : ''}</span>
            </div>
            ${o.status !== 'Cancelled' ? timelineHTML : ''}
            <div class="od-section">
                <h5><i class="fas fa-user"></i> Customer</h5>
                <p>${o.customerName || 'N/A'}</p>
                <p>${o.customerEmail || ''} | ${o.customerPhone || ''}</p>
            </div>
            <div class="od-section">
                <h5><i class="fas fa-map-marker-alt"></i> Shipping Address</h5>
                <p>${o.address || 'N/A'}</p>
                <p>${o.city || ''} - ${o.pincode || ''}</p>
            </div>
            <div class="od-section">
                <h5><i class="fas fa-box"></i> Items</h5>
                <table class="od-items">
                    <tr><th>Product</th><th>Size</th><th>Color</th><th>Qty</th><th>Price</th></tr>
                    ${(o.items || []).map(i => `<tr><td>${i.name}</td><td>${i.selectedSize || '-'}</td><td>${i.selectedColor || '-'}</td><td>${i.qty}</td><td>\u20b9${i.price * i.qty}</td></tr>`).join('')}
                </table>
                <p style="text-align:right;font-weight:700;margin-top:10px;font-size:1rem;color:var(--primary)">Total: \u20b9${(o.total || 0).toLocaleString()}</p>
            </div>
            <div class="od-section">
                <h5><i class="fas fa-credit-card"></i> Payment</h5>
                <p>Method: <strong>${o.payment || 'COD'}</strong></p>
            </div>
            ${o.trackingId ? `<div class="od-section"><h5><i class="fas fa-truck"></i> Tracking</h5><p>${o.trackingId}</p></div>` : ''}
            <div class="od-actions">
                <select id="orderStatusSelect" class="status-select">
                    <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>Processing</option>
                    <option value="Approved" ${o.status === 'Approved' ? 'selected' : ''}>Approved</option>
                    <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
                <input type="text" id="orderTracking" placeholder="Tracking ID (optional)" value="${o.trackingId || ''}" class="tracking-input">
                <button class="btn-primary" onclick="saveOrderUpdate('${docId}')"><i class="fas fa-save"></i> Update</button>
            </div>
        </div>
    `;
    openModal('orderModal');
}

async function saveOrderUpdate(docId) {
    const status    = document.getElementById('orderStatusSelect').value;
    const trackingId = document.getElementById('orderTracking').value.trim();
    try {
        // Always write directly to Firestore (write operations are low-volume)
        await db.collection('orders').doc(docId).update({ status, trackingId, updatedAt: fsServerTimestamp() });
        _invalidateCache('orders');
        if (window.ssaApi && window.ssaApi.enabled) window.ssaApi.invalidate('/api/admin/orders');
        showAdminToast('Order updated successfully');
        closeModal('orderModal');
        loadOrders();
        loadDashboard();
    } catch (err) {
        showAdminToast('Error: ' + err.message, 'error');
    }
}

async function updateOrderStatus(docId) {
    viewOrder(docId);
}

// ===== Products =====
async function loadProducts() {
    try {
        const data = await _adminApiOr('adminProducts',
            () => _cachedGet('products', () => db.collection('products').get()).then(snap => {
                const docs = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
                docs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                return docs;
            })
        );
        allProducts = Array.isArray(data) ? data : data.docs.map(d => ({ docId: d.id, ...d.data() }));
        allProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        if (allProducts.length === 0) { await autoSeedProducts(); } else { await deduplicateProducts(); renderProducts(); }
    } catch (err) { console.error('Products error:', err); }
}

async function deduplicateProducts() {
    const seen = new Map(); // name -> docId of first seen
    const toDelete = [];
    for (const p of allProducts) {
        if (seen.has(p.name)) {
            toDelete.push(p.docId);
        } else {
            seen.set(p.name, p.docId);
        }
    }
    if (toDelete.length === 0) return;
    showAdminToast(`Removing ${toDelete.length} duplicate product(s)...`, 'info');
    for (const docId of toDelete) {
        try { await db.collection('products').doc(docId).delete(); } catch (e) { /* ignore */ }
    }
    // Rebuild allProducts without deleted docs
    const deletedSet = new Set(toDelete);
    allProducts = allProducts.filter(p => !deletedSet.has(p.docId));
    showAdminToast(`Cleaned up ${toDelete.length} duplicate(s)`);
}

async function autoSeedProducts() {
    const products = getLocalProductsData();
    let count = 0;
    showAdminToast('Seeding products to Firestore...', 'info');
    for (const p of products) {
        const existing = await db.collection('products').where('name', '==', p.name).get();
        if (existing.empty) {
            await db.collection('products').add({
                name: p.name, category: p.category, price: p.price,
                oldPrice: p.oldPrice || null, gender: p.gender || null,
                sleeve: p.sleeve || null, sizes: p.sizes || [],
                description: p.description || '', image: p.image || '',
                badge: p.badge || '', totalStock: 100,
                createdAt: fsServerTimestamp()
            });
            const colors = getColorsForCategory(p.category);
            for (const size of (p.sizes || [])) {
                for (const color of colors) {
                    await db.collection('inventory').add({
                        productName: p.name, productCategory: p.category,
                        size, color, quantity: 20,
                        updatedAt: fsServerTimestamp()
                    });
                }
            }
            count++;
        }
    }
    showAdminToast(`Auto-seeded ${count} products to Firestore!`);
    const snap = await db.collection('products').orderBy('name').get();
    allProducts = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    renderProducts();
}

function renderProducts() {
    const search = (document.getElementById('productSearch')?.value || '').toLowerCase();
    let filtered = allProducts;
    if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search) || p.category.toLowerCase().includes(search));

    const tbody = document.getElementById('productsTableBody');
    if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty">No products. Click "Add Product" or "Sync Products" in Inventory.</td></tr>'; return; }

    // Build stock status from allInventory (by status field, fall back to quantity)
    const stockByProduct = {};
    for (const inv of allInventory) {
        if (!stockByProduct[inv.productName]) stockByProduct[inv.productName] = 'in_stock';
        const st = _invStatus(inv);
        // Demote: out_of_stock < low_stock < in_stock (use worst status across all sizes)
        if (st === 'out_of_stock') stockByProduct[inv.productName] = 'out_of_stock';
        else if (st === 'low_stock' && stockByProduct[inv.productName] !== 'out_of_stock') stockByProduct[inv.productName] = 'low_stock';
    }

    tbody.innerHTML = filtered.map(p => {
        const worstStatus = stockByProduct[p.name] || 'in_stock';
        const stockBadge = worstStatus === 'out_of_stock' ? 'cancelled' : worstStatus === 'low_stock' ? 'processing' : 'approved';
        const stockLabel = worstStatus === 'out_of_stock' ? 'Out of Stock' : worstStatus === 'low_stock' ? 'Low Stock' : 'In Stock';
        return `        <tr>
            <td><img src="${p.image || ''}" alt="" class="product-thumb"></td>
            <td class="td-name"><strong>${p.name}</strong><small>${(p.category || '').replace(/-/g, ' ')}</small></td>
            <td>${p.gender ? `<span class="size-chip" style="background:#e0e7ff;color:#3730a3">${p.gender}</span>` : '-'}</td>
            <td>\u20b9${p.price}</td>
            <td>${p.badge ? `<span class="size-chip" style="background:#fef3c7;color:#92400e">${p.badge}</span>` : '-'}</td>
            <td><span class="status-badge ${stockBadge}">${stockLabel}</span></td>            <td>
                <button class="btn-icon" onclick="editProduct('${p.docId}')" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="btn-icon danger" onclick="deleteProduct('${p.docId}')" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
    }).join('');
}

document.getElementById('productSearch')?.addEventListener('input', renderProducts);

function openProductModal(product = null) {
    document.getElementById('productEditId').value = product ? product.docId : '';
    document.getElementById('productModalTitle').innerHTML = product ? '<i class="fas fa-edit"></i> Edit Product' : '<i class="fas fa-plus"></i> Add Product';
    document.getElementById('pName').value = product ? product.name : '';
    document.getElementById('pCategory').value = product ? product.category : 'doctor-uniform';
    document.getElementById('pPrice').value = product ? product.price : '';
    document.getElementById('pOldPrice').value = product ? product.oldPrice || '' : '';
    document.getElementById('pGender').value = product ? product.gender || '' : '';
    document.getElementById('pSleeve').value = product ? product.sleeve || '' : '';
    document.getElementById('pSizes').value = product ? (product.sizes || []).join(',') : 'S,M,L,XL,XXL,XXXL';
    document.getElementById('pDescription').value = product ? product.description || '' : '';
    document.getElementById('pImage').value = product ? product.image || '' : '';
    document.getElementById('pBadge').value = product ? product.badge || '' : '';
    openModal('productModal');
}

function editProduct(docId) {
    const p = allProducts.find(x => x.docId === docId);
    if (p) openProductModal(p);
}

async function saveProduct(e) {
    e.preventDefault();
    const docId = document.getElementById('productEditId').value;
    const data = {
        name: document.getElementById('pName').value.trim(),
        category: document.getElementById('pCategory').value,
        price: parseInt(document.getElementById('pPrice').value),
        oldPrice: parseInt(document.getElementById('pOldPrice').value) || null,
        gender: document.getElementById('pGender').value || null,
        sleeve: document.getElementById('pSleeve').value || null,
        sizes: document.getElementById('pSizes').value.split(',').map(s => s.trim()).filter(Boolean),
        description: document.getElementById('pDescription').value.trim(),
        image: document.getElementById('pImage').value.trim(),
        badge: document.getElementById('pBadge').value.trim(),
        updatedAt: fsServerTimestamp()
    };

    try {
        if (docId) {
            await db.collection('products').doc(docId).update(data);
            _invalidateCache('products');
            showAdminToast('Product updated');
        } else {
            data.createdAt = fsServerTimestamp();
            data.totalStock = 0;
            await db.collection('products').add(data);
            _invalidateCache('products');
            showAdminToast('Product added');
        }
        closeModal('productModal');
        loadProducts();
    } catch (err) {
        showAdminToast('Error: ' + err.message, 'error');
    }
}

async function deleteProduct(docId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
        await db.collection('products').doc(docId).delete();
        _invalidateCache('products');
        showAdminToast('Product deleted');
        loadProducts();
    } catch (err) {
        showAdminToast('Error: ' + err.message, 'error');
    }
}

// Sync products from the local productsData (first-time setup)
async function syncInventoryFromProducts() {
    const btn = document.querySelector('button[onclick="syncInventoryFromProducts()"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...'; }

    const products = getLocalProductsData();
    let count = 0;
    try {
        showAdminToast('Syncing products to Firestore...', 'info');
        for (const p of products) {
            const existing = await db.collection('products').where('name', '==', p.name).get();
            if (existing.empty) {
                await db.collection('products').add({
                    name: p.name,
                    category: p.category,
                    price: p.price,
                    oldPrice: p.oldPrice || null,
                    gender: p.gender || null,
                    sleeve: p.sleeve || null,
                    sizes: p.sizes || [],
                    description: p.description || '',
                    image: p.image || '',
                    badge: p.badge || '',
                    totalStock: 100,
                    createdAt: fsServerTimestamp()
                });
                // Create inventory entries for each size — check first to avoid duplicates
                const colors = getColorsForCategory(p.category);
                for (const size of (p.sizes || [])) {
                    for (const color of colors) {
                        const invCheck = await db.collection('inventory')
                            .where('productName', '==', p.name)
                            .where('size', '==', size)
                            .get();
                        if (invCheck.empty) {
                            await db.collection('inventory').add({
                                productName: p.name,
                                productCategory: p.category,
                                size: size,
                                color: color,
                                quantity: 20,
                                updatedAt: fsServerTimestamp()
                            });
                        }
                    }
                }
                count++;
            }
        }
        showAdminToast(`Synced ${count} products to Firestore!`);
        loadProducts();
        loadInventory();
    } catch (err) {
        console.error('Sync error:', err);
        const msg = err.code === 'permission-denied'
            ? 'Permission denied â€” publish Firestore rules in Firebase Console (Firestore > Security tab) then retry.'
            : 'Sync failed: ' + err.message;
        showAdminToast(msg, 'error');
        // Show inline alert so user cannot miss it
        const panel = document.getElementById('page-inventory') || document.getElementById('page-products');
        if (panel) {
            const alert = document.createElement('div');
            alert.style.cssText = 'background:#fee;border:1px solid #f55;padding:12px 16px;border-radius:8px;margin:12px 0;font-size:0.9rem;color:#c00;';
            alert.innerHTML = '<strong>Error:</strong> ' + msg + '<br><a href="https://console.firebase.google.com/project/siva-suresh-agency/firestore/databases/-default-/rules" target="_blank" style="color:#0e4a86;">Click here to open Firestore Security Rules &rarr;</a>';
            panel.prepend(alert);
        }
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync"></i> Sync Products'; }
    }
}

function getColorsForCategory(category) {
    const colorMap = {
        'doctor-uniform': ['White', 'Light Blue', 'Mint Green'],
        'staff-uniform': ['Blue', 'Green', 'Pink', 'Gray'],
        'bedsheets': ['White', 'Sky Blue', 'Navy Blue'],
        'hospital-linen': ['White', 'Teal', 'Green'],
        'hotel-linen': ['White', 'Ivory', 'Sky Blue']
    };
    return colorMap[category] || ['White'];
}

function getLocalProductsData() {
    return [
        { name: "Male Doctor Uniform - Full Sleeve", category: "doctor-uniform", gender: "male", sleeve: "full", price: 850, oldPrice: 1100, sizes: ["S","M","L","XL","XXL","XXXL"], description: "Premium full-sleeve doctor uniform for men.", image: "images/Images/Male Full Sleeve.jpg", badge: "Bestseller" },
        { name: "Male Doctor Uniform - Half Sleeve", category: "doctor-uniform", gender: "male", sleeve: "half", price: 750, oldPrice: 950, sizes: ["S","M","L","XL","XXL","XXXL"], description: "Comfortable half-sleeve doctor uniform for men.", image: "images/Images/Male Half Sleeve.jpg", badge: "" },
        { name: "Female Doctor Uniform - Full Sleeve", category: "doctor-uniform", gender: "female", sleeve: "full", price: 900, oldPrice: 1200, sizes: ["S","M","L","XL","XXL","XXXL"], description: "Elegant full-sleeve doctor uniform for women.", image: "images/Images/Female Full Sleeve.jpg", badge: "New" },
        { name: "Female Doctor Uniform - Half Sleeve", category: "doctor-uniform", gender: "female", sleeve: "half", price: 800, oldPrice: 1050, sizes: ["S","M","L","XL","XXL","XXXL"], description: "Ladies half-sleeve doctor uniform.", image: "images/Images/Female Half Sleeve.jpg", badge: "" },
        { name: "Male Staff Uniform - Beige Style", category: "staff-uniform", gender: "male", sleeve: "half", price: 550, oldPrice: 720, sizes: ["S","M","L","XL","XXL","XXXL"], description: "Professional beige style staff uniform.", image: "images/Images/Male Uniform (Beige Style).jpg", badge: "" },
        { name: "Male Staff Uniform - Blue Style", category: "staff-uniform", gender: "male", sleeve: "half", price: 550, oldPrice: 720, sizes: ["S","M","L","XL","XXL","XXXL"], description: "Smart blue style staff uniform.", image: "images/Images/Male Uniform (Blue Style).jpg", badge: "Popular" },
        { name: "Male Staff Uniform - Brown Style", category: "staff-uniform", gender: "male", sleeve: "half", price: 560, oldPrice: 730, sizes: ["S","M","L","XL","XXL","XXXL"], description: "Durable brown style staff uniform.", image: "images/Images/Male Uniform (Brown Style).jpg", badge: "" },
        { name: "Male Staff Uniform - Gray Style", category: "staff-uniform", gender: "male", sleeve: "half", price: 540, oldPrice: 710, sizes: ["S","M","L","XL","XXL","XXXL"], description: "Comfortable gray style staff uniform.", image: "images/Images/Male Uniform (Gray Style).jpg", badge: "" },
        { name: "Male Ward Boy Uniform - Blue", category: "staff-uniform", gender: "male", sleeve: "half", price: 500, oldPrice: 650, sizes: ["S","M","L","XL","XXL","XXXL"], description: "Blue ward boy uniform.", image: "images/Images/Male Uniform (Blue Ward Boy).jpg", badge: "" },
        { name: "Male Ward Boy Uniform - Gray", category: "staff-uniform", gender: "male", sleeve: "half", price: 500, oldPrice: 650, sizes: ["S","M","L","XL","XXL","XXXL"], description: "Gray ward boy uniform.", image: "images/Images/Male Uniform (Gray Ward Boy).jpg", badge: "" },
        { name: "Male Ward Boy Uniform - Green", category: "staff-uniform", gender: "male", sleeve: "half", price: 500, oldPrice: 650, sizes: ["S","M","L","XL","XXL","XXXL"], description: "Green ward boy uniform.", image: "images/Images/Male Uniform (Green Ward Boy).jpg", badge: "" },
        { name: "Female Staff Uniform - Blue Style", category: "staff-uniform", gender: "female", sleeve: "half", price: 580, oldPrice: 750, sizes: ["S","M","L","XL","XXL","XXXL"], description: "Professional blue style staff uniform for women.", image: "images/Images/Female Uniform (Blue Style).jpg", badge: "Bestseller" },
        { name: "Female Staff Uniform - Blue Style 02", category: "staff-uniform", gender: "female", sleeve: "half", price: 580, oldPrice: 750, sizes: ["S","M","L","XL","XXL","XXXL"], description: "Elegant blue style variant.", image: "images/Images/Female Uniform (Blue Style 02).jpg", badge: "" },
        { name: "Female Staff Uniform - Dark Pink", category: "staff-uniform", gender: "female", sleeve: "half", price: 590, oldPrice: 760, sizes: ["S","M","L","XL","XXL","XXXL"], description: "Stylish dark pink staff uniform.", image: "images/Images/Female Uniform (Dark Pink).jpg", badge: "New" },
        { name: "Female Staff Uniform - Green Color", category: "staff-uniform", gender: "female", sleeve: "half", price: 570, oldPrice: 740, sizes: ["S","M","L","XL","XXL","XXXL"], description: "Fresh green color staff uniform.", image: "images/Images/Female Uniform (Green Color).jpg", badge: "" },
        { name: "Female Staff Uniform - Pink Style", category: "staff-uniform", gender: "female", sleeve: "half", price: 580, oldPrice: 750, sizes: ["S","M","L","XL","XXL","XXXL"], description: "Classic pink style staff uniform.", image: "images/Images/Female Uniform (Pink Style).jpg", badge: "Popular" },
        { name: "Female Staff Uniform - Pink Style 02", category: "staff-uniform", gender: "female", sleeve: "half", price: 580, oldPrice: 750, sizes: ["S","M","L","XL","XXL","XXXL"], description: "Pink style variant.", image: "images/Images/Female Uniform (Pink Style) (2).jpg", badge: "" },
        { name: "Female Staff Uniform - Red Style", category: "staff-uniform", gender: "female", sleeve: "half", price: 590, oldPrice: 760, sizes: ["S","M","L","XL","XXL","XXXL"], description: "Elegant red style staff uniform.", image: "images/Images/Female Uniform (Red Style).jpg", badge: "Premium" },
        { name: "Bedsheet - Striped Blue & White", category: "bedsheets", price: 350, oldPrice: 450, sizes: ["60x90","60x100","90x100"], description: "Hospital-grade striped bedsheet.", image: "images/Images/Striped Sheet.jpg", badge: "" },
        { name: "Bedsheet - Checked Blue", category: "bedsheets", price: 320, oldPrice: 420, sizes: ["60x90","60x100","90x100"], description: "Blue checked hospital bedsheet.", image: "", badge: "" },
        { name: "Pillow Cover - Light Blue Set", category: "bedsheets", price: 150, oldPrice: 200, sizes: ["Standard","Large"], description: "Set of 2 light blue pillow covers.", image: "", badge: "" },
        { name: "Hospital Towel - OT Grade", category: "hospital-linen", price: 220, oldPrice: 300, sizes: ["36x1m","36x1.25m","60x2m"], description: "High-absorbency OT towel.", image: "images/Images/Hospital Towel.jpg", badge: "" },
        { name: "Surgical Cap & Mask Set", category: "hospital-linen", price: 120, oldPrice: 160, sizes: ["Standard","Large"], description: "Reusable surgical cap and mask set.", image: "images/Images/Head cap and Mask.jpg", badge: "Popular" },
        { name: "Surgeon Apron - Ladies", category: "hospital-linen", gender: "female", sleeve: "half", price: 450, oldPrice: 580, sizes: ["S","M","L","XL","XXL","XXXL"], description: "Ladies surgeon apron.", image: "images/Images/Surgeon Apron.jpg", badge: "" },
        { name: "Patient Gown - Cotton", category: "hospital-linen", price: 380, oldPrice: 480, sizes: ["S","M","L","XL","XXL","XXXL"], description: "Comfortable cotton patient gown.", image: "", badge: "" },
        { name: "Surgeon Apron - Gents", category: "hospital-linen", gender: "male", sleeve: "full", price: 520, oldPrice: 680, sizes: ["S","M","L","XL","XXL","XXXL"], description: "Heavy-duty surgeon apron for men.", image: "images/Images/Male Surgeon Apron.jpg", badge: "Premium" },
        { name: "Hotel Bedsheet - Premium White", category: "hotel-linen", price: 480, oldPrice: 620, sizes: ["Single","Double","King"], description: "Premium white hotel bedsheet.", image: "", badge: "Premium" },
        { name: "Hotel Towel - Big 60x2m", category: "hotel-linen", price: 350, oldPrice: 450, sizes: ["Standard","Large","Bath Sheet"], description: "Large hotel bath towel.", image: "", badge: "" },
        { name: "Abdominal Sheet 9x9", category: "hospital-linen", price: 280, oldPrice: 380, sizes: ["9x9","Standard"], description: "Surgical abdominal sheet.", image: "images/Images/abdominal Sheet 9x9.jpg", badge: "New" },
        { name: "Surgical Eye Pad", category: "hospital-linen", price: 95, oldPrice: 130, sizes: ["Standard"], description: "Reusable surgical eye pad.", image: "images/Images/Eye Pad.jpg", badge: "" },
        { name: "Female Surgeon Apron - Green", category: "hospital-linen", gender: "female", sleeve: "full", price: 480, oldPrice: 620, sizes: ["S","M","L","XL","XXL","XXXL"], description: "Full green surgeon apron for women.", image: "images/Images/Female Surgoen Apron.jpg", badge: "New" },
        { name: "OT Nighty - Patient Wear", category: "hospital-linen", gender: "female", price: 340, oldPrice: 450, sizes: ["S","M","L","XL","XXL","XXXL"], description: "Comfortable OT nighty for patients.", image: "images/Images/OT Nighty.jpg", badge: "" },
        { name: "Bedspread & Pillow Cover Set - Striped", category: "bedsheets", price: 420, oldPrice: 550, sizes: ["Single","Double","King"], description: "Premium striped bedspread with pillow cover.", image: "images/Images/Stripped Bedspread and Pillow Cover.jpg", badge: "New" },
    ];
}

// ===== Inventory =====
async function loadInventory() {
    try {
        const data = await _adminApiOr('adminInventory',
            () => _cachedGet('inventory', () => db.collection('inventory').get()).then(snap => {
                const docs = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
                docs.sort((a, b) => (a.productName || '').localeCompare(b.productName || ''));
                return docs;
            })
        );
        allInventory = Array.isArray(data) ? data : data.docs.map(d => ({ docId: d.id, ...d.data() }));
        allInventory.sort((a, b) => (a.productName || '').localeCompare(b.productName || ''));
        renderInventory();
    } catch (err) { console.error('Inventory error:', err); }
}

let _invFilter = 'all';

// Helper: derive effective status (supports both new status field + old quantity field)
function _invStatus(i) {
    if (i.status) return i.status;
    if (i.quantity === 0) return 'out_of_stock';
    if (i.quantity > 0 && i.quantity <= 10) return 'low_stock';
    return 'in_stock';
}

function setInvFilter(filter, btn) {
    _invFilter = filter;
    document.querySelectorAll('[data-inv-filter]').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderInventory();
}

function renderInventory() {
    const tbody = document.getElementById('inventoryTableBody');
    const summary = document.getElementById('invSummary');
    if (!allInventory.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty">No inventory data. Click "Sync" to populate.</td></tr>'; return; }

    const okCount  = allInventory.filter(i => _invStatus(i) === 'in_stock').length;
    const lowCount = allInventory.filter(i => _invStatus(i) === 'low_stock').length;
    const outCount = allInventory.filter(i => _invStatus(i) === 'out_of_stock').length;

    if (summary) summary.innerHTML = `
        <div class="inv-chip total"><i class="fas fa-boxes"></i> ${allInventory.length} SKUs</div>
        <div class="inv-chip ok"><i class="fas fa-check-circle"></i> ${okCount} In Stock</div>
        <div class="inv-chip low"><i class="fas fa-exclamation-triangle"></i> ${lowCount} Low Stock</div>
        <div class="inv-chip out"><i class="fas fa-times-circle"></i> ${outCount} Out of Stock</div>
    `;

    const search = (document.getElementById('inventorySearch')?.value || '').toLowerCase();
    let items = allInventory;
    if (search) items = items.filter(i =>
        (i.productName || '').toLowerCase().includes(search) ||
        (i.size || '').toLowerCase().includes(search) ||
        (i.color || '').toLowerCase().includes(search)
    );
    if (_invFilter === 'low') items = items.filter(i => _invStatus(i) === 'low_stock');
    if (_invFilter === 'out') items = items.filter(i => _invStatus(i) === 'out_of_stock');

    if (!items.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty">No matching items.</td></tr>'; return; }

    tbody.innerHTML = items.map(i => {
        const st = _invStatus(i);
        const rowClass = st === 'out_of_stock' ? 'inv-row-out' : st === 'low_stock' ? 'inv-row-low' : 'inv-row-ok';
        return `
        <tr class="${rowClass}">
            <td class="td-name"><strong>${i.productName}</strong></td>
            <td><span class="size-chip">${i.size}</span></td>
            <td>${i.color || '<span style="color:#94a3b8">\u2014</span>'}</td>
            <td>
                <select class="inv-status-select inv-status-${st}" onchange="updateInventoryStatus('${i.docId}', this.value)">
                    <option value="in_stock"  ${st === 'in_stock'      ? 'selected' : ''}>\u2713 In Stock</option>
                    <option value="low_stock" ${st === 'low_stock'     ? 'selected' : ''}>\u26a0 Low Stock</option>
                    <option value="out_of_stock" ${st === 'out_of_stock' ? 'selected' : ''}>\u2717 Out of Stock</option>
                </select>
            </td>
        </tr>`;
    }).join('');
}

async function updateInventoryStatus(docId, status) {
    try {
        await db.collection('inventory').doc(docId).update({ status, updatedAt: fsServerTimestamp() });
        _invalidateCache('inventory');
        if (window.ssaApi && window.ssaApi.enabled) { window.ssaApi.invalidate('/api/admin/inventory'); window.ssaApi.invalidate('/api/inventory'); }
        const item = allInventory.find(i => i.docId === docId);
        if (item) { item.status = status; renderInventory(); }
        const labels = { in_stock: 'In Stock', low_stock: 'Low Stock', out_of_stock: 'Out of Stock' };
        showAdminToast(`\u2713 Marked as ${labels[status] || status}`);
    } catch (err) {
        showAdminToast('Update failed: ' + err.message, 'error');
    }
}

function openStockModal(docId, name) {
    document.getElementById('stockDocId').value = docId;
    document.getElementById('stockProductName').textContent = name;
    const item = allInventory.find(i => i.docId === docId);
    document.getElementById('stockStatus').value = item ? _invStatus(item) : 'in_stock';
    openModal('stockModal');
}

async function saveStock(e) {
    e.preventDefault();
    const docId = document.getElementById('stockDocId').value;
    const status = document.getElementById('stockStatus').value;
    try {
        await db.collection('inventory').doc(docId).update({ status, updatedAt: fsServerTimestamp() });
        const item = allInventory.find(i => i.docId === docId);
        if (item) { item.status = status; }
        showAdminToast('Stock status updated');
        closeModal('stockModal');
        renderInventory();
    } catch (err) {
        showAdminToast('Error: ' + err.message, 'error');
    }
}
function exportOrdersCSV() {
    if (!allOrders.length) { showAdminToast('No orders to export', 'info'); return; }
    const rows = [['Order ID','Customer','Email','Phone','Items','Total','Status','Date','Tracking','Address','City','Pincode']];
    allOrders.forEach(o => {
        const items = (o.items || []).map(i => `${i.name} x${i.qty} (${i.selectedSize||''})`).join('; ');
        const date = o.createdAt ? new Date(o.createdAt.seconds * 1000).toLocaleDateString('en-IN') : '';
        rows.push([o.orderId||o.docId, o.customerName||'', o.customerEmail||'', o.customerPhone||'', items, o.total||0, o.status||'', date, o.trackingId||'', o.address||'', o.city||'', o.pincode||'']);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `orders_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    showAdminToast('CSV downloaded!');
}

// ===== Deduplicate inventory (merge/delete extra copies per product+size+color) =====
async function deduplicateInventory() {
    const btn = event?.target;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...'; }
    showAdminToast('Scanning for duplicates...', 'info');
    try {
        const snap = await db.collection('inventory').get();
        const docs = snap.docs.map(d => ({ docId: d.id, ...d.data() }));

        // Group by productName + size + (color or '')
        const groups = {};
        for (const doc of docs) {
            const key = `${doc.productName}||${doc.size}||${doc.color || ''}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(doc);
        }

        let deleted = 0;
        for (const group of Object.values(groups)) {
            if (group.length <= 1) continue;
            // Keep the doc with the LOWEST quantity (most deductions applied = most accurate)
            group.sort((a, b) => (a.quantity || 0) - (b.quantity || 0));
            const toDelete = group.slice(1);
            for (const dup of toDelete) {
                await db.collection('inventory').doc(dup.docId).delete();
                deleted++;
            }
        }

        if (deleted === 0) {
            showAdminToast('No duplicates found.', 'info');
        } else {
            showAdminToast(`Removed ${deleted} duplicate entries!`);
            await loadInventory();
        }
    } catch (err) {
        showAdminToast('Error: ' + err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-compress-alt"></i> Fix Duplicates'; }
    }
}

// ===== Reconcile inventory from all unprocessed orders =====
async function reconcileInventoryFromOrders() {
    const btn = event?.target;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Working...'; }
    showAdminToast('Reading all orders...', 'info');
    try {
        const snap = await db.collection('orders').get();
        const pending = snap.docs.filter(d => {
            const data = d.data();
            return !data.inventoryDeducted && data.status !== 'Cancelled';
        });
        if (!pending.length) {
            showAdminToast('All orders already reconciled ✓', 'info');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-calculator"></i> Reconcile Stock'; }
            return;
        }
        let processed = 0;
        for (const doc of pending) {
            const order = doc.data();
            for (const item of (order.items || [])) {
                if (!item.name || !item.selectedSize) continue;
                const invSnap = await db.collection('inventory')
                    .where('productName', '==', item.name)
                    .where('size', '==', item.selectedSize)
                    .get();
                if (invSnap.empty) continue;
                let invDoc = invSnap.docs[0];
                if (item.selectedColor && invSnap.docs.length > 1) {
                    const m = invSnap.docs.find(d => (d.data().color || '').toLowerCase() === item.selectedColor.toLowerCase());
                    if (m) invDoc = m;
                }
                const cur = invDoc.data().quantity || 0;
                await db.collection('inventory').doc(invDoc.id).update({
                    quantity: Math.max(0, cur - (item.qty || 1)),
                    updatedAt: fsServerTimestamp()
                });
            }
            await db.collection('orders').doc(doc.id).update({ inventoryDeducted: true });
            processed++;
        }
        showAdminToast(`Reconciled ${processed} order(s). Inventory updated!`);
        await loadInventory();
    } catch (err) {
        showAdminToast('Error: ' + err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-calculator"></i> Reconcile Stock'; }
    }
}

function openStockModal(docId, name, qty) {
    document.getElementById('stockDocId').value = docId;
    document.getElementById('stockProductName').textContent = name;
    document.getElementById('stockQty').value = qty;
    openModal('stockModal');
}

async function saveStock(e) {
    e.preventDefault();
    const docId = document.getElementById('stockDocId').value;
    const qty = parseInt(document.getElementById('stockQty').value);
    try {
        await db.collection('inventory').doc(docId).update({ quantity: qty, updatedAt: fsServerTimestamp() });
        showAdminToast('Stock updated');
        closeModal('stockModal');
        loadInventory();
    } catch (err) {
        showAdminToast('Error: ' + err.message, 'error');
    }
}

// ===== Customers =====
async function loadCustomers() {
    const tbody = document.getElementById('customersTableBody');
    try {
        const data = await _adminApiOr('adminCustomers',
            () => _cachedGet('customers', () => db.collection('customers').get()).then(snap => {
                const docs = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
                docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                return docs;
            })
        );
        allCustomers = Array.isArray(data) ? data : data.docs.map(d => ({ docId: d.id, ...d.data() }));
        allCustomers.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        renderCustomers();
    } catch (err) {
        console.error('Customers error:', err);
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="empty" style="color:red">Error: ' + err.message + '</td></tr>';
    }
}

function renderCustomers() {
    const search = (document.getElementById('customerSearch')?.value || '').toLowerCase();
    let filtered = allCustomers;
    if (search) filtered = filtered.filter(c => (c.name || '').toLowerCase().includes(search) || (c.email || '').toLowerCase().includes(search));

    const tbody = document.getElementById('customersTableBody');
    if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">No customers yet</td></tr>'; return; }

    tbody.innerHTML = filtered.map(c => `
        <tr>
            <td><strong>${c.name || 'N/A'}</strong></td>
            <td>${c.email || ''}</td>
            <td>${c.phone || ''}</td>
            <td>${c.orderCount || 0}</td>
            <td>\u20b9${(c.totalSpent || 0).toLocaleString()}</td>
            <td>${c.createdAt ? new Date(c.createdAt.seconds * 1000).toLocaleDateString('en-IN') : 'N/A'}</td>
        </tr>
    `).join('');
}

document.getElementById('customerSearch')?.addEventListener('input', renderCustomers);

// ===== Modals =====
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// Close modals on backdrop click
document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', (e) => { if (e.target === e.currentTarget) el.classList.remove('active'); });
});

// ===== Toast =====
function showAdminToast(msg, type = 'success') {
    const toast = document.getElementById('adminToast');
    if (!toast) { console.log('[toast]', type, msg); return; }
    toast.textContent = msg;
    toast.className = 'admin-toast ' + type + ' show';
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== Global Exports =====
window.handleAdminLogin = handleAdminLogin;
window.handleAdminLogout = handleAdminLogout;
window.toggleSidebar = toggleSidebar;
window.viewOrder = viewOrder;
window.updateOrderStatus = updateOrderStatus;
window.saveOrderUpdate = saveOrderUpdate;
window.openProductModal = openProductModal;
window.editProduct = editProduct;
window.saveProduct = saveProduct;
window.deleteProduct = deleteProduct;
window.syncInventoryFromProducts = syncInventoryFromProducts;
window.openStockModal = openStockModal;
window.saveStock = saveStock;
window.closeModal = closeModal;


// ===== NEW: Reset Password Feature =====
function handleResetPassword(e) {
    e.preventDefault();
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    document.getElementById('currentPasswordError').style.display = 'none';
    document.getElementById('newPasswordError').style.display = 'none';
    document.getElementById('confirmPasswordError').style.display = 'none';
    if (newPass.length < 6) {
        document.getElementById('newPasswordError').textContent = 'Min 6 chars';
        document.getElementById('newPasswordError').style.display = 'block';
        return;
    }
    if (newPass !== confirm) {
        document.getElementById('confirmPasswordError').textContent = 'Passwords don\u0027t match';
        document.getElementById('confirmPasswordError').style.display = 'block';
        return;
    }
    const user = window.getCurrentUser();
    if (!user) { showAdminToast('User not found', 'error'); return; }
    auth.signInWithEmailAndPassword(user.email, current)
        .then(() => auth.updatePassword(newPass))
        .then(() => {
            showAdminToast('✓ Password updated successfully', 'success');
            closeModal('resetPasswordModal');
            document.getElementById('resetPasswordForm').reset();
        })
        .catch(err => {
            const msg = err.message.includes('wrong') || err.message.includes('invalid') ? 'Current password is incorrect' : err.message;
            document.getElementById('currentPasswordError').textContent = msg;
            document.getElementById('currentPasswordError').style.display = 'block';
        });
}

// ===== NEW: Edit Order Modal =====
async function editOrderModal(docId) {
    const order = allOrders.find(o => o.docId === docId);
    if (!order) return;
    document.getElementById('editOrderId').value = docId;
    document.getElementById('editOrderIdDisplay').value = order.orderId || docId.slice(0, 8);
    document.getElementById('editOrderStatus').value = order.status || 'Processing';
    document.getElementById('editOrderAddress').value = order.address || '';
    document.getElementById('editOrderCity').value = order.city || '';
    document.getElementById('editOrderPincode').value = order.pincode || '';
    document.getElementById('editOrderTracking').value = order.trackingId || '';
    openModal('editOrderModal');
}

// ===== NEW: Save Order Modifications =====
async function saveOrderModifications(e) {
    e.preventDefault();
    const docId = document.getElementById('editOrderId').value;
    const status = document.getElementById('editOrderStatus').value;
    const address = document.getElementById('editOrderAddress').value;
    const city = document.getElementById('editOrderCity').value;
    const pincode = document.getElementById('editOrderPincode').value;
    const tracking = document.getElementById('editOrderTracking').value;
    try {
        const docRef = db.collection('orders').doc(docId);
        await docRef.update({status, address, city, pincode, trackingId: tracking, updatedAt: fsServerTimestamp()});
        showAdminToast('✓ Order updated successfully', 'success');
        closeModal('editOrderModal');
        loadOrders();
    } catch (err) {
        showAdminToast('✗ Failed to update: ' + err.message, 'error');
    }
}

// ===== Product Image Upload =====
// Converts the selected image to a compressed JPEG data-URL client-side.
// No Firebase Storage upload — data URL stored directly in Firestore.
function handleProductImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const MAX_W = 900, MAX_H = 900, QUALITY = 0.82;
    const btn = document.querySelector('#productForm button[type=submit]');
    const origText = btn?.innerHTML || '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...'; }

    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image();
        img.onload = () => {
            // Resize keeping aspect ratio
            let w = img.width, h = img.height;
            if (w > MAX_W || h > MAX_H) {
                const ratio = Math.min(MAX_W / w, MAX_H / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
            }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);

            // Show preview
            const preview = document.getElementById('pImagePreview');
            if (preview) { preview.src = dataUrl; preview.classList.add('show'); }

            // Store data URL as the image value (saved to Firestore with the product)
            document.getElementById('pImage').value = dataUrl;

            if (btn) { btn.disabled = false; btn.innerHTML = origText; }
            showAdminToast('Image ready — click Save to store it.');
        };
        img.onerror = () => {
            showAdminToast('Could not read image file', 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = origText; }
        };
        img.src = e.target.result;
    };
    reader.onerror = () => {
        showAdminToast('Failed to read file', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = origText; }
    };
    reader.readAsDataURL(file);
}

// ===== Messages =====
let allMessages = [];

async function loadMessages() {
    const container = document.getElementById('messagesList');
    if (!container) return;
    container.innerHTML = '<p class="empty">Loading messages...</p>';
    try {
        const snap = await db.collection('messages').get();
        allMessages = snap.docs.map(d => ({ docId: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        renderMessages();
    } catch (err) {
        container.innerHTML = '<p class="empty" style="color:red">Error loading messages: ' + err.message + '</p>';
    }
}

function renderMessages() {
    const container = document.getElementById('messagesList');
    if (!container) return;
    const search = (document.getElementById('messageSearch')?.value || '').toLowerCase();
    let msgs = allMessages;
    if (search) msgs = msgs.filter(m => (m.name||'').toLowerCase().includes(search) || (m.email||'').toLowerCase().includes(search) || (m.message||'').toLowerCase().includes(search));

    if (!msgs.length) {
        container.innerHTML = '<p class="empty"><i class="fas fa-envelope-open"></i>No messages found</p>';
        return;
    }
    container.innerHTML = msgs.map(m => `
        <div class="msg-card ${m.read ? '' : 'unread'}" onclick="toggleMessage('${m.docId}')">
            <div class="msg-header">
                <span class="msg-sender"><i class="fas fa-user-circle" style="color:#6366f1;margin-right:6px"></i>${m.name || 'Unknown'}</span>
                <span class="msg-time">${m.createdAt ? new Date(m.createdAt.seconds*1000).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : 'N/A'}</span>
            </div>
            <div class="msg-subject">${m.subject || 'General Inquiry'}</div>
            <div class="msg-preview">${m.message || ''}</div>
            <div class="msg-meta">
                <span class="msg-tag"><i class="fas fa-envelope"></i> ${m.email || ''}</span>
                ${m.phone ? `<span class="msg-tag"><i class="fas fa-phone"></i> ${m.phone}</span>` : ''}
                ${!m.read ? '<span class="msg-tag" style="background:#ede9fe;color:#6366f1;">New</span>' : ''}
            </div>
            <div class="msg-full" id="msg-full-${m.docId}">${(m.message||'').replace(/\n/g,'<br>')}</div>
        </div>
    `).join('');
}

async function toggleMessage(docId) {
    const full = document.getElementById('msg-full-' + docId);
    if (full) full.classList.toggle('open');
    // Mark as read
    const msg = allMessages.find(m => m.docId === docId);
    if (msg && !msg.read) {
        try {
            await db.collection('messages').doc(docId).update({ read: true });
            msg.read = true;
            renderMessages();
            loadDashboard(); // refresh badge
        } catch (e) { /* ignore */ }
    }
}

async function markAllRead() {
    const unread = allMessages.filter(m => !m.read);
    if (!unread.length) { showAdminToast('All messages already read'); return; }
    try {
        await Promise.all(unread.map(m => db.collection('messages').doc(m.docId).update({ read: true })));
        unread.forEach(m => m.read = true);
        renderMessages();
        loadDashboard();
        showAdminToast('All messages marked as read');
    } catch (err) {
        showAdminToast('Error: ' + err.message, 'error');
    }
}

// ===== Export new functions =====
window.handleProductImageUpload = handleProductImageUpload;
window.loadMessages = loadMessages;
window.renderMessages = renderMessages;
window.toggleMessage = toggleMessage;
window.markAllRead = markAllRead;
window.quickAdjust = undefined; // removed — use status dropdown
window.setInvFilter = setInvFilter;
window.reconcileInventoryFromOrders = undefined; // removed — no longer qty-based
window.deduplicateInventory = deduplicateInventory;
window.exportOrdersCSV = exportOrdersCSV;
window.updateInventoryStatus = updateInventoryStatus;
window.openStockModal = openStockModal;
window.saveStock = saveStock;
