#!/usr/bin/env python3
"""
Fix null dates in finance_payments by re-reading the original CSVs
and matching records by source + source_id (for Stripe/Zoho) or
source + payer_name + amount (for Brex which has no source_id).
"""

import csv
import json
import os
import re
import sys
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime

SUPABASE_URL = "https://tnkmxmlgdhlgehlrbxuf.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRua214bWxnZGhsZ2VobHJieHVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE0MjQzMiwiZXhwIjoyMDg3NzE4NDMyfQ.KRgDU-OCfx4inIU_tl0W24XfiojjFQ7K8jTYYyc0qlI"
USER_ID = "78bd1255-f05a-436b-abbd-f8c281d30210"
REST_ENDPOINT = SUPABASE_URL + "/rest/v1/finance_payments"
CSV_DIR = "/Users/timjarvis/Documents/TaskFlow Data/Finance"


def parse_date(s):
    if not s:
        return None
    s = s.strip()
    m = re.match(r"^(\d{2})/(\d{2})/(\d{4})$", s)
    if m:
        return f"{m.group(3)}-{m.group(1)}-{m.group(2)}"
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    m = re.match(r"^(\d{2})-(\d{2})-(\d{4})", s)
    if m:
        return f"{m.group(3)}-{m.group(1)}-{m.group(2)}"
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


