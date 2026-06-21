/**
 * js/firebase-db.js
 * Modular Firebase SDK wrapper targeting the named database "sivasureshagency".
 * Sets window.db, window.auth, window.fsServerTimestamp, window.fsIncrement
 * so existing compat-style code in admin.js and firebase-integration.js keeps working.
 */
import { initializeApp, getApps, getApp }
    from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
    getFirestore, collection, getDocs, addDoc,
    doc, getDoc, updateDoc, deleteDoc,
    query, orderBy as _orderBy, where as _where,
    serverTimestamp, increment
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, signInAnonymously
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// ── Config ───────────────────────────────────────────────────────────
const firebaseConfig = {
    apiKey:            "AIzaSyD3H7U7WwkRWx6hvsQxTGkmGO2Uq9xd4n4",
    authDomain:        "siva-suresh-agency.firebaseapp.com",
    projectId:         "siva-suresh-agency",
    storageBucket:     "siva-suresh-agency.firebasestorage.app",
    messagingSenderId: "1069646087757",
    appId:             "1:1069646087757:web:986a9d840fcb77a68c3e04"
};

const app   = getApps().length ? getApp() : initializeApp(firebaseConfig);
const _db   = getFirestore(app, 'sivasureshagency');
const _auth = getAuth(app);

// ── Snapshot wrapper (mirrors compat API) ────────────────────────────
function wrapSnap(snap) {
    return {
        docs:  snap.docs.map(wrapDoc),
        empty: snap.empty,
        size:  snap.size
    };
}
function wrapDoc(d) {
    return { id: d.id, exists: d.exists(), data: () => d.data() };
}

// ── Query builder (compat-like chaining) ─────────────────────────────
class QB {
    constructor(colRef, constraints) {
        this._col = colRef;
        this._c   = constraints || [];
    }
    where(f, op, v)  { return new QB(this._col, [...this._c, _where(f, op, v)]); }
    orderBy(f, dir)  { return new QB(this._col, [...this._c, _orderBy(f, dir || 'asc')]); }
    async get()      {
        const q    = this._c.length ? query(this._col, ...this._c) : this._col;
        return wrapSnap(await getDocs(q));
    }
    async add(data)  { return addDoc(this._col, data); }
    doc(id)          { return new DR(this._col, id); }
}

// ── Doc ref ──────────────────────────────────────────────────────────
class DR {
    constructor(colRef, id) {
        this._ref = doc(_db, colRef.path ? colRef.path.split('/').pop() : colRef._query?.path?.segments?.join('/') || colRef.id, id);
    }
    async get()          { return wrapDoc(await getDoc(this._ref)); }
    async update(data)   { return updateDoc(this._ref, data); }
    async delete()       { return deleteDoc(this._ref); }
}

// ── Collection ref ────────────────────────────────────────────────────
class CR extends QB {
    constructor(name) {
        super(collection(_db, name));
        this._name = name;
    }
    doc(id) { return new DR(collection(_db, this._name), id); }
}

// ── Global window.db (compat-like) ───────────────────────────────────
window.db = { collection: (name) => new CR(name) };

// ── Global window.auth (compat-like) ─────────────────────────────────
window.auth = {
    onAuthStateChanged:          (cb)    => onAuthStateChanged(_auth, cb),
    signInWithEmailAndPassword:  (e, p)  => signInWithEmailAndPassword(_auth, e, p),
    signOut:                     ()      => signOut(_auth),
    signInAnonymously:           ()      => signInAnonymously(_auth)
};

// ── FieldValue helpers (global shortcuts used in admin.js) ───────────
window.fsServerTimestamp = serverTimestamp;
window.fsIncrement       = increment;

// Also expose on fireDb for firebase-integration.js
window.fireDb = window.db;

// Signal that module is ready
window._firebaseReady = true;
console.log('[firebase-db] ✓ Initialised → database: sivasureshagency');
