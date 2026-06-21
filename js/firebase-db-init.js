/**
 * Firebase initialization using compat SDK
 * Loads Firebase globally and sets window.db, window.auth, etc.
 */

// Initialize Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyD3H7U7WwkRWx6hvsQxTGkmGO2Uq9xd4n4",
    authDomain: "siva-suresh-agency.firebaseapp.com",
    projectId: "siva-suresh-agency",
    storageBucket: "siva-suresh-agency.firebasestorage.app",
    messagingSenderId: "1069646087757",
    appId: "1:1069646087757:web:986a9d840fcb77a68c3e04"
};

console.log('[firebase-db-init] Starting Firebase initialization...');

// Initialize Firebase (compat SDK)
firebase.initializeApp(firebaseConfig);
console.log('[firebase-db-init] Firebase app initialized');

// Get references - targeting named database "sivasureshagency"
const _db = firebase.firestore();
_db.settings({ experimentalAutoDetectLongPolling: true });

const _auth = firebase.auth();
const _storage = firebase.storage();

console.log('[firebase-db-init] Got references - db, auth, storage');

// Wrapper to mimic modular SDK behavior
window.db = {
    collection: (name) => {
        const ref = _db.collection(name);
        return {
            get: () => ref.get(),
            add: (data) => ref.add(data),
            where: (f, op, v) => ({
                get: () => ref.where(f, op, v).get(),
                orderBy: (f2, dir) => ({
                    get: () => ref.where(f, op, v).orderBy(f2, dir).get()
                })
            }),
            orderBy: (f, dir) => ({
                get: () => ref.orderBy(f, dir || 'asc').get(),
                where: (f2, op2, v2) => ({
                    get: () => ref.orderBy(f, dir).where(f2, op2, v2).get()
                })
            }),
            doc: (id) => ({
                get: () => ref.doc(id).get(),
                set: (data, opts) => ref.doc(id).set(data, opts),
                update: (data) => ref.doc(id).update(data),
                delete: () => ref.doc(id).delete()
            })
        };
    }
};

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

window.fsServerTimestamp = () => firebase.firestore.FieldValue.serverTimestamp();
window.fsIncrement = (n) => firebase.firestore.FieldValue.increment(n);

// Also expose on fireDb for firebase-integration.js
window.fireDb = window.db;

// Helper
window.getCurrentUser = () => _auth.currentUser;

// Signal ready
window._firebaseReady = true;
console.log('[firebase-db-init] ✓ Firebase initialized successfully');
console.log('[firebase-db-init] window.auth:', typeof window.auth);
console.log('[firebase-db-init] window.db:', typeof window.db);
