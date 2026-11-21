import re
from typing import List, Optional, Dict, Any
from app.resolvers.base import TrackItem, PlaylistOrAlbum, SearchResponse
from app.resolvers.deezer_resolver import DeezerResolver
from app.resolvers.ytdlp_resolver import YtDlpResolver
from app.resolvers.antra_resolver import AntraResolver

class MusicAggregator:
    def __init__(self):
        self.deezer = DeezerResolver()
        self.ytdlp = YtDlpResolver()
        self.antra = AntraResolver()

    def search(self, query: str, platform: str = "auto", limit: int = 25) -> SearchResponse:
        tracks: List[TrackItem] = []
        albums: List[PlaylistOrAlbum] = []
        playlists: List[PlaylistOrAlbum] = []

        if platform == "deezer" or platform == "auto":
            dz_tracks = self.deezer.search(query, limit=limit)
            tracks.extend(dz_tracks)

        if platform == "youtube" or (platform == "auto" and len(tracks) < 5):
            yt_tracks = self.ytdlp.search(query, limit=limit)
            tracks.extend(yt_tracks)

        return SearchResponse(
            query=query,
            tracks=tracks[:limit],
            albums=albums,
            playlists=playlists
        )

    def resolve_url(self, url: str) -> Optional[PlaylistOrAlbum]:
        url = url.strip()
        # 1. Check if YouTube playlist or video
        if "youtube.com" in url or "youtu.be" in url:
            return self.ytdlp.get_playlist(url)

        # 2. Check if Deezer album/playlist
        if "deezer.com" in url:
            album_match = re.search(r'album/(\d+)', url)
            if album_match:
                return self.deezer.get_album(album_match.group(1))

        # 3. Check Spotify / Apple Music via Antra
        if "spotify.com" in url or "apple.com" in url:
            try:
                res = self.antra.resolve(url)
                # Parse Antra payload
                title = res.get("name") or res.get("title", "Antra Playlist")
                author = res.get("author") or res.get("artist", "Various")
                raw_tracks = res.get("tracks", [])
                parsed_tracks: List[TrackItem] = []
                for idx, t in enumerate(raw_tracks, start=1):
                    parsed_tracks.append(TrackItem(
                        id=f"antra_{t.get('id', idx)}",
                        title=t.get("name") or t.get("title", "Track"),
                        artist=t.get("artist", author),
                        album=title,
                        duration=int(t.get("duration", 0)),
                        cover_url=t.get("cover") or res.get("cover"),
                        platform="antra",
                        quality="flac-16",
                        source_url=t.get("url") or url,
                        track_number=idx
                    ))
                return PlaylistOrAlbum(
                    id=f"antra_pl_{hash(url)}",
                    title=title,
                    artist=author,
                    type="playlist",
                    cover_url=res.get("cover"),
                    track_count=len(parsed_tracks),
                    source_url=url,
                    platform="antra",
                    tracks=parsed_tracks
                )
            except Exception as e:
                print(f"[Aggregator] Antra resolve failed: {e}")

        # Fallback to YT-DLP for unknown URLs
        return self.ytdlp.get_playlist(url)
