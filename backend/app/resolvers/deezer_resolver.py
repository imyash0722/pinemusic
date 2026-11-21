import requests
from typing import List, Optional, Dict, Any
from app.resolvers.base import TrackItem, PlaylistOrAlbum

class DeezerResolver:
    BASE_URL = "https://api.deezer.com"

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0"
        })

    def search(self, query: str, limit: int = 25) -> List[TrackItem]:
        url = f"{self.BASE_URL}/search"
        params = {"q": query, "limit": limit}
        items: List[TrackItem] = []
        try:
            r = self.session.get(url, params=params, timeout=10)
            if r.status_code == 200:
                data = r.json().get("data", [])
                for t in data:
                    album_obj = t.get("album", {})
                    artist_obj = t.get("artist", {})
                    items.append(TrackItem(
                        id=f"deezer_{t.get('id')}",
                        title=t.get("title_short") or t.get("title", "Unknown"),
                        artist=artist_obj.get("name", "Unknown Artist"),
                        album=album_obj.get("title", "Singles"),
                        duration=int(t.get("duration", 0)),
                        cover_url=album_obj.get("cover_xl") or album_obj.get("cover_big"),
                        preview_url=t.get("preview"),
                        isrc=t.get("isrc"),
                        platform="deezer",
                        quality="flac-16",
                        source_url=t.get("link", f"https://www.deezer.com/track/{t.get('id')}"),
                        track_number=t.get("track_position", 1) or 1
                    ))
        except Exception as e:
            print(f"[Deezer] Search error: {e}")
        return items

    def get_album(self, album_id: str) -> Optional[PlaylistOrAlbum]:
        url = f"{self.BASE_URL}/album/{album_id}"
        try:
            r = self.session.get(url, timeout=10)
            if r.status_code == 200:
                data = r.json()
                tracks = []
                for idx, t in enumerate(data.get("tracks", {}).get("data", []), start=1):
                    tracks.append(TrackItem(
                        id=f"deezer_{t.get('id')}",
                        title=t.get("title_short") or t.get("title", "Unknown"),
                        artist=t.get("artist", {}).get("name", data.get("artist", {}).get("name")),
                        album=data.get("title"),
                        duration=int(t.get("duration", 0)),
                        cover_url=data.get("cover_xl") or data.get("cover_big"),
                        preview_url=t.get("preview"),
                        isrc=t.get("isrc"),
                        platform="deezer",
                        quality="flac-16",
                        source_url=t.get("link", f"https://www.deezer.com/track/{t.get('id')}"),
                        track_number=idx,
                        year=int(data.get("release_date", "2024")[:4]) if data.get("release_date") else None
                    ))
                return PlaylistOrAlbum(
                    id=f"deezer_album_{data.get('id')}",
                    title=data.get("title"),
                    artist=data.get("artist", {}).get("name", "Unknown Artist"),
                    type="album",
                    cover_url=data.get("cover_xl") or data.get("cover_big"),
                    track_count=len(tracks),
                    source_url=data.get("link", f"https://www.deezer.com/album/{data.get('id')}"),
                    platform="deezer",
                    tracks=tracks
                )
        except Exception as e:
            print(f"[Deezer] Album error: {e}")
        return None

    def get_track(self, track_id: str) -> Optional[PlaylistOrAlbum]:
        url = f"{self.BASE_URL}/track/{track_id}"
        try:
            r = self.session.get(url, timeout=10)
            if r.status_code == 200:
                t = r.json()
                album_obj = t.get("album", {})
                artist_obj = t.get("artist", {})
                title = t.get("title_short") or t.get("title", "Unknown")
                artist = artist_obj.get("name", "Unknown Artist")
                album = album_obj.get("title", "Singles")
                cover = album_obj.get("cover_xl") or album_obj.get("cover_big")
                track = TrackItem(
                    id=f"deezer_{t.get('id')}",
                    title=title,
                    artist=artist,
                    album=album,
                    duration=int(t.get("duration", 0)),
                    cover_url=cover,
                    preview_url=t.get("preview"),
                    isrc=t.get("isrc"),
                    platform="deezer",
                    quality="flac-16",
                    source_url=t.get("link", f"https://www.deezer.com/track/{t.get('id')}"),
                    track_number=t.get("track_position", 1) or 1
                )
                return PlaylistOrAlbum(
                    id=f"deezer_track_{t.get('id')}",
                    title=title,
                    artist=artist,
                    type="track",
                    cover_url=cover,
                    track_count=1,
                    source_url=t.get("link", f"https://www.deezer.com/track/{t.get('id')}"),
                    platform="deezer",
                    tracks=[track]
                )
        except Exception as e:
            print(f"[Deezer] Track error: {e}")
        return None

    def get_playlist(self, playlist_id: str) -> Optional[PlaylistOrAlbum]:
        url = f"{self.BASE_URL}/playlist/{playlist_id}"
        try:
            r = self.session.get(url, timeout=10)
            if r.status_code == 200:
                data = r.json()
                tracks = []
                for idx, t in enumerate(data.get("tracks", {}).get("data", []), start=1):
                    album_obj = t.get("album", {})
                    tracks.append(TrackItem(
                        id=f"deezer_{t.get('id')}",
                        title=t.get("title_short") or t.get("title", "Unknown"),
                        artist=t.get("artist", {}).get("name", "Unknown Artist"),
                        album=album_obj.get("title", data.get("title")),
                        duration=int(t.get("duration", 0)),
                        cover_url=album_obj.get("cover_xl") or album_obj.get("cover_big"),
                        preview_url=t.get("preview"),
                        isrc=t.get("isrc"),
                        platform="deezer",
                        quality="flac-16",
                        source_url=t.get("link", f"https://www.deezer.com/track/{t.get('id')}"),
                        track_number=idx
                    ))
                return PlaylistOrAlbum(
                    id=f"deezer_pl_{data.get('id')}",
                    title=data.get("title"),
                    artist=data.get("creator", {}).get("name", "Deezer"),
                    type="playlist",
                    cover_url=data.get("picture_xl") or data.get("picture_big"),
                    track_count=len(tracks),
                    source_url=data.get("link", f"https://www.deezer.com/playlist/{data.get('id')}"),
                    platform="deezer",
                    tracks=tracks
                )
        except Exception as e:
            print(f"[Deezer] Playlist error: {e}")
        return None
