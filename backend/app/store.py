from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Iterable

from .wellbeing import DEFAULT_SETTINGS


class WellbeingStore:
    def __init__(self, db_path: str):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

    def initialize(self) -> None:
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS wellbeing_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    title TEXT,
                    url TEXT,
                    host TEXT,
                    content TEXT,
                    excerpt TEXT,
                    duration_ms INTEGER NOT NULL DEFAULT 0,
                    risk_score REAL NOT NULL,
                    risk_band TEXT NOT NULL,
                    toxic_ratio REAL NOT NULL DEFAULT 0,
                    total_comments INTEGER NOT NULL DEFAULT 0,
                    top_label TEXT,
                    summary_json TEXT NOT NULL DEFAULT '{}',
                    predictions_json TEXT NOT NULL DEFAULT '[]',
                    metadata_json TEXT NOT NULL DEFAULT '{}'
                );

                CREATE INDEX IF NOT EXISTS idx_wellbeing_events_timestamp
                ON wellbeing_events(timestamp);

                CREATE TABLE IF NOT EXISTS wellbeing_settings (
                    key TEXT PRIMARY KEY,
                    value_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                """
            )

        self.save_settings({})

    def get_settings(self) -> dict:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT value_json FROM wellbeing_settings WHERE key = ?",
                ("wellbeing",),
            ).fetchone()

        if not row:
            return dict(DEFAULT_SETTINGS)

        try:
            return {
                **DEFAULT_SETTINGS,
                **json.loads(row["value_json"]),
            }
        except json.JSONDecodeError:
            return dict(DEFAULT_SETTINGS)

    def save_settings(self, patch: dict, updated_at: str | None = None) -> dict:
        current = self.get_settings()
        merged = {**current, **patch}
        timestamp = updated_at or _iso_now()

        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO wellbeing_settings (key, value_json, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value_json = excluded.value_json,
                    updated_at = excluded.updated_at
                """,
                ("wellbeing", json.dumps(merged), timestamp),
            )

        return merged

    def insert_event(self, event: dict) -> int:
        with self._connect() as connection:
            cursor = connection.execute(
                """
                INSERT INTO wellbeing_events (
                    source, kind, timestamp, title, url, host, content, excerpt,
                    duration_ms, risk_score, risk_band, toxic_ratio, total_comments,
                    top_label, summary_json, predictions_json, metadata_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event.get("source", "unknown"),
                    event.get("kind", "unknown"),
                    event["timestamp"],
                    event.get("title"),
                    event.get("url"),
                    event.get("host"),
                    event.get("content"),
                    event.get("excerpt"),
                    int(event.get("durationMs") or 0),
                    float(event.get("riskScore") or 0.0),
                    event.get("riskBand", "calm"),
                    float(event.get("toxicRatio") or 0.0),
                    int(event.get("totalComments") or 0),
                    event.get("topLabel"),
                    json.dumps(event.get("summary") or {}),
                    json.dumps(event.get("predictions") or []),
                    json.dumps(event.get("metadata") or {}),
                ),
            )
            return int(cursor.lastrowid)

    def list_events(self, limit: int | None = None) -> list[dict]:
        query = "SELECT * FROM wellbeing_events ORDER BY timestamp ASC"
        params: Iterable = ()
        if limit:
            query = "SELECT * FROM wellbeing_events ORDER BY timestamp DESC LIMIT ?"
            params = (limit,)

        with self._connect() as connection:
            rows = connection.execute(query, params).fetchall()

        items = [self._serialize_event(row) for row in rows]
        return list(reversed(items)) if limit else items

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _serialize_event(self, row: sqlite3.Row) -> dict:
        return {
            "id": row["id"],
            "source": row["source"],
            "kind": row["kind"],
            "timestamp": row["timestamp"],
            "title": row["title"],
            "url": row["url"],
            "host": row["host"],
            "content": row["content"],
            "excerpt": row["excerpt"],
            "durationMs": row["duration_ms"],
            "riskScore": row["risk_score"],
            "riskBand": row["risk_band"],
            "toxicRatio": row["toxic_ratio"],
            "totalComments": row["total_comments"],
            "topLabel": row["top_label"],
            "summary": _load_json(row["summary_json"], {}),
            "predictions": _load_json(row["predictions_json"], []),
            "metadata": _load_json(row["metadata_json"], {}),
        }


def _load_json(value: str, fallback):
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return fallback


def _iso_now() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()
