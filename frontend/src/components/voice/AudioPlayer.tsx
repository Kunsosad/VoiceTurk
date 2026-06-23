import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Waveform } from './Waveform';
import { Button } from '../ui/Button';

interface AudioPlayerProps {
  duration?: string;
  themeColor?: 'cyan' | 'violet' | 'emerald';
}

export function AudioPlayer({ duration = '1m 15s', themeColor = 'cyan' }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return p + 2;
        });
      }, 150);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  return (
    <div className="p-4 rounded-2xl bg-zinc-950 border border-white/5 shadow-inner">
      <div className="flex flex-col gap-3">
        {/* Waveform indicator */}
        <Waveform isPlaying={isPlaying} color={themeColor} />

        {/* Progress Bar */}
        <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-white/5">
          <div 
            className={`h-full transition-all duration-150 ${
              themeColor === 'violet' ? 'bg-violet-600' : themeColor === 'emerald' ? 'bg-emerald-600' : 'bg-cyan-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Custom duration labels and control buttons */}
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 font-semibold mt-1">
          <span>0:{progress > 9 ? Math.floor(progress * 0.4) : '0' + Math.floor(progress * 0.4)}</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={togglePlay}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                isPlaying 
                  ? 'bg-rose-950/20 text-rose-400 border-rose-500/20 hover:border-rose-500/40' 
                  : 'bg-zinc-900 hover:bg-zinc-800 text-white border-white/10 hover:border-white/20'
              }`}
            >
              {isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" className="translate-x-[0.5px]" />}
            </button>
            <button 
              onClick={handleReset}
              className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 flex items-center justify-center cursor-pointer transition-all"
            >
              <RotateCcw size={13} />
            </button>
          </div>
          <span>{duration}</span>
        </div>
      </div>
    </div>
  );
}
export default AudioPlayer;
