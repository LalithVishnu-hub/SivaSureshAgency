#!/usr/bin/env python3
"""
Siva Suresh Agency – Admin Setup Automation
===========================================
What this script does:
  1. Creates a Firebase Auth admin user via the Identity Toolkit REST API
  2. Signs in to verify the account works
  3. Writes admin user details to tools/admin_credentials.txt (gitignored)
  4. Deploys Firestore security rules via firebase-tools (if Node/npm is available)
  5. Prints next steps for setting custom admin claims in the Firebase Console

Usage:
    python tools/setup_admin.py
    python tools/setup_admin.py --email myemail@example.com --password MyPass123!
"""

import argparse
import json
import os
import subprocess
import sys
import textwrap
import urllib.request
import urllib.error
import urllib.parse

# ─── Firebase Config (matches js/admin.js) ────────────────────────────────────
API_KEY    = "AIzaSyD3H7U7WwkRWx6hvsQxTGkmGO2Uq9xd4n4"
PROJECT_ID = "siva-suresh-agency"
SIGN_UP_URL = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={API_KEY}"
SIGN_IN_URL = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}"
# ──────────────────────────────────────────────────────────────────────────────

CRED_FILE = os.path.join(os.path.dirname(__file__), "admin_credentials.txt")

COLORS = {
    "green":  "\033[92m",
    "yellow": "\033[93m",
    "red":    "\033[91m",
    "cyan":   "\033[96m",
    "bold":   "\033[1m",
    "reset":  "\033[0m",
}

def c(color, text):
    return f"{COLORS.get(color,'')}{text}{COLORS['reset']}"

def post_json(url, payload):
    data = json.dumps(payload).encode("utf-8")
    req  = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read()), None
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            err = json.loads(body)
            msg = err.get("error", {}).get("message", body)
        except Exception:
            msg = body
        return None, msg

def create_user(email, password, display_name):
    print(c("cyan", f"\n[1/4] Creating Firebase Auth user: {email}"))
    result, err = post_json(SIGN_UP_URL, {
        "email": email,
        "password": password,
        "displayName": display_name,
        "returnSecureToken": True
    })
    if err:
        if "EMAIL_EXISTS" in err:
            print(c("yellow", f"      ⚠  User already exists ({email}). Skipping creation."))
            return None
        print(c("red", f"      ✗  Failed to create user: {err}"))
        sys.exit(1)
    uid = result.get("localId", "unknown")
    print(c("green", f"      ✓  User created  UID={uid}"))
    return uid

def verify_login(email, password):
    print(c("cyan", "\n[2/4] Verifying admin login..."))
    result, err = post_json(SIGN_IN_URL, {
        "email": email,
        "password": password,
        "returnSecureToken": True
    })
    if err:
        print(c("red", f"      ✗  Login failed: {err}"))
        sys.exit(1)
    uid        = result.get("localId")
    id_token   = result.get("idToken")
    exp        = result.get("expiresIn")
    print(c("green", f"      ✓  Signed in successfully  UID={uid}  token_expires_in={exp}s"))
    return uid, id_token

def save_credentials(email, password, uid):
    print(c("cyan", "\n[3/4] Saving credentials to tools/admin_credentials.txt (gitignored)..."))
    with open(CRED_FILE, "w", encoding="utf-8") as f:
        f.write(textwrap.dedent(f"""\
            Admin Account Credentials
            =========================
            Email    : {email}
            Password : {password}
            UID      : {uid}
            Project  : {PROJECT_ID}

            Login URL (local): http://localhost:8000/admin.html
            Login URL (live) : https://lalithvishnu-hub.github.io/SivaSureshAgency/admin.html

            Next step - set admin custom claim so Firestore write rules apply:
            1. Open https://console.firebase.google.com/project/{PROJECT_ID}/authentication/users
            2. Find the user above, click the 3-dot menu -> Set custom claims
            3. Paste: {{"admin": true}}
        """))
    print(c("green", f"      ✓  Saved to {CRED_FILE}"))

def _run(cmd):
    """Run a command safely, returning (returncode, stdout, stderr)."""
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, shell=True)
        return r.returncode, r.stdout.strip(), r.stderr.strip()
    except Exception as e:
        return 1, "", str(e)

