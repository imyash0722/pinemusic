import os
import time
import asyncio
import uuid
import aiosqlite
from typing import List, Dict, Any, Optional, Set
from fastapi import WebSocket
from app.config import get_config
from app.database import get_db_path
from app.library import organize_file, write_m3u8, trigger_navidrome_scan, delete_track_from_device
from app.resolvers.ytdlp_resolver import YtDlpResolver
from app.resolvers.antra_resolver import AntraResolver

class QueueManager:
    def __init__(self):
        self.ytdlp = YtDlpResolver()
        self.antra = AntraResolver()
        self.active_websockets: Set[WebSocket] = set()
        self.running = False
        self.worker_task: Optional[asyncio.Task] = None
        self.current_job_cancel = False

    async def connect_ws(self, ws: WebSocket):
        await ws.accept()
        self.active_websockets.add(ws)
        # Send current queue state immediately upon connect
        queue_items = await self.get_queue()
        await ws.send_json({"type": "queue_state", "queue": queue_items})

    def disconnect_ws(self, ws: WebSocket):
        self.active_websockets.discard(ws)

    async def broadcast(self, message: Dict[str, Any]):
        dead = set()
        for ws in self.active_websockets:
            try:
                await ws.send_json(message)
            except Exception:
                dead.add(ws)
        self.active_websockets.difference_update(dead)

    async def get_queue(self) -> List[Dict[str, Any]]:
        db_path = await get_db_path()
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM download_queue ORDER BY queue_position ASC, created_at ASC")
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

    async def add_to_queue(self, tracks: List[Dict[str, Any]], request_id: Optional[str] = None, playlist_name: Optional[str] = None) -> List[str]:
        db_path = await get_db_path()
        added_ids = []
        async with aiosqlite.connect(db_path) as db:
            cursor = await db.execute("SELECT COALESCE(MAX(queue_position), 0) FROM download_queue")
            max_pos = (await cursor.fetchone())[0]

            for idx, t in enumerate(tracks, start=1):
                item_id = f"q_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"
                pos = max_pos + idx
                await db.execute("""
                    INSERT INTO download_queue 
                    (id, request_id, playlist_name, title, artist, album, duration, source_platform, target_quality, source_url, queue_position, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
                """, (
                    item_id,
                    request_id,
                    playlist_name or t.get("album", "Singles"),
                    t.get("title", "Unknown"),
                    t.get("artist", "Unknown Artist"),
                    t.get("album", "Singles"),
                    t.get("duration", 0),
                    t.get("platform", "auto"),
                    t.get("quality", "flac-16"),
                    t.get("source_url", ""),
                    pos
                ))
                added_ids.append(item_id)
            await db.commit()

        await self.broadcast({"type": "queue_updated", "queue": await self.get_queue()})
        return added_ids

    async def reorder_queue(self, item_id: str, direction: str) -> bool:
        db_path = await get_db_path()
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            # Get current item
            cur = await db.execute("SELECT id, queue_position FROM download_queue WHERE id = ?", (item_id,))
            current = await cur.fetchone()
            if not current:
                return False
            curr_pos = current["queue_position"]

            # Find target item to swap with
            if direction == "up":
                swap_cur = await db.execute("SELECT id, queue_position FROM download_queue WHERE queue_position < ? ORDER BY queue_position DESC LIMIT 1", (curr_pos,))
            else:
                swap_cur = await db.execute("SELECT id, queue_position FROM download_queue WHERE queue_position > ? ORDER BY queue_position ASC LIMIT 1", (curr_pos,))
            
            swap_item = await swap_cur.fetchone()
            if not swap_item:
                return False

            # Swap positions
            await db.execute("UPDATE download_queue SET queue_position = ? WHERE id = ?", (swap_item["queue_position"], item_id))
            await db.execute("UPDATE download_queue SET queue_position = ? WHERE id = ?", (curr_pos, swap_item["id"]))
            await db.commit()

        await self.broadcast({"type": "queue_updated", "queue": await self.get_queue()})
        return True

    async def cancel_item(self, item_id: str) -> bool:
        db_path = await get_db_path()
        async with aiosqlite.connect(db_path) as db:
            await db.execute("DELETE FROM download_queue WHERE id = ?", (item_id,))
            await db.commit()
        await self.broadcast({"type": "queue_updated", "queue": await self.get_queue()})
        return True

    async def retry_item(self, item_id: str, new_platform: Optional[str] = None, new_quality: Optional[str] = None) -> bool:
        db_path = await get_db_path()
        async with aiosqlite.connect(db_path) as db:
            updates = ["status = 'pending'", "progress_percent = 0.0", "error_message = NULL"]
            params = []
            if new_platform:
                updates.append("source_platform = ?")
                params.append(new_platform)
            if new_quality:
                updates.append("target_quality = ?")
                params.append(new_quality)
            params.append(item_id)

            sql = f"UPDATE download_queue SET {', '.join(updates)} WHERE id = ?"
            await db.execute(sql, params)
            await db.commit()
        await self.broadcast({"type": "queue_updated", "queue": await self.get_queue()})
        return True

    async def delete_from_library(self, file_path: str) -> bool:
        success = delete_track_from_device(file_path)
        if success:
            db_path = await get_db_path()
            async with aiosqlite.connect(db_path) as db:
                await db.execute("DELETE FROM library_items WHERE file_path = ?", (file_path,))
                await db.execute("UPDATE download_queue SET status = 'deleted' WHERE file_path = ?", (file_path,))
                await db.commit()
            await self.broadcast({"type": "library_updated"})
        return success

    async def start_worker(self):
        if not self.running:
            self.running = True
            self.worker_task = asyncio.create_task(self._worker_loop())

    async def stop_worker(self):
        self.running = False
        if self.worker_task:
            self.worker_task.cancel()

    async def _worker_loop(self):
        cfg = get_config()
        download_tmp = os.path.expanduser("~/.local/share/pinemusic/tmp")
        os.makedirs(download_tmp, exist_ok=True)

        while self.running:
            db_path = await get_db_path()
            item = None
            async with aiosqlite.connect(db_path) as db:
                db.row_factory = aiosqlite.Row
                cur = await db.execute("SELECT * FROM download_queue WHERE status = 'pending' ORDER BY queue_position ASC LIMIT 1")
                row = await cur.fetchone()
                if row:
                    item = dict(row)
                    await db.execute("UPDATE download_queue SET status = 'active', progress_percent = 5.0 WHERE id = ?", (item["id"],))
                    await db.commit()

            if not item:
                await asyncio.sleep(2)
                continue

            item_id = item["id"]
            await self.broadcast({"type": "item_started", "item_id": item_id, "title": item["title"]})

            # Download process
            try:
                platform = item["source_platform"]
                quality = item["target_quality"]
                url = item["source_url"]
                tmp_out = os.path.join(download_tmp, f"dl_{item_id}")

                # Progress callback
                loop = asyncio.get_running_loop()
                last_emit = 0
                def progress_cb(pct, speed, eta):
                    nonlocal last_emit
                    now = time.time()
                    if now - last_emit > 0.4:
                        last_emit = now
                        try:
                            asyncio.run_coroutine_threadsafe(
                                self._update_item_progress(item_id, pct, speed, eta),
                                loop
                            )
                        except Exception:
                            pass

                # Route download based on platform
                downloaded_file = None
                if platform == "antra":
                    try:
                        # Attempt Antra job
                        job = self.antra.create_job(url, quality, 0, 1)
                        job_id = job.get("job_id")
                        extracted = self.antra.download_and_extract(job_id, tmp_out)
                        if extracted:
                            downloaded_file = extracted[0]
                    except Exception as antra_err:
                        print(f"[Queue] Antra failed, falling back to YT-DLP: {antra_err}")

                if not downloaded_file:
                    # YT-DLP Universal Engine
                    query = f"{item['artist']} - {item['title']}"
                    target_url = url if ("youtube.com" in url or "youtu.be" in url) else f"ytsearch1:{query}"
                    try:
                        downloaded_file = await asyncio.to_thread(
                            self.ytdlp.download_track,
                            target_url,
                            tmp_out,
                            "video" if quality == "mp4-1080" else "audio",
                            quality,
                            progress_cb
                        )
                    except Exception as dl_err:
                        if target_url != f"ytsearch1:{query}":
                            print(f"[Queue] Direct URL failed ({dl_err}), falling back to search: ytsearch1:{query}")
                            downloaded_file = await asyncio.to_thread(
                                self.ytdlp.download_track,
                                f"ytsearch1:{query}",
                                tmp_out,
                                "video" if quality == "mp4-1080" else "audio",
                                quality,
                                progress_cb
                            )
                        else:
                            raise

                if downloaded_file and os.path.exists(downloaded_file):
                    # Tagging & Ingest
                    meta = {
                        "title": item["title"],
                        "artist": item["artist"],
                        "album": item["album"],
                        "track_number": item["queue_position"],
                    }
                    final_path = organize_file(downloaded_file, meta, playlist_name=item["playlist_name"])

                    # Update M3U8 playlist if associated with a playlist
                    if item.get("playlist_name"):
                        try:
                            write_m3u8(item["playlist_name"], [final_path])
                        except Exception as m3u_err:
                            print(f"[Queue] Warning writing playlist m3u8: {m3u_err}")

                    # Update SQLite database
                    async with aiosqlite.connect(db_path) as db:
                        await db.execute("""
                            UPDATE download_queue 
                            SET status = 'completed', progress_percent = 100.0, file_path = ?, updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        """, (final_path, item_id))
                        if item["request_id"]:
                            await db.execute("UPDATE requests SET status = 'available' WHERE id = ?", (item["request_id"],))
                        await db.execute("""
                            INSERT OR REPLACE INTO library_items (id, title, artist, album, duration, quality, file_path, playlist_name)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """, (item_id, item["title"], item["artist"], item["album"], item["duration"], quality, final_path, item["playlist_name"]))
                        await db.commit()

                    # Trigger Navidrome scanner immediately
                    trigger_navidrome_scan()
                    await self.broadcast({"type": "item_completed", "item_id": item_id, "file_path": final_path})
                else:
                    raise RuntimeError("No audio bitstream could be resolved from provider")

            except Exception as e:
                err_str = str(e)
                print(f"[Queue] Item {item_id} failed: {err_str}")
                async with aiosqlite.connect(db_path) as db:
                    await db.execute("UPDATE download_queue SET status = 'failed', error_message = ? WHERE id = ?", (err_str, item_id))
                    await db.commit()
                await self.broadcast({"type": "item_failed", "item_id": item_id, "error": err_str})

            await asyncio.sleep(1)

    async def _update_item_progress(self, item_id: str, pct: float, speed: int, eta: int):
        db_path = await get_db_path()
        async with aiosqlite.connect(db_path) as db:
            await db.execute("UPDATE download_queue SET progress_percent = ?, speed_bytes_sec = ?, eta_seconds = ? WHERE id = ?", (pct, speed, eta, item_id))
            await db.commit()
        await self.broadcast({
            "type": "item_progress",
            "item_id": item_id,
            "progress_percent": round(pct, 1),
            "speed_bytes_sec": speed,
            "eta_seconds": eta
        })

queue_manager = QueueManager()
