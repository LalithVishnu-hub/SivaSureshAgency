#!/usr/bin/env python3
"""Adds a test order to Firestore so the admin Orders page shows data."""
import urllib.request, urllib.error, json

API_KEY    = "AIzaSyD3H7U7WwkRWx6hvsQxTGkmGO2Uq9xd4n4"
PROJECT_ID = "siva-suresh-agency"
DB_NAME    = "(default)"
FS_BASE    = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/{DB_NAME}/documents"

payload = json.dumps({"email": "admin@sivasureshagency.com", "password": "Admin@SSA2024!", "returnSecureToken": True}).encode()
req = urllib.request.Request(
    f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}",
    data=payload, headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req, timeout=10) as r:
    token = json.loads(r.read())["idToken"]
print("Signed in")

order_doc = {
    "fields": {
        "orderId":       {"stringValue": "SSA-TEST-001"},
        "customerName":  {"stringValue": "Test Customer"},
        "customerEmail": {"stringValue": "testcustomer@example.com"},
        "customerPhone": {"stringValue": "9876543210"},
        "address":       {"stringValue": "123 Main Street"},
        "city":          {"stringValue": "Chennai"},
        "pincode":       {"stringValue": "600001"},
        "total":         {"integerValue": "930"},
        "payment":       {"stringValue": "COD"},
        "status":        {"stringValue": "Processing"},
        "trackingId":    {"stringValue": ""},
        "items": {"arrayValue": {"values": [
            {"mapValue": {"fields": {
                "name":          {"stringValue": "Bedsheet - Checked Blue"},
                "selectedSize":  {"stringValue": "60x90"},
                "selectedColor": {"stringValue": "Sky Blue"},
                "qty":           {"integerValue": "2"},
                "price":         {"integerValue": "320"}
            }}}
        ]}},
        "createdAt": {"timestampValue": "2026-06-21T10:00:00Z"},
        "updatedAt": {"timestampValue": "2026-06-21T10:00:00Z"}
    }
}

req2 = urllib.request.Request(
    f"{FS_BASE}/orders",
    data=json.dumps(order_doc).encode(),
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
)
try:
    with urllib.request.urlopen(req2, timeout=10) as r:
        result = json.loads(r.read())
        doc_id = result["name"].split("/")[-1]
        print(f"Test order added: {doc_id}")
        print("Refresh admin Orders page to see it.")
except urllib.error.HTTPError as e:
    print("Error:", e.code, e.read().decode()[:200])
