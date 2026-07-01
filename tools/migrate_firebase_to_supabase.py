#!/usr/bin/env python3
"""
One-time migration: Firestore -> Supabase.

Copies legacy Firebase collections into Supabase tables:
- products
- inventory
- orders
- customers
- messages

Uses user login (email/password) for both systems, so no service-role key is needed.
Run this only once (or rerun safely; upsert is used on id).

Usage example:
python tools/migrate_firebase_to_supabase.py \
  --firebase-email admin@sivasureshagency.com \
  --firebase-password Admin@SSA2024! \
  --supabase-url https://your-project.supabase.co \
  --supabase-anon-key sb_publishable_xxx \
  --supabase-email admin@sivasureshagency.com \
  --supabase-password Admin@SSA2024!
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

DEFAULT_FIREBASE_API_KEY = "AIzaSyD3H7U7WwkRWx6hvsQxTGkmGO2Uq9xd4n4"
DEFAULT_FIREBASE_PROJECT = "siva-suresh-agency"
DEFAULT_FIREBASE_DB = "sivasureshagency"

COLLECTION_TABLE_MAP = {
    "products": "products",
    "inventory": "inventory",
    "orders": "orders",
    "customers": "customers",
    "messages": "messages",
}


def _request_json(url: str, method: str = "GET", headers: dict[str, str] | None = None, payload: Any = None) -> Any:
    data = None
    merged_headers = dict(headers or {})
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        merged_headers.setdefault("Content-Type", "application/json")

    req = urllib.request.Request(url=url, data=data, headers=merged_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} {method} {url}\n{body}") from exc


def firebase_sign_in(api_key: str, email: str, password: str) -> str:
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
    result = _request_json(
        url,
        method="POST",
        payload={"email": email, "password": password, "returnSecureToken": True},
    )
    token = result.get("idToken")
    if not token:
        raise RuntimeError("Firebase sign-in succeeded but no idToken returned.")
    return token


def service_account_access_token(service_account_file: str) -> str:
    try:
        import google.auth.transport.requests
        import google.oauth2.service_account
    except ImportError as exc:
        raise RuntimeError(
            "google-auth is required for --firebase-service-account-file. Install with: pip install google-auth"
        ) from exc

    creds = google.oauth2.service_account.Credentials.from_service_account_file(
        service_account_file,
        scopes=["https://www.googleapis.com/auth/datastore"],
    )
    req = google.auth.transport.requests.Request()
    creds.refresh(req)
    if not creds.token:
        raise RuntimeError("Failed to mint service-account access token for Firestore.")
    return creds.token


def from_firestore_value(value: dict[str, Any]) -> Any:
    if "stringValue" in value:
        return value["stringValue"]
    if "integerValue" in value:
        return int(value["integerValue"])
    if "doubleValue" in value:
        return float(value["doubleValue"])
    if "booleanValue" in value:
        return bool(value["booleanValue"])
    if "nullValue" in value:
        return None
    if "timestampValue" in value:
        return value["timestampValue"]
    if "arrayValue" in value:
        entries = value["arrayValue"].get("values", [])
        return [from_firestore_value(entry) for entry in entries]
    if "mapValue" in value:
        fields = value["mapValue"].get("fields", {})
        return {k: from_firestore_value(v) for k, v in fields.items()}
    return None


def from_firestore_document(doc: dict[str, Any]) -> dict[str, Any]:
    fields = doc.get("fields", {})
    data = {k: from_firestore_value(v) for k, v in fields.items()}
    name = doc.get("name", "")
    doc_id = name.split("/")[-1] if name else None
    if doc_id and not data.get("id"):
        data["id"] = doc_id
    return data


def fetch_firestore_collection(project_id: str, database: str, collection: str, token: str, api_key: str) -> list[dict[str, Any]]:
    base = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/{database}/documents/{collection}"
    headers = {"Authorization": f"Bearer {token}"}

    docs: list[dict[str, Any]] = []
    page_token: str | None = None

    while True:
        query = {"pageSize": 500, "key": api_key}
        if page_token:
            query["pageToken"] = page_token
        url = base + "?" + urllib.parse.urlencode(query)
        page = _request_json(url, headers=headers)
        for raw_doc in page.get("documents", []):
            docs.append(from_firestore_document(raw_doc))
        page_token = page.get("nextPageToken")
        if not page_token:
            break

    return docs


def supabase_sign_in(supabase_url: str, anon_key: str, email: str, password: str) -> str:
    url = f"{supabase_url.rstrip('/')}/auth/v1/token?grant_type=password"
    headers = {"apikey": anon_key}
    result = _request_json(url, method="POST", headers=headers, payload={"email": email, "password": password})
    token = result.get("access_token")
    if not token:
        raise RuntimeError("Supabase sign-in succeeded but no access_token returned.")
    return token


def sanitize_row(table: str, row: dict[str, Any]) -> dict[str, Any]:
    cleaned = dict(row)
    now_iso = datetime.now(timezone.utc).isoformat()

    # Ensure required keys exist for known table schemas.
    if table == "orders":
        cleaned.setdefault("items", [])
        if not cleaned.get("customerEmail"):
            # Orders table requires customerEmail.
            cleaned["customerEmail"] = "unknown@example.com"
        cleaned.setdefault("createdAt", now_iso)
        cleaned.setdefault("updatedAt", now_iso)
    elif table == "customers":
        if not cleaned.get("email"):
            cleaned["email"] = f"{cleaned.get('id', 'unknown')}@unknown.local"
        cleaned.setdefault("createdAt", now_iso)
        cleaned.setdefault("updatedAt", now_iso)
    elif table == "products":
        cleaned.setdefault("updatedAt", now_iso)
        cleaned.setdefault("createdAt", now_iso)
    elif table == "inventory":
        cleaned.setdefault("updatedAt", now_iso)
    elif table == "messages":
        cleaned.setdefault("createdAt", now_iso)

    return cleaned


def upsert_supabase_rows(supabase_url: str, anon_key: str, access_token: str, table: str, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return

    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {access_token}",
        "Prefer": "resolution=merge-duplicates,return=minimal",
        "Content-Type": "application/json",
    }

    chunk_size = 200
    for i in range(0, len(rows), chunk_size):
        chunk = [sanitize_row(table, row) for row in rows[i : i + chunk_size]]
        all_keys: set[str] = set()
        for row in chunk:
            all_keys.update(row.keys())
        normalized_chunk = [{k: row.get(k) for k in all_keys} for row in chunk]
        query = urllib.parse.urlencode({"on_conflict": "id"})
        url = f"{supabase_url.rstrip('/')}/rest/v1/{table}?{query}"
        _request_json(url, method="POST", headers=headers, payload=normalized_chunk)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate Firestore collections into Supabase tables.")
    parser.add_argument("--firebase-api-key", default=DEFAULT_FIREBASE_API_KEY)
    parser.add_argument("--firebase-project-id", default=DEFAULT_FIREBASE_PROJECT)
    parser.add_argument("--firebase-database", default=DEFAULT_FIREBASE_DB)
    parser.add_argument("--firebase-service-account-file")
    parser.add_argument("--firebase-email", required=True)
    parser.add_argument("--firebase-password", required=True)

    parser.add_argument("--supabase-url", required=True)
    parser.add_argument("--supabase-anon-key", required=True)
    parser.add_argument("--supabase-email", required=True)
    parser.add_argument("--supabase-password", required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    print("\nFirestore -> Supabase migration")
    print("===============================\n")

    try:
        print("[1/4] Signing into Firebase...")
        firebase_token = firebase_sign_in(args.firebase_api_key, args.firebase_email, args.firebase_password)
        if args.firebase_service_account_file:
            print("  Switching Firestore reads to service-account token...")
            firebase_token = service_account_access_token(args.firebase_service_account_file)
        print("  OK")

        print("[2/4] Exporting Firestore collections...")
        exported: dict[str, list[dict[str, Any]]] = {}
        for collection in COLLECTION_TABLE_MAP:
            rows = fetch_firestore_collection(
                project_id=args.firebase_project_id,
                database=args.firebase_database,
                collection=collection,
                token=firebase_token,
                api_key=args.firebase_api_key,
            )
            exported[collection] = rows
            print(f"  {collection}: {len(rows)} rows")

        print("[3/4] Signing into Supabase...")
        supabase_token = supabase_sign_in(
            args.supabase_url,
            args.supabase_anon_key,
            args.supabase_email,
            args.supabase_password,
        )
        print("  OK")

        print("[4/4] Upserting into Supabase...")
        for collection, table in COLLECTION_TABLE_MAP.items():
            rows = exported[collection]
            upsert_supabase_rows(
                supabase_url=args.supabase_url,
                anon_key=args.supabase_anon_key,
                access_token=supabase_token,
                table=table,
                rows=rows,
            )
            print(f"  {table}: upserted {len(rows)} rows")

        print("\nMigration complete. Refresh your admin dashboard.")
        return 0
    except Exception as exc:  # pragma: no cover
        print("\nMigration failed:")
        print(str(exc))
        return 1


if __name__ == "__main__":
    sys.exit(main())
