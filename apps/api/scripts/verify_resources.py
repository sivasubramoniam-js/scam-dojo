#!/usr/bin/env python3
"""Verify that all active resources have verified_on and source_url."""

import sqlite3
import sys
from pathlib import Path


def verify_resources() -> bool:
    root = Path(__file__).resolve().parent.parent.parent.parent
    db_path = root / "data" / "knowledge.sqlite"
    if not db_path.exists():
        print(f"Error: {db_path} does not exist. Run 'make kb' first.")
        return False

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("""
    SELECT id, name_en, contact_type, contact_value, source_url, verified_on
    FROM resources
    WHERE active = 1 AND (contact_type IN ('phone', 'url'));
    """)
    rows = cur.fetchall()
    conn.close()

    errors = []
    for r_id, name, _c_type, _c_val, source_url, verified_on in rows:
        if not source_url or not source_url.startswith("http"):
            errors.append(f"Resource '{r_id}' ({name}) missing valid source_url.")
        if not verified_on:
            errors.append(f"Resource '{r_id}' ({name}) missing verified_on date.")

    if errors:
        print("Resource verification failed:")
        for err in errors:
            print(f"  - {err}")
        return False

    print(f"Verified {len(rows)} active resources successfully.")
    return True

if __name__ == "__main__":
    if not verify_resources():
        sys.exit(1)
