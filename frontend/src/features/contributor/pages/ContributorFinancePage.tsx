import React, { useState } from 'react';
import { Landmark, X, CheckCircle2 } from 'lucide-react';
import { Campaign, Recording, AppView } from '../../../shared/types';
import { Card } from '../../../components/ui/Card';
import { StatCard } from '../../../components/ui/StatCard';
import { Button } from '../../../components/ui/Button';
import { formatMoneyVND } from '../../../shared/formatters';

interface ContributorFinancePageProps {
  campaigns: Campaign[];
  recordings: Recording[];
  contributorBalance: number;
  setContributorBalance: React.Dispatch<React.SetStateAction<number>>;
  onToast?: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  onWithdraw?: (amount: number) => Promise<boolean>;
  onNavigate: (view: AppView) => void;
}

export function ContributorFinancePage({ 
  campaigns, 
  recordings,
  contributorBalance,
  setContributorBalance,
  onToast,
  onWithdraw,
  onNavigate
}: ContributorFinancePageProps) {
  const [withdrawMethod, setWithdrawMethod] = useState<'vietqr' | 'momo' | 'zalopay'>('vietqr');
  const [withdrawAmountStr, setWithdrawAmountStr] = useState<string>('50000');
  const [isProcessingWithdraw, setIsProcessingWithdraw] = useState(false);
  const [withdrawSuccessBanner, setWithdrawSuccessBanner] = useState<string | null>(null);
  const [showWithdrawPortal, setShowWithdrawPortal] = useState<boolean>(false);

  // Mock withdrawal history
  const [withdrawals, setWithdrawals] = useState<Array<{id: string, time: string, amount: number, method: string, status: string}>>([
    { id: 'TXN-9281', time: '2026-06-18 14:15', amount: 80000, method: 'VietQR (MB Bank)', status: 'COMPLETED' },
    { id: 'TXN-3912', time: '2026-06-15 09:30', amount: 150000, method: 'MoMo E-Wallet', status: 'COMPLETED' },
  ]);

  // Account inputs
  const [bankName, setBankName] = useState<string>('Techcombank');
  const [accountNum, setAccountNum] = useState<string>('1903 8219 2818 012');
  const [accountName, setAccountName] = useState<string>('MINH PHAM');

  const minWithdrawThreshold = 8000;

  const triggerWithdraw = async () => {
    const amt = parseInt(withdrawAmountStr) || 0;
    if (amt < minWithdrawThreshold) {
      if (onToast) onToast(`Minimum withdrawal limit must be at least ${formatMoneyVND(minWithdrawThreshold)}!`, 'warning');
      return;
    }
    if (contributorBalance < amt) {
      if (onToast) onToast(`Insufficient balance to withdraw this amount!`, 'error');
      return;
    }

    setIsProcessingWithdraw(true);
    try {
      if (onWithdraw) {
        const accepted = await onWithdraw(amt);
        if (!accepted) throw new Error('Withdrawal was not accepted');
      } else {
        await new Promise(resolve => setTimeout(resolve, 1100));
      }
      setContributorBalance(prev => prev - amt);
      const newTxn = {
        id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
        time: new Date().toISOString().replace('T', ' ').substring(0, 16),
        amount: amt,
        method: withdrawMethod === 'vietqr' ? `VietQR (${bankName})` : withdrawMethod === 'momo' ? 'MoMo E-Wallet' : 'ZaloPay Direct',
        status: 'COMPLETED'
       };
      setWithdrawals(prev => [newTxn, ...prev]);
      setIsProcessingWithdraw(false);
      setShowWithdrawPortal(false);
      setWithdrawSuccessBanner(`Express payout of ${formatMoneyVND(amt)} has been successfully processed to your selected destination.`);
      if (onToast) onToast("Payout successful!", "success");
      setTimeout(() => setWithdrawSuccessBanner(null), 5000);
    } catch (error: any) {
      setIsProcessingWithdraw(false);
      if (onToast) onToast(error?.message || 'Withdrawal failed', 'error');
    }
  };

  const contributionList = recordings.filter(r => r.status === 'Accepted');
  const pendingCount = recordings.filter(r => r.status === 'Pending review').length;

  return (
    <div id="contributor-finance-screen" className="space-y-6 py-4 animate-fadeIn text-left font-sans text-white">
      
      {/* Back list action */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('contributor-campaigns')}
          className="text-xs text-[#A8A5B5] hover:text-white font-semibold px-2.5 py-1.5 hover:bg-white/5 rounded transition-all cursor-pointer"
        >
          ← Return to Campaigns
        </button>
      </div>

      {withdrawSuccessBanner && (
        <div className="bg-zinc-950 border-2 border-emerald-500/40 text-emerald-400 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-scaleIn">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <div className="text-xs font-semibold">{withdrawSuccessBanner}</div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white">Earnings & Payouts</h1>
          <p className="text-xs text-[#A8A5B5]">Track your approved speech tracks, accumulated balance, and request instant online wallet withdrawals</p>
        </div>

        {/* Balance badge */}
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto select-none">
          <div className="bg-[#0D0D18] border border-teal-500/30 rounded-xl px-4 py-2.5 text-right shadow-lg">
            <span className="text-[9.5px] text-teal-400 font-mono uppercase block font-bold">Available Balance</span>
            <span className="text-lg font-mono font-bold text-teal-300">{formatMoneyVND(contributorBalance)}</span>
          </div>

          <Button
            variant="emerald"
            id="btn-contributor-withdraw-toggle"
            onClick={() => setShowWithdrawPortal(true)}
            className="h-11 px-5 font-bold text-xs"
          >
            Withdraw Balance
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="TOTAL RECORDINGS SUBMITTED"
          value={`${recordings.length} submissions`}
          badge="Submission History"
          badgeVariant="indigo"
        />
        <StatCard
          title="APPROVED (ACCEPTED)"
          value={`${contributionList.length} submissions`}
          badge="Redeemed for Cash"
          badgeVariant="emerald"
        />
        <StatCard
          title="PENDING VERIFICATION"
          value={`${pendingCount} submissions`}
          badge="Held in Secure Escrow"
          badgeVariant="cyan"
        />
      </div>

      {/* Main ledger list */}
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-4">
          <h3 className="text-[10px] font-mono text-[#6F6B7E] uppercase block font-bold tracking-widest">Earnings Breakdown per Campaign</h3>
          
          <Card className="overflow-hidden shadow-lg border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left antialiased">
                <thead className="bg-[#151522]/80 border-b border-white/10 text-[#6F6B7E] uppercase font-mono text-[9px] tracking-wider font-bold">
                  <tr>
                    <th className="p-4">Acoustic Campaign Title</th>
                    <th className="p-4 text-center">Submitted</th>
                    <th className="p-4 text-center">Approved</th>
                    <th className="p-4">Baseline Price</th>
                    <th className="p-4">Accumulated Earnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-zinc-300 font-mono">
                  {campaigns.map((c) => {
                    const campRecs = recordings.filter(r => r.campaignId === c.id);
                    const acCount = campRecs.filter(r => r.status === 'Accepted').length;
                    return (
                      <tr key={c.id} className="hover:bg-white/5 font-sans transition-all text-xs">
                        <td className="p-4 font-bold text-white">
                          <div>{c.name}</div>
                          <span className="text-[9.5px] text-[#6F6B7E] font-normal leading-relaxed font-mono">Role: {c.contributorRole}</span>
                        </td>
                        <td className="p-4 text-center font-mono font-bold">{campRecs.length}</td>
                        <td className="p-4 text-center font-mono text-emerald-400 font-bold">{acCount}</td>
                        <td className="p-4 font-mono font-bold">{formatMoneyVND(c.pricePerRecording || 8000)}</td>
                        <td className="p-4 font-mono text-[#2cd4bf] font-bold">{formatMoneyVND(acCount * (c.pricePerRecording || 8000))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Withdrawal log list */}
        <div className="space-y-3.5 text-left">
          <h3 className="text-[10px] font-mono text-[#6F6B7E] uppercase block font-bold tracking-widest">Recent Payout Disbursements</h3>
          
          <Card className="p-1 divide-y divide-white/5 border-white/5">
            {withdrawals.length === 0 ? (
              <p className="text-xs p-6 text-zinc-500 text-center leading-relaxed">No payout transactions have been recorded yet.</p>
            ) : (
              withdrawals.map((withdraw) => (
                <div key={withdraw.id} className="p-3.5 flex justify-between items-center text-xs animate-fadeIn">
                  <div className="space-y-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold font-mono">{withdraw.id}</span>
                      <span className="text-[#6F6B7E] font-mono">· {withdraw.time}</span>
                    </div>
                    <span className="text-zinc-400 block text-[10.5px]">Destination: {withdraw.method}</span>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="text-rose-450 font-mono font-bold">-{formatMoneyVND(withdraw.amount)}</span>
                    <span className="block text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold">COMPLETED</span>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>

      {/* Withdrawal Form Modal Portal overlay */}
      {showWithdrawPortal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md animate-fadeIn flex items-center justify-center p-4">
          <div className="bg-[#0D0D15] border border-white/15 rounded-2xl p-6 w-full max-w-lg space-y-5 shadow-2xl relative animate-scaleIn text-left text-white">
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full filter blur-xl pointer-events-none" />
            
            <div className="flex justify-between items-start border-b border-white/5 pb-3 bg-transparent">
              <div>
                <span className="text-[10px] text-teal-400 font-mono block uppercase font-bold tracking-wider">Instant 24/7 Online Payout Gateway</span>
                <h3 className="text-base font-bold text-white mt-1">Initiate Balance Withdrawal</h3>
              </div>
              
              <button 
                type="button"
                onClick={() => setShowWithdrawPortal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-teal-950/10 border border-teal-500/20 rounded-xl space-y-1 text-xs">
              <span className="text-teal-400 font-bold block">Gateway Fee Guidelines</span>
              <p className="text-[#A8A5B5] leading-relaxed text-[11px]">
                The minimum withdrawal limit is <b className="text-white font-mono">{formatMoneyVND(minWithdrawThreshold)}</b> to cover Napas 24/7 interbank settlement network fees.
              </p>
            </div>

            {/* Withdraw Amount */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-[#6F6B7E] font-mono block uppercase font-bold">Enter Amount to Withdraw (VND):</label>
              <div className="relative">
                <input
                  type="number"
                  value={withdrawAmountStr}
                  onChange={(e) => setWithdrawAmountStr(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3.5 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setWithdrawAmountStr(contributorBalance.toString())}
                  className="absolute right-2 top-1.5 px-2 py-1 bg-teal-950/40 hover:bg-teal-900 text-teal-300 border border-teal-500/20 text-[10px] font-mono rounded-md font-bold cursor-pointer"
                >
                  Withdraw All
                </button>
              </div>
            </div>

            {/* Withdraw Method */}
            <div className="space-y-2 text-left bg-transparent">
              <label className="text-[10px] text-[#6F6B7E] font-mono block uppercase font-bold text-left">Select Destination Gateway:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setWithdrawMethod('vietqr')}
                  className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${withdrawMethod === 'vietqr' ? 'bg-teal-950/40 border-teal-500 text-teal-300 font-bold' : 'bg-[#0B0B12] border-white/5 text-zinc-400 hover:bg-white/5'}`}
                >
                  <span className="block text-[11px]">Napas Transfer</span>
                  <span className="block text-[8.5px] text-[#6F6B7E] font-mono mt-1">Napas 24/7</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWithdrawMethod('momo')}
                  className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${withdrawMethod === 'momo' ? 'bg-[#a50064]/20 border-[#a50064] text-pink-350 font-bold' : 'bg-[#0B0B12] border-white/5 text-zinc-400 hover:bg-white/5'}`}
                >
                  <span className="block text-[11px]">MoMo Wallet</span>
                  <span className="block text-[8.5px] text-[#6F6B7E] font-mono mt-1">E-Wallet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWithdrawMethod('zalopay')}
                  className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${withdrawMethod === 'zalopay' ? 'bg-blue-950/40 border-blue-500 text-blue-350 font-bold' : 'bg-[#0B0B12] border-white/5 text-zinc-400'}`}
                >
                  <span className="block text-[11px]">ZaloPay Wallet</span>
                  <span className="block text-[8.5px] text-[#6F6B7E] font-mono mt-1">Zalo Pay</span>
                </button>
              </div>
            </div>

            {/* Input banking */}
            {withdrawMethod === 'vietqr' && (
              <div className="space-y-3 bg-zinc-950/60 p-3 rounded-xl border border-white/5 animate-scaleIn text-xs text-left">
                <div className="grid grid-cols-2 gap-3 bg-transparent">
                  <div className="space-y-1">
                    <label className="text-[9px] text-[#6F6B7E] uppercase font-mono block">Bank Association:</label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full bg-[#0B0B12] border border-white/10 rounded px-2 py-1 text-zinc-305 focus:outline-none"
                    >
                      <option value="Techcombank">Techcombank</option>
                      <option value="Vietcombank">Vietcombank</option>
                      <option value="MB Bank">MB Bank</option>
                      <option value="ACB">ACB Bank</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-[#6F6B7E] uppercase font-mono block font-bold">Account Number:</label>
                    <input
                      type="text"
                      value={accountNum}
                      onChange={(e) => setAccountNum(e.target.value)}
                      className="w-full bg-[#0B0B12] border border-white/10 rounded px-2 py-1 text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-[#6F6B7E] uppercase font-mono block">Account Holder Name (ALL CAPS):</label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value.toUpperCase())}
                    className="w-full bg-[#0B0B12] border border-white/10 rounded px-2 py-1 text-white uppercase font-mono focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* ZaloPay / MoMo mock phone number fields */}
            {withdrawMethod !== 'vietqr' && (
              <div className="space-y-3 bg-zinc-950/60 p-3 rounded-xl border border-white/5 animate-scaleIn text-xs text-left">
                <div className="space-y-1">
                  <label className="text-[9px] text-[#6F6B7E] uppercase font-mono block">E-Wallet Mobile Number:</label>
                  <input
                    type="text"
                    defaultValue="0981 123 456"
                    className="w-full bg-[#0B0B12] border border-white/10 rounded px-2 py-1 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              onClick={triggerWithdraw}
              disabled={isProcessingWithdraw || contributorBalance < minWithdrawThreshold || (parseInt(withdrawAmountStr) || 0) < minWithdrawThreshold}
              className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 disabled:from-zinc-900 disabled:to-zinc-950 disabled:text-zinc-650 disabled:border-white/5 border border-transparent font-bold rounded-full text-xs text-white shadow-xl flex items-center justify-center gap-1.5 cursor-pointer font-sans transition-all"
            >
              {isProcessingWithdraw ? "AUTHORISING SECURE API PAYOUT..." : "CONFIRM WITHDRAWAL"}
            </button>
          </div>
        </div>
      )}

      {/* Trust Notice card */}
      <Card className="p-4 flex items-start gap-3 border-white/5 bg-zinc-950/45 text-left">
        <Landmark className="text-[#2cd4bf] shrink-0 mt-0.5" size={16} />
        <div className="space-y-1">
          <span className="text-xs text-white font-bold block">Automated Payout Protection Guarantee</span>
          <p className="text-[11px] text-[#A8A5B5] leading-relaxed">
            Our smart mediator protocol ensures absolute protection for contributors. As soon as a campaign owner reviews and accepts your submission files, funds from the locked escrow pool are immediately dispatched into your available balance, bypassing standard payment delays.
          </p>
        </div>
      </Card>
      
    </div>
  );
}
export default ContributorFinancePage;
