Siva Suresh Agency (GitHub Pages frontend + Supabase backend)

## Supabase Migration Setup

This project now uses Supabase instead of Firebase for auth, database, and storage through the compatibility wrapper in [js/firebase-db-init.js](js/firebase-db-init.js).

### 1. Create Supabase project

1. Create a new project in Supabase.
2. Open SQL Editor and run [tools/supabase_setup.sql](tools/supabase_setup.sql).
3. In Authentication -> Users, create admin user `lalithvishnu04@gmail.com` (or your preferred admin email).
4. In Authentication -> URL Configuration, set:
	- Site URL: your GitHub Pages URL
	- Redirect URLs: your GitHub Pages URL and local dev URL

### 2. Configure frontend keys

Edit [js/backend-config.js](js/backend-config.js):

- `supabaseUrl`: your project URL
- `supabaseAnonKey`: your anon/public API key
- `storageBucket`: `assets` (default from SQL)

### 3. Data migration

After moving to Supabase, historical Firebase data will not appear automatically.
Run this one-time migration to copy old Firebase collections to Supabase tables:

- `products` -> `products`
- `inventory` -> `inventory`
- `orders` -> `orders`
- `customers` -> `customers`
- `messages` -> `messages`

```powershell
python tools/migrate_firebase_to_supabase.py \
	--firebase-email admin@sivasureshagency.com \
	--firebase-password "<your-firebase-password>" \
	--supabase-url https://kyzlxhncnqahlpfhtoky.supabase.co \
	--supabase-anon-key "<your-supabase-publishable-key>" \
	--supabase-email admin@sivasureshagency.com \
	--supabase-password "<your-supabase-password>"
```

This script uses upsert by `id`, so it is safe to rerun if needed.

### 4. Password reset

Customer forgot-password now sends a secure reset email (via Supabase Auth) from login modal.

### 5. Deploy

Commit and push to `main`. GitHub Pages serves the static files.

