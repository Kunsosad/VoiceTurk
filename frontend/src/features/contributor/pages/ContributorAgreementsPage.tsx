import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { ContributorAgreement, AppView } from '../../../shared/types';

interface ContributorAgreementsPageProps {
  agreements: ContributorAgreement[];
  onNavigate: (view: AppView) => void;
}

export function ContributorAgreementsPage({ agreements, onNavigate }: ContributorAgreementsPageProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div id="contributor-agreements-screen" className="space-y-6 py-4 animate-fadeIn text-left font-sans text-white">
      <div className="space-y-1 pb-2 border-b border-white/10">
        <h1 className="text-xl font-bold text-white font-sans uppercase tracking-tight">Vocal Release & Consent Agreements</h1>
        <p className="text-xs text-[#A8A5B5]">Review signed legal parameters, acoustic license deeds, neural network training releases, and security clearances</p>
      </div>

      <div className="space-y-4">
        {agreements.map((agree) => (
          <Card
            key={agree.id}
            className="p-0 overflow-hidden hover:border-white/15 transition-all text-left"
          >
            {/* Header row click */}
            <div
              onClick={() => toggleExpand(agree.id)}
              className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-white/2"
            >
              <div className="space-y-1 text-left flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="emerald">
                    Completed & Countersigned
                  </Badge>
                  <span className="text-[10px] text-[#6F6B7E] font-mono leading-none">Agreement Hash: {agree.id}</span>
                </div>
                <h3 className="text-sm font-bold text-white font-sans pt-1">
                  Consent Clearance: {agree.campaignName}
                </h3>
                <p className="text-[10.5px] text-[#A8A5B5] font-mono leading-none">Signed on: {agree.confirmedTime}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[9px] text-[#6F6B7E] font-mono block uppercase">Baseline reward payout:</span>
                  <span className="text-xs text-teal-400 font-mono font-bold">{agree.rewardRule ? agree.rewardRule.split('.')[0] : "8,000 VND"}</span>
                </div>
                <button className="text-zinc-300 font-bold text-[10.5px] uppercase hover:text-white px-3 py-1 bg-white/5 hover:bg-white/10 rounded-full cursor-pointer transition-all">
                  {expandedId === agree.id ? 'Collapse' : 'Expand Details'}
                </button>
              </div>
            </div>

            {/* Expanded content details */}
            {expandedId === agree.id && (
              <div className="px-5 pb-5 pt-3 border-t border-white/5 bg-zinc-950/40 space-y-3">
                <div className="space-y-1.5 text-left">
                  <span className="text-[10px] text-[#6F6B7E] font-mono block uppercase font-bold text-left">Agreement Terms & Conditions:</span>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans block">
                    {agree.consentDetails}
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap gap-2 text-[9.5px] font-mono text-[#6F6B7E] select-none font-bold">
                  <span className="bg-white/5 border border-white/5 px-2 py-1 rounded text-slate-300">Licensor: Contributor Profile</span>
                  <span className="bg-white/5 border border-white/5 px-2 py-1 rounded text-slate-300">Escrow Protection: Active</span>
                  <span className="bg-white/5 border border-white/5 px-2 py-1 rounded text-slate-300">On-chain Record Logged</span>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
export default ContributorAgreementsPage;
