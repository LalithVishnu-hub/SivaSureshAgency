console.log('[firebase-db-init] Starting Firebase initialization...');

// Initialize Firebase config (compat SDK already loaded via HTML script tags)
const firebaseConfig = {
    apiKey: "AIzaSyD3H7U7WwkRWx6hvsQxTGkmGO2Uq9xd4n4",
    authDomain: "siva-suresh-agency.firebaseapp.com",
    projectId: "siva-suresh-agency",
    storageBucket: "siva-suresh-agency.firebasestorage.app",
    messagingSenderId: "1069646087757",
    appId: "1:1069646087757:web:986a9d840fcb77a68c3e04"
};

firebase.initializeApp(firebaseConfig);

const _auth = firebase.auth();
const _storage = firebase.storage();

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
    ref: (path) => _storage.ref(path),
    uploadBytes: (r, data) => r.put(data),
    getDownloadURL: (r) => r.getDownloadURL(),
    deleteObject: (r) => r.delete()
};

window.getCurrentUser = () => _auth.currentUser;

// Firestore via modular SDK to target named database "sivasureshagency"
// Loaded inline using dynamic import
(async () => {
    try {
        const { initializeApp, getApps, getApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
        const { getFirestore, collection, getDocs, addDoc, doc, getDoc, setDoc, updateDoc, deleteDoc, query, orderBy, where, serverTimestamp, increment } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

        const _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
        const _db = getFirestore(_app, 'sivasureshagency');

        // Expose Firestore with compat-like chainable API
        class ColRef {
            constructor(name) { this._col = collection(_db, name); this._name = name; this._constraints = []; }
            _clone(extra) { const c = new ColRef(this._name); c._constraints = [...this._constraints, extra]; return c; }
            where(f, op, v) { return this._clone(where(f, op, v)); }
            orderBy(f, dir) { return this._clone(orderBy(f, dir || 'asc')); }
            async get() { const q = this._constraints.length ? query(this._col, ...this._constraints) : this._col; const snap = await getDocs(q); return { docs: snap.docs.map(d => ({ id: d.id, data: () => d.data(), exists: d.exists() })), size: snap.size, empty: snap.empty }; }
            async add(data) { return addDoc(this._col, data); }
            doc(id) { return { get: async () => { const d = await getDoc(doc(_db, this._name, id)); return { id: d.id, data: () => d.data(), exists: d.exists() }; }, set: (data, opts) => setDoc(doc(_db, this._name, id), data, opts || {}), update: (data) => updateDoc(doc(_db, this._name, id), data), delete: () => deleteDoc(doc(_db, this._name, id)) }; }
        }

        window.db = { collection: (name) => new ColRef(name) };
        window.fireDb = window.db;
        window.fsServerTimestamp = serverTimestamp;
        window.fsIncrement = increment;
        window._firebaseReady = true;
        console.log('[firebase-db-init] ✓ Ready');
    } catch (err) {
        console.error('[firebase-db-init] Firestore init failed:', err);
    }
})();