def read_csv(filename):
    fp = os.path.join(CSV_DIR, filename)
    if not os.path.exists(fp):
        print(f"  File not found: {fp}")
        return []
    rows = []
    with open(fp, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows


def supabase_get_all_null_dates():
    """Fetch all finance_payments with null dates."""
    all_records = []
    offset = 0
    batch_size = 500
    while True:
        params = {
            "select": "id,source,source_id,payer_name,payer_email,amount,description",
            "date": "is.null",
            "user_id": f"eq.{USER_ID}",
            "limit": str(batch_size),
            "offset": str(offset),
        }
        qs = urllib.parse.urlencode(params)
        url = REST_ENDPOINT + "?" + qs
        req = urllib.request.Request(url, method="GET")
        req.add_header("apikey", SUPABASE_KEY)
        req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
        req.add_header("Content-Type", "application/json")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            all_records.extend(data)
            if len(data) < batch_size:
                break
            offset += batch_size
    return all_records


def supabase_patch(record_id, date_value):
    """Update a single record's date."""
    data = json.dumps({"date": date_value}).encode("utf-8")
    url = REST_ENDPOINT + "?" + urllib.parse.urlencode({"id": f"eq.{record_id}"})
    req = urllib.request.Request(url, data=data, method="PATCH")
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=minimal")
    try:
        with urllib.request.urlopen(req) as resp:
            return None
    except urllib.error.HTTPError as e:
        return f"HTTP {e.code}: {e.read().decode('utf-8')}"


# Brex exclusion list (same as import script)
BREX_EXCLUDE = [
    "Client Advertising Account", "Cash Reserve", "Brex Card", "STRIPE",
    "TIM JARVIS ONLIN", "Film&Content LLC", "Lee Brack", "Reservoir Limited",
    "Dreyfus Government", "Brex", "PAYPAL", "IMPACT RADIUS", "Treasury",
    "Stripe - Do Not Use", "Nightwolf Productions", "CITYCOAST TRUST",
]


def main():
    print("Fix Null Dates in finance_payments")
    print("=" * 40)

    # 1. Get all null-date records
    print("\nFetching records with null dates...")
    null_records = supabase_get_all_null_dates()
    print(f"Found {len(null_records)} records with null dates")

    if not null_records:
        print("No records to fix!")
        return

    # 2. Build lookup maps from CSVs

    # Stripe 1: source_id -> date
    print("\nReading CSVs...")
    stripe1_rows = read_csv("stripe_payments.csv")
    stripe1_map = {}
    for r in stripe1_rows:
        sid = (r.get("id") or "").strip()
        if sid:
            d = parse_date(r.get("Created date (UTC)"))
            if d:
                stripe1_map[sid] = d
    print(f"  Stripe 1: {len(stripe1_map)} records with dates")

    # Stripe 2: source_id -> date
    stripe2_rows = read_csv("stripe_account2_payments.csv")
    stripe2_map = {}
    for r in stripe2_rows:
        sid = (r.get("id") or "").strip()
        if sid:
            d = parse_date(r.get("Created date (UTC)"))
            if d:
                stripe2_map[sid] = d
    print(f"  Stripe 2: {len(stripe2_map)} records with dates")

    # Zoho: source_id -> date
    zoho_rows = read_csv("zoho_payments.csv")
    zoho_map = {}
    for r in zoho_rows:
        sid = (r.get("PaymentID") or "").strip()
        if sid:
            d = parse_date(r.get("Date"))
            if d:
                zoho_map[sid] = d
    print(f"  Zoho:     {len(zoho_map)} records with dates")

    # Brex: (payer_name_lower, amount) -> date
    # Brex has no source_id, so we match by payer name + amount
    brex_rows = read_csv("brex_payments.csv")
    brex_map = {}  # key: (payer_name_lower, amount_str) -> date
    brex_multi = {}  # track multiple matches
    for r in brex_rows:
        if (r.get("Status") or "").strip() != "Complete":
            continue
        amt = num(r.get("Amount"))
        if amt <= 0:
            continue
        to_from = (r.get("To/From") or "").strip()
        d = parse_date(r.get("Date"))
        if d:
            key = (to_from.upper(), f"{amt:.2f}")
            if key in brex_map:
                # Multiple records with same name+amount, track them
                if key not in brex_multi:
                    brex_multi[key] = [brex_map[key]]
                brex_multi[key].append(d)
            else:
                brex_map[key] = d
    print(f"  Brex:     {len(brex_map)} unique (name+amount) pairs")

    # 3. Match and fix
    print(f"\nMatching {len(null_records)} records...")
    fixed = 0
    unmatched = 0
    errors = 0

    for rec in null_records:
        source = rec["source"]
        source_id = (rec.get("source_id") or "").strip()
        date_to_set = None

        if source == "stripe" and source_id and source_id in stripe1_map:
            date_to_set = stripe1_map[source_id]
        elif source == "stripe2" and source_id and source_id in stripe2_map:
            date_to_set = stripe2_map[source_id]
        elif source == "zoho" and source_id and source_id in zoho_map:
            date_to_set = zoho_map[source_id]
        elif source == "brex":
            payer = (rec.get("payer_name") or "").strip().upper()
            amt_str = f"{rec['amount']:.2f}"
            key = (payer, amt_str)
            if key in brex_map and key not in brex_multi:
                date_to_set = brex_map[key]
            elif key in brex_multi:
                # Multiple matches - take the first unused date
                dates = brex_multi[key]
                if dates:
                    date_to_set = dates.pop(0)

        if date_to_set:
            err = supabase_patch(rec["id"], date_to_set)
            if err:
                print(f"\n  Error updating {rec['id']}: {err}")
                errors += 1
            else:
                fixed += 1
                sys.stdout.write(f"\rFixed: {fixed}/{len(null_records)}")
                sys.stdout.flush()
        else:
            unmatched += 1

    print(f"\n\nDone!")
    print(f"  Fixed:     {fixed}")
    print(f"  Unmatched: {unmatched}")
    print(f"  Errors:    {errors}")

    if unmatched > 0:
        print(f"\n--- Unmatched records ---")
        count = 0
        for rec in null_records:
            source = rec["source"]
            source_id = (rec.get("source_id") or "").strip()
            matched = False
            if source == "stripe" and source_id and source_id in stripe1_map:
                matched = True
            elif source == "stripe2" and source_id and source_id in stripe2_map:
                matched = True
            elif source == "zoho" and source_id and source_id in zoho_map:
                matched = True
            elif source == "brex":
                payer = (rec.get("payer_name") or "").strip().upper()
                amt_str = f"{rec['amount']:.2f}"
                key = (payer, amt_str)
                if key in brex_map:
                    matched = True
            if not matched:
                count += 1
                if count <= 20:
                    print(f"  [{source}] {rec.get('payer_name', 'Unknown')} - ${rec['amount']:.2f} (source_id: '{source_id}')")
        if count > 20:
            print(f"  ... and {count - 20} more")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Fatal error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
