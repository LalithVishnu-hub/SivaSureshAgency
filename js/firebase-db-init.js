console.log('[firebase-db-init] Starting Firebase initialization...');

const firebaseConfig = {
    apiKey: "AIzaSyD3H7U7WwkRWx6hvsQxTGkmGO2Uq9xd4n4",
    authDomain: "siva-suresh-agency.firebaseapp.com",
    projectId: "siva-suresh-agency",
    storageBucket: "siva-suresh-agency.firebasestorage.app",
    messagingSenderId: "1069646087757",
    appId: "1:1069646087757:web:986a9d840fcb77a68c3e04"
};

firebase.initializeApp(firebaseConfig);
const _auth  = firebase.auth();
const _store = firebase.storage();

window.auth = {
    onAuthStateChanged: (cb) => _auth.onAuthStateChanged(cb),
    signInWithEmailAndPassword: (e, p) => _auth.signInWithEmailAndPassword(e, p),
    signOut: () => _auth.signOut(),
    signInAnonymously: () => _auth.signInAnonymously(),
    updatePassword: (p) => _auth.currentUser.updatePassword(p),
    sendPasswordResetEmail: (e) => _auth.sendPasswordResetEmail(e),
    currentUser: () => _auth.currentUser
};
window.storage = {
    ref: (path) => _store.ref(path),
    uploadBytes: (r, data) => r.put(data),
    getDownloadURL: (r) => r.getDownloadURL(),
    deleteObject: (r) => r.delete()
};
window.getCurrentUser = () => _auth.currentUser;

