import React from 'react';
import { FileText, Radio, Mic, HeartHandshake, FolderHeart } from 'lucide-react';

export function ProductFlow() {
  const steps = [
    {
      num: "01",
      icon: <FileText className="w-5 h-5 text-cyan-400" />,
      title: "Buyer Scenario",
      desc: "Buyer defines a client-support scenario and agent instructions."
    },
    {
      num: "02",
      icon: <Radio className="w-5 h-5 text-indigo-400 font-bold" />,
      title: "AI Customer Roleplay",
      desc: "An AI Customer uses model prompt parameters to act as the client."
    },
    {
      num: "03",
      icon: <Mic className="w-5 h-5 text-teal-400" />,
      title: "Contributor Record",
      desc: "A contributor acts as the support agent, completing the conversation."
    },
    {
      num: "04",
      icon: <HeartHandshake className="w-5 h-5 text-violet-400" />,
      title: "Buyer Review",
      desc: "Buyer inspects transcripts and approves or requests retakes."
    },
    {
      num: "05",
      icon: <FolderHeart className="w-5 h-5 text-pink-400" />,
      title: "Dataset Delivered",
      desc: "Only accepted recordings are packaged into the final training dataset."
    }
  ];

  return (
    <section id="how-it-works" className="py-16 border-t border-white/5 bg-zinc-950/20 selection:bg-teal-500/30 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 pb-12">
          <span className="text-[10px] font-bold text-cyan-400 font-mono tracking-widest uppercase">
            OPERATING MODEL
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            How VoiceTurk Works
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Secure, verified, five-step lifecycle guiding raw customer-support criteria into reliable language datasets.
          </p>
        </div>

        {/* Responsive Flex/Grid list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 pt-2">
          {steps.map((s, idx) => (
            <div 
              key={idx}
              className="relative overflow-hidden bg-zinc-950/40 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all duration-300 flex flex-col justify-between"
            >
              {/* Background Step Num Accent */}
              <div className="absolute top-2 right-4 text-3xl font-black text-white/5 font-mono select-none">
                {s.num}
              </div>

              <div className="space-y-4">
                <div className="p-2 border border-white/10 rounded-lg w-fit bg-zinc-900/60">
                  {s.icon}
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="text-sm font-extrabold text-white leading-snug">
                    {s.title}
                  </h3>
                  <p className="text-[11.5px] text-zinc-400 leading-relaxed font-sans">
                    {s.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
