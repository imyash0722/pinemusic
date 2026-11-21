import React, { useState } from 'react';
import { Layers, Clock, CheckCircle2, ExternalLink, Music2, AlertCircle } from 'lucide-react';
import { RequestItem, SystemStatus } from '../types';

interface RequestsTabProps {
  requests: RequestItem[];
  systemStatus: SystemStatus | null;
}

export const RequestsTab: React.FC<RequestsTabProps> = ({ requests, systemStatus }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'available'>('all');

  const filteredRequests = requests.filter((r) => {
    if (filter === 'pending') return r.status === 'pending' || r.status === 'processing';
    if (filter === 'available') return r.status === 'available';
    return true;
  });

  const navidromeUrl = systemStatus?.navidrome?.url || 'http://localhost:4533';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Ombi Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <span>Music Requests Ledger</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Ombi-style request tracking and automated library availability lifecycle.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1 p-1 rounded-xl bg-obsidian-900 border border-white/10">
          {(['all', 'pending', 'available'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                filter === f
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-xs glass-panel rounded-2xl">
          No music requests recorded in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className="glass-card p-4 rounded-2xl flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start space-x-3">
                {req.cover_url ? (
                  <img
                    src={req.cover_url}
                    alt={req.title}
                    className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <Music2 className="w-6 h-6 text-slate-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-white/5 text-slate-400 border border-white/5">
                      {req.item_type}
                    </span>
                    {/* Status Pill */}
                    {req.status === 'available' ? (
                      <span className="flex items-center space-x-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Available</span>
                      </span>
                    ) : req.status === 'processing' ? (
                      <span className="flex items-center space-x-1 text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                        <Clock className="w-3 h-3 animate-spin" />
                        <span>Downloading</span>
                      </span>
                    ) : req.status === 'failed' ? (
                      <span className="flex items-center space-x-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                        <AlertCircle className="w-3 h-3" />
                        <span>Failed</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                        <Clock className="w-3 h-3" />
                        <span>Requested</span>
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white truncate mt-1">{req.title}</h4>
                  <p className="text-xs text-slate-400 truncate">{req.artist}</p>
                </div>
              </div>

              {/* Footer info & Navidrome link */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono">{new Date(req.created_at).toLocaleDateString()}</span>
                {req.status === 'available' ? (
                  <a
                    href={navidromeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    <span>Play in Navidrome</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-slate-500">{req.quality.toUpperCase()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
