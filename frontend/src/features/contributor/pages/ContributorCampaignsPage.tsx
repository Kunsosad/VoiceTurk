import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Campaign, AppView } from '../../../shared/types';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { formatMoneyVND } from '../../../shared/formatters';

interface ContributorCampaignsPageProps {
  campaigns: Campaign[];
  onSelectCampaign: (camp: Campaign) => void;
  onNavigate: (view: AppView) => void;
}

export function ContributorCampaignsPage({ campaigns, onSelectCampaign, onNavigate }: ContributorCampaignsPageProps) {
  return (
    <div id="contributor-campaigns-screen" className="space-y-8 py-4 animate-fadeIn font-sans text-white">
      {/* Premium Hero Banner */}
      <Card className="relative overflow-hidden bg-gradient-to-r from-violet-950/40 via-[#0B0B12] to-cyan-950/40 border border-white/10 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-2xl text-left relative z-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-350 border border-violet-500/20 text-xs font-mono font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            CONTRIBUTOR PORTAL ACTIVE
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight font-sans">
            Your Voice, Your Terms<br />
            <span className="bg-gradient-to-r from-violet-300 to-teal-300 bg-clip-text text-transparent">Turn Dialogues into Payouts</span>
          </h1>
          <p className="text-sm text-[#A8A5B5] leading-relaxed font-sans">
            Choose from authentic business scenarios, roleplay live interactively with smart AI customers via your microphone, and secure verified payouts as soon as your acoustic tracks are approved.
          </p>
        </div>
      </Card>

      {/* Campaigns list */}
      <div className="space-y-4">
        <div className="text-left space-y-1">
          <h2 className="text-lg font-bold text-white">Available Audio Scenarios</h2>
          <p className="text-xs text-[#6F6B7E]">Choose an active prompt page to roleplay, review dialogue constraints, and tap 'Participate' to start.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map((camp) => (
            <Card
              key={camp.id}
              className="p-6 flex flex-col justify-between space-y-4 transition-all duration-300 text-left"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="cyan">
                    Escrow Secured
                  </Badge>
                  <div className="text-right">
                    <span className="text-[9px] text-[#6F6B7E] font-mono uppercase block">Required Pacing</span>
                    <span className="text-xs text-white font-mono font-bold">3–5 turns</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white font-sans">
                  {camp.name}
                </h3>
                <p className="text-xs text-[#A8A5B5] leading-relaxed line-clamp-3">
                  {camp.description}
                </p>

                {/* Scope specifics */}
                <div className="pt-2 grid grid-cols-2 gap-3 border-t border-white/5 text-[10.5px] font-mono text-[#6F6B7E]">
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-[#6F6B7E] mt-0.5">Your Assigned Role</span>
                    <span className="text-slate-300 font-semibold">{camp.contributorRole}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-[#6F6B7E] mt-0.5">Dialogue Boundary</span>
                    <span className="text-violet-300 font-semibold">{camp.boundary || camp.conversationLimit || "Max 5 turns"}</span>
                  </div>
                </div>
              </div>

              {/* Bottom reward trigger */}
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="text-left">
                   <span className="text-[10px] text-[#6F6B7E] font-mono uppercase block">payout reward release</span>
                   <span className="text-base font-mono font-bold text-[#2cd4bf]">
                     {formatMoneyVND(camp.pricePerRecording || 8000)} <span className="text-[10px] text-[#6F6B7E] font-mono">/ verified submission</span>
                   </span>
                </div>

                <Button
                  id={`btn-join-campaign-${camp.id}`}
                  variant="violet"
                  onClick={() => {
                    onSelectCampaign(camp);
                    onNavigate('contributor-consent');
                  }}
                  className="flex items-center gap-1.5 font-bold text-xs"
                >
                  Participate
                  <ArrowUpRight size={13} strokeWidth={2.5} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
export default ContributorCampaignsPage;
