// ============================================================
//  Firebase Integration — firebase-integration.js
//
//  Routes through window.ssaApi (backend) when SSA_API_BASE
//  is set in api.js. Falls back to direct Firestore otherwise.
//  sessionStorage cache on loadOutOfStockData() is ALWAYS
//  active — cuts repeated reads on every page navigation.
// ============================================================

async function _ensureAuth() {
    if (!window.auth) return;
    try { await window.auth.signInAnonymously(); } catch (e) { }
}
function _markSynced(orderId, userEmail) {
    const key = 'ssa_orders_' + userEmail;
    try {
        const orders = JSON.parse(localStorage.getItem(key) || '[]');
        const idx = orders.findIndex(o => o.id === orderId);
        if (idx !== -1) { orders[idx]._synced = true; localStorage.setItem(key, JSON.stringify(orders)); }
    } catch (e) {}
}

// ===== Save Order =====
async function saveOrderToFirebase(order, shippingDetails) {
    try {
        if (window.ssaApi && window.ssaApi.enabled) {
            await window.ssaApi.postOrder({
                orderId:       order.id,
                customerName:  (shippingDetails.firstname + ' ' + shippingDetails.lastname).trim(),
                customerEmail: shippingDetails.email,
                customerPhone: shippingDetails.phone || '',
                address: shippingDetails.address, city: shippingDetails.city, pincode: shippingDetails.pincode,
                items: order.items, total: order.total, payment: order.payment
            });
            await window.ssaApi.postCustomer({ email: shippingDetails.email, firstName: shippingDetails.firstname, lastName: shippingDetails.lastname, phone: shippingDetails.phone || '' }).catch(() => {});
            _markSynced(order.id, shippingDetails.email);
            return;
        }
        if (!window.fireDb) throw new Error('Firebase not initialised');
        await _ensureAuth();
        await fireDb.collection('orders').add({
            orderId: order.id,
            customerName:  (shippingDetails.firstname + ' ' + shippingDetails.lastname).trim(),
            customerEmail: shippingDetails.email,
            customerPhone: shippingDetails.phone,
            address: shippingDetails.address, city: shippingDetails.city, pincode: shippingDetails.pincode,
            items: order.items, total: order.total, payment: order.payment,
            status: 'Processing', trackingId: '', inventoryDeducted: false,
            createdAt: fsServerTimestamp(), updatedAt: fsServerTimestamp()
        });
        _markSynced(order.id, shippingDetails.email);
        const cid  = shippingDetails.email.replace(/[^a-zA-Z0-9]/g, '_');
        const cRef = fireDb.collection('customers').doc(cid);
        await cRef.set({ name: (shippingDetails.firstname + ' ' + shippingDetails.lastname).trim(), email: shippingDetails.email, phone: shippingDetails.phone || '', createdAt: fsServerTimestamp() }, { merge: true });
        await cRef.update({ orderCount: fsIncrement(1), totalSpent: fsIncrement(order.total) });
    } catch (err) { console.error('[order] Save error:', err); }
}

