import React from 'react';
import { Disc3, ListMusic, Layers, Sparkles, HardDrive, Radio, ExternalLink } from 'lucide-react';
import { SystemStatus } from '../types';
import { PineappleGuitarLogo } from './PineappleGuitarLogo';

interface NavbarProps {
  activeTab: 'discover' | 'queue' | 'requests' | 'library';
  setActiveTab: (tab: 'discover' | 'queue' | 'requests' | 'library') => void;
  systemStatus: SystemStatus | null;
  wsConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  systemStatus,
  wsConnected,
}) => {
  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-white/10 bg-obsidian-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('discover')}>
          <div className="w-10 h-10 rounded-xl bg-obsidian-900 border border-white/10 flex items-center justify-center p-1.5 shadow-sm hover:border-pine-500/40 transition-colors">
            <PineappleGuitarLogo size={32} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight text-white">
                PineMusic
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-pine-500/15 text-pine-400 border border-pine-500/20 font-semibold tracking-wide">
                Navidrome
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Lossless Request & Ingest Orchestrator</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 p-1 rounded-xl bg-white/[0.03] border border-white/5">
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'discover'
                ? 'bg-pine-500/20 text-emerald-300 border border-pine-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Discover</span>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all relative ${
              activeTab === 'queue'
                ? 'bg-pine-500/20 text-emerald-300 border border-pine-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            <ListMusic className="w-4 h-4" />
            <span>Queue</span>
            {systemStatus && (systemStatus.queue.active > 0 || systemStatus.queue.pending > 0) && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-cyan-500 text-obsidian-950 font-bold">
                {systemStatus.queue.active + systemStatus.queue.pending}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'requests'
                ? 'bg-pine-500/20 text-emerald-300 border border-pine-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Requests</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'library'
                ? 'bg-pine-500/20 text-emerald-300 border border-pine-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            <Disc3 className="w-4 h-4" />
            <span>Device Library</span>
          </button>
        </nav>

        {/* Live Badges */}
        <div className="flex items-center space-x-3 text-xs">
          {/* Storage Free */}
          {systemStatus?.storage && (
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-obsidian-900 border border-white/5 text-slate-300">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono text-emerald-400 font-semibold">{systemStatus.storage.free_gb} GB</span>
              <span className="text-slate-500">free</span>
            </div>
          )}

          {/* Navidrome Link */}
          <a
            href={systemStatus?.navidrome?.url || 'http://localhost:4533'}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-obsidian-900 border border-white/5 text-slate-300 hover:border-pine-500/40 transition-colors"
            title="Open Navidrome Music Player"
          >
            <Radio className={`w-3.5 h-3.5 ${systemStatus?.navidrome?.online ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`} />
            <span className="hidden sm:inline">Navidrome</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>

          {/* WebSocket Status */}
          <div
            className={`w-2.5 h-2.5 rounded-full ${wsConnected ? 'bg-emerald-400 ring-2 ring-emerald-400/20' : 'bg-rose-500'}`}
            title={wsConnected ? 'Live WebSocket connected' : 'Connecting WebSocket...'}
          />
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-white/5 py-2 px-1 bg-obsidian-900/90">
        <button
          onClick={() => setActiveTab('discover')}
          className={`flex flex-col items-center py-1 px-3 text-[11px] ${activeTab === 'discover' ? 'text-emerald-400' : 'text-slate-400'}`}
        >
          <Sparkles className="w-4 h-4 mb-0.5" />
          Discover
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex flex-col items-center py-1 px-3 text-[11px] relative ${activeTab === 'queue' ? 'text-emerald-400' : 'text-slate-400'}`}
        >
          <ListMusic className="w-4 h-4 mb-0.5" />
          Queue
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex flex-col items-center py-1 px-3 text-[11px] ${activeTab === 'requests' ? 'text-emerald-400' : 'text-slate-400'}`}
        >
          <Layers className="w-4 h-4 mb-0.5" />
          Requests
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`flex flex-col items-center py-1 px-3 text-[11px] ${activeTab === 'library' ? 'text-emerald-400' : 'text-slate-400'}`}
        >
          <Disc3 className="w-4 h-4 mb-0.5" />
          Library
        </button>
      </div>
    </header>
  );
};
