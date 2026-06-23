import React from 'react';

interface ButtonProps {
  variant?: 'cyan' | 'violet' | 'emerald' | 'rose' | 'dark' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  id?: string;
}

export function Button({ 
  variant = 'dark', 
  size = 'md', 
  children, 
  className = '', 
  disabled, 
  onClick,
  type = 'button',
  id,
  ...props 
}: ButtonProps) {
  let baseClass = 'font-sans font-bold transition-all rounded-full select-none cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 border ';

  // Variant classes
  switch (variant) {
    case 'cyan':
      baseClass += 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-500/30 font-semibold hover:shadow-cyan-500/15 disabled:bg-cyan-950/20 disabled:text-zinc-600 disabled:border-white/5 disabled:scale-100 disabled:cursor-not-allowed';
      break;
    case 'violet':
      baseClass += 'bg-violet-600 hover:bg-violet-500 text-white border-violet-500/30 font-semibold hover:shadow-violet-500/15 disabled:bg-violet-950/20 disabled:text-zinc-600 disabled:border-white/5 disabled:scale-100 disabled:cursor-not-allowed';
      break;
    case 'emerald':
      baseClass += 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/40 font-semibold hover:shadow-emerald-500/10 disabled:scale-100 disabled:cursor-not-allowed';
      break;
    case 'rose':
      baseClass += 'bg-rose-950/40 hover:bg-rose-900 border-rose-500/30 text-rose-400 disabled:scale-100 disabled:cursor-not-allowed';
      break;
    case 'outline':
      baseClass += 'bg-transparent hover:bg-white/5 text-zinc-300 hover:text-white border-white/10 hover:border-white/20 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed';
      break;
    default:
      baseClass += 'bg-zinc-900 hover:bg-zinc-800 text-white border-white/10 hover:border-white/15 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed';
      break;
  }

  // Size classes
  switch (size) {
    case 'sm':
      baseClass += ' px-3.5 py-1.5 text-[11px]';
      break;
    case 'lg':
      baseClass += ' px-6 py-3 text-sm';
      break;
    default:
      baseClass += ' px-4 py-2.5 text-xs';
      break;
  }

  return (
    <button 
      className={`${baseClass} ${className}`} 
      disabled={disabled}
      onClick={onClick}
      type={type}
      id={id}
    >
      {children}
    </button>
  );
}
