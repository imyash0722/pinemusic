import os
import re
import shutil
import requests
from pathlib import Path
from typing import Dict, Any, List, Optional
import mutagen
from mutagen.flac import FLAC, Picture
from mutagen.easyid3 import EasyID3
from mutagen.id3 import ID3, APIC, USLT
from mutagen.mp4 import MP4, MP4Cover
from app.config import get_config

def sanitize_filename(name: str) -> str:
    # Remove filesystem illegal characters
    cleaned = re.sub(r'[\\/*?:"<>|]', "", name).strip()
    return cleaned or "Unknown"

def embed_metadata(file_path: str, meta: Dict[str, Any], cover_bytes: Optional[bytes] = None) -> None:
    ext = os.path.splitext(file_path)[1].lower()
    title = meta.get("title", "Unknown Title")
    artist = meta.get("artist", "Unknown Artist")
    album = meta.get("album", "Unknown Album")
    year = str(meta.get("year", ""))
    genre = meta.get("genre", "Electronic")
    track_num = meta.get("track_number", 1)
    disc_num = meta.get("disc_number", 1)
    lyrics = meta.get("lyrics", "")

    try:
        if ext == ".flac":
            audio = FLAC(file_path)
            audio["title"] = title
            audio["artist"] = artist
            audio["album"] = album
            audio["albumartist"] = artist
            if year:
                audio["date"] = year
            audio["genre"] = genre
            audio["tracknumber"] = str(track_num)
            audio["discnumber"] = str(disc_num)
            if lyrics:
                audio["lyrics"] = lyrics
            if cover_bytes:
                pic = Picture()
                pic.type = 3 # front cover
                pic.mime = "image/jpeg"
                pic.desc = "Cover"
                pic.data = cover_bytes
                audio.clear_pictures()
                audio.add_picture(pic)
            audio.save()

        elif ext == ".mp3":
            try:
                audio = EasyID3(file_path)
            except Exception:
                audio = mutagen.File(file_path, easy=True)
                audio.add_tags()
            audio["title"] = title
            audio["artist"] = artist
            audio["album"] = album
            audio["albumartist"] = artist
            if year:
                audio["date"] = year
            audio["genre"] = genre
            audio["tracknumber"] = str(track_num)
            audio["discnumber"] = str(disc_num)
            audio.save()

            if cover_bytes or lyrics:
                id3 = ID3(file_path)
                if cover_bytes:
                    id3.delall("APIC")
                    id3.add(APIC(
                        encoding=3,
                        mime="image/jpeg",
                        type=3,
                        desc="Cover",
                        data=cover_bytes
                    ))
                if lyrics:
                    id3.delall("USLT")
                    id3.add(USLT(encoding=3, lang="eng", desc="Lyrics", text=lyrics))
                id3.save(v2_version=3)

        elif ext == ".mp4" or ext == ".m4a":
            audio = MP4(file_path)
            audio["\xa9nam"] = title
            audio["\xa9ART"] = artist
            audio["\xa9alb"] = album
            audio["aART"] = artist
            if year:
                audio["\xa9day"] = year
            audio["\xa9gen"] = genre
            audio["trkn"] = [(int(track_num), 0)]
            audio["disk"] = [(int(disc_num), 0)]
            if lyrics:
                audio["\xa9lyr"] = lyrics
            if cover_bytes:
                audio["covr"] = [MP4Cover(cover_bytes, imageformat=MP4Cover.FORMAT_JPEG)]
            audio.save()
    except Exception as e:
        print(f"[Library] Warning tagging {file_path}: {e}")

