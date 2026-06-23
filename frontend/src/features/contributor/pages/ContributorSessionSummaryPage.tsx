import React from 'react';
import { CheckCircle } from 'lucide-react';
import { AppView } from '../../../shared/types';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';

interface ContributorSessionSummaryPageProps {
  campaignName: string;
  duration: string;
  onNavigate: (view: AppView) => void;
}

export function ContributorSessionSummaryPage({ campaignName, duration, onNavigate }: ContributorSessionSummaryPageProps) {
  return (
    <div id="session-summary-screen" className="max-w-xl mx-auto text-center space-y-6 py-8 animate-scaleIn font-sans text-white">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_20px_rgba(45,212,191,0.15)] animate-pulse">
        <CheckCircle size={32} />
      </div>

      <div className="space-y-2">
        <span className="text-[10px] text-[#6F6B7E] font-mono tracking-widest block uppercase font-bold">DATA SUBMISSION SUCCESSFUL</span>
        <h1 className="text-2xl font-bold text-white tracking-tight">Dialogue Recording Transmitted</h1>
        <p className="text-xs text-[#A8A5B5] max-w-sm mx-auto leading-relaxed">
          Your voice track and conversational tokens have been cryptographically hashed, timestamped on-chain, and routed directly to the buyer's quality audit queue.
        </p>
      </div>

      {/* Detail attributes list */}
      <Card className="p-5 space-y-4 text-left border-white/5 bg-[#0B0B12]">
        <span className="text-[9px] text-[#6F6B7E] font-mono uppercase tracking-wider block border-b border-white/5 pb-2 text-center">ACOUSTIC TRANSACTION RECEIPT (SPEECH SUMMARY)</span>
        
        <div className="space-y-3.5 text-xs text-left leading-none font-sans">
          <div className="flex justify-between items-center">
            <span className="text-[#A8A5B5]">Consented Campaign</span>
            <span className="text-white font-bold">{campaignName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#A8A5B5]">Licensor / Contributor</span>
            <span className="text-white font-mono font-medium">Minh Pham</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#A8A5B5]">Recorded Duration</span>
            <span className="text-white font-mono font-semibold">{duration}</span>
          </div>
          
          <div className="pt-2.5 border-t border-white/5 space-y-2 text-[11px] text-left">
            <span className="block font-bold text-[#6F6B7E] font-mono uppercase text-[9.5px]">AUTOMATED SYSTEM SPECTRUM VERIFICATION:</span>
            <div className="grid grid-cols-3 gap-2 text-center font-mono text-[9px] font-bold">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-2 py-1 rounded">VOICE DETECTED</span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-2 py-1 rounded">STANDARD SPECTRUM</span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-2 py-1 rounded">CLEAN PROFILE</span>
            </div>
          </div>

          <div className="flex justify-between pt-3 border-t border-white/5 items-center">
            <span className="text-[#A8A5B5]">Accrued Contingent Value</span>
            <span className="text-[#2cd4bf] font-mono font-bold text-sm">8,000 VND</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#A8A5B5]">Verification State</span>
            <span className="text-amber-405 font-mono font-bold uppercase tracking-wider text-[9.5px] text-amber-400">AWAITING BUYER AUDIT</span>
          </div>
        </div>
      </Card>

      <p className="text-[10px] text-[#6F6B7E] font-mono max-w-sm mx-auto leading-normal">
        * Allocated payout funds will execute instantly to your available balance as soon as the project manager triggers verification clearance.
      </p>

      {/* Action triggers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
        <button
          id="btn-studio-back-campaigns"
          onClick={() => onNavigate('contributor-campaigns')}
          className="px-4 py-2.5 bg-[#0D0D15]/60 hover:bg-zinc-900 border border-white/5 text-xs font-semibold rounded-full text-white cursor-pointer transition-all hover:border-white/15"
        >
          Other Campaigns
        </button>
        <button
          id="btn-studio-go-finance"
          onClick={() => onNavigate('contributor-finance')}
          className="px-4 py-2.5 bg-[#0D0D15]/60 hover:bg-zinc-900 border border-white/5 text-xs font-semibold rounded-full text-white cursor-pointer transition-all hover:border-white/15"
        >
          View Earnings Ledger
        </button>
        <button
          id="btn-record-another"
          onClick={() => onNavigate('contributor-studio')}
          className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-full transition-all cursor-pointer shadow-lg hover:shadow-violet-500/10 font-sans"
        >
          Record Another Session
        </button>
      </div>
    </div>
  );
}
export default ContributorSessionSummaryPage;
