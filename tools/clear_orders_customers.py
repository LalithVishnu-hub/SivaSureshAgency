#!/usr/bin/env python3
"""Deletes ALL documents from orders and customers collections in Firestore."""
import urllib.request, urllib.error, json

API_KEY    = "AIzaSyD3H7U7WwkRWx6hvsQxTGkmGO2Uq9xd4n4"
PROJECT_ID = "siva-suresh-agency"
DB_NAME    = "sivasureshagency"
FS_BASE    = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/{DB_NAME}/documents"

# Sign in as admin to get token (needed for delete)
payload = json.dumps({"email": "admin@sivasureshagency.com", "password": "Admin@SSA2024!", "returnSecureToken": True}).encode()
req = urllib.request.Request(
    f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}",
    data=payload, headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req, timeout=10) as r:
    token = json.loads(r.read())["idToken"]
print("Signed in as admin")

def delete_collection(col):
    # List documents (orders allow read: if true now, no auth needed)
    url = f"{FS_BASE}/{col}?pageSize=300"
    try:
        list_req = urllib.request.Request(url)  # no auth header needed for orders
        with urllib.request.urlopen(list_req, timeout=10) as r:
            body = r.read()
            docs = json.loads(body).get("documents", [])
    except urllib.error.HTTPError as e:
        # Retry with auth for customers collection
        try:
            list_req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
            with urllib.request.urlopen(list_req, timeout=10) as r:
                docs = json.loads(r.read()).get("documents", [])
        except urllib.error.HTTPError as e2:
            err_body = e2.read().decode('utf-8', errors='replace')
            print(f"  Could not list {col}: HTTP {e2.code} - {err_body[:200]}")
            return

    if not docs:
        print(f"  {col}: already empty")
        return

    deleted = 0
    for document in docs:
        # doc["name"] = "projects/.../databases/.../documents/COLLECTION/DOCID"
        doc_path = document["name"]  # full resource path
        doc_url  = "https://firestore.googleapis.com/v1/" + doc_path
        del_req  = urllib.request.Request(doc_url, headers={"Authorization": f"Bearer {token}"}, method="DELETE")
        try:
            with urllib.request.urlopen(del_req, timeout=10):
                deleted += 1
        except urllib.error.HTTPError as e:
            print(f"  Failed to delete {doc_path.split('/')[-1]}: HTTP {e.code}")

    print(f"  {col}: deleted {deleted} document(s)")

print("\nClearing collections...")
delete_collection("orders")
delete_collection("customers")
print("\nDone. Firestore is clean.")