// ===== Sync pending localStorage orders =====
async function syncPendingOrders(userEmail, userName, userPhone) {
    if (!userEmail) return;
    if (!window.fireDb && !(window.ssaApi && window.ssaApi.enabled)) return;
    const key = 'ssa_orders_' + userEmail;
    let orders;
    try { orders = JSON.parse(localStorage.getItem(key) || '[]'); } catch { return; }
    const pending = orders.filter(o => !o._synced);
    if (!pending.length) return;

    let changed = false;
    for (const order of pending) {
        try {
            if (window.ssaApi && window.ssaApi.enabled) {
                await window.ssaApi.postOrder({ orderId: order.id, customerName: userName, customerEmail: userEmail, customerPhone: userPhone, items: order.items, total: order.total, payment: order.payment || 'COD', address: '', city: '', pincode: '' });
            } else {
                await _ensureAuth();
                const exists = await fireDb.collection('orders').where('orderId', '==', order.id).get();
                if (!exists.empty) { order._synced = true; changed = true; continue; }
                await fireDb.collection('orders').add({ orderId: order.id, customerName: userName, customerEmail: userEmail, customerPhone: userPhone, address: '', city: '', pincode: '', items: order.items, total: order.total, payment: order.payment || 'COD', status: order.status || 'Processing', trackingId: '', inventoryDeducted: false, createdAt: fsServerTimestamp(), updatedAt: fsServerTimestamp() });
            }
            order._synced = true; changed = true;
        } catch (e) { console.warn('[sync] failed:', order.id, e.message); }
    }
    if (changed) {
        const all = JSON.parse(localStorage.getItem(key) || '[]');
        for (const p of pending) { const idx = all.findIndex(o => o.id === p.id); if (idx !== -1) all[idx]._synced = p._synced; }
        localStorage.setItem(key, JSON.stringify(all));
    }
}

// ===== Save Customer Registration =====
async function saveCustomerToFirebase(customerData) {
    try {
        if (window.ssaApi && window.ssaApi.enabled) { await window.ssaApi.postCustomer(customerData); return; }
        if (!window.fireDb) return;
        await _ensureAuth();
        const docId = customerData.email.replace(/[^a-zA-Z0-9]/g, '_');
        await fireDb.collection('customers').doc(docId).set({ name: ((customerData.firstName || '') + ' ' + (customerData.lastName || '')).trim(), email: customerData.email, phone: customerData.phone || '', orderCount: 0, totalSpent: 0, createdAt: fsServerTimestamp() }, { merge: true });
    } catch (err) { console.error('[customer] Save error:', err.message); }
}

window.saveOrderToFirebase    = saveOrderToFirebase;
window.saveCustomerToFirebase = saveCustomerToFirebase;
window.syncPendingOrders      = syncPendingOrders;

// ===== Inventory stock status =====
// Priority: 1. sessionStorage cache  2. Backend API  3. Direct Firestore
async function loadOutOfStockData() {
    const CACHE_KEY = '_ssa_inv_status_v1';
    const CACHE_TTL = 120000;

    // 1. sessionStorage hit — zero network/Firestore reads
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (raw) {
            const { d, e } = JSON.parse(raw);
            if (Date.now() < e) {
                console.log('[stock] sessionStorage HIT');
                _applyStockMaps(
                    _reviveSets(d.outMap),
                    _reviveSets(d.lowMap),
                    _reviveSets(d.outVariantMap),
                    _reviveSets(d.lowVariantMap)
                );
                return;
            }
            sessionStorage.removeItem(CACHE_KEY);
        }
    } catch { }

    try {
        let invList = null;

        // 2. Backend API
        if (window.ssaApi && window.ssaApi.enabled) {
            try { invList = await window.ssaApi.getInventoryStatus(); console.log('[stock] API:', invList.length, 'items'); }
            catch (e) { console.warn('[stock] API failed, using Firestore:', e.message); }
        }

        // 3. Direct database read (preferred for variant-level color status and fresher updates)
        if (window.fireDb) {
            try {
                const snap = await window.fireDb.collection('inventory').get();
                const detailed = snap.docs.map(d => {
                    const { productName, size, color, status, quantity } = d.data();
                    const st = _normalizeInvStatus(status) || (quantity === 0 ? 'out_of_stock' : quantity <= 10 ? 'low_stock' : 'in_stock');
                    return { productName, size, color, status: st };
                });
                if (detailed.length) {
                    invList = detailed;
                    console.log('[stock] Firestore:', invList.length, 'items');
                }
            } catch (e) {
                console.warn('[stock] Firestore read failed:', e.message);
            }
        }

        if (!invList) return;

        const outMap = {}, lowMap = {}, outVariantMap = {}, lowVariantMap = {};
        invList.forEach(({ productName, size, color, status }) => {
            const sizeKey = _normalizeSize(size);
            const colorKey = _normalizeColor(color);
            if (!productName || !sizeKey) return;
            const variantKey = _variantKey(sizeKey, colorKey);
            const st = _normalizeInvStatus(status);
            if (st === 'out_of_stock') {
                (outMap[productName] = outMap[productName] || new Set()).add(sizeKey);
                (outVariantMap[productName] = outVariantMap[productName] || new Set()).add(variantKey);
            }
            else if (st === 'low_stock') {
                (lowMap[productName]  = lowMap[productName]  || new Set()).add(sizeKey);
                (lowVariantMap[productName] = lowVariantMap[productName] || new Set()).add(variantKey);
            }
        });

        // Save to sessionStorage as serialisable arrays
        try {
            const ser = { outMap: {}, lowMap: {}, outVariantMap: {}, lowVariantMap: {} };
            Object.entries(outMap).forEach(([k, s]) => ser.outMap[k] = [...s]);
            Object.entries(lowMap).forEach(([k, s]) => ser.lowMap[k]  = [...s]);
            Object.entries(outVariantMap).forEach(([k, s]) => ser.outVariantMap[k] = [...s]);
            Object.entries(lowVariantMap).forEach(([k, s]) => ser.lowVariantMap[k]  = [...s]);
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ d: ser, e: Date.now() + CACHE_TTL }));
        } catch { }

        _applyStockMaps(outMap, lowMap, outVariantMap, lowVariantMap);
    } catch (e) { console.warn('[stock] Could not load:', e.message); }
}

