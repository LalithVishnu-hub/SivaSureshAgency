#!/usr/bin/env python3
"""
Direct Firestore seeder via Firebase REST API.
Seeds all products and inventory into Firestore without needing Node.js or a service account.

Usage:
    python tools/seed_firestore.py
    python tools/seed_firestore.py --email admin@sivasureshagency.com --password Admin@SSA2024!
"""
import argparse, json, urllib.request, urllib.error, sys

API_KEY    = "AIzaSyD3H7U7WwkRWx6hvsQxTGkmGO2Uq9xd4n4"
PROJECT_ID = "siva-suresh-agency"
DB_NAME    = "(default)"  # Use default database — named DB not supported on Spark plan
SIGN_IN_URL = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}"
FS_BASE     = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/{DB_NAME}/documents"

COLORS = {
    'doctor-uniform':  ['White', 'Light Blue', 'Mint Green'],
    'staff-uniform':   ['Blue', 'Green', 'Pink', 'Gray'],
    'bedsheets':       ['White', 'Sky Blue', 'Navy Blue'],
    'hospital-linen':  ['White', 'Teal', 'Green'],
    'hotel-linen':     ['White', 'Ivory', 'Sky Blue'],
}

PRODUCTS = [
    {"name":"Male Doctor Uniform - Full Sleeve","category":"doctor-uniform","gender":"male","sleeve":"full","price":850,"oldPrice":1100,"sizes":["S","M","L","XL","XXL","XXXL"],"description":"Premium full-sleeve doctor uniform for men.","image":"images/Images/Male Full Sleeve.jpg","badge":"Bestseller"},
    {"name":"Male Doctor Uniform - Half Sleeve","category":"doctor-uniform","gender":"male","sleeve":"half","price":750,"oldPrice":950,"sizes":["S","M","L","XL","XXL","XXXL"],"description":"Comfortable half-sleeve doctor uniform for men.","image":"images/Images/Male Half Sleeve.jpg","badge":""},
    {"name":"Female Doctor Uniform - Full Sleeve","category":"doctor-uniform","gender":"female","sleeve":"full","price":900,"oldPrice":1200,"sizes":["S","M","L","XL","XXL","XXXL"],"description":"Elegant full-sleeve doctor uniform for women.","image":"images/Images/Female Full Sleeve.jpg","badge":"New"},
    {"name":"Female Doctor Uniform - Half Sleeve","category":"doctor-uniform","gender":"female","sleeve":"half","price":800,"oldPrice":1050,"sizes":["S","M","L","XL","XXL","XXXL"],"description":"Ladies half-sleeve doctor uniform.","image":"images/Images/Female Half Sleeve.jpg","badge":""},
    {"name":"Male Staff Uniform - Beige Style","category":"staff-uniform","gender":"male","sleeve":"half","price":550,"oldPrice":720,"sizes":["S","M","L","XL","XXL","XXXL"],"description":"Professional beige style staff uniform.","image":"images/Images/Male Uniform (Beige Style).jpg","badge":""},
    {"name":"Male Staff Uniform - Blue Style","category":"staff-uniform","gender":"male","sleeve":"half","price":550,"oldPrice":720,"sizes":["S","M","L","XL","XXL","XXXL"],"description":"Smart blue style staff uniform.","image":"images/Images/Male Uniform (Blue Style).jpg","badge":"Popular"},
    {"name":"Male Staff Uniform - Brown Style","category":"staff-uniform","gender":"male","sleeve":"half","price":560,"oldPrice":730,"sizes":["S","M","L","XL","XXL","XXXL"],"description":"Durable brown style staff uniform.","image":"images/Images/Male Uniform (Brown Style).jpg","badge":""},
    {"name":"Male Staff Uniform - Gray Style","category":"staff-uniform","gender":"male","sleeve":"half","price":540,"oldPrice":710,"sizes":["S","M","L","XL","XXL","XXXL"],"description":"Comfortable gray style staff uniform.","image":"images/Images/Male Uniform (Gray Style).jpg","badge":""},
    {"name":"Male Ward Boy Uniform - Blue","category":"staff-uniform","gender":"male","sleeve":"half","price":500,"oldPrice":650,"sizes":["S","M","L","XL","XXL","XXXL"],"description":"Blue ward boy uniform.","image":"images/Images/Male Uniform (Blue Ward Boy).jpg","badge":""},
    {"name":"Male Ward Boy Uniform - Gray","category":"staff-uniform","gender":"male","sleeve":"half","price":500,"oldPrice":650,"sizes":["S","M","L","XL","XXL","XXXL"],"description":"Gray ward boy uniform.","image":"images/Images/Male Uniform (Gray Ward Boy).jpg","badge":""},
    {"name":"Male Ward Boy Uniform - Green","category":"staff-uniform","gender":"male","sleeve":"half","price":500,"oldPrice":650,"sizes":["S","M","L","XL","XXL","XXXL"],"description":"Green ward boy uniform.","image":"images/Images/Male Uniform (Green Ward Boy).jpg","badge":""},
    {"name":"Female Staff Uniform - Blue Style","category":"staff-uniform","gender":"female","sleeve":"half","price":580,"oldPrice":750,"sizes":["S","M","L","XL","XXL","XXXL"],"description":"Professional blue style staff uniform for women.","image":"images/Images/Female Uniform (Blue Style).jpg","badge":"Bestseller"},
    {"name":"Female Staff Uniform - Blue Style 02","category":"staff-uniform","gender":"female","sleeve":"half","price":580,"oldPrice":750,"sizes":["S","M","L","XL","XXL","XXXL"],"description":"Elegant blue style variant.","image":"images/Images/Female Uniform (Blue Style 02).jpg","badge":""},
    {"name":"Female Staff Uniform - Dark Pink","category":"staff-uniform","gender":"female","sleeve":"half","price":590,"oldPrice":760,"sizes":["S","M","L","XL","XXL","XXXL"],"description":"Stylish dark pink staff uniform.","image":"images/Images/Female Uniform (Dark Pink).jpg","badge":"New"},
    {"name":"Female Staff Uniform - Green Color","category":"staff-uniform","gender":"female","sleeve":"half","price":570,"oldPrice":740,"sizes":["S","M","L","XL","XXL","XXXL"],"description":"Fresh green color staff uniform.","image":"images/Images/Female Uniform (Green Color).jpg","badge":""},
    {"name":"Female Staff Uniform - Pink Style","category":"staff-uniform","gender":"female","sleeve":"half","price":580,"oldPrice":750,"sizes":["S","M","L","XL","XXL","XXXL"],"description":"Classic pink style staff uniform.","image":"images/Images/Female Uniform (Pink Style).jpg","badge":"Popular"},
    {"name":"Female Staff Uniform - Pink Style 02","category":"staff-uniform","gender":"female","sleeve":"half","price":580,"oldPrice":750,"sizes":["S","M","L","XL","XXL","XXXL"],"description":"Pink style variant.","image":"images/Images/Female Uniform (Pink Style) (2).jpg","badge":""},
    {"name":"Female Staff Uniform - Red Style","category":"staff-uniform","gender":"female","sleeve":"half","price":590,"oldPrice":760,"sizes":["S","M","L","XL","XXL","XXXL"],"description":"Elegant red style staff uniform.","image":"images/Images/Female Uniform (Red Style).jpg","badge":"Premium"},
    {"name":"Bedsheet - Striped Blue & White","category":"bedsheets","price":350,"oldPrice":450,"sizes":["60x90","60x100","90x100"],"description":"Hospital-grade striped bedsheet.","image":"images/Images/Striped Sheet.jpg","badge":""},
    {"name":"Bedsheet - Checked Blue","category":"bedsheets","price":320,"oldPrice":420,"sizes":["60x90","60x100","90x100"],"description":"Blue checked hospital bedsheet.","image":"","badge":""},
    {"name":"Pillow Cover - Light Blue Set","category":"bedsheets","price":150,"oldPrice":200,"sizes":["Standard","Large"],"description":"Set of 2 light blue pillow covers.","image":"","badge":""},
    {"name":"Hospital Towel - OT Grade","category":"hospital-linen","price":220,"oldPrice":300,"sizes":["36x1m","36x1.25m","60x2m"],"description":"High-absorbency OT towel.","image":"images/Images/Hospital Towel.jpg","badge":""},
    {"name":"Surgical Cap & Mask Set","category":"hospital-linen","price":120,"oldPrice":160,"sizes":["Standard","Large"],"description":"Reusable surgical cap and mask set.","image":"images/Images/Head cap and Mask.jpg","badge":"Popular"},
    {"name":"Surgeon Apron - Ladies","category":"hospital-linen","gender":"female","sleeve":"half","price":450,"oldPrice":580,"sizes":["S","M","L","XL","XXL","XXXL"],"description":"Ladies surgeon apron.","image":"images/Images/Surgeon Apron.jpg","badge":""},
    {"name":"Patient Gown - Cotton","category":"hospital-linen","price":380,"oldPrice":480,"sizes":["S","M","L","XL","XXL","XXXL"],"description":"Comfortable cotton patient gown.","image":"","badge":""},
    {"name":"Surgeon Apron - Gents","category":"hospital-linen","gender":"male","sleeve":"full","price":520,"oldPrice":680,"sizes":["S","M","L","XL","XXL","XXXL"],"description":"Heavy-duty surgeon apron for men.","image":"images/Images/Male Surgeon Apron.jpg","badge":"Premium"},
    {"name":"Hotel Bedsheet - Premium White","category":"hotel-linen","price":480,"oldPrice":620,"sizes":["Single","Double","King"],"description":"Premium white hotel bedsheet.","image":"","badge":"Premium"},
    {"name":"Hotel Towel - Big 60x2m","category":"hotel-linen","price":350,"oldPrice":450,"sizes":["Standard","Large","Bath Sheet"],"description":"Large hotel bath towel.","image":"","badge":""},
    {"name":"Abdominal Sheet 9x9","category":"hospital-linen","price":280,"oldPrice":380,"sizes":["9x9","Standard"],"description":"Surgical abdominal sheet.","image":"images/Images/abdominal Sheet 9x9.jpg","badge":"New"},
    {"name":"Surgical Eye Pad","category":"hospital-linen","price":95,"oldPrice":130,"sizes":["Standard"],"description":"Reusable surgical eye pad.","image":"images/Images/Eye Pad.jpg","badge":""},
    {"name":"Female Surgeon Apron - Green","category":"hospital-linen","gender":"female","sleeve":"full","price":480,"oldPrice":620,"sizes":["S","M","L","XL","XXL","XXXL"],"description":"Full green surgeon apron for women.","image":"images/Images/Female Surgoen Apron.jpg","badge":"New"},
    {"name":"OT Nighty - Patient Wear","category":"hospital-linen","gender":"female","price":340,"oldPrice":450,"sizes":["S","M","L","XL","XXL","XXXL"],"description":"Comfortable OT nighty for patients.","image":"images/Images/OT Nighty.jpg","badge":""},
    {"name":"Bedspread & Pillow Cover Set - Striped","category":"bedsheets","price":420,"oldPrice":550,"sizes":["Single","Double","King"],"description":"Premium striped bedspread with pillow cover.","image":"images/Images/Stripped Bedspread and Pillow Cover.jpg","badge":"New"},
]