// Firestore REST API — named database "sivasureshagency"
// Uses runQuery (POST) for collection reads — the list (GET) API returns 403
// on named databases even with 'allow read: if true' rules.
// Individual document GET and all write operations work normally.
const _DB  = 'sivasureshagency';
const _FS  = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${_DB}/documents`;
const _KEY = firebaseConfig.apiKey;

async function _fetch(url, opts = {}) {
    const user = _auth.currentUser;
    const h = { 'Content-Type': 'application/json' };
    if (user) { try { h['Authorization'] = 'Bearer ' + await user.getIdToken(); } catch(e) {} }
    const sep = url.includes('?') ? '&' : '?';
    const res  = await fetch(`${url}${sep}key=${_KEY}`, { ...opts, headers: h });
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(json.error?.message || `Firestore ${res.status}`);
    return json;
}

// Firestore value → JS
function _fromV(v) {
    if (!v) return null;
    if ('stringValue'    in v) return v.stringValue;
    if ('integerValue'   in v) return Number(v.integerValue);
    if ('doubleValue'    in v) return v.doubleValue;
    if ('booleanValue'   in v) return v.booleanValue;
    if ('nullValue'      in v) return null;
    if ('timestampValue' in v) { const d = new Date(v.timestampValue); return { seconds: Math.floor(d/1000), toDate: () => d }; }
    if ('arrayValue'     in v) return (v.arrayValue.values || []).map(_fromV);
    if ('mapValue'       in v) return _fromFields(v.mapValue.fields || {});
    return null;
}
function _fromFields(f) { return Object.fromEntries(Object.entries(f).map(([k,v]) => [k, _fromV(v)])); }

// JS → Firestore value
function _toV(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (v instanceof Date)     return { timestampValue: v.toISOString() };
    if (typeof v === 'string') return { stringValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') {
        if (!isFinite(v) || isNaN(v)) return { nullValue: null };
        return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    }
    if (Array.isArray(v)) return { arrayValue: { values: v.map(_toV) } };
    if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k,x]) => [k, _toV(x)])) } };
    return { nullValue: null };
}

function _buildWrite(obj) {
    const fields = {}, transforms = [];
    for (const [k, v] of Object.entries(obj)) {
        if (v && v._fsOp === 'serverTime')
            transforms.push({ fieldPath: k, setToServerValue: 'REQUEST_TIME' });
        else if (v && v._fsOp === 'increment')
            transforms.push({ fieldPath: k, increment: { integerValue: String(v._n) } });
        else
            fields[k] = _toV(v);
    }
    return { fields, transforms };
}

function _parseDoc(raw) {
    if (!raw?.name) return null;
    return { id: raw.name.split('/').pop(), data: () => _fromFields(raw.fields || {}), exists: true };
}

function _autoId() {
    const C = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 20 }, () => C[Math.floor(Math.random() * C.length)]).join('');
}

class ColRef {
    constructor(name) { this._name = name; this._wheres = []; this._order = null; }
    _clone() { const c = new ColRef(this._name); c._wheres = [...this._wheres]; c._order = this._order; return c; }
    where(f, op, v) { const c = this._clone(); c._wheres.push({ f, op, v }); return c; }
    orderBy(f, dir) { const c = this._clone(); c._order = { f, dir: dir === 'desc' ? 'desc' : 'asc' }; return c; }

    async get() {
        // Use runQuery (POST) — the list (GET) API returns 403 on named databases.
        // Push WHERE filters server-side so only matching docs are fetched (critical for
        // large collections like inventory with 1800+ docs).
        // Cursor-paginates if unfiltered collection exceeds 1000 docs.

        const FS_OPS = { '==':'EQUAL','!=':'NOT_EQUAL','<':'LESS_THAN','<=':'LESS_THAN_OR_EQUAL','>':'GREATER_THAN','>=':'GREATER_THAN_OR_EQUAL','array-contains':'ARRAY_CONTAINS' };
        const serverWheres = this._wheres.filter(w => FS_OPS[w.op]);
        const clientWheres = this._wheres.filter(w => !FS_OPS[w.op]);
        const hasServerFilter = serverWheres.length > 0;

        let all = [], lastDocName = null, batchCount = 0;
        do {
            const q = { from: [{ collectionId: this._name }], limit: 1000 };
            // Cursor pagination — only when no server filters (avoids composite index needs)
            if (lastDocName && !hasServerFilter) {
                q.orderBy = [{ field: { fieldPath: '__name__' }, direction: 'ASCENDING' }];
                q.startAt = { values: [{ referenceValue: lastDocName }], before: false };
            }
            // Server-side WHERE (single or composite AND)
            if (serverWheres.length === 1) {
                q.where = { fieldFilter: { field: { fieldPath: serverWheres[0].f }, op: FS_OPS[serverWheres[0].op], value: _toV(serverWheres[0].v) } };
            } else if (serverWheres.length > 1) {
                q.where = { compositeFilter: { op: 'AND', filters: serverWheres.map(w => ({ fieldFilter: { field: { fieldPath: w.f }, op: FS_OPS[w.op], value: _toV(w.v) } })) } };
            }
            const res = await _fetch(`${_FS}:runQuery`, {
                method: 'POST',
                body: JSON.stringify({ structuredQuery: q })
            });
            const rawArr = Array.isArray(res) ? res : [res];
            const rawDocs = rawArr.filter(r => r.document).map(r => r.document);
            batchCount = rawDocs.length;
            all = all.concat(rawDocs.map(_parseDoc).filter(Boolean));
            // Only paginate for unfiltered queries (filtered results are always < 1000)
            lastDocName = (!hasServerFilter && batchCount === 1000) ? (rawDocs[rawDocs.length - 1]?.name || null) : null;
        } while (lastDocName);

        // Client-side fallback for unsupported operators (e.g. 'in')
        let docs = all;
        for (const { f, op, v } of clientWheres) {
            docs = docs.filter(d => {
                const val = d.data()[f];
                if (op === 'in') return Array.isArray(v) && v.includes(val);
                return true;
            });
        }

        // Client-side sort
        if (this._order) {
            const { f, dir } = this._order;
            docs.sort((a, b) => {
                let av = a.data()[f], bv = b.data()[f];
                if (av?.seconds !== undefined) av = av.seconds;
                if (bv?.seconds !== undefined) bv = bv.seconds;
                if (av < bv) return dir === 'desc' ? 1 : -1;
                if (av > bv) return dir === 'desc' ? -1 : 1;
                return 0;
            });
        }

        console.log(`[FS] ${this._name}: ${docs.length} docs`);
        return { docs, size: docs.length, empty: !docs.length };
    }

    doc(id) { return new DocRef(this._name, id); }

    async add(obj) {
        const id = _autoId();
        const { fields, transforms } = _buildWrite(obj);
        const docPath = `projects/${firebaseConfig.projectId}/databases/${_DB}/documents/${this._name}/${id}`;
        const write = { update: { name: docPath, fields } };
        if (transforms.length) write.updateTransforms = transforms;
        await _fetch(`${_FS}:commit`, { method: 'POST', body: JSON.stringify({ writes: [write] }) });
        return { id };
    }
}

class DocRef {
    constructor(col, id) { this._col = col; this._id = id; }
    get _docPath() { return `projects/${firebaseConfig.projectId}/databases/${_DB}/documents/${this._col}/${this._id}`; }

    async get() {
        try {
            const res = await _fetch(`${_FS}/${this._col}/${this._id}`);
            return _parseDoc(res) || { id: this._id, data: () => ({}), exists: false };
        } catch { return { id: this._id, data: () => ({}), exists: false }; }
    }

    async set(obj, opts) {
        const { fields, transforms } = _buildWrite(obj);
        const write = { update: { name: this._docPath, fields } };
        if (opts?.merge) write.updateMask = { fieldPaths: Object.keys(fields) };
        if (transforms.length) write.updateTransforms = transforms;
        await _fetch(`${_FS}:commit`, { method: 'POST', body: JSON.stringify({ writes: [write] }) });
    }

    async update(obj) {
        const { fields, transforms } = _buildWrite(obj);
        const writes = [];
        if (Object.keys(fields).length) {
            writes.push({
                update: { name: this._docPath, fields },
                updateMask: { fieldPaths: Object.keys(fields) },
                ...(transforms.length ? { updateTransforms: transforms } : {})
            });
        } else if (transforms.length) {
            writes.push({ transform: { document: this._docPath, fieldTransforms: transforms } });
        }
        if (writes.length) await _fetch(`${_FS}:commit`, { method: 'POST', body: JSON.stringify({ writes }) });
    }

    async delete() { await _fetch(`${_FS}/${this._col}/${this._id}`, { method: 'DELETE' }); }
}

window.db = { collection: (name) => new ColRef(name) };
window.fireDb = window.db;
window.fsServerTimestamp = () => ({ _fsOp: 'serverTime' });
window.fsIncrement = (n) => ({ _fsOp: 'increment', _n: n });
window._firebaseReady = true;

console.log('[firebase-db-init] ✓ Ready');