function _reviveSets(obj) {
    const m = {};
    Object.entries(obj || {}).forEach(([k, v]) => m[k] = new Set(v));
    return m;
}

function _normalizeSize(size) {
    if (size === undefined || size === null) return '';
    return String(size)
        .trim()
        .replace(/×/g, 'x')
        .replace(/\s+/g, '')
        .toLowerCase();
}

function _normalizeColor(color) {
    if (color === undefined || color === null) return '';
    return String(color).trim().toLowerCase();
}

function _variantKey(sizeKey, colorKey) {
    return `${sizeKey}::${colorKey || '*'}`;
}

function _normalizeInvStatus(status) {
    if (!status) return '';
    const s = String(status).trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (s === 'outofstock') return 'out_of_stock';
    if (s === 'lowstock') return 'low_stock';
    if (s === 'instock') return 'in_stock';
    return s;
}

function _applyStockMaps(outMap, lowMap, outVariantMap, lowVariantMap) {
    window.outOfStockMap = outMap;
    window.lowStockMap   = lowMap;
    window.outOfStockVariantMap = outVariantMap || {};
    window.lowStockVariantMap   = lowVariantMap || {};
    if (window.productsData) {
        window.productsData.forEach(p => {
            const o = outMap[p.name], l = lowMap[p.name];
            p.outOfStockSizes = o ? [...o] : [];
            p.lowStockSizes   = l ? [...l] : [];
            const normalizedSizes = (p.sizes || []).map(_normalizeSize).filter(Boolean);
            p.outOfStock = normalizedSizes.length
                ? (!!o && normalizedSizes.every(s => o.has(s)))
                : false;
            p.lowStock   = !p.outOfStock && (!!l && normalizedSizes.some(s => l.has(s)));
        });
    }
    if (typeof window.renderProducts === 'function') {
        window.renderProducts(window.currentFilter || 'all', window.displayedProducts || 12, window._currentGender, window._currentSleeve);
    }
    console.log('[stock] Applied — out:', Object.keys(outMap).length, 'low:', Object.keys(lowMap).length);
}

document.addEventListener('DOMContentLoaded', () => {
    const wait = setInterval(() => {
        if (window._firebaseReady && window.fireDb) { clearInterval(wait); loadOutOfStockData(); }
    }, 400);
});
window.loadOutOfStockData = loadOutOfStockData;
