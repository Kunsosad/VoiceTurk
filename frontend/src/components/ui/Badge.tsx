import React from 'react';

interface BadgeProps {
  variant?: 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose' | 'neutral';
  children: React.ReactNode;
}

export function Badge({ variant = 'neutral', children }: BadgeProps) {
  let baseClass = 'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wider uppercase border ';
  
  switch (variant) {
    case 'cyan':
      baseClass += 'bg-cyan-950/40 text-cyan-400 border-cyan-500/20';
      break;
    case 'violet':
      baseClass += 'bg-violet-950/40 text-violet-400 border-violet-500/20';
      break;
    case 'emerald':
      baseClass += 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20';
      break;
    case 'amber':
      baseClass += 'bg-amber-950/40 text-amber-400 border-amber-500/20';
      break;
    case 'rose':
      baseClass += 'bg-rose-950/40 text-rose-450 border-rose-500/20';
      break;
    default:
      baseClass += 'bg-zinc-900 text-zinc-400 border-zinc-700/50';
      break;
  }

  return (
    <span className={baseClass}>
      {children}
    </span>
  );
}
