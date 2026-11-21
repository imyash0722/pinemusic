import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, X, Music2 } from 'lucide-react';
import { TrackItem } from '../types';

interface PreviewPlayerProps {
  currentTrack: TrackItem | null;
  onClose: () => void;
}

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({ currentTrack, onClose }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (currentTrack?.preview_url) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(currentTrack.preview_url);
      audioRef.current = audio;

      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
      });

      audio.play().then(() => setIsPlaying(true)).catch(e => console.log('Audio autoplay prevented:', e));

      return () => {
        audio.pause();
        audio.remove();
      };
    } else {
      setIsPlaying(false);
      setProgress(0);
    }
  }, [currentTrack]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-2xl z-50 animate-in fade-in slide-in-from-bottom duration-300">
      <div className="glass-panel p-3 rounded-2xl bg-obsidian-900/90 border border-emerald-500/30 shadow-2xl shadow-obsidian-950/80 backdrop-blur-2xl flex items-center justify-between space-x-4">
        {/* Track Info */}
        <div className="flex items-center space-x-3 min-w-0">
          {currentTrack.cover_url ? (
            <img
              src={currentTrack.cover_url}
              alt={currentTrack.title}
              className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
              <Music2 className="w-6 h-6 text-slate-400" />
            </div>
          )}
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{currentTrack.title}</h4>
            <p className="text-xs text-slate-400 truncate">{currentTrack.artist}</p>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-pine-500/10 text-pine-400 border border-pine-500/20">
              30s Hi-Fi Preview
            </span>
          </div>
        </div>

        {/* Center Controls & Mini Visualizer */}
        <div className="flex items-center space-x-3 shrink-0">
          {/* Animated Waveform Bars */}
          <div className="hidden sm:flex items-center space-x-1 h-5 px-2">
            {[40, 70, 100, 60, 30, 85, 45, 95].map((h, i) => (
              <span
                key={i}
                style={{ height: isPlaying ? `${h}%` : '20%' }}
                className="w-1 bg-emerald-400/80 rounded-full transition-all duration-200"
              />
            ))}
          </div>

          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20 transition-transform active:scale-95"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
        </div>

        {/* Progress & Close */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden hidden sm:block">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-150" style={{ width: `${progress}%` }} />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