def organize_file(source_file: str, meta: Dict[str, Any], playlist_name: Optional[str] = None) -> str:
    cfg = get_config()
    music_dir = cfg["music_dir"]
    artist_clean = sanitize_filename(meta.get("artist", "Unknown Artist"))
    album_clean = sanitize_filename(meta.get("album", "Singles"))
    title_clean = sanitize_filename(meta.get("title", "Track"))
    track_num = meta.get("track_number", 1)
    ext = os.path.splitext(source_file)[1].lower()

    if playlist_name:
        pl_clean = sanitize_filename(playlist_name)
        target_dir = os.path.join(music_dir, "Playlists", pl_clean)
        target_name = f"{track_num:02d} - {artist_clean} - {title_clean}{ext}"
    else:
        target_dir = os.path.join(music_dir, artist_clean, album_clean)
        target_name = f"{track_num:02d} - {title_clean}{ext}"

    os.makedirs(target_dir, exist_ok=True)
    target_path = os.path.join(target_dir, target_name)

    # Fetch cover art if URL provided
    cover_bytes = None
    cover_url = meta.get("cover_url")
    if cover_url:
        try:
            r = requests.get(cover_url, timeout=10)
            if r.status_code == 200:
                cover_bytes = r.content
                # Also save folder.jpg for Navidrome
                folder_jpg = os.path.join(target_dir, "cover.jpg")
                if not os.path.exists(folder_jpg):
                    with open(folder_jpg, "wb") as f:
                        f.write(cover_bytes)
        except Exception:
            pass

    embed_metadata(source_file, meta, cover_bytes)
    shutil.move(source_file, target_path)

    # Set 0664 permissions so Navidrome / media group can read
    try:
        os.chmod(target_path, 0o664)
    except Exception:
        pass

    # Generate sidecar .lrc if synced lyrics available
    synced_lyrics = meta.get("synced_lyrics")
    if synced_lyrics:
        lrc_path = os.path.splitext(target_path)[0] + ".lrc"
        try:
            with open(lrc_path, "w", encoding="utf-8") as f:
                f.write(synced_lyrics)
            os.chmod(lrc_path, 0o664)
        except Exception:
            pass

    return target_path

def write_m3u8(playlist_name: str, file_paths: List[str]) -> str:
    cfg = get_config()
    pl_dir = cfg["playlist_dir"]
    os.makedirs(pl_dir, exist_ok=True)
    m3u8_file = os.path.join(pl_dir, f"{sanitize_filename(playlist_name)}.m3u8")

    lines = ["#EXTM3U", f"#EXTENC: UTF-8", f"#PLAYLIST: {playlist_name}"]
    for p in file_paths:
        if os.path.exists(p):
            # Write relative path from playlist_dir or absolute path
            try:
                rel = os.path.relpath(p, pl_dir)
                lines.append(f"#EXTINF:-1,{os.path.basename(p)}")
                lines.append(rel)
            except Exception:
                lines.append(f"#EXTINF:-1,{os.path.basename(p)}")
                lines.append(p)

    with open(m3u8_file, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    try:
        os.chmod(m3u8_file, 0o664)
    except Exception:
        pass
    return m3u8_file

def trigger_navidrome_scan() -> bool:
    cfg = get_config()
    nav_url = cfg["navidrome_url"].rstrip("/")
    scan_url = f"{nav_url}/rest/startScan.view"
    params = {
        "u": cfg["navidrome_user"],
        "p": cfg["navidrome_pass"],
        "v": "1.16.1",
        "c": "pinemusic",
        "f": "json"
    }
    try:
        res = requests.get(scan_url, params=params, timeout=10)
        if res.status_code == 200:
            print("[Library] Navidrome scan successfully triggered")
            return True
    except Exception as e:
        print(f"[Library] Warning: Failed to trigger Navidrome scan: {e}")
    return False

def delete_track_from_device(file_path: str) -> bool:
    if not os.path.exists(file_path):
        return False
    try:
        os.remove(file_path)
        # Check for sidecar .lrc
        lrc_path = os.path.splitext(file_path)[0] + ".lrc"
        if os.path.exists(lrc_path):
            os.remove(lrc_path)

        # Cleanup empty parent directory
        parent = os.path.dirname(file_path)
        if os.path.exists(parent) and not os.listdir(parent):
            os.rmdir(parent)

        # Trigger Navidrome to immediately purge the deleted track
        trigger_navidrome_scan()
        return True
    except Exception as e:
        print(f"[Library] Error deleting file {file_path}: {e}")
        return False
