import re
from typing import List, Optional, Dict, Any
from app.resolvers.base import TrackItem, PlaylistOrAlbum, SearchResponse
from app.resolvers.deezer_resolver import DeezerResolver
from app.resolvers.ytdlp_resolver import YtDlpResolver
from app.resolvers.antra_resolver import AntraResolver
from app.resolvers.spotify_resolver import SpotifyResolver
from app.resolvers.applemusic_resolver import AppleMusicResolver

class MusicAggregator:
    def __init__(self):
        self.deezer = DeezerResolver()
        self.ytdlp = YtDlpResolver()
        self.antra = AntraResolver()
        self.spotify = SpotifyResolver()
        self.applemusic = AppleMusicResolver()

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

        # 1. Spotify (Playlists, Albums, Tracks - Zero Auth)
        if "spotify.com" in url or url.startswith("spotify:"):
            res = self.spotify.resolve(url)
            if res:
                return res

        # 2. Apple Music (Albums, Tracks, Playlists - Zero Auth)
        if "apple.com" in url or "itunes.apple.com" in url:
            res = self.applemusic.resolve(url)
            if res:
                return res

        # 3. Deezer (Albums, Tracks, Playlists)
        if "deezer.com" in url:
            album_m = re.search(r'album/(\d+)', url)
            if album_m:
                return self.deezer.get_album(album_m.group(1))
            track_m = re.search(r'track/(\d+)', url)
            if track_m:
                return self.deezer.get_track(track_m.group(1))
            pl_m = re.search(r'playlist/(\d+)', url)
            if pl_m:
                return self.deezer.get_playlist(pl_m.group(1))

        # 4. YouTube (Playlists, Albums, Single Videos)
        if "youtube.com" in url or "youtu.be" in url:
            return self.ytdlp.get_playlist(url)

        # 5. Fallback to Antra if configured
        try:
            res = self.antra.resolve(url)
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
        except Exception:
            pass

        # 6. Universal YT-DLP fallback
        return self.ytdlp.get_playlist(url)
