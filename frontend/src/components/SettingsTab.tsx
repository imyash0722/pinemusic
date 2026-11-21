import React from 'react';
import { Settings2, Server, ShieldCheck, Database, Radio, HardDrive, Cpu } from 'lucide-react';
import { SystemStatus } from '../types';

interface SettingsTabProps {
  systemStatus: SystemStatus | null;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ systemStatus }) => {
  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
          <Settings2 className="w-5 h-5 text-emerald-400" />
          <span>Appliance & Ingest Configuration</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Decoupled backend daemon architecture listening on dedicated port :8090.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Navidrome Subsonic Integration */}
        <div className="glass-panel p-5 rounded-2xl bg-obsidian-900 border border-white/10 space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Radio className="w-4 h-4" />
            <h3 className="text-sm font-bold text-white">Navidrome Subsonic Node</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Automatic rescan notifications are sent via Subsonic REST API upon queue completion.
          </p>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2 rounded-lg bg-obsidian-950 border border-white/5">
              <span className="text-slate-500">API Endpoint:</span>
              <span className="text-slate-200">{systemStatus?.navidrome?.url || 'http://127.0.0.1:4533'}</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-obsidian-950 border border-white/5">
              <span className="text-slate-500">Node Status:</span>
              <span className={systemStatus?.navidrome?.online ? 'text-emerald-400 font-semibold' : systemStatus === null ? 'text-amber-400' : 'text-rose-400'}>
                {systemStatus === null ? 'CONNECTING...' : systemStatus?.navidrome?.online ? 'CONNECTED / SCAN READY' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>

        {/* Media Storage Vault */}
        <div className="glass-panel p-5 rounded-2xl bg-obsidian-900 border border-white/10 space-y-3">
          <div className="flex items-center space-x-2 text-cyan-400">
            <HardDrive className="w-4 h-4" />
            <h3 className="text-sm font-bold text-white">Music Storage Vault</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Tracks are stored in standard hierarchical structure: <code>Artist/Album/Track - Title.ext</code>.
          </p>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2 rounded-lg bg-obsidian-950 border border-white/5">
              <span className="text-slate-500">Storage Root:</span>
              <span className="text-slate-200 truncate">{systemStatus?.storage?.path || '/srv/media/music'}</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-obsidian-950 border border-white/5">
              <span className="text-slate-500">Available Space:</span>
              <span className="text-cyan-400 font-semibold">{systemStatus?.storage?.free_gb ?? 0} GB Free</span>
            </div>
          </div>
        </div>

        {/* Proton VPN Selective Split Routing */}
        <div className="glass-panel p-5 rounded-2xl bg-obsidian-900 border border-white/10 space-y-3">
          <div className="flex items-center space-x-2 text-amber-400">
            <ShieldCheck className="w-4 h-4" />
            <h3 className="text-sm font-bold text-white">Outbound Privacy Gateway</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Antra and lossless ingest pipelines are bound through Proton VPN Proxy (127.0.0.1:1088).
          </p>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2 rounded-lg bg-obsidian-950 border border-white/5">
              <span className="text-slate-500">Proxy Gateway:</span>
              <span className="text-slate-200">http://127.0.0.1:1088</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-obsidian-950 border border-white/5">
              <span className="text-slate-500">Tunnel Routing:</span>
              <span className="text-amber-400 font-semibold">SO_MARK 0x5182 (dev proton)</span>
            </div>
          </div>
        </div>

        {/* Ingest Daemon Engine */}
        <div className="glass-panel p-5 rounded-2xl bg-obsidian-900 border border-white/10 space-y-3">
          <div className="flex items-center space-x-2 text-purple-400">
            <Cpu className="w-4 h-4" />
            <h3 className="text-sm font-bold text-white">Ingest Daemon & Queuer</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Multi-threaded asynchronous task queue with real-time WebSocket state broadcasting.
          </p>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2 rounded-lg bg-obsidian-950 border border-white/5">
              <span className="text-slate-500">Active Queue:</span>
              <span className="text-purple-400 font-semibold">{systemStatus?.queue?.active ?? 0} active / {systemStatus?.queue?.pending ?? 0} pending</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-obsidian-950 border border-white/5">
              <span className="text-slate-500">Service Port:</span>
              <span className="text-slate-200">:8090 (Standalone)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
