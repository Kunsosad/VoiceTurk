import React from 'react';
import { ArrowRight, PlusCircle } from 'lucide-react';
import { Campaign, AppView } from '../../../shared/types';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { formatMoneyVND } from '../../../shared/formatters';

interface BuyerCampaignsPageProps {
  campaigns: Campaign[];
  onSelectCampaign: (camp: Campaign) => void;
  onNavigate: (view: AppView) => void;
}

export function BuyerCampaignsPage({ campaigns, onSelectCampaign, onNavigate }: BuyerCampaignsPageProps) {
  return (
    <div id="buyer-campaigns-screen" className="space-y-8 py-4 animate-fadeIn font-sans">
      {/* Premium Hero Banner */}
      <Card className="bg-gradient-to-r from-cyan-950/40 via-[#0B0B12] to-indigo-950/40 border border-white/10 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-2xl text-left relative z-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            BUYER WORKSPACE ACTIVE
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight font-sans">
            Trusted Vietnamese Voice Data <br/>
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">for AI Models</span>
          </h1>
          <p className="text-sm text-[#A8A5B5] leading-relaxed">
            Build real-world customer support roleplays. Let contributors interact with customized AI Customers to generate high-fidelity, verified Vietnamese conversational datasets.
          </p>
        </div>
      </Card>

      {/* Main Campaign Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white font-sans text-left">Your Campaigns</h2>
            <p className="text-xs text-[#6F6B7E] text-left">Track collection progress, secure escrow budgets, and approve contributor voice recordings.</p>
          </div>
          
          <Button
            id="btn-create-campaign-ai"
            variant="cyan"
            onClick={() => onNavigate('buyer-create-agent')}
            className="flex items-center justify-center gap-1.5 font-bold self-start sm:self-auto"
          >
            Create campaign with AI
          </Button>
        </div>

        {/* Campaign List */}
        <div className="grid grid-cols-1 gap-6">
          {campaigns.map((camp) => {
            const targetSize = camp.targetAcceptedRecordings || camp.targetRecordings || 50;
            const progressPct = Math.round((camp.acceptedRecordings / targetSize) * 100);
            return (
              <div
                key={camp.id}
                onClick={() => {
                  onSelectCampaign(camp);
                  onNavigate('buyer-campaign-review');
                }}
                className="group relative bg-[#0B0B12] hover:bg-zinc-900/60 border border-white/5 hover:border-cyan-500/30 rounded-xl p-6 cursor-pointer transition-all duration-300 shadow-lg flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
              >
                {/* Left Content */}
                <div className="space-y-3 max-w-xl text-left">
                  <div className="flex items-center gap-2.5">
                    <Badge variant={camp.status === 'Active' ? 'emerald' : 'amber'}>
                      {camp.status === 'Active' ? 'ACTIVE' : 'DRAFT'}
                    </Badge>
                    <span className="text-[11px] text-[#6F6B7E] font-mono">
                      Created: 15/06/2026
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#F7F4ED] group-hover:text-cyan-400 transition-colors font-sans">
                    {camp.name}
                  </h3>
                  <p className="text-xs text-[#A8A5B5] line-clamp-2 leading-relaxed">
                    {camp.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-1.5 text-[11px] text-[#6F6B7E] font-mono">
                    <span>Rules: {camp.boundary || camp.conversationLimit}</span>
                    <span>Reward: <b className="text-cyan-400">{formatMoneyVND(camp.pricePerRecording || 8000)}</b> / recording</span>
                  </div>
                </div>

                {/* Middle Stats block */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-x-6 gap-y-4 lg:border-l lg:border-white/10 lg:pl-6 w-full lg:w-auto">
                  <div className="text-left">
                    <p className="text-[9px] text-[#6F6B7E] font-mono uppercase tracking-wider font-semibold">PENDING REVIEW</p>
                    <p className="text-lg font-mono font-bold text-amber-400">{camp.pendingReviewCount}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] text-[#6F6B7E] font-mono uppercase tracking-wider font-semibold">ACCEPTED</p>
                    <p className="text-lg font-mono font-bold text-white">
                      {camp.acceptedRecordings} <span className="text-[#6F6B7E] text-xs">/ {targetSize}</span>
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] text-[#6F6B7E] font-mono uppercase tracking-wider font-semibold">SECURED BUDGET</p>
                    <p className="text-xs font-mono font-semibold text-teal-400">
                      {formatMoneyVND(camp.securedBudget || camp.totalBudget || 0)}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] text-[#6F6B7E] font-mono uppercase tracking-wider font-semibold">PAID REWARDS</p>
                    <p className="text-xs font-mono font-semibold text-indigo-300">
                      {formatMoneyVND(camp.payoutAccrued || 0)}
                    </p>
                  </div>
                </div>

                {/* Right: Progress block */}
                <div className="flex items-center gap-4 border-t border-white/5 lg:border-0 pt-4 lg:pt-0 w-full lg:w-auto justify-between lg:justify-end">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <svg className="w-12 h-12 transform -rotate-90">
                        <circle cx="24" cy="24" r="18" className="stroke-zinc-800" strokeWidth="3" fill="transparent" />
                        <circle cx="24" cy="24" r="18" className="stroke-cyan-500" strokeWidth="3" fill="transparent" strokeDasharray={`${progressPct * 1.13} 113`} strokeLinecap="round" />
                      </svg>
                      <span className="absolute text-[10px] font-mono font-bold text-cyan-400">{progressPct}%</span>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-white leading-tight">Progress</p>
                      <p className="text-[10px] text-[#A8A5B5] font-mono whitespace-nowrap">{camp.acceptedRecordings} approved</p>
                    </div>
                  </div>
                  
                  <div className="w-8 h-8 rounded-full bg-zinc-950 flex items-center justify-center group-hover:bg-cyan-950 group-hover:text-cyan-400 transition-all border border-white/10 shrink-0">
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
export default BuyerCampaignsPage;
