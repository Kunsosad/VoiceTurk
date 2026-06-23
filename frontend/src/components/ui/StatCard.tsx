import React from 'react';
import { Card } from './Card';

interface StatCardProps {
  label?: string;
  title?: string;
  value: string | number;
  subtext?: string;
  badge?: string;
  badgeVariant?: string;
  variant?: 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose' | 'neutral';
}

export function StatCard({ label, title, value, subtext, badge, badgeVariant, variant = 'neutral' }: StatCardProps) {
  const displayLabel = label || title || '';
  const displaySubtext = subtext || badge || '';
  let accentBar = 'bg-zinc-700';
  let valueColor = 'text-white';
  
  switch (variant) {
    case 'cyan':
      accentBar = 'bg-cyan-500';
      valueColor = 'text-cyan-400';
      break;
    case 'violet':
      accentBar = 'bg-violet-500';
      valueColor = 'text-violet-400';
      break;
    case 'emerald':
      accentBar = 'bg-emerald-500';
      valueColor = 'text-emerald-400';
      break;
    case 'amber':
      accentBar = 'bg-amber-500';
      valueColor = 'text-amber-400';
      break;
    case 'rose':
      accentBar = 'bg-rose-500';
      valueColor = 'text-rose-450';
      break;
  }

  return (
    <Card className="flex flex-col justify-between py-4.5 px-5 select-none relative group h-full">
      {/* Decorative vertical bar indicators */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentBar}`} />
      
      <div>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1.5 font-sans">
          {displayLabel}
        </p>
        <p className={`text-xl sm:text-2xl font-mono font-black ${valueColor} tracking-tight leading-none`}>
          {value}
        </p>
      </div>
      
      {displaySubtext && (
        <p className="text-[9.5px] text-zinc-400 font-sans tracking-wide leading-none mt-2">
          {displaySubtext}
        </p>
      )}
    </Card>
  );
}
