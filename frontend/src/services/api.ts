import { SearchResponse, PlaylistOrAlbum, QueueItem, RequestItem, LibraryItem, SystemStatus, TrackItem } from '../types';

const API_BASE = '/api/v1';

export const getAuthToken = (): string | null => {
  return localStorage.getItem('pinemusic_token');
};

export const setAuthToken = (token: string) => {
  localStorage.setItem('pinemusic_token', token);
};

const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // System Status
  async getSystemStatus(): Promise<SystemStatus> {
    const res = await fetch(`${API_BASE}/system/status`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch system status');
    return res.json();
  },

  async triggerRescan(): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/system/rescan`, { method: 'POST', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to trigger scan');
    return res.json();
  },

  // Search & Resolve
  async searchMusic(query: string, platform: string = 'auto', limit: number = 25): Promise<SearchResponse> {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}&platform=${platform}&limit=${limit}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Search failed');
    return res.json();
  },

  async resolveUrl(url: string): Promise<PlaylistOrAlbum> {
    const res = await fetch(`${API_BASE}/resolve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Resolve failed' }));
      throw new Error(err.detail || 'Could not resolve playlist');
    }
    return res.json();
  },

  // Queue Operations
  async getQueue(): Promise<{ queue: QueueItem[]; total: number }> {
    const res = await fetch(`${API_BASE}/queue`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to get queue');
    return res.json();
  },

  async addToQueue(tracks: Partial<TrackItem>[], playlistName?: string, requestId?: string): Promise<{ status: string; added_count: number; queue_ids: string[] }> {
    const res = await fetch(`${API_BASE}/queue/add`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ tracks, playlist_name: playlistName, request_id: requestId }),
    });
    if (!res.ok) throw new Error('Failed to add to queue');
    return res.json();
  },

  async reorderQueue(itemId: string, direction: 'up' | 'down'): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/queue/reorder`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ item_id: itemId, direction }),
    });
    if (!res.ok) throw new Error('Failed to reorder queue');
    return res.json();
  },

  async cancelQueueItem(itemId: string): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/queue/${itemId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to cancel item');
    return res.json();
  },

  async retryQueueItem(itemId: string, platform?: string, quality?: string): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/queue/${itemId}/retry`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ platform, quality }),
    });
    if (!res.ok) throw new Error('Failed to retry item');
    return res.json();
  },

  // Requests (Ombi-style)
  async getRequests(): Promise<RequestItem[]> {
    const res = await fetch(`${API_BASE}/requests`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch requests');
    return res.json();
  },

  async createRequest(payload: {
    title: string;
    artist: string;
    item_type: 'track' | 'album' | 'playlist';
    cover_url?: string;
    source_url?: string;
    platform: string;
    quality: string;
    tracks?: Partial<TrackItem>[];
  }): Promise<{ status: string; request_id: string }> {
    const res = await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create request');
    return res.json();
  },

  // Library & Deletion
  async getLibraryItems(limit: number = 100): Promise<LibraryItem[]> {
    const res = await fetch(`${API_BASE}/library/items?limit=${limit}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch library');
    return res.json();
  },

  async deleteFromLibrary(filePath: string): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/library/delete`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ file_path: filePath }),
    });
    if (!res.ok) throw new Error('Failed to delete track');
    return res.json();
  },

  // WebSocket Connection
  getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/api/v1/queue/ws`;
  },
};
