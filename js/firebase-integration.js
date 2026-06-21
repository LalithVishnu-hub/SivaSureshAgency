// ===== Firebase Integration for Customer Site =====
// fireDb is set by js/firebase-db.js (module) which targets named DB "sivasureshagency"
// fsServerTimestamp and fsIncrement are also set by firebase-db.js

// ── Helper: ensure anonymous Firebase auth ───────────────────────────
async function _ensureAuth() {
    if (!window.auth) return;
    try { await window.auth.signInAnonymously(); } catch (e) { /* already signed in or disabled */ }
}

// ── Helper: mark an order as synced in localStorage ─────────────────
function _markSynced(orderId, userEmail) {
    const key = 'ssa_orders_' + userEmail;
    try {
        const orders = JSON.parse(localStorage.getItem(key) || '[]');
        const idx = orders.findIndex(o => o.id === orderId);
        if (idx !== -1) { orders[idx]._synced = true; localStorage.setItem(key, JSON.stringify(orders)); }
    } catch (e) {}
}

// ===== Save Order to Firestore =====
async function saveOrderToFirebase(order, shippingDetails) {
    try {
        if (!window.fireDb) throw new Error('Firebase not initialised');
        await _ensureAuth();

        await fireDb.collection('orders').add({
            orderId: order.id,
            customerName: shippingDetails.firstname + ' ' + shippingDetails.lastname,
            customerEmail: shippingDetails.email,
            customerPhone: shippingDetails.phone,
            address: shippingDetails.address,
            city: shippingDetails.city,
            pincode: shippingDetails.pincode,
            items: order.items,
            total: order.total,
            payment: order.payment,
            status: 'Processing',
            trackingId: '',
            inventoryDeducted: false,
            createdAt: fsServerTimestamp(),
            updatedAt: fsServerTimestamp()
        });

        // Mark as synced in localStorage so syncPendingOrders skips it
        _markSynced(order.id, shippingDetails.email);

        // Upsert customer record using email as doc ID (no read needed)
        const customerDocId = shippingDetails.email.replace(/[^a-zA-Z0-9]/g, '_');
        const customerDocRef = fireDb.collection('customers').doc(customerDocId);
        await customerDocRef.set({
            name:  (shippingDetails.firstname + ' ' + shippingDetails.lastname).trim(),
            email: shippingDetails.email,
            phone: shippingDetails.phone || '',
            createdAt: fsServerTimestamp()
        }, { merge: true });
        // Increment counts separately so they don't reset on merge
        await customerDocRef.update({
            orderCount: fsIncrement(1),
            totalSpent: fsIncrement(order.total)
        });
    } catch (err) {
        console.error('Firebase order save error:', err);
        // Will be retried automatically by syncPendingOrders on next page load
    }
}

