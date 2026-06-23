import React from 'react';
import { Landmark } from 'lucide-react';
import { Campaign, Recording, AppView } from '../../../shared/types';
import { Card } from '../../../components/ui/Card';
import { StatCard } from '../../../components/ui/StatCard';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { formatMoneyVND } from '../../../shared/formatters';

interface BuyerFinancePageProps {
  campaigns: Campaign[];
  recordings: Recording[];
  onNavigate: (view: AppView) => void;
  onSelectCampaign?: (campaign: Campaign) => void;
  buyerWalletBalance: number;
  setBuyerWalletBalance?: React.Dispatch<React.SetStateAction<number>>;
}

export function BuyerFinancePage({
  campaigns,
  recordings,
  onNavigate,
  onSelectCampaign,
  buyerWalletBalance,
  setBuyerWalletBalance,
}: BuyerFinancePageProps) {
  const totalSecuredFunds = campaigns.reduce((acc, c) => acc + (c.totalBudget || c.securedBudget || 528000), 0);
  const totalPayoutAccrued = campaigns.reduce((acc, c) => acc + (c.payoutAccrued || 0), 0);
  const totalRemainingEscrow = totalSecuredFunds - totalPayoutAccrued;

  const totalPendingImpact = campaigns.reduce((acc, c) => {
    const pendingCount = recordings.filter(r => r.campaignId === c.id && r.status === 'Pending review').length;
    return acc + (pendingCount * (c.pricePerRecording || 8000));
  }, 0);

  return (
    <div id="buyer-finance-screen" className="space-y-6 py-4 animate-fadeIn text-left font-sans text-white">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white font-sans">Escrow & Financial Reports</h1>
          <p className="text-xs text-[#A8A5B5]">Monitor secured escrow flows, locked campaign pools, and authorized contributor distribution logs</p>
        </div>

        {/* Display Current General Wallet Balance */}
        <div className="bg-[#0D0D18] border border-cyan-500/30 rounded-full px-5 py-2 text-right shadow-lg shrink-0">
          <span className="text-[9px] text-cyan-400 font-mono uppercase block font-bold">Enterprise Vault Balance</span>
          <span className="text-sm font-mono font-bold text-white">{formatMoneyVND(buyerWalletBalance)}</span>
        </div>
      </div>

      {/* Top metrics summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="TOTAL SECURED FUNDS"
          value={formatMoneyVND(totalSecuredFunds)}
          badge="100% Escrow Backed"
          badgeVariant="emerald"
        />
        <StatCard
          title="DISTRIBUTED PAYOUTS"
          value={formatMoneyVND(totalPayoutAccrued)}
          badge="Transferred to contributors"
          badgeVariant="emerald"
        />
        <StatCard
          title="REMAINING LOCKED ESCROW"
          value={formatMoneyVND(totalRemainingEscrow)}
          badge="Secure balance available"
          badgeVariant="cyan"
        />
        <StatCard
          title="COMMITTED PENDING REVIEWS"
          value={formatMoneyVND(totalPendingImpact)}
          badge="Max pipeline impact"
          badgeVariant="amber"
        />
      </div>

      {/* Campaign finances mapping ledger list */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-mono text-[#6F6B7E] uppercase block font-bold tracking-widest">CAMPAIGN ESCROW LEDGER (ESCROW SPECIFICATION LEDGER)</h3>
        
        <Card className="overflow-hidden shadow-lg border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left antialiased">
              <thead className="bg-[#151522]/80 border-b border-white/10 text-[#6F6B7E] uppercase font-mono text-[9px] tracking-wider font-bold">
                <tr>
                  <th className="p-4">Campaign Project</th>
                  <th className="p-4 text-center">Unit Price / Recording</th>
                  <th className="p-4 text-center">Approved Submissions</th>
                  <th className="p-4">Secured Escrow</th>
                  <th className="p-4">Paid Out</th>
                  <th className="p-4">Pending Review Value</th>
                  <th className="p-4 text-right">Management Trigger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {campaigns.map((c) => {
                  const pendingCount = recordings.filter(r => r.campaignId === c.id && r.status === 'Pending review').length;
                  const pendingImpact = pendingCount * (c.pricePerRecording || 8000);
                  const targetSize = c.targetAcceptedRecordings || c.targetRecordings || 60;
                  return (
                    <tr key={c.id} className="hover:bg-white/5 transition-all">
                      <td className="p-4 font-bold text-white">
                        <div className="text-xs">{c.name}</div>
                        <div className="text-[9.5px] text-[#6F6B7E] font-normal leading-relaxed pt-0.5 font-mono">Role: {c.contributorRole}</div>
                      </td>
                      <td className="p-4 text-center font-mono font-semibold">
                        {formatMoneyVND(c.pricePerRecording || 8000)}
                      </td>
                      <td className="p-4 text-center font-mono">
                        <span className="text-[#2cd4bf] font-bold">{c.acceptedRecordings || 0}</span>
                        <span className="text-zinc-650 font-bold"> / {targetSize} recordings</span>
                      </td>
                      <td className="p-4 font-mono font-bold text-white">
                        {formatMoneyVND(c.totalBudget || c.securedBudget || 528000)}
                      </td>
                      <td className="p-4 font-mono text-cyan-450 font-bold">
                        {formatMoneyVND(c.payoutAccrued || 0)}
                      </td>
                      <td className="p-4 font-mono text-amber-400 font-bold">
                        {formatMoneyVND(pendingImpact)}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => {
                            if (onSelectCampaign) {
                              onSelectCampaign(c);
                            }
                            onNavigate('buyer-campaign-review');
                          }}
                          className="px-3.5 py-1.5 bg-cyan-950/40 hover:bg-cyan-900 border border-cyan-800/15 hover:border-cyan-500/40 text-[#2cd4bf] hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer font-sans select-none"
                        >
                          Manage Funds →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Trust Notice card */}
      <Card className="p-4 flex items-start gap-3 border-white/5 bg-zinc-950/45">
        <Landmark className="text-cyan-400 shrink-0 mt-0.5" size={16} />
        <div className="space-y-1">
          <span className="text-xs text-white font-bold block">Integrity Escrow Policy Commitment</span>
          <p className="text-[11px] text-[#A8A5B5] leading-relaxed">
            Secure sandbox escrow pools operate as a trustless smart mediator. Campaign budgets are held independently in digital trust until explicit human verification is signaled. Every disbursement decision is under your full oversight, cementing solid trust between enterprises and contributors.
          </p>
        </div>
      </Card>
    </div>
  );
}
export default BuyerFinancePage;
