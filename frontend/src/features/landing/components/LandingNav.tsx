import React, { useState } from 'react';
import { ShieldCheck, Menu, X } from 'lucide-react';

interface LandingNavProps {
  onSignIn: () => void;
  onGetStarted: () => void;
  onScrollTo: (elementId: string) => void;
}

export function LandingNav({ onSignIn, onGetStarted, onScrollTo }: LandingNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-[#050509]/80 backdrop-blur-md border-b border-white/5 selection:bg-teal-500/30 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="p-1.5 border border-cyan-500/30 bg-cyan-950/40 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-base font-extrabold text-white tracking-widest uppercase">
              VoiceTurk
            </span>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => onScrollTo('how-it-works')}
              className="text-xs font-semibold text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              How it works
            </button>
            <button 
              onClick={() => onScrollTo('demo-campaign')}
              className="text-xs font-semibold text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              Demo campaign
            </button>
            <button 
              onClick={() => onScrollTo('proof-layer')}
              className="text-xs font-semibold text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              Proof layer
            </button>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={onSignIn}
              className="text-xs font-bold text-zinc-300 hover:text-white px-4 py-2 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
            >
              Sign in
            </button>
            <button 
              onClick={onGetStarted}
              className="text-xs font-bold bg-cyan-500 text-black hover:bg-cyan-400 px-4 py-2 rounded-lg shadow-lg hover:shadow-cyan-500/20 transition-all cursor-pointer"
            >
              Get started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div className="md:hidden bg-[#050509]/95 border-b border-white/5 py-4 px-4 space-y-4 animate-scaleIn">
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => { onScrollTo('how-it-works'); setIsOpen(false); }}
              className="text-left py-2 text-xs font-medium text-zinc-300 hover:text-white"
            >
              How it works
            </button>
            <button 
              onClick={() => { onScrollTo('demo-campaign'); setIsOpen(false); }}
              className="text-left py-2 text-xs font-medium text-zinc-300 hover:text-white"
            >
              Demo campaign
            </button>
            <button 
              onClick={() => { onScrollTo('proof-layer'); setIsOpen(false); }}
              className="text-left py-2 text-xs font-medium text-zinc-400 hover:text-white"
            >
              Proof layer
            </button>
          </div>
          <div className="h-px bg-white/5 w-full my-1" />
          <div className="flex flex-col gap-2 pt-1">
            <button 
              onClick={() => { onSignIn(); setIsOpen(false); }}
              className="w-full text-center py-2.5 text-xs font-bold text-zinc-300 border border-white/10 rounded-lg bg-transparent hover:bg-white/5 transition-all"
            >
              Sign in
            </button>
            <button 
              onClick={() => { onGetStarted(); setIsOpen(false); }}
              className="w-full text-center py-2.5 text-xs font-bold bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 shadow-md transition-all"
            >
              Get started
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
