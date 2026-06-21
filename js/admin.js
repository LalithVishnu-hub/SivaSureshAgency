// db, auth, fsServerTimestamp, fsIncrement are set by js/firebase-db-init.js

// ===== State =====
let currentOrderFilter = 'all';
let allOrders = [];
let allProducts = [];
let allInventory = [];
let allCustomers = [];

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
            document.getElementById('adminName').textContent = user.email.split('@')[0];
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
        if (page === 'dashboard') loadDashboard();
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
        const ordersSnap = await db.collection('orders').get();
        const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const customersSnap = await db.collection('customers').get();

        const totalOrders = orders.length;
        const pending = orders.filter(o => o.status === 'Processing').length;
        const revenue = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.total || 0), 0);
        const customers = customersSnap.size;

        document.getElementById('statTotalOrders').textContent = totalOrders;
        document.getElementById('statPending').textContent = pending;
        document.getElementById('statRevenue').textContent = '\u20b9' + revenue.toLocaleString();
        document.getElementById('statCustomers').textContent = customers;

        // Recent orders
        const recent = orders.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 5);
        const recentHtml = recent.length ? recent.map(o => `
            <div class="list-item">
                <div class="list-item-info">
                    <strong>#${o.orderId || o.id.slice(0, 8)}</strong>
                    <span>${o.customerName || 'Guest'}</span>
                </div>
                <div class="list-item-right">
                    <span class="amount">\u20b9${(o.total || 0).toLocaleString()}</span>
                    <span class="status-badge ${(o.status || '').toLowerCase()}">${o.status}</span>
                </div>
            </div>
        `).join('') : '<p class="empty">No orders yet</p>';
        document.getElementById('recentOrdersList').innerHTML = recentHtml;

        // Low stock alerts
        const invSnap = await db.collection('inventory').where('quantity', '<', 10).get();
        const lowStock = invSnap.docs.map(d => d.data());
        const lowStockHtml = lowStock.length ? lowStock.map(s => `
            <div class="list-item">
                <div class="list-item-info">
                    <strong>${s.productName}</strong>
                    <span>Size: ${s.size} | Color: ${s.color || 'N/A'}</span>
                </div>
                <div class="list-item-right">
                    <span class="stock-low">${s.quantity} left</span>
                </div>
            </div>
        `).join('') : '<p class="empty">All stock levels OK</p>';
        document.getElementById('lowStockList').innerHTML = lowStockHtml;
    } catch (err) {
        console.error('Dashboard error:', err);
    }
}

// ===== Orders =====
async function loadOrders() {
    const tbody = document.getElementById('ordersTableBody');
    try {
        let snap;
        try {
            snap = await db.collection('orders').orderBy('createdAt', 'desc').get();
        } catch (e) {
            // Fallback: load without ordering if index missing
            snap = await db.collection('orders').get();
        }
        allOrders = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
        // Sort client-side
        allOrders.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        renderOrders();
    } catch (err) {
        console.error('Orders error:', err);
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="empty" style="color:red">Failed to load orders. Check Firestore security rules.<br><small>' + err.message + '</small></td></tr>';
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
    modal.innerHTML = `
        <div class="order-detail">
            <div class="od-header">
                <div><h4>Order #${o.orderId || docId.slice(0, 8)}</h4><span class="status-badge ${(o.status || '').toLowerCase()}">${o.status}</span></div>
                <span>${o.createdAt ? new Date(o.createdAt.seconds * 1000).toLocaleString('en-IN') : ''}</span>
            </div>
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
            </div>
            <div class="od-section">
                <h5><i class="fas fa-rupee-sign"></i> Payment</h5>
                <p>Method: <strong>${o.payment || 'COD'}</strong></p>
                <p>Total: <strong>\u20b9${(o.total || 0).toLocaleString()}</strong></p>
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
    const status = document.getElementById('orderStatusSelect').value;
    const trackingId = document.getElementById('orderTracking').value.trim();
    try {
        await db.collection('orders').doc(docId).update({ status, trackingId, updatedAt: fsServerTimestamp() });
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
        const snap = await db.collection('products').orderBy('name').get();
        allProducts = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
        // Auto-seed on first run if Firestore is empty
        if (allProducts.length === 0) {
            await autoSeedProducts();
        } else {
            // Remove duplicates: keep first doc per name, delete extras
            await deduplicateProducts();
            renderProducts();
        }
    } catch (err) {
        console.error('Products error:', err);
    }
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
    if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty">No products. Click "Add Product" or "Sync Products" in Inventory.</td></tr>'; return; }

    tbody.innerHTML = filtered.map(p => `
        <tr>
            <td><img src="${p.image || ''}" alt="" class="product-thumb"></td>
            <td><strong>${p.name}</strong></td>
            <td>${(p.category || '').replace(/-/g, ' ')}</td>
            <td>\u20b9${p.price}</td>
            <td>${p.totalStock !== undefined ? p.totalStock : '-'}</td>
            <td><span class="status-badge ${p.totalStock > 0 ? 'approved' : 'cancelled'}">${p.totalStock > 0 ? 'In Stock' : 'Out of Stock'}</span></td>
            <td>
                <button class="btn-icon" onclick="editProduct('${p.docId}')" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="btn-icon danger" onclick="deleteProduct('${p.docId}')" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
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
            showAdminToast('Product updated');
        } else {
            data.createdAt = fsServerTimestamp();
            data.totalStock = 0;
            await db.collection('products').add(data);
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
                // Create inventory entries for each size
                const colors = getColorsForCategory(p.category);
                for (const size of (p.sizes || [])) {
                    for (const color of colors) {
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
        const snap = await db.collection('inventory').orderBy('productName').get();
        allInventory = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
        renderInventory();
    } catch (err) {
        console.error('Inventory error:', err);
    }
}

function renderInventory() {
    const tbody = document.getElementById('inventoryTableBody');
    if (!allInventory.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">No inventory data. Click "Sync Products" to populate.</td></tr>'; return; }

    tbody.innerHTML = allInventory.map(i => `
        <tr>
            <td>${i.productName}</td>
            <td>${i.size}</td>
            <td>${i.color || '-'}</td>
            <td><strong>${i.quantity}</strong></td>
            <td><span class="status-badge ${i.quantity > 10 ? 'approved' : i.quantity > 0 ? 'shipped' : 'cancelled'}">${i.quantity > 10 ? 'OK' : i.quantity > 0 ? 'Low' : 'Out'}</span></td>
            <td><button class="btn-icon" onclick="openStockModal('${i.docId}', '${i.productName} (${i.size}/${i.color || "-"})', ${i.quantity})" title="Update"><i class="fas fa-edit"></i></button></td>
        </tr>
    `).join('');
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
        // Debug: log auth state
        const user = window.getCurrentUser();
        if (!user) {
            console.error('[customers] Not authenticated');
            if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="empty" style="color:red">Auth Error: Not authenticated. Refresh and login.</td></tr>';
            return;
        }
        console.log('[customers] Authenticated as:', user.email);
        
        let snap;
        try {
            snap = await db.collection('customers').orderBy('createdAt', 'desc').get();
        } catch (e) {
            // Fallback: load without ordering if index missing
            console.log('[customers] OrderBy failed, retrying:', e.message);
            snap = await db.collection('customers').get();
        }
        allCustomers = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
        // Sort client-side
        allCustomers.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        console.log('[customers] Loaded', allCustomers.length, 'customers');
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

// ===== Export new functions =====
window.handleResetPassword = handleResetPassword;
window.editOrderModal = editOrderModal;
window.saveOrderModifications = saveOrderModifications;
