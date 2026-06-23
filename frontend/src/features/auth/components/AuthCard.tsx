import React from 'react';

interface AuthCardProps {
  children: React.ReactNode;
}

export function AuthCard({ children }: AuthCardProps) {
  return (
    <div className="relative w-full max-w-lg mx-auto bg-zinc-950/80 border border-white/5 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md overflow-hidden">
      {/* Decorative background glow inside card borders */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10 space-y-4">
        {children}
      </div>
    </div>
  );
}
