export interface TrackItem {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  cover_url?: string;
  platform: string;
  quality: string;
  source_url: string;
  preview_url?: string;
  track_number?: number;
  year?: string;
}

export interface PlaylistOrAlbum {
  id: string;
  title: string;
  artist: string;
  type: 'playlist' | 'album' | 'single';
  cover_url?: string;
  track_count: number;
  source_url: string;
  platform: string;
  tracks: TrackItem[];
}

export interface SearchResponse {
  query: string;
  tracks: TrackItem[];
  albums: PlaylistOrAlbum[];
  playlists: PlaylistOrAlbum[];
}

export interface QueueItem {
  id: string;
  request_id?: string;
  playlist_name?: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  source_platform: string;
  target_quality: string;
  source_url: string;
  queue_position: number;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'paused' | 'deleted';
  progress_percent: number;
  speed_bytes_sec: number;
  eta_seconds: number;
  file_path?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface RequestItem {
  id: string;
  user_id: string;
  username: string;
  item_type: 'track' | 'album' | 'playlist';
  title: string;
  artist: string;
  cover_url?: string;
  source_url?: string;
  platform: string;
  quality: string;
  status: 'pending' | 'processing' | 'available' | 'failed';
  created_at: string;
}

export interface LibraryItem {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  quality: string;
  file_path: string;
  playlist_name?: string;
  downloaded_at: string;
}

export interface SystemStatus {
  status: string;
  storage: {
    path: string;
    total_bytes: number;
    used_bytes: number;
    free_bytes: number;
    free_gb: number;
  };
  navidrome: {
    url: string;
    online: boolean;
  };
  queue: {
    active: number;
    pending: number;
    total: number;
  };
}
