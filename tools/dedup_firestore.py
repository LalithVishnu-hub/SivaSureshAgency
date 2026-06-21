#!/usr/bin/env python3
"""
Firestore de-duplication script.
Finds products that appear more than once in Firestore (same name) and deletes the extras,
keeping only the first-added document.

Usage:
    python tools/dedup_firestore.py
"""
import json, urllib.request, urllib.error, sys

API_KEY    = "AIzaSyD3H7U7WwkRWx6hvsQxTGkmGO2Uq9xd4n4"
PROJECT_ID = "siva-suresh-agency"
DB_NAME    = "(default)"
SIGN_IN_URL = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}"
FS_BASE     = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/{DB_NAME}/documents"

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
        return None, (e.code, e.read().decode())

def get_all(token, col):
    """Returns list of {name, docId, ...fields}"""
    url = f"{FS_BASE}/{col}?pageSize=500"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read())
            docs = []
            for d in data.get("documents", []):
                doc_id = d["name"].split("/")[-1]
                fields = d.get("fields", {})
                name_val = ""
                if "name" in fields:
                    name_val = fields["name"].get("stringValue", "")
                docs.append({"docId": doc_id, "productName": name_val})
            return docs
    except Exception as e:
        print(f"  ERROR fetching {col}: {e}")
        return []

def delete_doc(token, col, doc_id):
    url = f"{FS_BASE}/{col}/{doc_id}"
    req = urllib.request.Request(url, method="DELETE", headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return True
    except urllib.error.HTTPError as e:
        print(f"  ERROR deleting {col}/{doc_id}: {e.code} {e.read().decode()[:100]}")
        return False

def main():
    print("\n  Siva Suresh Agency - Firestore De-duplicator")
    print("  =============================================\n")

    # Sign in
    print("[1/3] Signing in...")
    result, err = post_json(SIGN_IN_URL, {
        "email": "admin@sivasureshagency.com",
        "password": "Admin@SSA2024!",
        "returnSecureToken": True
    })
    if err:
        print(f"  FAILED: {err[1]}")
        sys.exit(1)
    token = result["idToken"]
    print(f"  OK")

    # Fetch all products
    print("[2/3] Fetching all products...")
    docs = get_all(token, "products")
    print(f"  Found {len(docs)} total product documents")

    # Find duplicates
    seen = {}   # name -> first docId
    dupes = []  # list of docIds to delete
    for d in docs:
        name = d["productName"]
        if name in seen:
            dupes.append(d["docId"])
        else:
            seen[name] = d["docId"]

    print(f"  Unique product names: {len(seen)}")
    print(f"  Duplicate docs to delete: {len(dupes)}")

    if not dupes:
        print("\n  No duplicates found! Your Firestore is clean.")
        return

    # Delete duplicates
    print(f"\n[3/3] Deleting {len(dupes)} duplicate product documents...")
    deleted = 0
    for doc_id in dupes:
        if delete_doc(token, "products", doc_id):
            deleted += 1
            print(f"  Deleted: {doc_id}")

    print(f"\n  Done! Deleted {deleted} duplicate documents.")
    print(f"  Remaining products in Firestore: {len(seen)}")
    print("  Refresh admin panel to verify.")

if __name__ == "__main__":
    main()