def post_json(url, payload, token=None):
    data = json.dumps(payload).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read()), None
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            err = json.loads(body)
            msg = err.get("error", {}).get("message") or err.get("error", {}).get("status") or body
        except Exception:
            msg = body
        return None, (e.code, msg)

def to_fs_value(v):
    if v is None:           return {"nullValue": None}
    if isinstance(v, bool): return {"booleanValue": v}
    if isinstance(v, int):  return {"integerValue": str(v)}
    if isinstance(v, float):return {"doubleValue": v}
    if isinstance(v, str):  return {"stringValue": v}
    if isinstance(v, list): return {"arrayValue": {"values": [to_fs_value(i) for i in v]}}
    if isinstance(v, dict): return {"mapValue": {"fields": {k: to_fs_value(val) for k, val in v.items()}}}
    return {"stringValue": str(v)}

def fs_fields(doc):
    return {"fields": {k: to_fs_value(v) for k, v in doc.items() if v is not None}}

def get_collection(token, col):
    url = f"{FS_BASE}/{col}?pageSize=500"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read())
            return [d["fields"]["name"]["stringValue"] for d in data.get("documents", []) if "fields" in d and "name" in d["fields"]]
    except Exception:
        return []

def add_doc(token, col, fields):
    url = f"{FS_BASE}/{col}"
    return post_json(url, fs_fields(fields), token)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--email",    default="admin@sivasureshagency.com")
    parser.add_argument("--password", default="Admin@SSA2024!")
    args = parser.parse_args()

    print("\n  Siva Suresh Agency - Firestore Seeder")
    print("  ======================================\n")

    # 1. Sign in
    print("[1/3] Signing in...")
    result, err = post_json(SIGN_IN_URL, {"email": args.email, "password": args.password, "returnSecureToken": True})
    if err:
        print(f"  FAILED to sign in: {err[1]}")
        print("  Check email/password or Firestore rules.")
        sys.exit(1)
    token = result["idToken"]
    print(f"  OK  UID={result['localId']}")

    # 2. Get existing product names to avoid duplicates
    print("[2/3] Checking existing products...")
    existing_names = set(get_collection(token, "products"))
    print(f"  Found {len(existing_names)} existing products")

    # 3. Seed
    print(f"[3/3] Seeding {len(PRODUCTS)} products + inventory...")
    prod_count = 0
    inv_count  = 0
    for p in PRODUCTS:
        if p["name"] in existing_names:
            print(f"  SKIP  {p['name']}")
            continue
        doc = {k: v for k, v in p.items()}
        doc["totalStock"] = 100
        _, err = add_doc(token, "products", doc)
        if err:
            code, msg = err
            if code == 403:
                print(f"\n  PERMISSION DENIED (403)")
                print("  Firestore rules are blocking writes.")
                print("  Fix: Open this URL and click the Security tab, paste the rules, and click Publish:")
                print(f"  https://console.firebase.google.com/project/{PROJECT_ID}/firestore/databases/-default-/rules")
                print("\n  Rules to paste:")
                print("  rules_version = '2';")
                print("  service cloud.firestore {")
                print("    match /databases/{database}/documents {")
                print("      match /{document=**} {")
                print("        allow read: if true;")
                print("        allow write: if request.auth != null;")
                print("      }")
                print("    }")
                print("  }")
                sys.exit(1)
            else:
                print(f"  ERROR adding {p['name']}: {msg}")
                continue
        prod_count += 1
        colors = COLORS.get(p["category"], ["White"])
        for size in p.get("sizes", []):
            for color in colors:
                add_doc(token, "inventory", {
                    "productName": p["name"],
                    "productCategory": p["category"],
                    "size": size,
                    "color": color,
                    "quantity": 20,
                })
                inv_count += 1
        print(f"  ADDED  {p['name']}")

    print(f"\n  Done! Added {prod_count} products and {inv_count} inventory entries.")
    print("  Refresh your admin panel to see the data.")

if __name__ == "__main__":
    main()
