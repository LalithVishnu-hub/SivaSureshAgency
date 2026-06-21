Firestore Local Sync & Admin Setup

Quick overview
- This project includes client-side Firebase usage (`js/firebase-integration.js` and `js/admin.js`). To work locally you can use the Firebase Local Emulator Suite.

Steps to run emulator and sync data

1. Install Firebase CLI (if not installed):

```powershell
npm install -g firebase-tools
```

2. Start the emulators (uses `firebase.json` and `firestore.rules` at repo root):

```powershell
firebase emulators:start --only firestore,auth --import=./emulator_export --export-on-exit
```

3. If you have a production export (not committed here), place it at `./emulator_export` or run:

```powershell
firebase firestore:export ./emulator_export --project your-prod-project-id
```

4. To import a JSON / export into the emulator, use `--import` as shown in step 2.

Create an admin user (local or production)

1. Put your service account JSON at `tools/serviceAccountKey.json` (do NOT commit).
2. Install dependencies and run the script:

```powershell
cd <repo-root>
npm init -y
npm install firebase-admin minimist
node tools/create_admin_user.js --email admin@example.com --password Secret123! --displayName "Site Admin"
```

Notes & safety
- Do not commit `serviceAccountKey.json` or any secrets. Add them to `.gitignore`.
- The `firestore.rules` in this repo is a starter; review and harden before using in production.
