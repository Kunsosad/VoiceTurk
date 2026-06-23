import React, { useState } from 'react';
import { Check, ShieldCheck, Landmark } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { formatMoneyVND } from '../../../shared/formatters';

interface CampaignSetupPageProps {
  draft: any;
  onComplete: () => void;
  onCancel: () => void;
}

export function CampaignSetupPage({ draft, onComplete, onCancel }: CampaignSetupPageProps) {
  const [termsConfirmed, setTermsConfirmed] = useState(false);
  const [budgetSecured, setBudgetSecured] = useState(false);
  const [isSecuring, setIsSecuring] = useState(false);

  const handleSecureBudget = () => {
    setIsSecuring(true);
    setTimeout(() => {
      setBudgetSecured(true);
      setIsSecuring(false);
    }, 1200);
  };

  // Financial summary calculations
  const pricePerRec = draft?.pricePerRecording || 8000;
  const targetRecs = draft?.targetRecordings || 60;
  const totalPayout = pricePerRec * targetRecs;
  const platformFee = totalPayout * 0.1;
  const grandTotal = totalPayout + platformFee;

  return (
    <div id="campaign-setup-screen" className="max-w-4xl mx-auto space-y-8 text-left py-4 animate-fadeIn font-sans text-white">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Review & Activate Campaign</h1>
        <p className="text-xs text-[#A8A5B5]">Verify campaign guidelines, authorize the secure escrow budget pools, and activate recording rules.</p>
      </div>

       {/* Visual Connection Nodes Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        <div className="hidden md:block absolute top-[40px] left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-cyan-600 to-indigo-600 opacity-20 -z-10" />

        {/* Node 1 */}
        <div className={`p-4 rounded-xl border bg-slate-950/65 flex flex-col items-center text-center space-y-2 transition-all ${
          termsConfirmed ? 'border-teal-500/50 shadow-[0_0_15px_rgba(45,212,191,0.15)]' : 'border-white/10'
        }`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border font-bold text-sm ${
            termsConfirmed ? 'bg-teal-500/10 text-teal-400 border-teal-500/30' : 'bg-white/5 text-[#6F6B7E] border-white/10'
          }`}>
            {termsConfirmed ? <Check size={18} /> : '1'}
          </div>
          <div>
            <span className="text-xs font-mono uppercase tracking-wider block font-bold text-white">1. Core Terms</span>
            <span className="text-[10px] text-[#A8A5B5]">Agreement & Guidelines</span>
          </div>
        </div>

        {/* Node 2 */}
        <div className={`p-4 rounded-xl border bg-slate-950/65 flex flex-col items-center text-center space-y-2 transition-all ${
          budgetSecured ? 'border-teal-500/50 shadow-[0_0_15px_rgba(45,212,191,0.15)]' : 'border-white/10'
        }`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border font-bold text-sm ${
            budgetSecured ? 'bg-teal-500/10 text-teal-400 border-teal-500/30' : 'bg-white/5 text-[#6F6B7E] border-white/10'
          }`}>
            {budgetSecured ? <Check size={18} /> : '2'}
          </div>
          <div>
            <span className="text-xs font-mono uppercase tracking-wider block font-bold text-white">2. Secure Escrow</span>
            <span className="text-[10px] text-[#A8A5B5]">Locked Holdings ({formatMoneyVND(grandTotal)})</span>
          </div>
        </div>

        {/* Node 3 */}
        <div className={`p-4 rounded-xl border bg-slate-950/65 flex flex-col items-center text-center space-y-2 transition-all ${
          termsConfirmed && budgetSecured ? 'border-purple-500/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]' : 'border-white/10'
        }`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border font-bold text-sm ${
            termsConfirmed && budgetSecured ? 'bg-purple-500/20 text-purple-350 border-purple-500/40' : 'bg-white/5 text-[#6F6B7E] border-white/10'
          }`}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <span className="text-xs font-mono uppercase tracking-wider block font-bold text-white">3. Publish Workspace</span>
            <span className="text-[10px] text-[#A8A5B5]">Open to Contributors</span>
          </div>
        </div>
      </div>

      {/* Main Form content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Overview */}
          <Card className="p-5 space-y-4">
            <span className="text-[11px] text-[#6F6B7E] font-mono uppercase tracking-wider block border-b border-white/5 pb-2">Campaign Specifications</span>
            
            <div className="space-y-4 text-left font-sans">
              <div>
                <dt className="text-[10px] text-[#6F6B7E] font-mono uppercase tracking-wide">Campaign Name</dt>
                <dd className="text-sm font-bold text-white mt-0.5">{draft?.name || "Vietnamese CSR Service Dataset"}</dd>
              </div>

              <div>
                <dt className="text-[10px] text-[#6F6B7E] font-mono uppercase tracking-wide">Dialogue Scenario</dt>
                <dd className="text-xs text-zinc-350 leading-relaxed mt-0.5">
                  {draft?.context || "A customer purchased products via live stream, but missed the complimentary promotional item upon delivery. The user expresses doubts about shop credibility and asks for refunds."}
                </dd>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                   <dt className="text-[10px] text-[#6F6B7E] font-mono uppercase tracking-wide">AI Customer Persona</dt>
                  <dd className="text-xs text-violet-300 font-bold mt-0.5">{draft?.aiCustomerRole || "Expresses frustration & skepticism."}</dd>
                </div>
                <div>
                   <dt className="text-[10px] text-[#6F6B7E] font-mono uppercase tracking-wide">Contributor Role</dt>
                  <dd className="text-xs text-cyan-300 font-bold mt-0.5">{draft?.contributorRole || "Professional customer service agent settling complaints."}</dd>
                </div>
              </div>

              <div className="p-3.5 bg-white/5 rounded-lg border border-white/5">
                <p className="text-[11px] text-[#A8A5B5] leading-relaxed">
                  <span className="font-bold text-white">Validation & Approval Criteria:</span><br />
                  1. Audio exhibits emotional resonance fitting the conversational prompt. <br />
                  2. High vocal fidelity with zero robotic overlays or white background noise. <br />
                  3. Accurate transcript spelling conforming to natural Vietnamese dialect.
                </p>
              </div>
            </div>
          </Card>

          {/* Guidelines confirmation check */}
          <Card className="p-5 space-y-4">
            <span className="text-[11px] text-[#6F6B7E] font-mono uppercase tracking-wider block border-b border-white/5 pb-2">Legal Agreement & Terms</span>
            
            <label className="flex items-start gap-4 cursor-pointer select-none">
              <input
                id="check-terms-confirm"
                type="checkbox"
                checked={termsConfirmed}
                onChange={() => setTermsConfirmed(!termsConfirmed)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-zinc-950 mt-1 cursor-pointer"
              />
              <div className="text-xs space-y-1">
                <span className="text-white font-bold block text-sm">Accept VoiceTurk Datatrust & Verification terms</span>
                <p className="text-[#A8A5B5] leading-relaxed">
                  I agree to release rewards ONLY for recordings matching dataset criteria. I understand VoiceTurk implements automated spectral deduplication to protect against synthetic vocal abuse.
                </p>
              </div>
            </label>
          </Card>
        </div>

        {/* Right side: Finance panel */}
        <div className="space-y-6">
          <Card className="p-5 space-y-5 bg-gradient-to-b from-[#0B0B12] to-zinc-950">
            <span className="text-[11px] text-[#6F6B7E] font-mono uppercase tracking-wider block border-b border-white/5 pb-2">Financial Escrow Summary</span>

            <div className="space-y-3 font-sans">
              <div className="flex justify-between text-xs">
                <span className="text-[#A8A5B5]">Target Deliverables</span>
                <span className="text-white font-mono font-bold">{targetRecs} recordings</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#A8A5B5]">Payout Rate / Recording</span>
                <span className="text-white font-mono">{formatMoneyVND(pricePerRec)}</span>
              </div>
              <div className="flex justify-between text-xs pt-2 border-t border-white/5">
                <span className="text-[#A8A5B5]">Total Payout Pool</span>
                <span className="text-white font-mono font-bold">{formatMoneyVND(totalPayout)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#A8A5B5]">Platform Protocol Fee (10%)</span>
                <span className="text-white font-mono">{formatMoneyVND(platformFee)}</span>
              </div>
              
              <div className="p-3 bg-cyan-950/20 rounded-lg border border-cyan-500/20 flex flex-col gap-1 pt-2 text-left">
                <div className="flex justify-between text-xs text-cyan-400 font-extrabold">
                  <span>Grand Total Escrow Hold</span>
                  <span>{formatMoneyVND(grandTotal)}</span>
                </div>
                <p className="text-[9.5px] text-[#A8A5B5] leading-relaxed mt-1">
                  💡 These funds are securely locked in smart escrow, and will be auto-released back to your balance if assignments remain unfulfilled or the campaign is canceled.
                </p>
              </div>
            </div>

            {/* Locked Action */}
            {!budgetSecured ? (
              <Button
                variant="cyan"
                id="btn-secure-budget"
                onClick={handleSecureBudget}
                disabled={isSecuring}
                className="w-full flex items-center justify-center gap-2 font-bold"
              >
                <Landmark size={14} />
                {isSecuring ? "Securing budget..." : "Secure budget"}
              </Button>
            ) : (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-mono text-center flex items-center justify-center gap-1.5 font-bold">
                <Check size={14} />
                Budget secured
              </div>
            )}
          </Card>

          {/* Action triggers */}
          <div className="space-y-3">
            <Button
              variant={termsConfirmed && budgetSecured ? 'violet' : 'dark'}
              id="btn-activate-campaign"
              disabled={!termsConfirmed || !budgetSecured}
              onClick={onComplete}
              className="w-full py-3 font-bold tracking-wider text-xs uppercase"
            >
              Activate campaign
            </Button>
            
            <button
              onClick={onCancel}
              className="w-full py-1.5 bg-transparent hover:bg-white/5 text-[#A8A5B5] hover:text-white text-xs font-bold rounded-lg transition-all border border-white/10 cursor-pointer"
            >
              Back to campaigns
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default CampaignSetupPage;
