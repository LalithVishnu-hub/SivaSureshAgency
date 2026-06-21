// ============================================================
//  SSA Backend API  —  server.js
//  Deploy to Render.com (free) or Railway.app
//
//  Env vars needed on Render:
//    FIREBASE_SERVICE_ACCOUNT  = contents of serviceAccountKey.json (paste as one line)
//    ADMIN_EMAIL               = admin@sivasureshagency.com
//    ALLOWED_ORIGINS           = https://lalithvishnu-hub.github.io
//    PORT                      = (auto-set by Render)
// ============================================================

const express      = require('express');
const cors         = require('cors');
const compression  = require('compression');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const NodeCache    = require('node-cache');
const admin        = require('firebase-admin');

// ── Firebase Admin init ───────────────────────────────────────
let credential;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Production: env var holds the JSON string
    credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
} else {
    // Local dev: place serviceAccountKey.json in this folder
    // Download from Firebase Console → Project Settings → Service Accounts
    try { credential = admin.credential.cert(require('./serviceAccountKey.json')); }
    catch { console.error('[startup] No Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT env var or add serviceAccountKey.json'); process.exit(1); }
}

admin.initializeApp({ credential });
const db = admin.firestore();
// Point to the named database used by this project
db.settings({ databaseId: 'sivasureshagency' });

// ── In-memory cache ───────────────────────────────────────────
// stdTTL=120: most public data cached 2 minutes
// Orders/dashboard cached 30s so admin sees fresh data
const cache = new NodeCache({ stdTTL: 120, checkperiod: 60 });

// cached(key, ttlSeconds, asyncFetcher) — returns cached data or fetches fresh
async function cached(key, ttl, fetcher) {
    const hit = cache.get(key);
    if (hit !== undefined) { console.log(`[cache] HIT  ${key}`); return hit; }
    console.log(`[cache] MISS ${key}`);
    const data = await fetcher();
    cache.set(key, data, ttl);
    return data;
}

function bust(...keys) { keys.forEach(k => cache.del(k)); }

// ── Express setup ─────────────────────────────────────────────
const app = express();
const ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://lalithvishnu-hub.github.io').split(',').map(s => s.trim());

// ── Security headers (helmet) ─────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: false, // Frontend is on a separate origin; skip CSP here
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// ── Gzip compression ──────────────────────────────────────────
app.use(compression());

// ── Rate limiting ─────────────────────────────────────────────
// Public endpoints: 60 requests / minute per IP
const publicLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'Too many requests. Please try again in a moment.' }
});
// Admin endpoints: 120 requests / minute (admins do more work)
const adminLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'Too many requests. Please try again in a moment.' }
});
// Write endpoints (POST): 20 per minute per IP
const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'Too many write requests. Please slow down.' }
});

app.use(cors({ origin: (origin, cb) => {
    if (!origin || ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('CORS: ' + origin));
}, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true, ts: Date.now(), cacheKeys: cache.keys().length }));

// =============================================================
//  PUBLIC ROUTES  (no auth required)
// =============================================================

