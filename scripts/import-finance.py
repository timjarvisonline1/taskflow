#!/usr/bin/env python3
"""
TaskFlow Finance — One-time CSV Import Script (Python version)

Reads CSV exports from Stripe (2 accounts), Zoho Payments, and Brex,
normalises them, and inserts into the finance_payments table in Supabase.

Usage:
    python3 scripts/import-finance.py

The script is idempotent — it checks source + source_id to skip duplicates.
"""

import csv
import json
import re
import sys
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime

# ── Config ──────────────────────────────────────────────────────────
SUPABASE_URL = "https://tnkmxmlgdhlgehlrbxuf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRua214bWxnZGhsZ2VobHJieHVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE0MjQzMiwiZXhwIjoyMDg3NzE4NDMyfQ.KRgDU-OCfx4inIU_tl0W24XfiojjFQ7K8jTYYyc0qlI"
USER_ID = "78bd1255-f05a-436b-abbd-f8c281d30210"

REST_ENDPOINT = SUPABASE_URL + "/rest/v1/finance_payments"
CSV_DIR = "/Users/timjarvis/Documents/TaskFlow Data/Finance"

# ── Brex: names to EXCLUDE (internal transfers, expenses, pass-through) ──
BREX_EXCLUDE = [
    "Client Advertising Account",
    "Cash Reserve",
    "Brex Card",
    "STRIPE",
    "TIM JARVIS ONLIN",
    "Film&Content LLC",
    "Lee Brack",
    "Reservoir Limited",
    "Dreyfus Government",
    "Brex",
    "PAYPAL",
    "IMPACT RADIUS",
    "Treasury",
    "Stripe - Do Not Use",
    "Nightwolf Productions",  # ACH return, not a real payment
    "CITYCOAST TRUST",
]


def brex_is_excluded(to_from):
    tf = to_from.lower()
    for name in BREX_EXCLUDE:
        if name.lower() in tf:
            return True
    return False


