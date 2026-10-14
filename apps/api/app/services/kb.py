"""Read-only access service for knowledge.sqlite."""

import json
import sqlite3
from pathlib import Path
from typing import Any

from app.config import settings


class KnowledgeBaseService:
    def __init__(self, db_path: str | None = None):
        candidate = Path(db_path or settings.KB_PATH)
        if not candidate.exists():
            # Try finding data/knowledge.sqlite relative to repo root
            curr = Path(__file__).resolve().parent
            while curr != curr.parent:
                potential = curr / "data" / "knowledge.sqlite"
                if potential.exists():
                    candidate = potential
                    break
                curr = curr.parent
        self.db_path = str(candidate)

    def _get_conn(self) -> sqlite3.Connection:
        # Open in URI read-only mode
        p = Path(self.db_path).resolve()
        uri = f"file:{p}?mode=ro"
        conn = sqlite3.connect(uri, uri=True)
        conn.row_factory = sqlite3.Row
        return conn

    def get_scenarios(self, lang: str = "en") -> list[dict[str, Any]]:
        conn = self._get_conn()
        cur = conn.cursor()
        cur.execute("""
        SELECT slug, scam_type_slug, channel, min_belt, difficulty_min, difficulty_max,
               est_minutes, active, title_en, title_hi, blurb_en, blurb_hi, spec_json
        FROM scenarios
        WHERE active = 1
        ORDER BY id ASC;
        """)
        rows = cur.fetchall()
        conn.close()

        items = []
        for r in rows:
            spec = json.loads(r["spec_json"])
            title = r["title_hi"] if lang == "hi" else r["title_en"]
            blurb = r["blurb_hi"] if lang == "hi" else r["blurb_en"]
            items.append({
                "slug": r["slug"],
                "custom": False,
                "title": title,
                "blurb": blurb,
                "scamType": r["scam_type_slug"],
                "channel": r["channel"],
                "difficultyRange": [r["difficulty_min"], r["difficulty_max"]],
                "estMinutes": r["est_minutes"],
                "minBelt": r["min_belt"],
                "spec": spec,
            })
        return items

    def get_scenario(self, slug: str) -> dict[str, Any] | None:
        conn = self._get_conn()
        cur = conn.cursor()
        cur.execute("""
        SELECT slug, scam_type_slug, channel, min_belt, difficulty_min, difficulty_max,
               est_minutes, title_en, title_hi, blurb_en, blurb_hi, spec_json
        FROM scenarios
        WHERE slug = ? AND active = 1;
        """, (slug,))
        r = cur.fetchone()
        conn.close()
        if not r:
            return None
        res: dict[str, Any] = json.loads(r["spec_json"])
        return res

    def get_resources(
        self,
        country: str = "IN",
        category: str | None = None,
        lang: str = "en",
    ) -> list[dict[str, Any]]:
        conn = self._get_conn()
        cur = conn.cursor()
        query = "SELECT * FROM resources WHERE country = ? AND active = 1"
        params: list[Any] = [country]
        if category:
            query += " AND category = ?"
            params.append(category)
        query += " ORDER BY priority ASC"
        cur.execute(query, params)
        rows = cur.fetchall()
        conn.close()

        results = []
        for r in rows:
            name = r["name_hi"] if lang == "hi" else r["name_en"]
            desc = r["description_hi"] if lang == "hi" else r["description_en"]
            when = r["when_to_use_hi"] if lang == "hi" else r["when_to_use_en"]
            results.append({
                "id": r["id"],
                "name": name,
                "category": r["category"],
                "contactType": r["contact_type"],
                "contactValue": r["contact_value"] or None,
                "description": desc,
                "whenToUse": when,
                "verifiedOn": r["verified_on"],
                "sourceUrl": r["source_url"],
                "triggersJson": r["triggers_json"],
            })
        return results

    def get_resources_by_ids(self, ids: list[str], lang: str = "en") -> list[dict[str, Any]]:
        if not ids:
            return []
        conn = self._get_conn()
        cur = conn.cursor()
        placeholders = ",".join("?" for _ in ids)
        cur.execute(f"SELECT * FROM resources WHERE id IN ({placeholders}) AND active = 1", ids)
        rows = cur.fetchall()
        conn.close()

        results = []
        for r in rows:
            name = r["name_hi"] if lang == "hi" else r["name_en"]
            desc = r["description_hi"] if lang == "hi" else r["description_en"]
            when = r["when_to_use_hi"] if lang == "hi" else r["when_to_use_en"]
            results.append({
                "id": r["id"],
                "name": name,
                "category": r["category"],
                "contactType": r["contact_type"],
                "contactValue": r["contact_value"] or None,
                "description": desc,
                "whenToUse": when,
                "verifiedOn": r["verified_on"],
                "sourceUrl": r["source_url"],
                "triggersJson": r["triggers_json"],
            })
        return results

    def search_kb(self, query: str, lang: str = "en", k: int = 5) -> list[dict[str, Any]]:
        if not query.strip():
            return []
        conn = self._get_conn()
        cur = conn.cursor()
        # Clean query for FTS5 (escape special chars)
        clean_tokens = [t.replace('"', '""') for t in query.split() if t.isalnum()]
        if not clean_tokens:
            conn.close()
            return []
        fts_query = " OR ".join(f'"{tok}"' for tok in clean_tokens)
        cur.execute("""
        SELECT title, body, scam_type_slug, lang, rank
        FROM kb_fts
        WHERE kb_fts MATCH ?
        ORDER BY rank
        LIMIT ?;
        """, (fts_query, k))
        rows = cur.fetchall()
        conn.close()

        return [{
            "title": r["title"],
            "body": r["body"],
            "scamType": r["scam_type_slug"],
            "lang": r["lang"],
        } for r in rows]

    def get_pattern_rules(self) -> list[dict[str, Any]]:
        conn = self._get_conn()
        cur = conn.cursor()
        cur.execute("SELECT id, kind, lang, pattern, tag, weight, note FROM pattern_rules ORDER BY id ASC")
        rows = cur.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def get_tactics(self) -> list[dict[str, Any]]:
        conn = self._get_conn()
        cur = conn.cursor()
        cur.execute("SELECT id, slug, name_en, name_hi, description_en, description_hi, counter_tip_en, counter_tip_hi FROM tactics ORDER BY id ASC")
        rows = cur.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def get_scam_types(self) -> list[dict[str, Any]]:
        conn = self._get_conn()
        cur = conn.cursor()
        cur.execute("SELECT id, slug, name_en, name_hi, summary_en, summary_hi, typical_channels, severity FROM scam_types ORDER BY id ASC")
        rows = cur.fetchall()
        conn.close()
        return [dict(r) for r in rows]


kb_service = KnowledgeBaseService()