def deploy_firestore_rules():
    print(c("cyan", "\n[4/4] Checking if Firebase CLI is available to deploy Firestore rules..."))
    rc_node, ver_node, _ = _run("node --version")
    rc_npm,  ver_npm,  _ = _run("npm --version")
    if rc_node != 0 or rc_npm != 0:
        print(c("yellow", "      ⚠  Node.js/npm not found. Cannot auto-deploy Firestore rules."))
        print(c("yellow", "         Install Node.js: https://nodejs.org/  then re-run this script."))
        print(c("yellow", "         firestore.rules is already committed to the repo for manual deploy."))
        return
    print(c("green", f"      ✓  Node {ver_node}  npm {ver_npm}"))

    rc_fb, ver_fb, _ = _run("firebase --version")
    if rc_fb != 0:
        print(c("yellow", "      ℹ  firebase-tools not installed. Installing now (this may take a minute)..."))
        rc_inst, _, err_inst = _run("npm install -g firebase-tools")
        if rc_inst != 0:
            print(c("yellow", f"      ⚠  Could not install firebase-tools: {err_inst}"))
            return
        print(c("green", "      ✓  firebase-tools installed."))

    rules_path = os.path.join(os.path.dirname(__file__), "..", "firestore.rules")
    if not os.path.exists(rules_path):
        print(c("yellow", "      ⚠  firestore.rules not found. Skipping."))
        return

    print(c("cyan", f"         Deploying firestore.rules to project {PROJECT_ID}..."))
    rc_deploy, out_deploy, err_deploy = _run(
        f'firebase deploy --only firestore:rules --project {PROJECT_ID}'
    )
    if rc_deploy == 0:
        print(c("green", "      ✓  Firestore rules deployed successfully."))
    else:
        print(c("yellow", f"      ⚠  Deploy failed (may need firebase login):"))
        print(c("yellow", f"         {err_deploy[-300:]}"))
        print(c("yellow", "         Run: firebase login  then re-run this script."))

def print_next_steps(email, uid):
    print(c("bold", "\n" + "="*60))
    print(c("bold", "  SETUP COMPLETE – NEXT STEPS"))
    print(c("bold", "="*60))
    print(textwrap.dedent(f"""
  {c("green","*")} Admin account created & verified.
  {c("green","*")} Credentials saved to tools/admin_credentials.txt

  Set the admin custom claim (required for Firestore writes):
  -> https://console.firebase.google.com/project/{PROJECT_ID}/authentication/users
    1. Find:  {email}
    2. Menu -> Set custom claims -> paste:  {{"admin": true}}

  Open the local admin panel:
  -> http://localhost:8000/admin.html
    Email   : {email}
    Password: (see tools/admin_credentials.txt)

  Open the live admin panel:
  -> https://lalithvishnu-hub.github.io/SivaSureshAgency/admin.html
    """))

def ensure_gitignore():
    gi_path = os.path.join(os.path.dirname(__file__), "..", ".gitignore")
    entries = ["tools/admin_credentials.txt", "tools/serviceAccountKey.json", "emulator_export/"]
    existing = ""
    if os.path.exists(gi_path):
        with open(gi_path) as f:
            existing = f.read()
    added = []
    with open(gi_path, "a") as f:
        for entry in entries:
            if entry not in existing:
                f.write(f"\n{entry}")
                added.append(entry)
    if added:
        print(c("green", f"      ✓  Added to .gitignore: {', '.join(added)}"))

def main():
    parser = argparse.ArgumentParser(description="Siva Suresh Agency – Admin Account Setup")
    parser.add_argument("--email",       default="admin@sivasureshagency.com")
    parser.add_argument("--password",    default="Admin@SSA2024!")
    parser.add_argument("--displayName", default="SSA Admin")
    args = parser.parse_args()

    print(c("bold", "\n  Siva Suresh Agency – Admin Setup Automation"))
    print(c("bold",   "  ============================================\n"))

    ensure_gitignore()

    uid = create_user(args.email, args.password, args.displayName)
    verified_uid, _ = verify_login(args.email, args.password)
    final_uid = uid or verified_uid

    save_credentials(args.email, args.password, final_uid)
    deploy_firestore_rules()
    print_next_steps(args.email, final_uid)

if __name__ == "__main__":
    main()