# ── Parse helpers ───────────────────────────────────────────────────
def parse_date(s):
    if not s:
        return None
    s = s.strip()

    # MM/DD/YYYY (Brex)
    m = re.match(r"^(\d{2})/(\d{2})/(\d{4})$", s)
    if m:
        return f"{m.group(3)}-{m.group(1)}-{m.group(2)}"

    # YYYY-MM-DD (already ISO)
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"

    # MM-DD-YYYY (Mercury)
    m = re.match(r"^(\d{2})-(\d{2})-(\d{4})", s)
    if m:
        return f"{m.group(3)}-{m.group(1)}-{m.group(2)}"

    # "Jan 28, 2026, 04:04 PM" (Zoho) — try common datetime formats
    for fmt in (
        "%b %d, %Y, %I:%M %p",
        "%b %d, %Y",
        "%B %d, %Y, %I:%M %p",
        "%B %d, %Y",
        "%m/%d/%Y %I:%M %p",
        "%Y-%m-%dT%H:%M:%S",
    ):
        try:
            dt = datetime.strptime(s, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue

    return None


def num(v):
    if not v:
        return 0.0
    cleaned = re.sub(r"[,$]", "", str(v))
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


# ── Read & parse CSV ────────────────────────────────────────────────
def read_csv(filename):
    import os
    fp = os.path.join(CSV_DIR, filename)
    if not os.path.exists(fp):
        print(f"File not found: {fp}", file=sys.stderr)
        return []
    rows = []
    with open(fp, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows


# ── Transform functions per source ──────────────────────────────────

def transform_stripe1(rows):
    out = []
    for r in rows:
        if (r.get("Status") or "").strip() != "Paid":
            continue
        amt = num(r.get("Amount"))
        if amt <= 0:
            continue
        out.append({
            "user_id":     USER_ID,
            "date":        parse_date(r.get("Created date (UTC)")),
            "amount":      amt,
            "fee":         num(r.get("Fee")),
            "net":         amt - num(r.get("Fee")),
            "source":      "stripe",
            "source_id":   (r.get("id") or "").strip(),
            "payer_email": (r.get("Customer Email") or "").strip().lower(),
            "payer_name":  (r.get("Customer Description") or r.get("name (metadata)") or "").strip(),
            "description": (r.get("Description") or "").strip(),
            "category":    "",
            "client_id":   None,
            "campaign_id": None,
            "end_client":  "",
            "notes":       "",
            "status":      "unmatched",
        })
    return out


def transform_stripe2(rows):
    out = []
    for r in rows:
        if (r.get("Status") or "").strip() != "Paid":
            continue
        amt = num(r.get("Amount"))
        if amt <= 0:
            continue
        out.append({
            "user_id":     USER_ID,
            "date":        parse_date(r.get("Created date (UTC)")),
            "amount":      amt,
            "fee":         num(r.get("Fee")),
            "net":         amt - num(r.get("Fee")),
            "source":      "stripe2",
            "source_id":   (r.get("id") or "").strip(),
            "payer_email": (r.get("Customer Email") or "").strip().lower(),
            "payer_name":  (r.get("Customer Description") or r.get("name (metadata)") or "").strip(),
            "description": (r.get("Description") or "").strip(),
            "category":    "",
            "client_id":   None,
            "campaign_id": None,
            "end_client":  "",
            "notes":       "",
            "status":      "unmatched",
        })
    return out


def transform_zoho(rows):
    out = []
    for r in rows:
        if (r.get("Status") or "").strip() != "succeeded":
            continue
        amt = num(r.get("Amount"))
        if amt <= 0:
            continue
        out.append({
            "user_id":     USER_ID,
            "date":        parse_date(r.get("Date")),
            "amount":      amt,
            "fee":         num(r.get("FeeAmount")),
            "net":         amt - num(r.get("FeeAmount")),
            "source":      "zoho",
            "source_id":   (r.get("PaymentID") or "").strip(),
            "payer_email": (r.get("ReceiptEmail") or "").strip().lower(),
            "payer_name":  (r.get("CardHolderName") or "").strip(),
            "description": (r.get("Description") or "").strip(),
            "category":    "",
            "client_id":   None,
            "campaign_id": None,
            "end_client":  "",
            "notes":       "",
            "status":      "unmatched",
        })
    return out


def transform_brex(rows):
    out = []
    for r in rows:
        if (r.get("Status") or "").strip() != "Complete":
            continue
        amt = num(r.get("Amount"))
        if amt <= 0:
            continue
        to_from = (r.get("To/From") or "").strip()
        if brex_is_excluded(to_from):
            continue
        method = (r.get("Method") or "").strip()
        if method not in ("ACH", "Wire", "ACH return"):
            continue
        out.append({
            "user_id":     USER_ID,
            "date":        parse_date(r.get("Date")),
            "amount":      amt,
            "fee":         0,
            "net":         amt,
            "source":      "brex",
            "source_id":   "",
            "payer_email": "",
            "payer_name":  to_from,
            "description": (r.get("Memo") or r.get("External Memo") or "").strip(),
            "category":    "",
            "client_id":   None,
            "campaign_id": None,
            "end_client":  "",
            "notes":       f"Method: {method}",
            "status":      "unmatched",
        })
    return out


# ── Supabase REST helpers ───────────────────────────────────────────

def supabase_get(params):
    """GET request to the finance_payments REST endpoint with query params."""
    qs = urllib.parse.urlencode(params)
    url = REST_ENDPOINT + "?" + qs
    req = urllib.request.Request(url, method="GET")
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body), None
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        return None, f"HTTP {e.code}: {err_body}"


def supabase_post(records):
    """POST (insert) a batch of records into finance_payments."""
    data = json.dumps(records).encode("utf-8")
    req = urllib.request.Request(REST_ENDPOINT, data=data, method="POST")
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=minimal")
    try:
        with urllib.request.urlopen(req) as resp:
            return None  # success
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        return f"HTTP {e.code}: {err_body}"


# ── Main ────────────────────────────────────────────────────────────

def main():
    print("TaskFlow Finance Import")
    print("=======================\n")

    # 1. Read & transform
    print(f"Reading CSVs from: {CSV_DIR}")

    stripe1_rows = read_csv("stripe_payments.csv")
    stripe2_rows = read_csv("stripe_account2_payments.csv")
    zoho_rows    = read_csv("zoho_payments.csv")
    brex_rows    = read_csv("brex_payments.csv")

    stripe1 = transform_stripe1(stripe1_rows)
    stripe2 = transform_stripe2(stripe2_rows)
    zoho    = transform_zoho(zoho_rows)
    brex    = transform_brex(brex_rows)

    print(f"Stripe Account 1: {len(stripe1)} records")
    print(f"Stripe Account 2: {len(stripe2)} records")
    print(f"Zoho Payments:    {len(zoho)} records")
    print(f"Brex Direct:      {len(brex)} records")

    all_records = stripe1 + stripe2 + zoho + brex
    print(f"Total to import:  {len(all_records)} records\n")

    if not all_records:
        print("Nothing to import.")
        return

    # 2. Check for existing records to avoid duplicates
    print("Checking for existing records...")
    existing, err = supabase_get({
        "select": "source,source_id",
        "user_id": f"eq.{USER_ID}",
    })

    if err:
        print(f"Error checking existing: {err}", file=sys.stderr)
        return

    existing_set = set()
    for r in (existing or []):
        if r.get("source_id"):
            existing_set.add(r["source"] + ":" + r["source_id"])
    print(f"Existing records: {len(existing_set)}")

    # Filter out duplicates (only for records with source_id)
    to_insert = []
    for r in all_records:
        if not r["source_id"]:
            to_insert.append(r)  # Brex has no source_id, always insert
        elif (r["source"] + ":" + r["source_id"]) not in existing_set:
            to_insert.append(r)

    print(f"After dedup:      {len(to_insert)} new records\n")

    if not to_insert:
        print("All records already imported. Nothing to do.")
        return

    # 3. Insert in batches of 50
    BATCH = 50
    inserted = 0
    errors = 0

    for i in range(0, len(to_insert), BATCH):
        batch = to_insert[i : i + BATCH]
        err = supabase_post(batch)
        if err:
            batch_num = (i // BATCH) + 1
            print(f"Insert error (batch {batch_num}): {err}", file=sys.stderr)
            errors += len(batch)
        else:
            inserted += len(batch)
            sys.stdout.write(f"\rInserted: {inserted}/{len(to_insert)}")
            sys.stdout.flush()

    print("\n\nImport complete!")
    print(f"  Inserted: {inserted}")
    print(f"  Errors:   {errors}")

    # 4. Summary by source
    print("\n--- Revenue Summary ---")
    sources = {"stripe": 0.0, "stripe2": 0.0, "zoho": 0.0, "brex": 0.0}
    for r in to_insert:
        sources[r["source"]] += r["amount"]
    for s, total in sources.items():
        print(f"  {s}: ${total:.2f}")
    grand_total = sum(sources.values())
    print(f"  Total: ${grand_total:.2f}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Fatal error: {e}", file=sys.stderr)
        sys.exit(1)
