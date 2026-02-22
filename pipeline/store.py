"""SQLite への保存処理"""

import sqlite3
import os
import json
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "smiles.db")


def init_db():
    """DBとテーブルを初期化する（冪等）"""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS photos (
            id                 INTEGER PRIMARY KEY AUTOINCREMENT,
            flickr_id          TEXT UNIQUE NOT NULL,
            photo_page_url     TEXT,
            url_medium         TEXT,
            lat                REAL,
            lon                REAL,
            geo_accuracy       INTEGER,
            license_id         INTEGER,
            emotion_happy_prob REAL,
            taken_date         TEXT,
            collected_at       TEXT
        )
    """)
    conn.commit()
    conn.close()


def save_photo(photo: dict) -> bool:
    """
    写真データをDBに保存する。
    flickr_id が重複する場合はスキップして False を返す。
    """
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            """
            INSERT INTO photos
                (flickr_id, photo_page_url, url_medium, lat, lon,
                 geo_accuracy, license_id, emotion_happy_prob, taken_date, collected_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                photo["flickr_id"],
                photo.get("photo_page_url"),
                photo.get("url_medium"),
                photo.get("lat"),
                photo.get("lon"),
                photo.get("geo_accuracy"),
                photo.get("license_id"),
                photo.get("emotion_happy_prob"),
                photo.get("taken_date"),
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False  # 重複スキップ
    finally:
        conn.close()


def count_photos() -> int:
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute("SELECT COUNT(*) FROM photos").fetchone()
    conn.close()
    return row[0]


def export_json(output_path: str) -> int:
    """DBから全件取得してJSONファイルに書き出す。件数を返す。"""
    import struct

    def _to_float(v):
        """bytes型の場合はlittle-endian float32として変換する"""
        if isinstance(v, bytes):
            return round(struct.unpack('<f', v)[0], 4)
        return v

    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute("""
        SELECT flickr_id, url_medium, photo_page_url,
               lat, lon, emotion_happy_prob, taken_date
        FROM photos
        ORDER BY collected_at DESC
    """).fetchall()
    conn.close()

    photos = [
        {
            "flickr_id": r[0],
            "url_medium": r[1],
            "photo_page_url": r[2],
            "lat": r[3],
            "lon": r[4],
            "emotion_happy_prob": _to_float(r[5]),
            "taken_date": r[6],
        }
        for r in rows
    ]

    import tempfile
    output_dir = os.path.dirname(output_path)
    os.makedirs(output_dir, exist_ok=True)
    # 一時ファイルに書き出してからアトミックに置き換える（部分読み取り防止）
    with tempfile.NamedTemporaryFile("w", dir=output_dir, delete=False, suffix=".tmp") as tmp:
        json.dump(photos, tmp)
        tmp_path = tmp.name
    os.replace(tmp_path, output_path)
    return len(photos)
