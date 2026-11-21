import re
import requests
from typing import Optional, List, Dict, Any
from app.resolvers.base import TrackItem, PlaylistOrAlbum

class AppleMusicResolver:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        })

    def resolve(self, url: str) -> Optional[PlaylistOrAlbum]:
        url = url.strip()
        # 1. Check for single song in album URL (?i=12345)
        song_in_album = re.search(r'[\?&]i=(\d+)', url)
        if song_in_album:
            song_id = song_in_album.group(1)
            return self._lookup_single_song(song_id, url)

        # 2. Check for single song URL (/song/name/12345)
        single_song_m = re.search(r'/song/[^/]+/(\d+)', url)
        if single_song_m:
            song_id = single_song_m.group(1)
            return self._lookup_single_song(song_id, url)

        # 3. Check for album URL (/album/name/12345)
        album_m = re.search(r'/album/(?:[^/]+/)?(\d+)', url)
        if album_m:
            album_id = album_m.group(1)
            return self._lookup_album(album_id, url)

        # 4. Check for playlist URL (/playlist/name/pl.12345)
        if "playlist" in url:
            return self._scrape_playlist(url)

        return None

    def _lookup_single_song(self, song_id: str, original_url: str) -> Optional[PlaylistOrAlbum]:
        lookup_url = f"https://itunes.apple.com/lookup?id={song_id}&entity=song"
        try:
            r = self.session.get(lookup_url, timeout=12)
            if r.status_code == 200:
                results = r.json().get("results", [])
                for item in results:
                    if item.get("wrapperType") == "track":
                        title = item.get("trackName", "Track")
                        artist = item.get("artistName", "Unknown Artist")
                        album = item.get("collectionName", "Apple Music Single")
                        dur = int(item.get("trackTimeMillis", 0) or 0) // 1000
                        cover = item.get("artworkUrl100", "").replace("100x100bb", "600x600bb")
                        preview = item.get("previewUrl")

                        track = TrackItem(
                            id=f"apple_{song_id}",
                            title=title,
                            artist=artist,
                            album=album,
                            duration=dur,
                            cover_url=cover,
                            preview_url=preview,
                            platform="apple",
                            quality="flac-16",
                            source_url=item.get("trackViewUrl") or original_url,
                            track_number=item.get("trackNumber", 1)
                        )
                        return PlaylistOrAlbum(
                            id=f"apple_track_{song_id}",
                            title=title,
                            artist=artist,
                            type="track",
                            cover_url=cover,
                            track_count=1,
                            source_url=original_url,
                            platform="apple",
                            tracks=[track]
                        )
        except Exception as e:
            print(f"[AppleMusicResolver] lookup_single_song error: {e}")
        return None

    def _lookup_album(self, album_id: str, original_url: str) -> Optional[PlaylistOrAlbum]:
        lookup_url = f"https://itunes.apple.com/lookup?id={album_id}&entity=song"
        try:
            r = self.session.get(lookup_url, timeout=15)
            if r.status_code == 200:
                results = r.json().get("results", [])
                if not results:
                    return None
                
                collection = results[0]
                album_title = collection.get("collectionName", "Apple Music Album")
                artist = collection.get("artistName", "Unknown Artist")
                cover = collection.get("artworkUrl100", "").replace("100x100bb", "600x600bb")

                tracks: List[TrackItem] = []
                for item in results[1:]:
                    if item.get("wrapperType") == "track":
                        t_id = item.get("trackId", len(tracks) + 1)
                        t_title = item.get("trackName", f"Track {len(tracks)+1}")
                        t_artist = item.get("artistName", artist)
                        dur = int(item.get("trackTimeMillis", 0) or 0) // 1000
                        t_cover = item.get("artworkUrl100", cover).replace("100x100bb", "600x600bb")
                        preview = item.get("previewUrl")

                        tracks.append(TrackItem(
                            id=f"apple_{t_id}",
                            title=t_title,
                            artist=t_artist,
                            album=album_title,
                            duration=dur,
                            cover_url=t_cover,
                            preview_url=preview,
                            platform="apple",
                            quality="flac-16",
                            source_url=item.get("trackViewUrl") or original_url,
                            track_number=item.get("trackNumber", len(tracks)+1)
                        ))

                return PlaylistOrAlbum(
                    id=f"apple_album_{album_id}",
                    title=album_title,
                    artist=artist,
                    type="album",
                    cover_url=cover,
                    track_count=len(tracks),
                    source_url=original_url,
                    platform="apple",
                    tracks=tracks
                )
        except Exception as e:
            print(f"[AppleMusicResolver] lookup_album error: {e}")
        return None

    def _scrape_playlist(self, url: str) -> Optional[PlaylistOrAlbum]:
        try:
            r = self.session.get(url, timeout=15)
            if r.status_code != 200:
                return None

            title_m = re.search(r'<meta property="og:title" content="([^"]+)"', r.text)
            title = title_m.group(1).replace(" on Apple Music", "") if title_m else "Apple Music Playlist"
            
            cover_m = re.search(r'<meta property="og:image" content="([^"]+)"', r.text)
            cover = cover_m.group(1) if cover_m else None

            # Find all song links
            song_links = re.findall(r'<meta property="music:song" content="([^"]+)"', r.text)
            tracks: List[TrackItem] = []

            for idx, s_url in enumerate(song_links, start=1):
                # Extract title from URL slug: https://music.apple.com/.../song/title-slug/12345
                slug_m = re.search(r'/song/([^/]+)/(\d+)', s_url)
                if slug_m:
                    slug = slug_m.group(1).replace("-", " ").title()
                    s_id = slug_m.group(2)
                else:
                    slug = f"Track {idx}"
                    s_id = str(idx)

                tracks.append(TrackItem(
                    id=f"apple_pl_trk_{s_id}",
                    title=slug,
                    artist=title,
                    album=title,
                    duration=0,
                    cover_url=cover,
                    platform="apple",
                    quality="flac-16",
                    source_url=s_url,
                    track_number=idx
                ))

            return PlaylistOrAlbum(
                id=f"apple_pl_{hash(url)}",
                title=title,
                artist="Apple Music",
                type="playlist",
                cover_url=cover,
                track_count=len(tracks),
                source_url=url,
                platform="apple",
                tracks=tracks
            )
        except Exception as e:
            print(f"[AppleMusicResolver] scrape_playlist error: {e}")
        return None
