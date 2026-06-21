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
                createdAt: fsServerTimestamp(),
                updatedAt: fsServerTimestamp()
            });
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

