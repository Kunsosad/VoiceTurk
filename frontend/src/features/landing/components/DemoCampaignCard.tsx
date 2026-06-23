import React from 'react';
import { ArrowRight, BadgeAlert, CheckCircle, ShieldCheck } from 'lucide-react';
import { DEMO_CAMPAIGN } from '../../../shared/copy/demoContent';

interface DemoCampaignCardProps {
  onTryCampaign: () => void;
}

export function DemoCampaignCard({ onTryCampaign }: DemoCampaignCardProps) {
  return (
    <section id="demo-campaign" className="py-16 border-t border-white/5 selection:bg-teal-500/30 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 pb-12">
          <span className="text-[10px] font-bold text-teal-400 font-mono tracking-widest uppercase">
            ACTIVE BLUEPRINT
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Canonical Demo Campaign
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Every workspace account has access to our certified test dataset templates. Tap to explore how criteria transforms into audio payloads.
          </p>
        </div>

        {/* Campaign showcase container */}
        <div className="max-w-3xl mx-auto bg-gradient-to-br from-zinc-950 to-zinc-900 border border-white/10 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          
          {/* Subtle glow background */}
          <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-cyan-500/5 blur-[80px] pointer-events-none" />

          <div className="space-y-6">
            
            {/* Header metadata row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
              <div>
                <span className="text-[10px] font-bold text-teal-400 font-mono tracking-widest uppercase block mb-1">
                  CAMPAIGN TYPE: CUSTOMER SUPPORT SCENARIO
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {DEMO_CAMPAIGN.name}
                </h3>
              </div>
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-1.5 self-start sm:self-auto">
                <span className="text-[9.5px] font-bold text-cyan-300 font-mono uppercase tracking-wider">
                  SOLANA SECURED
                </span>
              </div>
            </div>

            {/* Main content columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1 bg-zinc-950/50 p-4 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">
                  Scenario Context (Bối cảnh tiếng Việt)
                </span>
                <p className="text-zinc-300 leading-relaxed text-[13px] font-sans">
                  {DEMO_CAMPAIGN.context}
                </p>
              </div>

              <div className="space-y-4 bg-zinc-950/50 p-4 rounded-xl border border-white/5">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                    AI Customer Character
                  </span>
                  <p className="text-zinc-300 text-[12.5px]">
                    {DEMO_CAMPAIGN.aiCustomerRole}
                  </p>
                </div>
                <div className="space-y-1 border-t border-white/5 pt-2">
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider block">
                    Contributor Instruction
                  </span>
                  <p className="text-zinc-300 text-[12.5px]">
                    {DEMO_CAMPAIGN.contributorRole}
                  </p>
                </div>
              </div>
            </div>

            {/* Campaign specs bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-white/5 text-xs">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Target dataset size:</span>
                  <span className="font-bold text-white bg-zinc-90 w-fit px-2 py-0.5 rounded border border-white/10 font-sans">
                    {DEMO_CAMPAIGN.targetAcceptedRecordings} accepted recordings
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Contributor reward:</span>
                  <span className="font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                    {DEMO_CAMPAIGN.pricePerRecording.toLocaleString()} VND / recording
                  </span>
                </div>
              </div>

              <button
                onClick={onTryCampaign}
                className="px-5 py-3 bg-cyan-500 text-black hover:bg-cyan-400 text-xs font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
              >
                Try this campaign
                <ArrowRight size={14} />
              </button>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
