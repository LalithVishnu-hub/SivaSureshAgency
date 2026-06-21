// ============================================================
//  SSA API Client  —  js/api.js
//
//  ⚙️  TO ACTIVATE: after deploying backend/server.js to
//      Render or Railway, paste your URL below:
//
//      const SSA_API_BASE = 'https://ssa-api.onrender.com';
//
//  Leave as '' to keep using direct Firestore (current behavior).
//  The frontend falls back gracefully when API_BASE is empty.
// ============================================================

const SSA_API_BASE = ''; // ← paste your Render/Railway URL here after deploying

// ── SessionStorage cache ──────────────────────────────────────
// Caches Firestore responses for the lifetime of a browser tab.
// Even without the backend, this cuts inventory reads by ~90%
// (page-to-page navigation reuses the same fetched data).

const _ssaCache = {
    _k: k => '_ssa_' + k,
    get(k) {
        try {
            const raw = sessionStorage.getItem(this._k(k));
            if (!raw) return null;
            const { d, e } = JSON.parse(raw);
            if (Date.now() > e) { sessionStorage.removeItem(this._k(k)); return null; }
            return d;
        } catch { return null; }
    },
    set(k, d, ttlMs) {
        try { sessionStorage.setItem(this._k(k), JSON.stringify({ d, e: Date.now() + ttlMs })); } catch { /* full */ }
    },
    del(prefix) {
        try {
            Object.keys(sessionStorage)
                .filter(k => k.startsWith('_ssa_' + prefix))
                .forEach(k => sessionStorage.removeItem(k));
        } catch { }
    }
};

// ── API request helpers ───────────────────────────────────────
async function _ssaGet(path, ttlMs = 120_000) {
    const hit = _ssaCache.get(path);
    if (hit !== null) { console.log('[api] cache HIT:', path); return hit; }
    const res  = await fetch(SSA_API_BASE + path);
    if (!res.ok) throw new Error('API ' + res.status + ': ' + path);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'API error');
    if (ttlMs > 0) _ssaCache.set(path, json.data, ttlMs);
    return json.data;
}

async function _ssaPost(path, body) {
    const res  = await fetch(SSA_API_BASE + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'API error');
    return json;
}

async function _ssaAdminGet(path, ttlMs = 60_000) {
    const hit = _ssaCache.get(path);
    if (hit !== null) { console.log('[api] admin cache HIT:', path); return hit; }
    const token = await _ssaAdminToken();
    if (!token) throw new Error('Not authenticated');
    const res  = await fetch(SSA_API_BASE + path, { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) throw new Error('API ' + res.status);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'API error');
    if (ttlMs > 0) _ssaCache.set(path, json.data, ttlMs);
    return json.data;
}

async function _ssaAdminPatch(path, body) {
    const token = await _ssaAdminToken();
    const res   = await fetch(SSA_API_BASE + path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(body)
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'API error');
    return json;
}

async function _ssaAdminDelete(path) {
    const token = await _ssaAdminToken();
    const res   = await fetch(SSA_API_BASE + path, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token }
    });
    return res.json();
}

async function _ssaAdminToken() {
    try {
        const user = window.auth?.currentUser?.();
        return user ? await user.getIdToken() : null;
    } catch { return null; }
}

// ── Public API ─────────────────────────────────────────────────
window.ssaApi = {
    enabled: !!SSA_API_BASE,

    // Inventory status for stock badges — cached 3 min
    async getInventoryStatus() {
        return _ssaGet('/api/inventory/status', 180_000);
    },

    // Products, optionally filtered by category — cached 5 min
    async getProducts(category) {
        const path = category ? '/api/products?category=' + encodeURIComponent(category) : '/api/products';
        return _ssaGet(path, 300_000);
    },

    // Place a new order (POST) — busts admin cache
    async postOrder(orderData) {
        const result = await _ssaPost('/api/orders', orderData);
        _ssaCache.del('/api/admin');
        return result;
    },

    // Register/upsert customer
    async postCustomer(data) {
        return _ssaPost('/api/customers', data);
    },

    // Contact form message
    async postMessage(data) {
        return _ssaPost('/api/messages', data);
    },

    // Customer's own orders (no cache — needs to be fresh)
    async getMyOrders(email) {
        return _ssaGet('/api/orders/my?email=' + encodeURIComponent(email), 0);
    },

    // ── Admin ─────────────────────────────────────────────────
    async adminDashboard()   { return _ssaAdminGet('/api/admin/dashboard',  30_000); },
    async adminOrders()      { return _ssaAdminGet('/api/admin/orders',     30_000); },
    async adminProducts()    { return _ssaAdminGet('/api/admin/products',  120_000); },
    async adminInventory()   { return _ssaAdminGet('/api/admin/inventory', 120_000); },
    async adminCustomers()   { return _ssaAdminGet('/api/admin/customers', 120_000); },
    async adminMessages()    { return _ssaAdminGet('/api/admin/messages',        0); },

    async updateOrderStatus(docId, status, trackingId) {
        const r = await _ssaAdminPatch('/api/admin/orders/' + docId, { status, trackingId });
        _ssaCache.del('/api/admin');
        return r;
    },

    async updateInventoryStatus(docId, status) {
        const r = await _ssaAdminPatch('/api/admin/inventory/' + docId, { status });
        _ssaCache.del('/api/admin'); _ssaCache.del('/api/inventory');
        return r;
    },

    async updateProduct(docId, data) {
        const r = await _ssaAdminPatch('/api/admin/products/' + docId, data);
        _ssaCache.del('/api/admin/products'); _ssaCache.del('/api/products');
        return r;
    },

    async deleteProduct(docId) {
        const r = await _ssaAdminDelete('/api/admin/products/' + docId);
        _ssaCache.del('/api/admin/products'); _ssaCache.del('/api/products');
        return r;
    },

    async markMessageRead(docId) {
        return _ssaAdminPatch('/api/admin/messages/' + docId, { read: true });
    },

    // Cache helpers
    invalidate: prefix => _ssaCache.del(prefix || ''),
    clearAll: () => _ssaCache.del('')
};

console.log('[api.js] SSA API client ready. Backend:', SSA_API_BASE || '(not configured — using Firestore directly)');
