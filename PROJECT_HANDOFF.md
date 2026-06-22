# Siva Suresh Agency — Project Handoff Guide

> **Resume from any laptop** — Read this file first, then pick up exactly where work left off.

---

## Live Site & Repository

| Property | Value |
|---|---|
| **Live URL** | https://lalithvishnu-hub.github.io/SivaSureshAgency/ |
| **GitHub Repo** | https://github.com/lalithvishnu-hub/SivaSureshAgency |
| **Branch** | `main` (auto-deploys to GitHub Pages) |
| **Admin Panel** | `/admin.html` (same domain) |
| **Firebase Project** | `siva-suresh-agency` |
| **Firestore DB** | `sivasureshagency` |
| **Firebase Plan** | Blaze (pay-as-you-go, needed for Cloud Functions) |

---

## Quick Start on a New Machine

```bash
# 1. Clone the repo
git clone https://github.com/lalithvishnu-hub/SivaSureshAgency.git
cd SivaSureshAgency

# 2. Open in VS Code
code .

# 3. Install Firebase CLI (if not already)
npm install -g firebase-tools

# 4. Login to Firebase
firebase login

# 5. To deploy anything
git add -A
git commit -m "your message"
git push origin main       # → GitHub Pages auto-deploys in ~2 min
```

No npm/build step needed — this is a plain HTML/CSS/JS site served via GitHub Pages.

---

## Project Structure

```
SivaSureshAgency/
├── index.html          # Home page
├── categories.html     # Shop / Products page
├── about.html          # About us page
├── services.html       # Services page
├── contact.html        # Contact form page
├── wishlist.html       # Wishlist page
├── admin.html          # Admin dashboard (password protected)
├── css/
│   ├── style.css       # Main design system (ALL frontend styles)
│   └── admin.css       # Admin panel styles (v4 "Teal Enterprise")
├── js/
│   ├── script.js       # All frontend logic (cart, auth, modals, etc.)
│   ├── admin.js        # Admin panel logic (orders, products, inventory)
│   ├── api.js          # Firebase config + API base URL
│   └── firebase-db-init.js  # Firebase app initialization
├── images/
│   └── Images/         # All product and site images
├── backup/             # Old files (ignore)
└── firebase.json       # Firebase hosting config
```

---

## Design System

| Token | Value |
|---|---|
| **Primary (Teal)** | `#0d9488` |
| **Primary Dark** | `#0f766e` |
| **Navy** | `#0f172a` |
| **Font** | Plus Jakarta Sans (frontend) / Inter (admin) |
| **Border Radius** | `14px` (card), `9px` (small) |
| **Cache Bust Version** | `?v=9` (bump when deploying JS/CSS) |

---

## Admin Panel

### Login credentials (stored in Firebase Auth via admin.js)

The admin login is validated against `ADMIN_CREDENTIALS` in `js/admin.js`:

```javascript
// Search for ADMIN_CREDENTIALS in js/admin.js to find/update
const ADMIN_CREDENTIALS = { email: "...", password: "..." };
```

### Admin Sections

| Section | Description |
|---|---|
| Dashboard | Order stats, revenue, recent orders, stock alerts |
| Orders | View/update orders, export CSV, change status |
| Products | Add/edit products with image upload |
| Inventory | Stock status per product/size/color |
| Customers | Registered customer list with order count |
| Messages | Contact form submissions |

---

## Firebase Services Used

| Service | Used For |
|---|---|
| Firestore | Orders, customers, inventory, messages |
| Firebase Auth | Anonymous auth for Firestore access |
| Firebase Storage | Product image uploads (admin) |
| Firebase Hosting | Not used (GitHub Pages instead) |
| Firebase Functions | **NOT YET DEPLOYED** (see below) |

### Firestore Collections

