// Creates an admin user using Firebase Admin SDK and sets custom claim `admin: true`.
// Usage:
// 1. Place your service account JSON at `tools/serviceAccountKey.json` (DO NOT commit it).
// 2. `npm init -y && npm install firebase-admin`
// 3. `node tools/create_admin_user.js --email admin@example.com --password secret123 --displayName "Admin User"`

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const keyPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(keyPath)) {
  console.error('Missing service account key. Place it at tools/serviceAccountKey.json');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(keyPath))
});

const argv = require('minimist')(process.argv.slice(2));
const email = argv.email || argv.e;
const password = argv.password || argv.p || 'ChangeMe123!';
const displayName = argv.displayName || 'Admin';

if (!email) {
  console.error('Usage: node create_admin_user.js --email admin@example.com [--password P] [--displayName "Admin"]');
  process.exit(1);
}

(async () => {
  try {
    // Create user
    const user = await admin.auth().createUser({
      email,
      emailVerified: false,
      password,
      displayName,
      disabled: false
    });

    // Set custom claim
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });

    // Optionally create a user document in Firestore
    const db = admin.firestore();
    await db.collection('users').doc(user.uid).set({
      email,
      displayName,
      roles: ['admin'],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Admin user created:', user.uid, email);
  } catch (err) {
    console.error('Error creating admin user:', err);
    process.exit(1);
  }
})();
