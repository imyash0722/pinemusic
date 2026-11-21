import os
import re
import yt_dlp
from typing import List, Dict, Any, Optional, Callable
from app.resolvers.base import TrackItem, PlaylistOrAlbum

class YtDlpResolver:
    def __init__(self):
        pass

    def search(self, query: str, limit: int = 15) -> List[TrackItem]:
        ydl_opts = {
            "quiet": True,
            "skip_download": True,
            "extract_flat": True,
            "default_search": f"ytsearch{limit}",
        }
        items: List[TrackItem] = []
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"ytsearch{limit}:{query}", download=False)
                entries = info.get("entries", [])
                for idx, e in enumerate(entries, start=1):
                    if not e or not e.get("id"):
                        continue
                    raw_title = str(e.get("title") or "").strip()
                    if not raw_title or raw_title.lower() in ("[private video]", "[deleted video]"):
                        continue
                    artist = e.get("uploader") or e.get("channel", "Unknown Artist")
                    title = raw_title
                    if " - " in raw_title:
                        parts = raw_title.split(" - ", 1)
                        artist = parts[0].strip()
                        title = parts[1].strip()
                    
                    # Remove [Official Music Video], etc.
                    title = re.sub(r'\[.*?\]|\(.*?\)', '', title).strip()

                    items.append(TrackItem(
                        id=f"yt_{e.get('id')}",
                        title=title,
                        artist=artist,
                        album="Singles",
                        duration=int(e.get("duration", 0) or 0),
                        cover_url=e.get("thumbnail") or f"https://i.ytimg.com/vi/{e.get('id')}/hqdefault.jpg",
                        preview_url=None,
                        platform="youtube",
                        quality="mp3-320",
                        source_url=f"https://www.youtube.com/watch?v={e.get('id')}",
                        track_number=idx
                    ))
        except Exception as e:
            print(f"[YtDlp] Search error: {e}")
        return items

    def get_playlist(self, url: str) -> Optional[PlaylistOrAlbum]:
        ydl_opts = {
            "quiet": True,
            "skip_download": True,
            "extract_flat": True,
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                if not info:
                    return None
                entries = info.get("entries", [])
                title = info.get("title", "YouTube Playlist")
                uploader = info.get("uploader", "Various Artists")
                tracks: List[TrackItem] = []
                for idx, e in enumerate(entries, start=1):
                    if not e or not e.get("id"):
                        continue
                    raw_title = str(e.get("title") or "").strip()
                    if not raw_title or raw_title.lower() in ("[private video]", "[deleted video]"):
                        continue
                    artist = e.get("uploader") or uploader
                    t_title = raw_title
                    if " - " in raw_title:
                        parts = raw_title.split(" - ", 1)
                        artist = parts[0].strip()
                        t_title = parts[1].strip()
                    t_title = re.sub(r'\[.*?\]|\(.*?\)', '', t_title).strip()
                    
                    tracks.append(TrackItem(
                        id=f"yt_{e.get('id')}",
                        title=t_title,
                        artist=artist,
                        album=title,
                        duration=int(e.get("duration", 0) or 0),
                        cover_url=e.get("thumbnail") or f"https://i.ytimg.com/vi/{e.get('id')}/hqdefault.jpg",
                        platform="youtube",
                        quality="mp3-320",
                        source_url=f"https://www.youtube.com/watch?v={e.get('id')}",
                        track_number=idx
                    ))
                return PlaylistOrAlbum(
                    id=f"yt_pl_{info.get('id', 'custom')}",
                    title=title,
                    artist=uploader,
                    type="playlist",
                    cover_url=info.get("thumbnail") or (tracks[0].cover_url if tracks else None),
                    track_count=len(tracks),
                    source_url=url,
                    platform="youtube",
                    tracks=tracks
                )
        except Exception as e:
            print(f"[YtDlp] Playlist error: {e}")
        return None

    def download_track(
        self,
        url: str,
        output_template: str,
        format_mode: str = "audio", # audio or video
        quality: str = "flac-16",
        on_progress: Optional[Callable[[float, int, int], None]] = None
    ) -> str:
        def hook(d):
            if d.get("status") == "downloading" and on_progress:
                total = d.get("total_bytes") or d.get("total_bytes_estimate") or 1
                downloaded = d.get("downloaded_bytes", 0)
                pct = (downloaded / total) * 100.0 if total > 0 else 0.0
                speed = int(d.get("speed", 0) or 0)
                eta = int(d.get("eta", 0) or 0)
                on_progress(pct, speed, eta)

        if format_mode == "video" or quality == "mp4-1080":
            ydl_opts = {
                "format": "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
                "outtmpl": output_template + ".%(ext)s",
                "progress_hooks": [hook],
                "quiet": True,
                "no_warnings": True,
                "extractor_args": {
                    "youtube": {
                        "player_client": ["android", "ios", "web"]
                    }
                },
            }
        else: # Audio extraction
            audio_fmt = "flac" if "flac" in quality else "mp3"
            ydl_opts = {
                "format": "bestaudio/best",
                "outtmpl": output_template + ".%(ext)s",
                "progress_hooks": [hook],
                "quiet": True,
                "no_warnings": True,
                "extractor_args": {
                    "youtube": {
                        "player_client": ["android", "ios", "web"]
                    }
                },
                "postprocessors": [{
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": audio_fmt,
                    "preferredquality": "320" if audio_fmt == "mp3" else "0",
                }],
            }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            ext = "mp4" if (format_mode == "video" or quality == "mp4-1080") else ("flac" if "flac" in quality else "mp3")
            final_file = f"{output_template}.{ext}"
            return final_file
