"""Async SQLite repository implementation for local dev and tests."""

import json
from pathlib import Path
from typing import Any

import aiosqlite

from app.config import settings
from app.repo.base import Repo


class SqliteRepo(Repo):
    def __init__(self, db_path: str | None = None):
        self.db_path = db_path or settings.SQLITE_PATH
        # Ensure parent directory exists
        parent = Path(self.db_path).resolve().parent
        parent.mkdir(parents=True, exist_ok=True)

    async def init_tables(self) -> None:
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                uid TEXT PRIMARY KEY,
                doc TEXT NOT NULL
            );
            """)
            await db.execute("""
            CREATE TABLE IF NOT EXISTS train_sessions (
                uid TEXT,
                sid TEXT,
                started_at TEXT,
                doc TEXT,
                PRIMARY KEY (uid, sid)
            );
            """)
            await db.execute("""
            CREATE TABLE IF NOT EXISTS checks (
                uid TEXT,
                cid TEXT,
                created_at TEXT,
                doc TEXT,
                PRIMARY KEY (uid, cid)
            );
            """)
            await db.execute("""
            CREATE TABLE IF NOT EXISTS recoveries (
                uid TEXT,
                pid TEXT,
                updated_at TEXT,
                doc TEXT,
                PRIMARY KEY (uid, pid)
            );
            """)
            await db.execute("""
            CREATE TABLE IF NOT EXISTS custom_scenarios (
                uid TEXT,
                id TEXT,
                doc TEXT,
                PRIMARY KEY (uid, id)
            );
            """)
            await db.execute("""
            CREATE TABLE IF NOT EXISTS usage (
                k TEXT PRIMARY KEY,
                doc TEXT
            );
            """)
            await db.execute("""
            CREATE TABLE IF NOT EXISTS global_stats (
                k TEXT PRIMARY KEY,
                v INTEGER NOT NULL DEFAULT 0
            );
            """)
            await db.commit()

    async def get_or_create_user(self, uid: str, defaults: dict[str, Any]) -> dict[str, Any]:
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("SELECT doc FROM users WHERE uid = ?", (uid,)) as cur:
                row = await cur.fetchone()
                if row:
                    return json.loads(row[0])  # type: ignore

            # Create new user
            user_doc = {**defaults, "uid": uid}
            await db.execute("INSERT INTO users (uid, doc) VALUES (?, ?)", (uid, json.dumps(user_doc)))
            await db.commit()
            return user_doc

    async def update_user(self, uid: str, patch: dict[str, Any]) -> dict[str, Any]:
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("SELECT doc FROM users WHERE uid = ?", (uid,)) as cur:
                row = await cur.fetchone()
                if not row:
                    doc = {"uid": uid, **patch}
                else:
                    doc = json.loads(row[0])
                    doc.update(patch)
            await db.execute(
                "INSERT INTO users (uid, doc) VALUES (?, ?) ON CONFLICT(uid) DO UPDATE SET doc = excluded.doc",
                (uid, json.dumps(doc)),
            )
            await db.commit()
            return doc

    async def delete_user_data(self, uid: str) -> None:
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM users WHERE uid = ?", (uid,))
            await db.execute("DELETE FROM train_sessions WHERE uid = ?", (uid,))
            await db.execute("DELETE FROM checks WHERE uid = ?", (uid,))
            await db.execute("DELETE FROM recoveries WHERE uid = ?", (uid,))
            await db.execute("DELETE FROM custom_scenarios WHERE uid = ?", (uid,))
            await db.commit()

    async def export_user_data(self, uid: str) -> dict[str, Any]:
        async with aiosqlite.connect(self.db_path) as db:
            export: dict[str, Any] = {"uid": uid}
            async with db.execute("SELECT doc FROM users WHERE uid = ?", (uid,)) as cur:
                row = await cur.fetchone()
                export["profile"] = json.loads(row[0]) if row else None

            async with db.execute("SELECT doc FROM train_sessions WHERE uid = ?", (uid,)) as cur:
                export["trainSessions"] = [json.loads(r[0]) async for r in cur]

            async with db.execute("SELECT doc FROM checks WHERE uid = ?", (uid,)) as cur:
                export["checks"] = [json.loads(r[0]) async for r in cur]

            async with db.execute("SELECT doc FROM recoveries WHERE uid = ?", (uid,)) as cur:
                export["recoveries"] = [json.loads(r[0]) async for r in cur]

            return export

    async def create_train_session(self, uid: str, doc: dict[str, Any]) -> str:
        sid = str(doc["sessionId"])
        started_at = doc.get("startedAt", "")
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT INTO train_sessions (uid, sid, started_at, doc) VALUES (?, ?, ?, ?)",
                (uid, sid, started_at, json.dumps(doc)),
            )
            await db.commit()
            return sid

    async def get_train_session(self, uid: str, sid: str) -> dict[str, Any] | None:
        async with aiosqlite.connect(self.db_path) as db, db.execute(
            "SELECT doc FROM train_sessions WHERE uid = ? AND sid = ?", (uid, sid)
        ) as cur:
            row = await cur.fetchone()
            if not row:
                return None
            res: dict[str, Any] = json.loads(row[0])
            return res

    async def append_train_turn(
        self, uid: str, sid: str, turn: dict[str, Any], state_patch: dict[str, Any]
    ) -> None:
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT doc FROM train_sessions WHERE uid = ? AND sid = ?", (uid, sid)
            ) as cur:
                row = await cur.fetchone()
                if not row:
                    return
                doc = json.loads(row[0])

            # Update turns and state
            messages = doc.get("messages", [])
            messages.extend(turn.get("messages", []))
            doc["messages"] = messages
            if "assessments" in doc and "assessment" in turn:
                doc["assessments"].append(turn["assessment"])
            doc.update(state_patch)

            await db.execute(
                "UPDATE train_sessions SET doc = ? WHERE uid = ? AND sid = ?",
                (json.dumps(doc), uid, sid),
            )
            await db.commit()

    async def finish_train_session(self, uid: str, sid: str, patch: dict[str, Any]) -> None:
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT doc FROM train_sessions WHERE uid = ? AND sid = ?", (uid, sid)
            ) as cur:
                row = await cur.fetchone()
                if not row:
                    return
                doc = json.loads(row[0])

            doc.update(patch)
            await db.execute(
                "UPDATE train_sessions SET doc = ? WHERE uid = ? AND sid = ?",
                (json.dumps(doc), uid, sid),
            )
            await db.commit()

    async def list_train_sessions(
        self, uid: str, limit: int = 20, cursor: str | None = None
    ) -> list[dict[str, Any]]:
        async with aiosqlite.connect(self.db_path) as db, db.execute(
            "SELECT doc FROM train_sessions WHERE uid = ? ORDER BY started_at DESC LIMIT ?",
            (uid, limit),
        ) as cur:
            return [json.loads(r[0]) async for r in cur]

    async def save_check(self, uid: str, doc: dict[str, Any]) -> str:
        cid = str(doc["checkId"])
        created_at = doc.get("createdAt", "")
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT INTO checks (uid, cid, created_at, doc) VALUES (?, ?, ?, ?)",
                (uid, cid, created_at, json.dumps(doc)),
            )
            await db.commit()
            return cid

    async def get_check(self, uid: str, cid: str) -> dict[str, Any] | None:
        async with aiosqlite.connect(self.db_path) as db, db.execute(
            "SELECT doc FROM checks WHERE uid = ? AND cid = ?", (uid, cid)
        ) as cur:
            row = await cur.fetchone()
            if not row:
                return None
            res: dict[str, Any] = json.loads(row[0])
            return res

    async def list_checks(self, uid: str, limit: int = 10) -> list[dict[str, Any]]:
        async with aiosqlite.connect(self.db_path) as db, db.execute(
            "SELECT doc FROM checks WHERE uid = ? ORDER BY created_at DESC LIMIT ?",
            (uid, limit),
        ) as cur:
            return [json.loads(r[0]) async for r in cur]

    async def save_plan(self, uid: str, doc: dict[str, Any]) -> str:
        pid = str(doc["planId"])
        updated_at = doc.get("updatedAt", doc.get("createdAt", ""))
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT INTO recoveries (uid, pid, updated_at, doc) VALUES (?, ?, ?, ?)",
                (uid, pid, updated_at, json.dumps(doc)),
            )
            await db.commit()
            return pid

    async def get_plan(self, uid: str, pid: str) -> dict[str, Any] | None:
        async with aiosqlite.connect(self.db_path) as db, db.execute(
            "SELECT doc FROM recoveries WHERE uid = ? AND pid = ?", (uid, pid)
        ) as cur:
            row = await cur.fetchone()
            if not row:
                return None
            res: dict[str, Any] = json.loads(row[0])
            return res

    async def set_step_done(self, uid: str, pid: str, step_id: str, done: bool) -> None:
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT doc FROM recoveries WHERE uid = ? AND pid = ?", (uid, pid)
            ) as cur:
                row = await cur.fetchone()
                if not row:
                    return
                doc = json.loads(row[0])

            step_status = doc.setdefault("stepStatus", {})
            step_status[step_id] = {"done": done}
            await db.execute(
                "UPDATE recoveries SET doc = ? WHERE uid = ? AND pid = ?",
                (json.dumps(doc), uid, pid),
            )
            await db.commit()

    async def append_plan_chat(self, uid: str, pid: str, msgs: list[dict[str, Any]]) -> None:
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT doc FROM recoveries WHERE uid = ? AND pid = ?", (uid, pid)
            ) as cur:
                row = await cur.fetchone()
                if not row:
                    return
                doc = json.loads(row[0])

            chat = doc.setdefault("chat", [])
            chat.extend(msgs)
            await db.execute(
                "UPDATE recoveries SET doc = ? WHERE uid = ? AND pid = ?",
                (json.dumps(doc), uid, pid),
            )
            await db.commit()

    async def list_plans(self, uid: str, limit: int = 10) -> list[dict[str, Any]]:
        async with aiosqlite.connect(self.db_path) as db, db.execute(
            "SELECT doc FROM recoveries WHERE uid = ? ORDER BY updated_at DESC LIMIT ?",
            (uid, limit),
        ) as cur:
            return [json.loads(r[0]) async for r in cur]

    async def save_custom_scenario(self, uid: str, spec: dict[str, Any]) -> str:
        s_id = str(spec["id"])
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT INTO custom_scenarios (uid, id, doc) VALUES (?, ?, ?)",
                (uid, s_id, json.dumps(spec)),
            )
            await db.commit()
            return s_id

    async def get_custom_scenario(self, uid: str, scenario_id: str) -> dict[str, Any] | None:
        async with aiosqlite.connect(self.db_path) as db, db.execute(
            "SELECT doc FROM custom_scenarios WHERE uid = ? AND id = ?", (uid, scenario_id)
        ) as cur:
            row = await cur.fetchone()
            if not row:
                return None
            res: dict[str, Any] = json.loads(row[0])
            return res

    async def list_custom_scenarios(self, uid: str) -> list[dict[str, Any]]:
        async with aiosqlite.connect(self.db_path) as db, db.execute(
            "SELECT doc FROM custom_scenarios WHERE uid = ?", (uid,)
        ) as cur:
            return [json.loads(r[0]) async for r in cur]

    async def incr_usage(self, uid: str, kind: str, n: int = 1) -> int:
        import datetime
        date_str = datetime.datetime.now(datetime.UTC).strftime("%Y%m%d")
        k = f"{uid}_{date_str}"
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("SELECT doc FROM usage WHERE k = ?", (k,)) as cur:
                row = await cur.fetchone()
                doc = json.loads(row[0]) if row else {"uid": uid, "date": date_str}
            prev_val = int(doc.get(kind, 0))
            current_val = prev_val + n
            doc[kind] = current_val
            await db.execute(
                "INSERT INTO usage (k, doc) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET doc = excluded.doc",
                (k, json.dumps(doc)),
            )
            await db.commit()
            return current_val

    async def incr_global(self, field: str, n: int = 1) -> None:
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT INTO global_stats (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = v + ?",
                (field, n, n),
            )
            await db.commit()

    async def get_global(self) -> dict[str, Any]:
        async with aiosqlite.connect(self.db_path) as db, db.execute("SELECT k, v FROM global_stats") as cur:
            stats = {r[0]: r[1] async for r in cur}
            return {
                "trainSessions": stats.get("trainSessions", 0),
                "checks": stats.get("checks", 0),
                "recoveryPlans": stats.get("recoveryPlans", 0),
                "redFlagsSurfaced": stats.get("redFlagsSurfaced", 0),
            }
