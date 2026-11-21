import React, { useState } from 'react';
import { Disc3, Trash2, RefreshCw, Folder, Music, AlertTriangle } from 'lucide-react';
import { LibraryItem } from '../types';
import { api } from '../services/api';

interface LibraryTabProps {
  library: LibraryItem[];
  onRefresh: () => void;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({ library, onRefresh }) => {
  const [filterText, setFilterText] = useState('');
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [confirmModalPath, setConfirmModalPath] = useState<string | null>(null);
  const [isRescanning, setIsRescanning] = useState(false);

  const filteredItems = library.filter(
    (item) =>
      item.title.toLowerCase().includes(filterText.toLowerCase()) ||
      item.artist.toLowerCase().includes(filterText.toLowerCase()) ||
      (item.playlist_name && item.playlist_name.toLowerCase().includes(filterText.toLowerCase()))
  );

  const handleDelete = async (filePath: string) => {
    setDeletingPath(filePath);
    try {
      await api.deleteFromLibrary(filePath);
      setConfirmModalPath(null);
      onRefresh();
    } catch (e) {
      alert('Failed to delete file from device');
    } finally {
      setDeletingPath(null);
    }
  };

  const handleManualRescan = async () => {
    setIsRescanning(true);
    try {
      await api.triggerRescan();
      alert('Navidrome library rescan triggered!');
    } catch (e) {
      alert('Failed to trigger scan');
    } finally {
      setIsRescanning(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Disc3 className="w-5 h-5 text-emerald-400" />
            <span>Local Device Library</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Physical media files stored in /srv/media/music. Deleting unlinks the file and updates Navidrome.
          </p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter library..."
            className="w-full sm:w-60 px-3 py-1.5 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />

          <button
            onClick={handleManualRescan}
            disabled={isRescanning}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRescanning ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Rescan</span>
          </button>
        </div>
      </div>

      {/* Library Table / List */}
      {filteredItems.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-xs glass-panel rounded-2xl">
          {library.length === 0 ? 'No library tracks found. Complete a download first.' : 'No tracks match your filter.'}
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-obsidian-950/80 border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Title / Artist</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Album / Playlist</th>
                  <th className="py-3 px-4 hidden md:table-cell">Quality</th>
                  <th className="py-3 px-4 hidden lg:table-cell">File Location</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <Music className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-200 truncate">{item.title}</p>
                          <p className="text-[11px] text-slate-400 truncate">{item.artist}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 hidden sm:table-cell truncate max-w-xs">
                      {item.playlist_name || item.album}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell font-mono text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {item.quality.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell font-mono text-[10px] text-slate-500 truncate max-w-xs" title={item.file_path}>
                      {item.file_path}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setConfirmModalPath(item.file_path)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete file from device and purge from Navidrome"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModalPath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md">
          <div className="glass-panel p-6 rounded-2xl max-w-md w-full bg-obsidian-900 border border-rose-500/30 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Delete Track from Storage?</h3>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              This will permanently delete the audio bitstream file from disk:
              <br />
              <span className="font-mono text-rose-300 block mt-2 p-2 bg-obsidian-950 rounded-lg text-[10px] break-all border border-rose-500/20">
                {confirmModalPath}
              </span>
              <br />
              Navidrome will automatically rescan and remove it from your playlists.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setConfirmModalPath(null)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmModalPath)}
                disabled={deletingPath === confirmModalPath}
                className="px-4 py-2 text-xs font-semibold bg-rose-500 hover:bg-rose-400 text-obsidian-950 rounded-xl transition-all shadow-lg shadow-rose-500/20"
              >
                {deletingPath === confirmModalPath ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
