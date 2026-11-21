import React, { useState } from 'react';
import { X, CheckSquare, Square, Download, Layers, Sparkles, Music } from 'lucide-react';
import { PlaylistOrAlbum, TrackItem } from '../types';

interface IngestModalProps {
  playlist: PlaylistOrAlbum | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    selectedTracks: TrackItem[],
    quality: string,
    platform: string,
    asRequest: boolean
  ) => Promise<void>;
}

export const IngestModal: React.FC<IngestModalProps> = ({
  playlist,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !playlist) return null;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(playlist.tracks.map((t) => t.id))
  );
  const [quality, setQuality] = useState<string>('flac-16');
  const [platform, setPlatform] = useState<string>('auto');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const toggleTrack = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAll = () => {
    setSelectedIds(new Set(playlist.tracks.map((t) => t.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleSubmit = async (asRequest: boolean) => {
    const tracksToEnqueue = playlist.tracks.filter((t) => selectedIds.has(t.id));
    if (tracksToEnqueue.length === 0) return;
    setIsSubmitting(true);
    try {
      await onConfirm(tracksToEnqueue, quality, platform, asRequest);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-2xl rounded-2xl bg-obsidian-900 border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-start justify-between">
          <div className="flex items-center space-x-4 min-w-0">
            {playlist.cover_url ? (
              <img
                src={playlist.cover_url}
                alt={playlist.title}
                className="w-16 h-16 rounded-xl object-cover border border-white/10 shadow-md shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <Music className="w-8 h-8 text-slate-400" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-pine-500/10 text-pine-400 border border-pine-500/20 font-semibold">
                {playlist.type} · {playlist.platform}
              </span>
              <h3 className="text-lg font-bold text-white truncate mt-1">{playlist.title}</h3>
              <p className="text-xs text-slate-400 truncate">{playlist.artist}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="px-5 py-3 bg-white/[0.02] border-b border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Quality Picker */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
              Audio Bitstream Quality
            </label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full bg-obsidian-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-pine-500 font-medium"
            >
              <option value="flac-16">16-bit / 44.1kHz Hi-Fi FLAC (Lossless)</option>
              <option value="flac-24">24-bit Studio Master FLAC (Max Fidelity)</option>
              <option value="mp3-320">320 kbps High-Bitrate MP3</option>
              <option value="mp4-1080">1080p Music Video (MP4)</option>
            </select>
          </div>

          {/* Platform / Source Picker */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">
              Ingest Engine Source
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full bg-obsidian-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-pine-500 font-medium"
            >
              <option value="auto">Auto-Select (Antra Lossless ➔ YT-DLP / Deezer)</option>
              <option value="antra">Antra Lossless Engine (Tidal/Qobuz/Spotify)</option>
              <option value="deezer">Deezer Hi-Fi API</option>
              <option value="youtube">YouTube Music Lossless Audio Stream</option>
            </select>
          </div>
        </div>

        {/* Selection Toolbar */}
        <div className="px-5 py-2.5 flex items-center justify-between border-b border-white/5 text-xs text-slate-400">
          <div className="flex items-center space-x-3">
            <button
              onClick={selectAll}
              className="flex items-center space-x-1 hover:text-emerald-400 transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Select All</span>
            </button>
            <span>·</span>
            <button
              onClick={deselectAll}
              className="flex items-center space-x-1 hover:text-slate-200 transition-colors"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Deselect All</span>
            </button>
          </div>
          <span className="font-mono text-emerald-400 font-semibold">
            {selectedIds.size} of {playlist.tracks.length} tracks selected
          </span>
        </div>

        {/* Track Checklist */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {playlist.tracks.map((t, idx) => {
            const isSelected = selectedIds.has(t.id);
            return (
              <div
                key={t.id || idx}
                onClick={() => toggleTrack(t.id)}
                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors border ${
                  isSelected
                    ? 'bg-pine-500/10 border-pine-500/30 text-white'
                    : 'bg-white/[0.01] border-white/5 text-slate-400 hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <span className="font-mono text-xs text-slate-500 w-5 text-right">{idx + 1}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate text-slate-200">{t.title}</p>
                    <p className="text-[11px] text-slate-400 truncate">{t.artist}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 shrink-0">
                  {t.duration > 0 && (
                    <span className="text-[11px] font-mono text-slate-500">
                      {Math.floor(t.duration / 60)}:{String(t.duration % 60).padStart(2, '0')}
                    </span>
                  )}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-emerald-500 bg-obsidian-950 border-white/20 focus:ring-0"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-obsidian-950/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleSubmit(true)}
              disabled={selectedIds.size === 0 || isSubmitting}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors disabled:opacity-40"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Request Only</span>
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={selectedIds.size === 0 || isSubmitting}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-pine-600 hover:bg-pine-500 text-white border border-pine-500/30 shadow-sm transition-all active:scale-95 disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>
                {isSubmitting
                  ? 'Queueing...'
                  : selectedIds.size === 1
                  ? 'Download Track'
                  : `Download ${selectedIds.size} Tracks`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
