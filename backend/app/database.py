import os
import aiosqlite
from typing import Optional, List, Dict, Any
from app.config import get_config

SCHEMA = """
CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    username TEXT,
    item_type TEXT, -- track, album, playlist
    title TEXT,
    artist TEXT,
    cover_url TEXT,
    source_url TEXT,
    platform TEXT, -- auto, antra, deezer, qobuz, youtube, soundcloud, bandcamp
    quality TEXT, -- flac-24, flac-16, mp3-320, mp4-1080
    status TEXT, -- pending, processing, available, failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS download_queue (
    id TEXT PRIMARY KEY,
    request_id TEXT,
    playlist_name TEXT,
    title TEXT,
    artist TEXT,
    album TEXT,
    duration INTEGER DEFAULT 0,
    source_platform TEXT,
    target_quality TEXT,
    source_url TEXT,
    queue_position INTEGER DEFAULT 0,
    status TEXT, -- pending, active, paused, completed, failed
    progress_percent REAL DEFAULT 0.0,
    speed_bytes_sec INTEGER DEFAULT 0,
    eta_seconds INTEGER DEFAULT 0,
    file_path TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(request_id) REFERENCES requests(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS library_items (
    id TEXT PRIMARY KEY,
    title TEXT,
    artist TEXT,
    album TEXT,
    duration INTEGER,
    quality TEXT,
    file_path TEXT UNIQUE,
    playlist_name TEXT,
    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

async def get_db_path() -> str:
    cfg = get_config()
    db_path = cfg["database_path"]
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    return db_path

async def init_db():
    db_path = await get_db_path()
    async with aiosqlite.connect(db_path) as db:
        await db.executescript(SCHEMA)
        await db.commit()
