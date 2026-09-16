#!/usr/bin/env python3
"""Import the email address every Florida business gave the state.

Florida publishes, quarterly, a plain CSV of document_number,email for every
registered entity — 10.7 million rows, on the same public SFTP the daily
filings come from. It costs nothing, needs no card and no vendor, and is keyed
on the document number already stored against every lead.

It matters because the address we have been using is the wrong person's. That
one comes from a property lookup, which answers "who is associated with this
address", and graded against the officer names Florida publishes it names
somebody else 71% of the time. This file is what the owner wrote on their own
filing.

WHY THIS IS A SCRIPT AND NOT AN EDGE FUNCTION

The archive is 129MB compressed and 387MB of text. Downloading it took 87
seconds on its own, before decompressing, parsing ten million rows and writing
the matches. An edge function gets 150 seconds of wall clock and a few hundred
megabytes of memory, so it would fail partway through — and a half-finished
import that reports success is the failure mode this project keeps being bitten
by. One long-running pass that either finishes or says it did not is honest;
a function racing a timeout is not.

WHEN TO RUN IT

Files appear about ten days after each quarter ends:

    Q1 2026   published  6 April
    Q2 2026   published 10 July
    Q3 2026   expected  ~10 October     <- the first one covering our leads

Running it before a new quarter is published is harmless: the file is already
recorded as imported and the script exits without downloading anything.

    python3 scripts/import-state-emails.py            # newest file
    python3 scripts/import-state-emails.py --dry-run  # match but write nothing
    python3 scripts/import-state-emails.py --file email_2026_q2.zip
"""
import argparse
import csv
import io
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request
import zipfile

PROJECT = "https://tftlysimqcrwjyncjvvf.supabase.co"
ENV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", ".env.local")
SFTP_HOST = "sftp.floridados.gov"
SFTP_USER = "Public"
SFTP_PASS = "PubAccess1845!"
REMOTE_DIR = "doc/DHE"
BATCH = 500


def service_key():
    for line in open(os.path.normpath(ENV)):
        if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
            return line.split("=", 1)[1].strip().strip('"')
    sys.exit(f"no SUPABASE_SERVICE_ROLE_KEY in {ENV}")


KEY = service_key()
AUTH = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"}


def rest(path, data=None, method="GET", extra=None):
    body = json.dumps(data).encode() if data is not None else None
    headers = dict(AUTH)
    if extra:
        headers.update(extra)
    req = urllib.request.Request(PROJECT + "/rest/v1/" + path, data=body,
                                 method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=300) as r:
        raw = r.read()
    return json.loads(raw) if raw else None


def lftp(commands):
    """Run a batch of lftp commands and return stdout.

    lftp rather than paramiko so the script has no pip dependencies — this has
    to run on a laptop that may have nothing installed.
    """
    out = subprocess.run(
        ["lftp", "-u", f"{SFTP_USER},{SFTP_PASS}", f"sftp://{SFTP_HOST}",
         "-e", "set sftp:auto-confirm yes; set net:timeout 40; " + commands + " bye"],
        capture_output=True, text=True, timeout=1800,
    )
    if out.returncode != 0 and not out.stdout:
        sys.exit(f"sftp failed: {out.stderr.strip()[:400]}")
    return out.stdout


def newest_remote_file():
    listing = lftp(f"cd {REMOTE_DIR}; ls;")
    names = re.findall(r"(email_\d{4}_q[1-4]\.zip)", listing)
    if not names:
        sys.exit(f"no email_YYYY_qN.zip found in {REMOTE_DIR}:\n{listing[:500]}")
    # Lexicographic order is chronological for this naming scheme.
    return sorted(set(names))[-1]


def already_imported(filename):
    rows = rest(f"state_email_imports?select=filename,imported_at,leads_updated"
                f"&filename=eq.{filename}")
    return rows[0] if rows else None


