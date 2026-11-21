import React from 'react';
import { ArrowUp, ArrowDown, X, RotateCcw, AlertCircle, CheckCircle2, Clock, Activity, FileCheck } from 'lucide-react';
import { QueueItem } from '../types';

interface QueueTabProps {
  queue: QueueItem[];
  onReorder: (itemId: string, direction: 'up' | 'down') => void;
  onCancel: (itemId: string) => void;
  onRetry: (itemId: string) => void;
}

export const QueueTab: React.FC<QueueTabProps> = ({
  queue,
  onReorder,
  onCancel,
  onRetry,
}) => {
  const activeItems = queue.filter((item) => item.status === 'active');
  const pendingItems = queue.filter((item) => item.status === 'pending');
  const finishedItems = queue.filter((item) => ['completed', 'failed'].includes(item.status));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Active Downloads Section */}
      <div>
        <div className="flex items-center space-x-2 mb-3">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Active Downloads ({activeItems.length})
          </h3>
        </div>

        {activeItems.length === 0 ? (
          <div className="p-8 rounded-2xl glass-panel text-center text-slate-500 text-xs">
            Queue worker is idle. Add tracks from the Discover tab to begin downloading.
          </div>
        ) : (
          <div className="space-y-3">
            {activeItems.map((item) => (
              <div
                key={item.id}
                className="glass-panel p-4 rounded-2xl border border-emerald-500/30 bg-obsidian-900/80 shadow-xl"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                        {item.target_quality}
                      </span>
                      <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{item.artist} · {item.album}</p>
                  </div>

                  <button
                    onClick={() => onCancel(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5"
                    title="Cancel download"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-300"
                    style={{ width: `${Math.max(5, item.progress_percent)}%` }}
                  />
                </div>

                {/* Live Stats */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>{item.progress_percent.toFixed(1)}%</span>
                  <div className="flex items-center space-x-3">
                    {item.speed_bytes_sec > 0 && (
                      <span>{(item.speed_bytes_sec / (1024 * 1024)).toFixed(2)} MB/s</span>
                    )}
                    {item.eta_seconds > 0 && (
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{item.eta_seconds}s remaining</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Queue Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Pending Queue ({pendingItems.length})
          </h3>
          <span className="text-xs text-slate-500">Auto-prioritized</span>
        </div>

        {pendingItems.length === 0 ? (
          <div className="p-6 rounded-2xl glass-panel text-center text-slate-500 text-xs">
            No pending downloads waiting.
          </div>
        ) : (
          <div className="space-y-2">
            {pendingItems.map((item, index) => (
              <div
                key={item.id}
                className="glass-card p-3 rounded-xl flex items-center justify-between space-x-3"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <span className="font-mono text-xs text-slate-500 w-5 text-right">{index + 1}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{item.title}</p>
                    <p className="text-[11px] text-slate-400 truncate">{item.artist}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                    {item.target_quality}
                  </span>

                  {/* Reorder Up/Down */}
                  <div className="flex items-center space-x-0.5">
                    <button
                      onClick={() => onReorder(item.id, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-20"
                      title="Move up in queue"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onReorder(item.id, 'down')}
                      disabled={index === pendingItems.length - 1}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-20"
                      title="Move down in queue"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => onCancel(item.id)}
                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-white/5"
                    title="Remove from queue"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed & Failed History */}
      {finishedItems.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Recent Activity ({finishedItems.length})
          </h3>
          <div className="space-y-2">
            {finishedItems.map((item) => (
              <div
                key={item.id}
                className="glass-card p-3 rounded-xl flex items-center justify-between space-x-3 text-xs"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {item.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 truncate">{item.title}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {item.artist} · {item.error_message || 'Saved to Navidrome'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {item.status === 'failed' && (
                    <button
                      onClick={() => onRetry(item.id)}
                      className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-medium transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  )}
                  {item.status === 'completed' && item.file_path && (
                    <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 truncate max-w-xs">
                      {item.file_path.split('/').pop()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
