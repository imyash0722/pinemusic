import React, { useState } from 'react';
import { Search, Link as LinkIcon, Sparkles, Play, Plus, Music2, ExternalLink } from 'lucide-react';
import { TrackItem, PlaylistOrAlbum, SearchResponse } from '../types';
import { api } from '../services/api';

interface DiscoverTabProps {
  onPlayPreview: (track: TrackItem) => void;
  onOpenIngest: (playlist: PlaylistOrAlbum) => void;
  onQuickQueue: (track: TrackItem) => void;
}

export const DiscoverTab: React.FC<DiscoverTabProps> = ({
  onPlayPreview,
  onOpenIngest,
  onQuickQueue,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [platform, setPlatform] = useState('auto');
  const [urlInput, setUrlInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const res = await api.searchMusic(searchQuery, platform);
      setSearchResults(res);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleResolveUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setIsResolving(true);
    setError(null);
    try {
      const res = await api.resolveUrl(urlInput);
      onOpenIngest(res);
      setUrlInput('');
    } catch (err: any) {
      setError(err.message || 'Failed to inspect URL. Make sure it is a valid playlist or song link.');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Ingest Box */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-obsidian-900 border border-white/10 shadow-lg overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-pine-600/15 border border-pine-500/25 text-pine-300 text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5 text-pine-400" />
            <span>Universal Bitstream Ingest Engine</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Search or Paste Any Music Link
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Zero sign-in required. Decodes Spotify, Apple Music, YouTube, and Deezer playlists, albums, and tracks directly into Navidrome.
          </p>

          {/* URL Ingest Form */}
          <form onSubmit={handleResolveUrl} className="mt-6 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Paste Spotify, Apple Music, YouTube, or Deezer playlist, album, or track URL..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-obsidian-950 border border-white/10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pine-500 transition-colors font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isResolving || !urlInput.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-pine-600 hover:bg-pine-500 text-white border border-pine-500/30 shadow-sm transition-all active:scale-95 disabled:opacity-40 shrink-0"
            >
              {isResolving ? 'Resolving Bitstream...' : 'Inspect & Ingest'}
            </button>
          </form>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearch} className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search artist, song, or album..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-obsidian-900 border border-white/10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pine-500 transition-colors"
            />
          </form>

          {/* Platform Pills */}
          <div className="flex items-center space-x-1 p-1 rounded-xl bg-obsidian-900 border border-white/10 self-stretch sm:self-auto overflow-x-auto">
            {[
              { id: 'auto', label: 'All Sources' },
              { id: 'deezer', label: 'Deezer Hi-Fi' },
              { id: 'youtube', label: 'YouTube Music' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  platform === p.id
                    ? 'bg-pine-600/20 text-emerald-300 border border-pine-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Results Grid */}
      {isSearching ? (
        <div className="py-16 text-center">
          <div className="inline-block w-8 h-8 border-2 border-pine-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-sm text-slate-400">Querying lossless providers...</p>
        </div>
      ) : searchResults && searchResults.tracks.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Results ({searchResults.tracks.length} tracks found)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {searchResults.tracks.map((track) => (
              <div
                key={track.id}
                className="glass-card p-3 rounded-2xl flex items-center justify-between space-x-3 group"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/10">
                    {track.cover_url ? (
                      <img src={track.cover_url} alt={track.title} className="w-full h-full object-cover" />
                    ) : (
                      <Music2 className="w-6 h-6 m-3 text-slate-500" />
                    )}
                    {track.preview_url && (
                      <button
                        onClick={() => onPlayPreview(track)}
                        className="absolute inset-0 bg-obsidian-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        title="Play 30s preview"
                      >
                        <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                      </button>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate group-hover:text-emerald-300 transition-colors">
                      {track.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-white/5 text-slate-400 border border-white/5">
                        {track.platform}
                      </span>
                      {track.duration > 0 && (
                        <span className="text-[10px] font-mono text-slate-500">
                          {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => onQuickQueue(track)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-emerald-500 hover:text-obsidian-950 text-slate-300 transition-colors shrink-0"
                  title="Add to Download Queue"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : searchResults ? (
        <div className="py-16 text-center text-slate-500 text-sm">
          No tracks matched your query. Try searching for an artist or album name.
        </div>
      ) : null}
    </div>
  );
};
