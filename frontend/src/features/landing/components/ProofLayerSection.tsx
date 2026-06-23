import React from 'react';
import { ShieldCheck, FileCheck, Landmark, CheckCircle } from 'lucide-react';

export function ProofLayerSection() {
  const cards = [
    {
      icon: <FileCheck className="w-5 h-5 text-cyan-400" />,
      title: "Campaign Terms",
      desc: "Original scenario guidelines, target specifications, and pricing metrics are securely cryptographically hashed."
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-teal-400" />,
      title: "Contributor Consent",
      desc: "Contributors accept cryptographic consent agreements to authorize machine training uses safely."
    },
    {
      icon: <Landmark className="w-5 h-5 text-indigo-400" />,
      title: "Secured Budget",
      desc: "Reward funds are held securely until validation audits are accepted by the scenario buyer."
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-violet-400" />,
      title: "Dataset Handover",
      desc: "Completion certificates provide proof of dataset delivery, file count hashes, and audio authenticity."
    }
  ];

  return (
    <section id="proof-layer" className="py-16 border-t border-white/5 bg-zinc-950/25 selection:bg-teal-500/30 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 pb-12">
          <span className="text-[10px] font-bold text-cyan-400 font-mono tracking-widest uppercase">
            PROOF BACKED INFRASTRUCTURE
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Proof-backed delivery
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            Campaign terms, contributor consent, secured budget, and dataset handover can be stored as proof records.
          </p>
        </div>

        {/* 4 Cards Grid - Responsive stack to 2x2 then 1-col */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto pt-2">
          {cards.map((c, idx) => (
            <div 
              key={idx}
              className="bg-zinc-950/40 border border-white/5 p-5 rounded-2xl hover:border-white/10 transition-all duration-300 flex flex-col justify-between space-y-4"
            >
              <div className="p-2 border border-white/10 rounded-lg w-fit bg-zinc-900/40">
                {c.icon}
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-extrabold text-white">
                  {c.title}
                </h3>
                <p className="text-[11.5px] text-zinc-400 leading-relaxed">
                  {c.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