| Collection | Fields |
|---|---|
| `orders` | orderId, customerName, customerEmail, customerPhone, items[], total, payment, status, createdAt |
| `customers` | firstName, lastName, email, phone, createdAt |
| `inventory` | productName, size, color, status (in_stock/low_stock/out_of_stock) |
| `messages` | name, email, phone, subject, message, read, createdAt |

---

## Firebase Functions (Pending)

Cloud Functions are written but **NOT deployed** — requires Blaze plan upgrade.

```bash
# Steps to deploy when ready:
cd functions
npm install
firebase deploy --only functions

# Then update js/api.js:
# const SSA_API_BASE = 'https://us-central1-siva-suresh-agency.cloudfunctions.net/ssa';
# Bump cache version to ?v=10 in all HTML files and push
```

---

## Cache Busting

All `<link>` and `<script>` tags use `?v=N` to bust CDN cache.

**Current version: `?v=9`**

When deploying CSS or JS changes:
1. Find all `?v=9` in HTML files (6 files)
2. Change to `?v=10` (or next number)
3. Commit and push

---

## Key Features Implemented

### Frontend

- [x] KnyaMed-inspired teal/navy design system
- [x] Hero section: 3-slide auto-advance with product photos + animated float
- [x] Trust strip (Free Delivery, Quality, Custom Manufacturing, Dedicated Support)
- [x] Product marquee — infinite scrolling product strip
- [x] Testimonial carousel with auto-advance and dots
- [x] Mobile bottom navigation (all 6 pages)
- [x] Cart requires login (auth gate)
- [x] Wishlist requires login (auth gate)
- [x] Login modal: split-panel (brand left + form right) with password eye toggle
- [x] Account modal: navy header, icon tabs (Orders/Profile/Address/Password)
- [x] Manufacturing Excellence photo on About page
- [x] Back-to-top arrow repositioned above chatbot on mobile

### Admin Panel

- [x] v4 "Teal Enterprise" design (white sidebar, teal accent)
- [x] Login: split-panel (brand stats left + form right)
- [x] Dashboard: white stat cards with colored icon boxes + bottom border accent
- [x] Dashboard: stock alerts now correctly show "Out of Stock" vs "Low Stock"
- [x] Orders: table with status filter, CSV export, order detail modal
- [x] Products: add/edit with image upload, badge, sizes, gender/sleeve
- [x] Inventory: per-size stock status with inline dropdown
- [x] Customers: list with order count and total spent
- [x] Messages: unread badge, expandable cards

---

## Known Issues / Next Steps

| Priority | Task |
|---|---|
| 🔴 High | Deploy Firebase Functions (needs Blaze plan) |
| 🟡 Medium | Testimonial carousel auto-advance JS (`initTestimonialCarousel`) — wired but needs testing |
| 🟡 Medium | WhatsApp Business integration for order notifications |
| 🟢 Low | Add more product categories (hotel linen, OT supplies) |
| 🟢 Low | Admin analytics charts (revenue over time) |
| 🟢 Low | Email templates for order confirmation |

---

## Git Commit History (Last 5)

```bash
git log --oneline -5
```

| Commit | Message |
|---|---|
| latest | feat: mobile nav fixes, cart/wishlist auth gate, admin v4 redesign |
| 6bf177a | feat: major UI overhaul - v9 (hero split, trust strip, mobile nav, marquee) |
| d01bb71 | redesign: KnyaMed-inspired clean UI overhaul |
| 7cb5088 | refactor: move backend API to Firebase Functions |

---

## Resuming Work Checklist

When you sit down on a new machine:

- [ ] `git clone` the repo (or `git pull` if already cloned)
- [ ] Open VS Code in the project folder
- [ ] Check `git status` to see any pending changes from last session
- [ ] Read this file for context
- [ ] Check `js/admin.js` for `ADMIN_CREDENTIALS` if you need to login to admin
- [ ] Run `firebase login` if you need to deploy to Firebase
- [ ] Make changes, then `git add -A && git commit -m "..." && git push origin main`

---

*Last updated: June 2026 — Siva Suresh Agency, Coimbatore*
