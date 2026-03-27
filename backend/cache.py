import sqlite3
import json
import time
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "cache.db")
CACHE_TTL = 3600  # 1 hour in seconds


def _get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS cache (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            expires_at REAL NOT NULL
        )
    """)
    conn.commit()
    return conn


def get_cached(key: str):
    """Return cached value if it exists and hasn't expired."""
    conn = _get_conn()
    try:
        row = conn.execute(
            "SELECT value, expires_at FROM cache WHERE key = ?", (key,)
        ).fetchone()
        if row and time.time() < row[1]:
            return json.loads(row[0])
        return None
    finally:
        conn.close()


def set_cache(key: str, value, ttl: int = CACHE_TTL):
    """Store value in cache with expiry."""
    conn = _get_conn()
    try:
        conn.execute(
            "INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)",
            (key, json.dumps(value), time.time() + ttl),
        )
        conn.commit()
    finally:
        conn.close()


def clear_cache(key: str):
    """Force-clear a cache entry so next request fetches fresh data."""
    conn = _get_conn()
    try:
        conn.execute("DELETE FROM cache WHERE key = ?", (key,))
        conn.commit()
    finally:
        conn.close()
