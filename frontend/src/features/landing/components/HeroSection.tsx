import React from 'react';
import { ArrowRight, Play, CheckCircle, ShieldCheck, HelpCircle } from 'lucide-react';

interface HeroSectionProps {
  onGetStarted: () => void;
  onViewDemo: () => void;
}

export function HeroSection({ onGetStarted, onViewDemo }: HeroSectionProps) {
  return (
    <section className="relative pt-6 sm:pt-8 lg:pt-10 pb-12 lg:pb-16 overflow-hidden selection:bg-teal-500/30 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Headline, Subtitle, and CTAs */}
          <div className="lg:col-span-7 text-left space-y-6 sm:space-y-8">
            
            {/* Soft badge */}
            <div className="inline-flex items-center gap-1.5 py-1 px-3 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] font-bold text-cyan-300 font-mono tracking-widest uppercase">
                TRUSTED VIETNAMESE VOICE DATA
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none">
                The Web3 Soundstage for
                <br />
                <span className="bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-400 bg-clip-text text-transparent">
                  Vietnamese AI Voice Data
                </span>
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-zinc-300 max-w-2xl font-normal leading-relaxed">
                VoiceTurk turns AI-customer roleplays into buyer-reviewed Vietnamese voice datasets for customer support AI.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                onClick={onGetStarted}
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-black font-extrabold text-sm rounded-xl shadow-lg hover:shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                Get started
                <ArrowRight size={16} />
              </button>
              <button
                onClick={onViewDemo}
                className="w-full sm:w-auto px-6 py-3.5 bg-zinc-900 hover:bg-zinc-850 text-white font-bold text-sm rounded-xl border border-white/10 hover:border-white/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Play size={14} className="text-cyan-400 fill-cyan-400/20" />
                View demo flow
              </button>
            </div>

            {/* Micro stats features */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-4 text-xs text-zinc-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-teal-400" />
                <span>Verified by real human contributors</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-teal-400" />
                <span>AI Customer roleplays</span>
              </div>
            </div>
          </div>

          {/* Cinematic Interactive Visual Card */}
          <div className="lg:col-span-5 w-full">
            <div className="relative group mx-auto max-w-md lg:max-w-none">
              
              {/* Backglow element */}
              <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-3xl blur-[40px] opacity-[0.22] group-hover:opacity-[0.3] transition-all duration-700 pointer-events-none" />
              
              <div className="relative overflow-hidden bg-zinc-950/80 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
                
                {/* Visual Orb Header */}
                <div className="flex items-center justify-between pb-6 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-md animate-ping" />
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-lg">
                        AI
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white leading-tight">AI Customer simulation</h4>
                      <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">Orb stream active</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-teal-500/15 border border-teal-500/25 rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                    <span className="text-[9px] font-bold text-teal-300 font-mono tracking-wider">LIVE DATA</span>
                  </div>
                </div>

                {/* Animated Waveform Indicator */}
                <div className="py-8 flex flex-col items-center justify-center space-y-4">
                  <div className="flex items-center justify-center gap-1.5 h-12 w-full px-4">
                    <span className="w-1 bg-cyan-400 rounded-full h-4 animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <span className="w-1 bg-indigo-400 rounded-full h-8 animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="w-1 bg-teal-400 rounded-full h-10 animate-bounce" style={{ animationDelay: '0.3s' }} />
                    <span className="w-1 bg-cyan-500 rounded-full h-12 animate-bounce" style={{ animationDelay: '0.4s' }} />
                    <span className="w-1 bg-zinc-600 rounded-full h-5" />
                    <span className="w-1 bg-zinc-600 rounded-full h-4" />
                    <span className="w-1 bg-cyan-400 rounded-full h-8 animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <span className="w-1 bg-indigo-500 rounded-full h-11 animate-bounce" style={{ animationDelay: '0.25s' }} />
                    <span className="w-1 bg-teal-300 rounded-full h-9 animate-bounce" style={{ animationDelay: '0.35s' }} />
                    <span className="w-1 bg-cyan-300 rounded-full h-5 animate-bounce" style={{ animationDelay: '0.45s' }} />
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-mono text-zinc-400 font-bold tracking-widest uppercase">
                      "Tôi mua trong live vì thấy nói có quà"
                    </span>
                  </div>
                </div>

                {/* Core flow parameters */}
                <div className="space-y-3.5 pt-4 border-t border-white/5 text-xs">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="font-sans">Recording Unit</span>
                    <span className="font-bold text-white bg-zinc-900 px-2 py-0.5 rounded border border-white/5">
                      1 short campaign conversation
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="font-sans">Verification Layer</span>
                    <span className="font-bold text-teal-400 flex items-center gap-1">
                      <ShieldCheck size={14} /> Buyer reviewed
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="font-sans">Dataset Package</span>
                    <span className="font-bold text-cyan-400">Dataset ready</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