// GET /api/products[?category=doctor-uniform&limit=100]
app.get('/api/products', publicLimiter, async (req, res) => {
    try {
        const { category, limit: lim = 100 } = req.query;
        const key = 'products_' + (category || 'all');
        const data = await cached(key, 300, async () => {
            let q = db.collection('products');
            if (category) q = q.where('category', '==', category);
            const snap = await q.limit(parseInt(lim)).get();
            return snap.docs.map(d => ({ docId: d.id, ...d.data() }));
        });
        res.json({ ok: true, data, count: data.length });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/inventory/status  — lightweight: only returns {productName, size, color, status}
// This is the main endpoint the frontend calls to show Out-of-Stock / Low-Stock badges.
// With 200-300 inventory docs it's ~1 Firestore read, served to ALL visitors from cache.
app.get('/api/inventory/status', publicLimiter, async (req, res) => {
    try {
        const data = await cached('inv_status', 180, async () => {
            const snap = await db.collection('inventory').get();
            return snap.docs.map(d => {
                const { productName, size, color, status, quantity } = d.data();
                const st = status ||
                    (quantity === 0   ? 'out_of_stock' :
                     quantity <= 10   ? 'low_stock'    : 'in_stock');
                return { productName, size, color: color || null, status: st };
            });
        });
        res.json({ ok: true, data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/orders  — place a new order
app.post('/api/orders', writeLimiter, async (req, res) => {
    try {
        const { customerEmail, customerName, customerPhone,
                items, total, payment, address, city, pincode,
                orderId } = req.body;
        if (!customerEmail || !items?.length) {
            return res.status(400).json({ ok: false, error: 'customerEmail and items required' });
        }
        const ref = await db.collection('orders').add({
            orderId:       orderId || ('SSA' + Date.now().toString(36).toUpperCase()),
            customerEmail, customerName, customerPhone,
            items, total, payment, address, city, pincode,
            status:        'Processing',
            trackingId:    '',
            createdAt:     admin.firestore.FieldValue.serverTimestamp(),
            updatedAt:     admin.firestore.FieldValue.serverTimestamp()
        });
        bust('orders_all', 'admin_dashboard');
        res.json({ ok: true, id: ref.id });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/orders/my?email=... — customer's own orders
app.get('/api/orders/my', publicLimiter, async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ ok: false, error: 'email required' });
        const snap = await db.collection('orders')
            .where('customerEmail', '==', email)
            .limit(50)
            .get();
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        res.json({ ok: true, data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/customers  — register / upsert customer
app.post('/api/customers', writeLimiter, async (req, res) => {
    try {
        const { email, firstName, lastName, phone } = req.body;
        if (!email) return res.status(400).json({ ok: false, error: 'email required' });
        // Use email-derived doc ID to avoid duplicate reads
        const docId = email.replace(/[^a-zA-Z0-9]/g, '_');
        await db.collection('customers').doc(docId).set(
            { email, firstName, lastName, phone, createdAt: admin.firestore.FieldValue.serverTimestamp() },
            { merge: true }
        );
        bust('customers_all', 'admin_dashboard');
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/messages  — contact form
app.post('/api/messages', writeLimiter, async (req, res) => {
    try {
        const { name, email, phone, message, subject } = req.body;
        if (!name || !email || !message) {
            return res.status(400).json({ ok: false, error: 'name, email and message required' });
        }
        await db.collection('messages').add({
            name, email, phone: phone || '', message, subject: subject || '',
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        bust('admin_dashboard');
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// =============================================================
//  ADMIN AUTH MIDDLEWARE
// =============================================================
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@sivasureshagency.com';

async function adminOnly(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ ok: false, error: 'Authorization header required' });
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        if (decoded.email !== ADMIN_EMAIL) {
            return res.status(403).json({ ok: false, error: 'Admin access only' });
        }
        req.admin = decoded;
        next();
    } catch { res.status(401).json({ ok: false, error: 'Invalid or expired token' }); }
}

// =============================================================
//  ADMIN ROUTES  (require valid admin Firebase Auth token)
// =============================================================

// GET /api/admin/dashboard — aggregated stats (cache 30s)
app.get('/api/admin/dashboard', adminLimiter, adminOnly, async (req, res) => {
    try {
        const data = await cached('admin_dashboard', 30, async () => {
            // These 4 parallel reads happen on the SERVER — single burst from one IP,
            // cached result served to admin browser without touching Firestore again.
            const [ordSnap, cusSnap, invSnap, msgSnap] = await Promise.all([
                db.collection('orders').get(),
                db.collection('customers').get(),
                db.collection('inventory').get(),
                db.collection('messages').where('read', '==', false).get()
            ]);
            const orders = ordSnap.docs.map(d => d.data());
            return {
                totalOrders:  orders.length,
                pending:      orders.filter(o => o.status === 'Processing').length,
                revenue:      orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.total || 0), 0),
                customers:    cusSnap.size,
                unreadMsgs:   msgSnap.size,
                recentOrders: ordSnap.docs.map(d => ({ docId: d.id, ...d.data() }))
                    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                    .slice(0, 5),
                stockAlerts: invSnap.docs.map(d => d.data())
                    .filter(i => (i.status || 'in_stock') !== 'in_stock')
                    .map(i => ({ productName: i.productName, size: i.size, color: i.color, status: i.status }))
            };
        });
        res.json({ ok: true, data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/admin/orders
app.get('/api/admin/orders', adminLimiter, adminOnly, async (req, res) => {
    try {
        const data = await cached('orders_all', 30, async () => {
            const snap = await db.collection('orders').get();
            return snap.docs.map(d => ({ docId: d.id, ...d.data() }))
                .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        });
        res.json({ ok: true, data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// PATCH /api/admin/orders/:id
app.patch('/api/admin/orders/:id', adminLimiter, adminOnly, async (req, res) => {
    try {
        const { status, trackingId, address, city, pincode } = req.body;
        const update = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
        if (status    !== undefined) update.status    = status;
        if (trackingId !== undefined) update.trackingId = trackingId;
        if (address    !== undefined) update.address   = address;
        if (city       !== undefined) update.city      = city;
        if (pincode    !== undefined) update.pincode   = pincode;
        await db.collection('orders').doc(req.params.id).update(update);
        bust('orders_all', 'admin_dashboard');
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/admin/products
app.get('/api/admin/products', adminLimiter, adminOnly, async (req, res) => {
    try {
        const data = await cached('products_all', 120, async () => {
            const snap = await db.collection('products').get();
            return snap.docs.map(d => ({ docId: d.id, ...d.data() }))
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        });
        res.json({ ok: true, data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/admin/products  — add product
app.post('/api/admin/products', adminLimiter, adminOnly, async (req, res) => {
    try {
        const ref = await db.collection('products').add({
            ...req.body,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        bust('products_all', 'products_' + (req.body.category || 'all'));
        res.json({ ok: true, id: ref.id });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// PATCH /api/admin/products/:id
app.patch('/api/admin/products/:id', adminLimiter, adminOnly, async (req, res) => {
    try {
        await db.collection('products').doc(req.params.id).update({
            ...req.body, updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        bust('products_all', 'products_' + (req.body.category || 'all'));
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// DELETE /api/admin/products/:id
app.delete('/api/admin/products/:id', adminOnly, async (req, res) => {
    try {
        await db.collection('products').doc(req.params.id).delete();
        bust('products_all');
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/admin/inventory
app.get('/api/admin/inventory', adminLimiter, adminOnly, async (req, res) => {
    try {
        const data = await cached('inventory_all', 120, async () => {
            const snap = await db.collection('inventory').get();
            return snap.docs.map(d => ({ docId: d.id, ...d.data() }))
                .sort((a, b) => (a.productName || '').localeCompare(b.productName || ''));
        });
        res.json({ ok: true, data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// PATCH /api/admin/inventory/:id  — update stock status
app.patch('/api/admin/inventory/:id', adminLimiter, adminOnly, async (req, res) => {
    try {
        await db.collection('inventory').doc(req.params.id).update({
            status: req.body.status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        bust('inventory_all', 'inv_status', 'admin_dashboard');
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/admin/customers
app.get('/api/admin/customers', adminLimiter, adminOnly, async (req, res) => {
    try {
        const data = await cached('customers_all', 120, async () => {
            const snap = await db.collection('customers').get();
            return snap.docs.map(d => ({ docId: d.id, ...d.data() }))
                .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        });
        res.json({ ok: true, data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/admin/messages
app.get('/api/admin/messages', adminLimiter, adminOnly, async (req, res) => {
    try {
        // Messages aren't cached — admin needs latest
        const snap = await db.collection('messages').get();
        const data = snap.docs.map(d => ({ docId: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        res.json({ ok: true, data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// PATCH /api/admin/messages/:id  — mark read
app.patch('/api/admin/messages/:id', adminLimiter, adminOnly, async (req, res) => {
    try {
        await db.collection('messages').doc(req.params.id).update({ read: req.body.read ?? true });
        bust('admin_dashboard');
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[ssa-api] Running on port ${PORT}`));
