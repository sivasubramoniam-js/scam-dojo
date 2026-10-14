#!/usr/bin/env python3
"""Build knowledge.sqlite from data/seed YAML files deterministically."""

import hashlib
import json
import os
import sqlite3
from pathlib import Path

try:
    import yaml
except ImportError:
    import pyyaml as yaml  # type: ignore

def get_repo_root() -> Path:
    # Look for docs/ and data/
    curr = Path(__file__).resolve().parent
    while curr != curr.parent:
        if (curr / "data" / "seed").exists():
            return curr
        curr = curr.parent
    raise RuntimeError("Cannot find repository root")

def compute_seeds_hash(seed_dir: Path) -> str:
    hasher = hashlib.sha256()
    for root, _, files in sorted(os.walk(seed_dir)):
        for f in sorted(files):
            if f.endswith((".yaml", ".yml", ".md")):
                p = Path(root) / f
                hasher.update(f.encode("utf-8"))
                hasher.update(p.read_bytes())
    return hasher.hexdigest()

def parse_markdown_with_frontmatter(content: str) -> tuple[dict, str]:
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            fm = yaml.safe_load(parts[1]) or {}
            body = parts[2].strip()
            return fm, body
    return {}, content.strip()

def build_kb(root_dir: Path) -> Path:
    seed_dir = root_dir / "data" / "seed"
    db_path = root_dir / "data" / "knowledge.sqlite"

    if db_path.exists():
        db_path.unlink()

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("PRAGMA journal_mode = OFF;")
    cur.execute("PRAGMA user_version = 1;")

    cur.execute("""
    CREATE TABLE meta (
        key TEXT PRIMARY KEY,
        value TEXT
    );
    """)

    cur.execute("""
    CREATE TABLE scam_types (
        id INTEGER PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name_en TEXT NOT NULL,
        name_hi TEXT NOT NULL,
        summary_en TEXT NOT NULL,
        summary_hi TEXT NOT NULL,
        typical_channels TEXT NOT NULL,
        severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5)
    );
    """)

    cur.execute("""
    CREATE TABLE tactics (
        id INTEGER PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name_en TEXT NOT NULL,
        name_hi TEXT NOT NULL,
        description_en TEXT NOT NULL,
        description_hi TEXT NOT NULL,
        counter_tip_en TEXT NOT NULL,
        counter_tip_hi TEXT NOT NULL
    );
    """)

    cur.execute("""
    CREATE TABLE red_flags (
        id INTEGER PRIMARY KEY,
        scam_type_id INTEGER REFERENCES scam_types(id),
        tactic_slug TEXT REFERENCES tactics(slug),
        text_en TEXT NOT NULL,
        text_hi TEXT NOT NULL,
        weight INTEGER NOT NULL DEFAULT 1
    );
    """)

    cur.execute("""
    CREATE TABLE scenarios (
        id INTEGER PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        scam_type_slug TEXT NOT NULL REFERENCES scam_types(slug),
        channel TEXT NOT NULL,
        min_belt TEXT NOT NULL DEFAULT 'white',
        difficulty_min INTEGER NOT NULL,
        difficulty_max INTEGER NOT NULL,
        est_minutes INTEGER NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        title_en TEXT NOT NULL,
        title_hi TEXT NOT NULL,
        blurb_en TEXT NOT NULL,
        blurb_hi TEXT NOT NULL,
        spec_json TEXT NOT NULL
    );
    """)

    cur.execute("""
    CREATE TABLE resources (
        id TEXT PRIMARY KEY,
        country TEXT NOT NULL DEFAULT 'IN',
        category TEXT NOT NULL,
        name_en TEXT NOT NULL,
        name_hi TEXT NOT NULL,
        contact_type TEXT NOT NULL,
        contact_value TEXT,
        description_en TEXT NOT NULL,
        description_hi TEXT NOT NULL,
        when_to_use_en TEXT NOT NULL,
        when_to_use_hi TEXT NOT NULL,
        triggers_json TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 50,
        source_url TEXT NOT NULL,
        verified_on TEXT,
        active INTEGER NOT NULL DEFAULT 1
    );
    """)

    cur.execute("""
    CREATE TABLE pattern_rules (
        id INTEGER PRIMARY KEY,
        kind TEXT NOT NULL,
        lang TEXT NOT NULL DEFAULT 'any',
        pattern TEXT NOT NULL,
        tag TEXT NOT NULL,
        weight INTEGER NOT NULL DEFAULT 1,
        note TEXT
    );
    """)

    cur.execute("""
    CREATE TABLE known_brands (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        domains_json TEXT NOT NULL,
        kind TEXT NOT NULL
    );
    """)

    cur.execute("""
    CREATE TABLE kb_docs (
        id INTEGER PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        lang TEXT NOT NULL,
        scam_type_slug TEXT,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        source_url TEXT
    );
    """)

    cur.execute("""
    CREATE VIRTUAL TABLE kb_fts USING fts5(
        title,
        body,
        scam_type_slug UNINDEXED,
        lang UNINDEXED,
        content='kb_docs',
        content_rowid='id',
        tokenize='unicode61 remove_diacritics 2'
    );
    """)

    # 1. Tactics
    with open(seed_dir / "tactics.yaml", encoding="utf-8") as f:
        tactics = yaml.safe_load(f)
    for t in sorted(tactics, key=lambda x: x["id"]):
        cur.execute("""
        INSERT INTO tactics (id, slug, name_en, name_hi, description_en, description_hi, counter_tip_en, counter_tip_hi)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, (t["id"], t["slug"], t["name_en"], t["name_hi"], t["description_en"], t["description_hi"], t["counter_tip_en"], t["counter_tip_hi"]))

    # 2. Scam Types
    with open(seed_dir / "scam_types.yaml", encoding="utf-8") as f:
        scam_types = yaml.safe_load(f)
    for s in sorted(scam_types, key=lambda x: x["id"]):
        cur.execute("""
        INSERT INTO scam_types (id, slug, name_en, name_hi, summary_en, summary_hi, typical_channels, severity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, (s["id"], s["slug"], s["name_en"], s["name_hi"], s["summary_en"], s["summary_hi"], json.dumps(s["typical_channels"], ensure_ascii=False), s["severity"]))

    # 3. Red Flags
    with open(seed_dir / "red_flags.yaml", encoding="utf-8") as f:
        red_flags = yaml.safe_load(f)
    for r in sorted(red_flags, key=lambda x: x["id"]):
        cur.execute("""
        INSERT INTO red_flags (id, scam_type_id, tactic_slug, text_en, text_hi, weight)
        VALUES (?, ?, ?, ?, ?, ?);
        """, (r["id"], r.get("scam_type_id"), r.get("tactic_slug"), r["text_en"], r["text_hi"], r.get("weight", 1)))

    # 4. Resources
    with open(seed_dir / "resources.yaml", encoding="utf-8") as f:
        resources = yaml.safe_load(f)
    for res in sorted(resources, key=lambda x: x["id"]):
        cur.execute("""
        INSERT INTO resources (id, country, category, name_en, name_hi, contact_type, contact_value, description_en, description_hi, when_to_use_en, when_to_use_hi, triggers_json, priority, source_url, verified_on, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            res["id"],
            res.get("country", "IN"),
            res["category"],
            res["name_en"],
            res["name_hi"],
            res["contact_type"],
            res.get("contact_value", ""),
            res["description_en"],
            res["description_hi"],
            res["when_to_use_en"],
            res["when_to_use_hi"],
            res.get("triggers_json", "{}"),
            res.get("priority", 50),
            res["source_url"],
            res.get("verified_on"),
            res.get("active", 1),
        ))

    # 5. Pattern Rules
    with open(seed_dir / "pattern_rules.yaml", encoding="utf-8") as f:
        rules = yaml.safe_load(f)
    for rule in sorted(rules, key=lambda x: x["id"]):
        cur.execute("""
        INSERT INTO pattern_rules (id, kind, lang, pattern, tag, weight, note)
        VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (rule["id"], rule["kind"], rule.get("lang", "any"), rule["pattern"], rule["tag"], rule.get("weight", 1), rule.get("note", "")))

    # 6. Known Brands
    with open(seed_dir / "known_brands.yaml", encoding="utf-8") as f:
        brands = yaml.safe_load(f)
    for b in sorted(brands, key=lambda x: x["id"]):
        cur.execute("""
        INSERT INTO known_brands (id, name, domains_json, kind)
        VALUES (?, ?, ?, ?);
        """, (b["id"], b["name"], b["domains_json"], b["kind"]))

    # 7. Scenarios
    scenarios_dir = seed_dir / "scenarios"
    scenario_files = sorted(scenarios_dir.glob("*.yaml"))
    for idx, sf in enumerate(scenario_files, start=1):
        with open(sf, encoding="utf-8") as f:
            scen = yaml.safe_load(f)
        spec_json = json.dumps(scen, ensure_ascii=False)
        cur.execute("""
        INSERT INTO scenarios (id, slug, scam_type_slug, channel, min_belt, difficulty_min, difficulty_max, est_minutes, active, title_en, title_hi, blurb_en, blurb_hi, spec_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            idx,
            scen["slug"],
            scen["scam_type"],
            scen["channel"],
            scen.get("min_belt", "white"),
            scen["difficulty_range"][0],
            scen["difficulty_range"][1],
            scen.get("est_minutes", 5),
            1,
            scen["title"]["en"],
            scen["title"]["hi"],
            scen["blurb"]["en"],
            scen["blurb"]["hi"],
            spec_json,
        ))

    # 8. KB Docs & FTS
    kb_dir = seed_dir / "kb"
    kb_files = sorted(kb_dir.glob("*.md"))
    for idx, kf in enumerate(kb_files, start=1):
        text = kf.read_text(encoding="utf-8")
        fm, body = parse_markdown_with_frontmatter(text)
        slug = fm.get("slug", kf.stem)
        lang = fm.get("lang", "en")
        scam_type = fm.get("scam_type", "")
        title = fm.get("title", slug.replace("_", " ").title())
        source_url = fm.get("source_url", "")
        cur.execute("""
        INSERT INTO kb_docs (id, slug, lang, scam_type_slug, title, body, source_url)
        VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (idx, slug, lang, scam_type, title, body, source_url))

    # Rebuild FTS
    cur.execute("INSERT INTO kb_fts(kb_fts) VALUES('rebuild');")

    # Indexes
    cur.execute("CREATE INDEX idx_resources_cat ON resources(category, active, priority);")
    cur.execute("CREATE INDEX idx_rules_kind ON pattern_rules(kind, lang);")

    # Meta
    seed_hash = compute_seeds_hash(seed_dir)
    cur.execute("INSERT INTO meta (key, value) VALUES ('schema_version', '1');")
    cur.execute("INSERT INTO meta (key, value) VALUES ('seed_hash', ?);", (seed_hash,))
    cur.execute("INSERT INTO meta (key, value) VALUES ('built_at', '2026-10-14T00:00:00Z');")

    conn.commit()
    conn.close()
    print(f"Successfully built {db_path} (seed_hash: {seed_hash[:12]})")
    return db_path

if __name__ == "__main__":
    root = get_repo_root()
    build_kb(root)
