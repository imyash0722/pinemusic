import re
import json
import requests
from typing import Optional, List, Dict, Any
from app.resolvers.base import TrackItem, PlaylistOrAlbum

class SpotifyResolver:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        })

    def resolve(self, url: str) -> Optional[PlaylistOrAlbum]:
        url = url.strip()
        # Parse entity type and ID
        m = re.search(r'(?:spotify\.com/(?:intl-[a-z]+/)?|spotify:)(playlist|album|track)[/:]([a-zA-Z0-9]+)', url)
        if not m:
            return None

        entity_type = m.group(1)
        entity_id = m.group(2)
        embed_url = f"https://open.spotify.com/embed/{entity_type}/{entity_id}"

        try:
            r = self.session.get(embed_url, timeout=15)
            if r.status_code == 200:
                match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', r.text, re.DOTALL)
                if match:
                    data = json.loads(match.group(1))
                    entity = data.get("props", {}).get("pageProps", {}).get("state", {}).get("data", {}).get("entity", {})
                    if entity:
                        return self._parse_entity(entity, entity_type, entity_id, url)
        except Exception as e:
            print(f"[SpotifyResolver] Embed resolve error: {e}")

        # Fallback to oEmbed for basic title / cover
        try:
            oembed_url = f"https://open.spotify.com/oembed?url=https://open.spotify.com/{entity_type}/{entity_id}"
            r = self.session.get(oembed_url, timeout=10)
            if r.status_code == 200:
                oe = r.json()
                title = oe.get("title", f"Spotify {entity_type.capitalize()}")
                cover = oe.get("thumbnail_url")
                # For single track
                if entity_type == "track":
                    artist = "Unknown Artist"
                    t_title = title
                    if " - " in title:
                        parts = title.split(" - ", 1)
                        artist = parts[0].strip()
                        t_title = parts[1].strip()
                    single = TrackItem(
                        id=f"spotify_trk_{entity_id}",
                        title=t_title,
                        artist=artist,
                        album="Spotify Singles",
                        duration=0,
                        cover_url=cover,
                        platform="spotify",
                        quality="flac-16",
                        source_url=f"https://open.spotify.com/track/{entity_id}",
                        track_number=1
                    )
                    return PlaylistOrAlbum(
                        id=f"spotify_pl_{entity_id}",
                        title=t_title,
                        artist=artist,
                        type="track",
                        cover_url=cover,
                        track_count=1,
                        source_url=url,
                        platform="spotify",
                        tracks=[single]
                    )
        except Exception as e:
            print(f"[SpotifyResolver] oEmbed fallback error: {e}")

        return None

    def _parse_entity(self, entity: Dict[str, Any], entity_type: str, entity_id: str, original_url: str) -> PlaylistOrAlbum:
        title = entity.get("title") or entity.get("name") or "Spotify Collection"
        subtitle = entity.get("subtitle") or ""
        
        # Extract cover art
        cover_url = None
        cover_art = entity.get("coverArt", {})
        if isinstance(cover_art, dict) and cover_art.get("sources"):
            sources = cover_art["sources"]
            if sources:
                cover_url = sources[0].get("url")
        if not cover_url:
            vis = entity.get("visualIdentity", {})
            if vis.get("image"):
                cover_url = vis["image"][-1].get("url")

        # 1. Single Track
        if entity_type == "track":
            artists_list = entity.get("artists", [])
            artist_name = ", ".join([a["name"] for a in artists_list]) if artists_list else (subtitle or "Unknown Artist")
            duration_sec = int(entity.get("duration", 0) or 0) // 1000
            preview = None
            if entity.get("audioPreview"):
                preview = entity["audioPreview"].get("url")

            single_track = TrackItem(
                id=f"spotify_{entity_id}",
                title=title,
                artist=artist_name,
                album="Spotify Singles",
                duration=duration_sec,
                cover_url=cover_url,
                preview_url=preview,
                platform="spotify",
                quality="flac-16",
                source_url=f"https://open.spotify.com/track/{entity_id}",
                track_number=1
            )
            return PlaylistOrAlbum(
                id=f"spotify_track_{entity_id}",
                title=title,
                artist=artist_name,
                type="track",
                cover_url=cover_url,
                track_count=1,
                source_url=original_url,
                platform="spotify",
                tracks=[single_track]
            )

        # 2. Playlist or Album
        track_list = entity.get("trackList", [])
        parsed_tracks: List[TrackItem] = []
        for idx, t in enumerate(track_list, start=1):
            t_title = t.get("title", f"Track {idx}")
            t_artist = t.get("subtitle") or subtitle or "Unknown Artist"
            t_dur = int(t.get("duration", 0) or 0) // 1000
            t_preview = None
            if t.get("audioPreview"):
                t_preview = t["audioPreview"].get("url")
            
            t_uri = t.get("uri", "")
            t_id = t_uri.split(":")[-1] if ":" in t_uri else f"{entity_id}_{idx}"
            source_track_url = f"https://open.spotify.com/track/{t_id}" if "track:" in t_uri else original_url

            parsed_tracks.append(TrackItem(
                id=f"spotify_{t_id}",
                title=t_title,
                artist=t_artist,
                album=title,
                duration=t_dur,
                cover_url=cover_url,
                preview_url=t_preview,
                platform="spotify",
                quality="flac-16",
                source_url=source_track_url,
                track_number=idx
            ))

        return PlaylistOrAlbum(
            id=f"spotify_{entity_type}_{entity_id}",
            title=title,
            artist=subtitle or "Spotify",
            type=entity_type,
            cover_url=cover_url,
            track_count=len(parsed_tracks),
            source_url=original_url,
            platform="spotify",
            tracks=parsed_tracks
        )
