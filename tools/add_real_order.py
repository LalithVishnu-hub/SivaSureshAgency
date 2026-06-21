#!/usr/bin/env python3
"""Adds a specific real customer order to Firestore using admin credentials."""
import urllib.request, urllib.error, json

API_KEY    = "AIzaSyD3H7U7WwkRWx6hvsQxTGkmGO2Uq9xd4n4"
PROJECT_ID = "siva-suresh-agency"
DB_NAME    = "(default)"
FS_BASE    = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/{DB_NAME}/documents"

# Sign in as admin
payload = json.dumps({"email": "admin@sivasureshagency.com", "password": "Admin@SSA2024!", "returnSecureToken": True}).encode()
req = urllib.request.Request(
    f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}",
    data=payload, headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req, timeout=10) as r:
    token = json.loads(r.read())["idToken"]
print("Signed in as admin")

# Check if order already exists
check_url = f"{FS_BASE}/orders?pageSize=200"
check_req = urllib.request.Request(check_url, headers={"Authorization": f"Bearer {token}"})
try:
    with urllib.request.urlopen(check_req, timeout=10) as r:
        existing = json.loads(r.read())
        for d in existing.get("documents", []):
            oid = d.get("fields", {}).get("orderId", {}).get("stringValue", "")
            if oid == "SSAMQNIEF0U":
                print("Order SSAMQNIEF0U already exists in Firestore!")
                exit(0)
except Exception:
    pass

# Add the real customer order from the screenshot
order_doc = {
    "fields": {
        "orderId":       {"stringValue": "SSAMQNIEF0U"},
        "customerName":  {"stringValue": "Lalith Vishnu"},
        "customerEmail": {"stringValue": "lalithvishnu04@gmail.com"},
        "customerPhone": {"stringValue": ""},
        "address":       {"stringValue": ""},
        "city":          {"stringValue": ""},
        "pincode":       {"stringValue": ""},
        "total":         {"integerValue": "1900"},
        "payment":       {"stringValue": "COD"},
        "status":        {"stringValue": "Processing"},
        "trackingId":    {"stringValue": ""},
        "items": {"arrayValue": {"values": [
            {"mapValue": {"fields": {
                "name":          {"stringValue": "Male Doctor Uniform - Full Sleeve"},
                "selectedSize":  {"stringValue": ""},
                "selectedColor": {"stringValue": ""},
                "qty":           {"integerValue": "1"},
                "price":         {"integerValue": "850"}
            }}},
            {"mapValue": {"fields": {
                "name":          {"stringValue": "Female Doctor Uniform - Full Sleeve"},
                "selectedSize":  {"stringValue": ""},
                "selectedColor": {"stringValue": ""},
                "qty":           {"integerValue": "1"},
                "price":         {"integerValue": "900"}
            }}}
        ]}},
        "createdAt": {"timestampValue": "2026-06-21T06:00:00Z"},
        "updatedAt": {"timestampValue": "2026-06-21T06:00:00Z"}
    }
}

write_req = urllib.request.Request(
    f"{FS_BASE}/orders",
    data=json.dumps(order_doc).encode(),
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
)
try:
    with urllib.request.urlopen(write_req, timeout=10) as r:
        result = json.loads(r.read())
        doc_id = result["name"].split("/")[-1]
        print(f"Order SSAMQNIEF0U added to Firestore (doc: {doc_id})")
        print("Refresh admin Orders page — it will now appear.")
except urllib.error.HTTPError as e:
    print("Error:", e.code, e.read().decode()[:300])

# Also add customer record
cust_doc = {
    "fields": {
        "name":       {"stringValue": "Lalith Vishnu"},
        "email":      {"stringValue": "lalithvishnu04@gmail.com"},
        "phone":      {"stringValue": ""},
        "orderCount": {"integerValue": "1"},
        "totalSpent": {"integerValue": "1900"},
        "createdAt":  {"timestampValue": "2026-06-21T06:00:00Z"}
    }
}
cust_req = urllib.request.Request(
    f"{FS_BASE}/customers",
    data=json.dumps(cust_doc).encode(),
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
)
try:
    with urllib.request.urlopen(cust_req, timeout=10) as r:
        result = json.loads(r.read())
        doc_id = result["name"].split("/")[-1]
        print(f"Customer Lalith Vishnu added (doc: {doc_id})")
except urllib.error.HTTPError as e:
    print("Customer add error:", e.code, e.read().decode()[:200])