// ===== Auto-sync: push any unsynced localStorage orders to Firestore =====
async function syncPendingOrders(userEmail, userName, userPhone) {
    if (!userEmail) { console.log('[sync] No email provided'); return; }
    if (!window.fireDb) { console.log('[sync] Firebase not ready yet'); return; }
    
    const key = 'ssa_orders_' + userEmail;
    let orders;
    try { orders = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { console.warn('[sync] Parse error:', e); return; }
    
    const pending = orders.filter(o => !o._synced);
    console.log(`[sync] Found ${orders.length} total orders, ${pending.length} unsynced for ${userEmail}`);
    if (!pending.length) { console.log('[sync] No pending orders'); return; }

    await _ensureAuth();

    let changed = false;
    let synced = 0, skipped = 0, failed = 0;
    
    for (const order of pending) {
        try {
            // Avoid duplicates: check if already in Firestore
            const existing = await fireDb.collection('orders').where('orderId', '==', order.id).get();
            if (!existing.empty) {
                console.log(`[sync] Order ${order.id} already in Firestore, skipping`);
                order._synced = true; changed = true; skipped++; continue;
            }
            // Push to Firestore
            console.log(`[sync] Pushing order ${order.id}...`);
            await fireDb.collection('orders').add({
                orderId:       order.id,
                customerName:  userName  || '',
                customerEmail: userEmail,
                customerPhone: userPhone || '',
                address: '', city: '', pincode: '',
                items:   order.items  || [],
                total:   order.total  || 0,
                payment: order.payment || 'COD',
                status:  order.status  || 'Processing',
                trackingId: '',
                inventoryDeducted: false,
                createdAt: fsServerTimestamp(),
                updatedAt: fsServerTimestamp()
            });
            // Deduct inventory for synced offline order — removed (admin manages stock status manually)
            console.log(`[sync] ✓ Order ${order.id} synced`);
            order._synced = true; changed = true; synced++;
        } catch (e) {
            console.error(`[sync] ✗ Failed to sync ${order.id}:`, e.message);
            failed++;
        }
    }
    
    if (changed) {
        // Write back with _synced flags
        const all = JSON.parse(localStorage.getItem(key) || '[]');
        for (const p of pending) {
            const idx = all.findIndex(o => o.id === p.id);
            if (idx !== -1) all[idx]._synced = p._synced;
        }
        localStorage.setItem(key, JSON.stringify(all));
    }
    
    console.log(`[sync] Complete: ${synced} synced, ${skipped} skipped, ${failed} failed`);
}

// ===== Save Customer Registration to Firestore =====
async function saveCustomerToFirebase(customerData) {
    try {
        if (!window.fireDb) { console.log('[customer] Firebase not ready'); return; }
        await _ensureAuth();
        const fullName = ((customerData.firstName || '') + ' ' + (customerData.lastName || '')).trim();
        // Use email as document ID (URL-safe) — prevents duplicates without needing a read
        const docId = customerData.email.replace(/[^a-zA-Z0-9]/g, '_');
        const docRef = fireDb.collection('customers').doc(docId);
        console.log('[customer] Saving customer doc:', docId);
        await docRef.set({
            name:       fullName,
            email:      customerData.email,
            phone:      customerData.phone || '',
            orderCount: 0,
            totalSpent: 0,
            createdAt:  fsServerTimestamp()
        }, { merge: true }); // merge: won't overwrite if doc already exists
        console.log('[customer] ✓ Customer saved to Firestore');
    } catch (err) {
        console.error('[customer] ✗ Save failed:', err.message || err);
    }
}

// Expose to global scope
window.saveOrderToFirebase   = saveOrderToFirebase;
window.saveCustomerToFirebase = saveCustomerToFirebase;
window.syncPendingOrders      = syncPendingOrders;

// ===== Out-of-Stock awareness for the customer-facing frontend =====
// Fetches all inventory docs, builds out-of-stock/low-stock maps by status field.
// Falls back to quantity field for older docs that haven't been migrated.
async function loadOutOfStockData() {
    try {
        if (!window.fireDb) return;
        const snap = await window.fireDb.collection('inventory').get();
        const outMap = {}, lowMap = {};

        snap.docs.forEach(d => {
            const { productName, size, status, quantity } = d.data();
            if (!productName || !size) return;
            // Effective status: prefer explicit status field, fall back to quantity
            let st = status;
            if (!st) st = (quantity === 0) ? 'out_of_stock' : (quantity > 0 && quantity <= 10) ? 'low_stock' : 'in_stock';
            if (st === 'out_of_stock') {
                if (!outMap[productName]) outMap[productName] = new Set();
                outMap[productName].add(size);
            } else if (st === 'low_stock') {
                if (!lowMap[productName]) lowMap[productName] = new Set();
                lowMap[productName].add(size);
            }
        });

        window.outOfStockMap = outMap;
        window.lowStockMap   = lowMap;

        if (window.productsData) {
            window.productsData.forEach(p => {
                const outSizes = outMap[p.name];
                const lowSizes = lowMap[p.name];
                p.outOfStockSizes = outSizes ? [...outSizes] : [];
                p.lowStockSizes   = lowSizes ? [...lowSizes] : [];
                p.outOfStock = outSizes ? p.sizes.every(s => outSizes.has(s)) : false;
                p.lowStock   = !p.outOfStock && (lowSizes ? p.sizes.some(s => lowSizes.has(s)) : false);
            });
        }
        if (typeof window.renderProducts === 'function') {
            window.renderProducts(window.currentFilter || 'all', window.displayedProducts || 12, window._currentGender, window._currentSleeve);
        }
        console.log('[stock] Loaded:', Object.keys(outMap).length, 'out-of-stock,', Object.keys(lowMap).length, 'low-stock products');
    } catch (e) {
        console.warn('[stock] Could not load stock data:', e.message);
    }
}
// Auto-load when Firebase is ready
document.addEventListener('DOMContentLoaded', () => {
    const wait = setInterval(() => {
        if (window._firebaseReady && window.fireDb) { clearInterval(wait); loadOutOfStockData(); }
    }, 400);
});
window.loadOutOfStockData = loadOutOfStockData;

