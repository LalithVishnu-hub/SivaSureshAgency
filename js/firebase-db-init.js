console.log('[firebase-db-init] Starting Firebase initialization...');

// NOTE: Switched from named database ("sivasureshagency") to DEFAULT database.
// Reason: Spark plan only supports 1 database. Named databases cannot have custom
// security rules on Spark — all requests get "Missing or insufficient permissions".
// The compat SDK (firebase.firestore()) always uses the default database, which
// works correctly with Firestore security rules on any plan.

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
const _db = firebase.firestore(); // default database — rules apply correctly

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

// Expose compat Firestore directly — it already has the chainable API
// that admin.js and firebase-integration.js use (collection().where().get() etc.)
window.db = _db;
window.fireDb = _db;
window.fsServerTimestamp = () => firebase.firestore.FieldValue.serverTimestamp();
window.fsIncrement = (n) => firebase.firestore.FieldValue.increment(n);
window._firebaseReady = true;

console.log('[firebase-db-init] ✓ Ready');
