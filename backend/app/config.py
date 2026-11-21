import os
import json
from pathlib import Path
from typing import Dict, Any

DEFAULT_CONFIG: Dict[str, Any] = {
    "host": "0.0.0.0",
    "port": 8090,
    "navidrome_url": os.environ.get("NAVIDROME_URL", "http://127.0.0.1:4533"),
    "navidrome_user": os.environ.get("NAVIDROME_USER", "pineapple"),
    "navidrome_pass": os.environ.get("NAVIDROME_PASS", "pine@2507"),
    "music_dir": os.environ.get("PINEMUSIC_DIR", "/srv/media/music"),
    "playlist_dir": os.environ.get("PINEMUSIC_PLAYLIST_DIR", "/srv/media/music/Playlists"),
    "database_path": os.environ.get("PINEMUSIC_DB", os.path.expanduser("~/.local/share/pinemusic/pinemusic.db")),
    "antra_url": "https://antra.hoshi.cfd",
    "antra_user": "pineapple",
    "antra_pass": "pine@2507",
    "proton_proxy": os.environ.get("PROTON_PROXY", "http://127.0.0.1:1088"),
    "default_quality": "flac-16",
    "default_platform": "auto",
    "max_concurrent_downloads": 3,
}

CONFIG_FILE = os.path.expanduser("~/.config/pinemusic/config.json")

def get_config() -> Dict[str, Any]:
    cfg = DEFAULT_CONFIG.copy()
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                cfg.update(loaded)
        except Exception as e:
            print(f"[PineMusic] Warning reading config file: {e}")
    # Auto fallback if /srv/media/music is not writable or doesn't exist
    if not os.path.exists(cfg["music_dir"]) and not os.access(os.path.dirname(cfg["music_dir"]), os.W_OK):
        fallback_dir = os.path.expanduser("~/Music")
        os.makedirs(fallback_dir, exist_ok=True)
        cfg["music_dir"] = fallback_dir
        cfg["playlist_dir"] = os.path.join(fallback_dir, "Playlists")
    return cfg

def save_config(new_cfg: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(new_cfg, f, indent=2)
