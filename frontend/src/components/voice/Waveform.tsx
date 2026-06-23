import React from 'react';
import { motion } from 'motion/react';

interface WaveformProps {
  isPlaying: boolean;
  color?: 'cyan' | 'violet' | 'emerald';
}

export function Waveform({ isPlaying, color = 'cyan' }: WaveformProps) {
  const bars = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    height: 4 + Math.random() * 24,
    speed: 0.2 + Math.random() * 0.4
  }));

  let colorClass = 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]';
  if (color === 'violet') {
    colorClass = 'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]';
  } else if (color === 'emerald') {
    colorClass = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
  }

  return (
    <div className="flex items-end justify-center gap-1.5 h-10 w-44 px-3 mx-auto">
      {bars.map(bar => (
        <motion.div
          key={bar.id}
          animate={
            isPlaying
              ? { scaleY: [1, 2.5, 0.8, 1.8, 1] }
              : { scaleY: 1 }
          }
          transition={
            isPlaying
              ? {
                  duration: bar.speed,
                  repeat: Infinity,
                  repeatType: 'reverse' as const,
                  ease: 'easeInOut'
                }
              : undefined
          }
          className={`w-1 rounded-full origin-bottom transition-all ${colorClass}`}
          style={{ height: isPlaying ? '35%' : `${bar.height}px` }}
        />
      ))}
    </div>
  );
}
export default Waveform;
