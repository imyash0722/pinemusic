import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { DiscoverTab } from './components/DiscoverTab';
import { QueueTab } from './components/QueueTab';
import { RequestsTab } from './components/RequestsTab';
import { LibraryTab } from './components/LibraryTab';
import { SettingsTab } from './components/SettingsTab';
import { PreviewPlayer } from './components/PreviewPlayer';
import { IngestModal } from './components/IngestModal';
import { TrackItem, PlaylistOrAlbum, QueueItem, RequestItem, LibraryItem, SystemStatus } from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'discover' | 'queue' | 'requests' | 'library' | 'settings'>('discover');
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [previewTrack, setPreviewTrack] = useState<TrackItem | null>(null);
  const [ingestPlaylist, setIngestPlaylist] = useState<PlaylistOrAlbum | null>(null);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState<boolean>(false);
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Load Initial Data
  const refreshAll = async () => {
    try {
      const [statusData, queueData, requestsData, libraryData] = await Promise.all([
        api.getSystemStatus().catch(() => null),
        api.getQueue().then((r) => r.queue).catch(() => []),
        api.getRequests().catch(() => []),
        api.getLibraryItems().catch(() => []),
      ]);
      if (statusData) setSystemStatus(statusData);
      setQueue(queueData);
      setRequests(requestsData);
      setLibrary(libraryData);
    } catch (e) {
      console.error('Data refresh error:', e);
    }
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 12000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket Connection
  useEffect(() => {
    let reconnectTimeout: any = null;

    const connectWs = () => {
      try {
        const wsUrl = api.getWebSocketUrl();
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'queue_state' || data.type === 'queue_updated') {
              if (data.queue) setQueue(data.queue);
            } else if (data.type === 'item_progress') {
              setQueue((prev) =>
                prev.map((item) =>
                  item.id === data.item_id
                    ? {
                        ...item,
                        status: 'active',
                        progress_percent: data.progress_percent,
                        speed_bytes_sec: data.speed_bytes_sec,
                        eta_seconds: data.eta_seconds,
                      }
                    : item
                )
              );
            } else if (data.type === 'item_completed' || data.type === 'item_failed') {
              refreshAll();
            } else if (data.type === 'library_updated') {
              api.getLibraryItems().then(setLibrary).catch(() => {});
            }
          } catch (err) {
            console.error('WS parse error:', err);
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimeout = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          setWsConnected(false);
          ws.close();
        };
      } catch (err) {
        console.error('WS connect error:', err);
        reconnectTimeout = setTimeout(connectWs, 4000);
      }
    };

    connectWs();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Handlers
  const handleOpenIngest = (playlist: PlaylistOrAlbum) => {
    setIngestPlaylist(playlist);
    setIsIngestModalOpen(true);
  };

  const handleConfirmIngest = async (
    selectedTracks: TrackItem[],
    quality: string,
    platform: string,
    asRequest: boolean
  ) => {
    if (!ingestPlaylist) return;
    const tracksToQueue = selectedTracks.map((t) => ({
      title: t.title,
      artist: t.artist,
      album: t.album || ingestPlaylist.title,
      duration: t.duration,
      platform,
      quality,
      source_url: t.source_url,
    }));

    if (asRequest) {
      await api.createRequest({
        title: ingestPlaylist.title,
        artist: ingestPlaylist.artist,
        item_type: ingestPlaylist.type === 'single' ? 'track' : ingestPlaylist.type,
        cover_url: ingestPlaylist.cover_url,
        source_url: ingestPlaylist.source_url,
        platform,
        quality,
        tracks: tracksToQueue,
      });
    } else {
      await api.addToQueue(tracksToQueue, ingestPlaylist.title);
    }

    refreshAll();
    setActiveTab('queue');
  };

  const handleQuickQueue = async (track: TrackItem) => {
    await api.addToQueue([
      {
        title: track.title,
        artist: track.artist,
        album: track.album || 'Singles',
        duration: track.duration,
        platform: track.platform || 'auto',
        quality: track.quality || 'flac-16',
        source_url: track.source_url,
      },
    ]);
    refreshAll();
    setActiveTab('queue');
  };

  const handleReorderQueue = async (itemId: string, direction: 'up' | 'down') => {
    await api.reorderQueue(itemId, direction);
  };

  const handleCancelQueue = async (itemId: string) => {
    await api.cancelQueueItem(itemId);
  };

  const handleRetryQueue = async (itemId: string) => {
    await api.retryQueueItem(itemId);
  };

  return (
    <div className="min-h-screen flex flex-col bg-obsidian-950 text-slate-100 font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemStatus={systemStatus}
        wsConnected={wsConnected}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28">
        {activeTab === 'discover' && (
          <DiscoverTab
            onPlayPreview={(track) => setPreviewTrack(track)}
            onOpenIngest={handleOpenIngest}
            onQuickQueue={handleQuickQueue}
          />
        )}

        {activeTab === 'queue' && (
          <QueueTab
            queue={queue}
            onReorder={handleReorderQueue}
            onCancel={handleCancelQueue}
            onRetry={handleRetryQueue}
          />
        )}

        {activeTab === 'requests' && (
          <RequestsTab requests={requests} systemStatus={systemStatus} />
        )}

        {activeTab === 'library' && (
          <LibraryTab library={library} onRefresh={refreshAll} />
        )}

        {activeTab === 'settings' && <SettingsTab systemStatus={systemStatus} />}
      </main>

      {/* Floating 30s Audio Preview Player */}
      <PreviewPlayer currentTrack={previewTrack} onClose={() => setPreviewTrack(null)} />

      {/* Playlist / Album Ingest Modal */}
      <IngestModal
        playlist={ingestPlaylist}
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        onConfirm={handleConfirmIngest}
      />
    </div>
  );
};
