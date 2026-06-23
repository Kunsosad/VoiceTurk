import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  hoverable?: boolean;
  key?: string | number;
}

export function Card({ children, className = '', onClick, hoverable = false, ...props }: CardProps) {
  let cardClass = 'bg-zinc-950/80 border border-white/5 rounded-2xl p-5 shadow-2xl backdrop-blur-sm relative overflow-hidden ';
  
  if (hoverable) {
    cardClass += 'hover:border-white/10 hover:shadow-zinc-950/50 transition-all duration-300 ';
  }
  
  if (onClick) {
    cardClass += 'cursor-pointer active:scale-[0.99] select-none ';
  }

  return (
    <div className={`${cardClass} ${className}`} onClick={onClick} {...props}>
      {children}
    </div>
  );
}
