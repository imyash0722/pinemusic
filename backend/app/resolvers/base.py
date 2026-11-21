from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class TrackItem(BaseModel):
    id: str
    title: str
    artist: str
    album: Optional[str] = "Singles"
    duration: int = 0 # in seconds
    cover_url: Optional[str] = None
    preview_url: Optional[str] = None
    isrc: Optional[str] = None
    platform: str = "auto" # antra, deezer, qobuz, youtube, soundcloud, bandcamp
    quality: str = "flac-16" # flac-24, flac-16, mp3-320, mp4-1080
    source_url: str
    track_number: int = 1
    disc_number: int = 1
    year: Optional[int] = None
    genre: Optional[str] = "Electronic"
    lyrics: Optional[str] = None
    synced_lyrics: Optional[str] = None

class PlaylistOrAlbum(BaseModel):
    id: str
    title: str
    artist: str
    type: str # playlist or album
    cover_url: Optional[str] = None
    track_count: int
    source_url: str
    platform: str
    tracks: List[TrackItem] = Field(default_factory=list)

class SearchResponse(BaseModel):
    query: str
    tracks: List[TrackItem] = Field(default_factory=list)
    albums: List[PlaylistOrAlbum] = Field(default_factory=list)
    playlists: List[PlaylistOrAlbum] = Field(default_factory=list)