def lead_count():
    """How many leads there are, straight from the server."""
    req = urllib.request.Request(
        PROJECT + "/rest/v1/leads?select=id&limit=1",
        headers={**AUTH, "Prefer": "count=exact", "Range-Unit": "items", "Range": "0-0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        content_range = r.headers.get("Content-Range", "")
    # "0-0/64205"
    return int(content_range.rsplit("/", 1)[-1])


def load_lead_index():
    """document_number -> {id, current state_email} for every lead we hold.

    Held in memory because the alternative is ten million lookups. Sixty
    thousand short strings is a few megabytes.

    Paged with an explicit sort and a keyset cursor, not limit/offset. Postgres
    gives no ordering guarantee for an unordered query, so offset paging is free
    to skip and repeat rows between pages — the first version of this function
    indexed 40,558 of 64,205 leads and reported no error at all. Every lead it
    missed would have been a business left without the email address the state
    holds for it.
    """
    index = {}
    cursor = ""
    while True:
        q = ("leads?select=id,document_number,state_email"
             "&order=document_number.asc&limit=1000")
        if cursor:
            q += f"&document_number=gt.{cursor}"
        page = rest(q)
        if not page:
            break
        for row in page:
            index[row["document_number"]] = row
        cursor = page[-1]["document_number"]
        if len(index) % 20000 < 1000:
            print(f"    ...{len(index):,} leads indexed")
    return index


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", help="specific email_YYYY_qN.zip to import")
    ap.add_argument("--dry-run", action="store_true",
                    help="report what would change and write nothing")
    ap.add_argument("--force", action="store_true",
                    help="re-import a file already recorded as done")
    args = ap.parse_args()

    filename = args.file or newest_remote_file()
    print(f"newest quarterly file on the state SFTP: {filename}")

    done = already_imported(filename)
    if done and not args.force and not args.dry_run:
        print(f"  already imported on {done['imported_at'][:10]} "
              f"({done.get('leads_updated')} leads updated) — nothing to do.")
        print("  Pass --force to run it again.")
        return

    print("indexing the leads we hold...")
    expected = lead_count()
    index = load_lead_index()
    print(f"  {len(index):,} leads indexed (server reports {expected:,})")
    # A short index is not a smaller job, it is a silently wrong one: every
    # lead missing from it keeps the wrong email forever and nothing says so.
    if len(index) < expected:
        sys.exit(f"ABORT: indexed {len(index):,} of {expected:,} leads. "
                 "Refusing to import a partial set.")

    with tempfile.TemporaryDirectory() as tmp:
        local = os.path.join(tmp, filename)
        print(f"downloading {filename} (this is ~130MB and takes a minute or two)...")
        lftp(f"get {REMOTE_DIR}/{filename} -o {local};")
        if not os.path.exists(local) or os.path.getsize(local) < 1_000_000:
            sys.exit("download failed or the file is far smaller than expected")
        print(f"  {os.path.getsize(local) / 1e6:.0f} MB")

        rows_read = 0
        updates = []
        skipped_same = 0
        bad_email = 0

        with zipfile.ZipFile(local) as z:
            inner = [n for n in z.namelist() if n.lower().endswith(".csv")]
            if not inner:
                sys.exit(f"no CSV inside {filename}: {z.namelist()}")
            print(f"reading {inner[0]}...")
            with z.open(inner[0]) as raw:
                # utf-8-sig: the file begins with a byte-order mark, which would
                # otherwise be glued onto the first document number and make it
                # miss.
                text = io.TextIOWrapper(raw, encoding="utf-8-sig", errors="replace")
                for line in text:
                    rows_read += 1
                    if rows_read % 2_000_000 == 0:
                        print(f"    ...{rows_read:,} rows, {len(updates):,} matches")
                    doc, _, email = line.partition(",")
                    lead = index.get(doc.strip())
                    if lead is None:
                        continue
                    email = email.strip().strip('"').lower()
                    if not EMAIL_RE.match(email):
                        bad_email += 1
                        continue
                    if lead.get("state_email") == email:
                        skipped_same += 1
                        continue
                    updates.append({"id": lead["id"], "email": email,
                                    "src": filename})

    print()
    print(f"rows read           : {rows_read:,}")
    print(f"matched our leads   : {len(updates) + skipped_same:,}")
    print(f"  already had it    : {skipped_same:,}")
    print(f"  new or changed    : {len(updates):,}")
    print(f"  malformed address : {bad_email:,}")

    if args.dry_run:
        print("\n--dry-run: nothing written. Sample of what would change:")
        for u in updates[:10]:
            print(f"   {u['id']}  ->  {u['email']}")
        return

    if updates:
        print(f"\nwriting {len(updates):,} addresses in batches of {BATCH}...")
        written = 0
        for i in range(0, len(updates), BATCH):
            chunk = updates[i:i + BATCH]
            # Through an RPC that does UPDATE ... FROM, not a PostgREST upsert.
            # merge-duplicates sends the row as an INSERT carrying only the
            # named columns, so every other field arrives null and the write is
            # refused by the first NOT NULL constraint. This touches the two
            # columns and nothing else.
            applied = rest("rpc/apply_state_emails", {"payload": chunk}, "POST")
            if applied != len(chunk):
                print(f"    WARNING: sent {len(chunk)} rows, {applied} were applied "
                      "— some lead ids no longer exist")
            written += len(chunk)
            print(f"    {written:,}/{len(updates):,}")
    else:
        print("\nnothing to write.")

    rest("state_email_imports?on_conflict=filename", {
        "filename": filename,
        "rows_read": rows_read,
        "leads_matched": len(updates) + skipped_same,
        "leads_updated": len(updates),
        "notes": f"{bad_email} malformed, {skipped_same} unchanged",
    }, "POST", extra={"Prefer": "resolution=merge-duplicates,return=minimal"})
    print("\nrecorded in state_email_imports. Done.")


if __name__ == "__main__":
    main()
