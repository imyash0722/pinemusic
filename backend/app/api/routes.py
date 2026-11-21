import os
import shutil
import aiosqlite
import requests
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.config import get_config
from app.database import get_db_path
from app.auth import create_jwt, verify_jwt, verify_navidrome_auth
from app.resolvers.aggregator import MusicAggregator
from app.resolvers.base import TrackItem, PlaylistOrAlbum, SearchResponse
from app.queue_manager import queue_manager
from app.library import trigger_navidrome_scan, delete_track_from_device

router = APIRouter(prefix="/api/v1")
aggregator = MusicAggregator()

# Dependency for JWT Auth
async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    cfg = get_config()
    # If auth header missing, allow read-only guest or server user on localhost/LAN
    if not authorization:
        # Default local session user
        return {"username": cfg.get("navidrome_user", "pineapple"), "role": "admin"}
    
    parts = authorization.split(" ")
    token = parts[1] if len(parts) == 2 else parts[0]
    payload = verify_jwt(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload

# Schemas
class LoginRequest(BaseModel):
    username: str
    password: str

class ResolveRequest(BaseModel):
    url: str

class QueueAddRequest(BaseModel):
    tracks: List[Dict[str, Any]]
    playlist_name: Optional[str] = None
    request_id: Optional[str] = None

class QueueReorderRequest(BaseModel):
    item_id: str
    direction: str # "up" or "down"

class QueueRetryRequest(BaseModel):
    platform: Optional[str] = None
    quality: Optional[str] = None

class CreateRequestItem(BaseModel):
    title: str
    artist: str
    item_type: str = "track" # track, album, playlist
    cover_url: Optional[str] = None
    source_url: Optional[str] = None
    platform: str = "auto"
    quality: str = "flac-16"
    tracks: Optional[List[Dict[str, Any]]] = None

class DeleteFileRequest(BaseModel):
    file_path: str

# --- Auth Routes ---
@router.post("/auth/login")
async def login(req: LoginRequest):
    # Verify against Navidrome Subsonic API
    user_info = verify_navidrome_auth(req.username, req.password)
    cfg = get_config()
    if not user_info:
        # Check if matching server config credentials directly
        if req.username == cfg.get("navidrome_user") and req.password == cfg.get("navidrome_pass"):
            user_info = {"username": req.username, "role": "admin", "navidrome_authenticated": True}
        else:
            raise HTTPException(status_code=401, detail="Invalid Navidrome username or password")
            
    token = create_jwt(user_info)
    return {
        "status": "success",
        "token": token,
        "user": user_info
    }

@router.get("/auth/me")
async def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    return {"status": "ok", "user": user}

# --- Search & Resolve Routes ---
@router.get("/search")
async def search_music(q: str = Query(..., min_length=1), platform: str = "auto", limit: int = 25):
    res = aggregator.search(query=q, platform=platform, limit=limit)
    return res.dict()

@router.post("/resolve")
async def resolve_url(req: ResolveRequest):
    resolved = aggregator.resolve_url(req.url)
    if not resolved:
        raise HTTPException(status_code=404, detail="Could not resolve playlist or track from the provided URL")
    return resolved.dict()

# --- Request Tracking (Ombi-Inspired) ---
@router.get("/requests")
async def list_requests():
    db_path = await get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT * FROM requests ORDER BY created_at DESC LIMIT 100")
        rows = await cur.fetchall()
        return [dict(r) for r in rows]

@router.post("/requests")
async def create_request(req: CreateRequestItem, user: Dict[str, Any] = Depends(get_current_user)):
    db_path = await get_db_path()
    import uuid, time
    req_id = f"req_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    async with aiosqlite.connect(db_path) as db:
        await db.execute("""
            INSERT INTO requests (id, user_id, username, item_type, title, artist, cover_url, source_url, platform, quality, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        """, (
            req_id,
            user.get("username", "guest"),
            user.get("username", "guest"),
            req.item_type,
            req.title,
            req.artist,
            req.cover_url,
            req.source_url,
            req.platform,
            req.quality
        ))
        await db.commit()

    # If tracks provided, immediately queue them up
    if req.tracks:
        await queue_manager.add_to_queue(
            tracks=req.tracks,
            request_id=req_id,
            playlist_name=req.title if req.item_type in ("playlist", "album") else None
        )

    return {"status": "success", "request_id": req_id}

# --- Download Queue Routes ---
@router.get("/queue")
async def get_queue():
    queue = await queue_manager.get_queue()
    return {"queue": queue, "total": len(queue)}

@router.post("/queue/add")
async def add_to_queue(req: QueueAddRequest):
    if not req.tracks:
        raise HTTPException(status_code=400, detail="No tracks provided")
    ids = await queue_manager.add_to_queue(
        tracks=req.tracks,
        request_id=req.request_id,
        playlist_name=req.playlist_name
    )
    return {"status": "success", "added_count": len(ids), "queue_ids": ids}

@router.post("/queue/reorder")
async def reorder_queue(req: QueueReorderRequest):
    if req.direction not in ("up", "down"):
        raise HTTPException(status_code=400, detail="Direction must be 'up' or 'down'")
    ok = await queue_manager.reorder_queue(req.item_id, req.direction)
    return {"status": "success" if ok else "not_found"}

@router.delete("/queue/{item_id}")
async def cancel_queue_item(item_id: str):
    await queue_manager.cancel_item(item_id)
    return {"status": "cancelled", "item_id": item_id}

@router.post("/queue/{item_id}/retry")
async def retry_queue_item(item_id: str, req: QueueRetryRequest):
    ok = await queue_manager.retry_item(item_id, new_platform=req.platform, new_quality=req.quality)
    return {"status": "retrying" if ok else "failed"}

# --- Library & Device Management ---
@router.get("/library/items")
async def list_library_items(limit: int = 150):
    db_path = await get_db_path()
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT * FROM library_items ORDER BY downloaded_at DESC LIMIT ?", (limit,))
        rows = await cur.fetchall()
        return [dict(r) for r in rows]

@router.delete("/library/delete")
async def delete_library_track(req: DeleteFileRequest):
    success = await queue_manager.delete_from_library(req.file_path)
    if not success:
        raise HTTPException(status_code=400, detail="Could not delete track from device")
    return {"status": "deleted", "file_path": req.file_path}

# --- System & Scanner Routes ---
@router.post("/system/rescan")
async def rescan_navidrome():
    success = trigger_navidrome_scan()
    return {"status": "scan_triggered" if success else "failed"}

@router.get("/system/status")
async def system_status():
    cfg = get_config()
    music_dir = cfg["music_dir"]
    total, used, free = 0, 0, 0
    if os.path.exists(music_dir):
        usage = shutil.disk_usage(music_dir)
        total = usage.total
        used = usage.used
        free = usage.free

    # Ping Navidrome
    nav_ok = False
    try:
        r = requests.get(f"{cfg['navidrome_url'].rstrip('/')}/rest/ping.view?u={cfg['navidrome_user']}&p={cfg['navidrome_pass']}&v=1.16.1&c=pinemusic&f=json", timeout=4)
        nav_ok = (r.status_code == 200 and r.json().get("subsonic-response", {}).get("status") == "ok")
    except Exception:
        nav_ok = False

    queue = await queue_manager.get_queue()
    active_count = sum(1 for item in queue if item.get("status") == "active")
    pending_count = sum(1 for item in queue if item.get("status") == "pending")

    return {
        "status": "online",
        "storage": {
            "path": music_dir,
            "total_bytes": total,
            "used_bytes": used,
            "free_bytes": free,
            "free_gb": round(free / (1024**3), 2)
        },
        "navidrome": {
            "url": cfg["navidrome_url"],
            "online": nav_ok
        },
        "queue": {
            "active": active_count,
            "pending": pending_count,
            "total": len(queue)
        }
    }

# --- WebSocket Progress Route ---
@router.websocket("/queue/ws")
async def queue_websocket(websocket: WebSocket):
    await queue_manager.connect_ws(websocket)
    try:
        while True:
            # Keepalive receiver
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        queue_manager.disconnect_ws(websocket)
    except Exception:
        queue_manager.disconnect_ws(websocket)
