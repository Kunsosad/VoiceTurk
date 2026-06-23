import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Certificate, AppView } from '../../../shared/types';

interface CertificateDetailPageProps {
  certificate: Certificate;
  onNavigate: (view: AppView) => void;
}

export function CertificateDetailPage({ certificate, onNavigate }: CertificateDetailPageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(certificate.solanaTxSignature);
    } catch (e) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="certificate-detail-screen" className="max-w-2xl mx-auto space-y-6 text-left py-4 animate-scaleIn font-sans text-white">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <button
          onClick={() => onNavigate('buyer-certificates')}
          className="text-xs text-[#A8A5B5] hover:text-white font-semibold px-2 py-1.5 hover:bg-white/5 rounded transition-all cursor-pointer"
        >
          ← Back to certificates ledger
        </button>
        <span className="text-zinc-650 font-mono text-xs">/</span>
        <h1 className="text-xs font-bold text-white uppercase font-mono tracking-tight">Certificate Details</h1>
      </div>

      {/* Elegant digital receipt layout */}
      <Card className="p-6 space-y-6 bg-gradient-to-b from-[#0B0B12] to-zinc-950 text-left">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none" />
        
        {/* Certificate metadata */}
        <div className="flex items-start justify-between border-b border-white/5 pb-4">
          <div className="space-y-1">
            <span className="text-[9px] text-[#2cd4bf] font-mono font-bold tracking-widest block uppercase font-bold">VERIFIED DIALOGUE EVIDENCE</span>
            <h2 className="text-base font-bold text-white">{certificate.title}</h2>
            <p className="text-xs text-[#A8A5B5]">Target Campaign: {certificate.campaignName}</p>
          </div>

          <Badge variant="emerald">
            {certificate.status}
          </Badge>
        </div>

        {/* Dynamic fields mapping */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#A8A5B5] text-left">
          <div className="space-y-1.5">
            <span className="text-[10px] text-[#6F6B7E] font-mono block uppercase font-bold">Associated Parties:</span>
            <ul className="list-disc pl-4 text-zinc-100 font-sans space-y-0.5 leading-relaxed">
              {certificate.parties.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>

          <div>
            <span className="text-[10px] text-[#6F6B7E] font-mono block uppercase font-bold">Cryptographic Timestamp:</span>
            <p className="mt-1 text-zinc-100 font-mono font-bold">{certificate.dateTime}</p>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-1 bg-[#151522]/40 p-4 rounded-xl border border-white/5 text-xs text-left">
          <span className="text-[10px] text-[#6F6B7E] font-mono block uppercase font-bold">Escrow Agreement Terms Summary</span>
          <p className="text-zinc-300 leading-relaxed">{certificate.termsSummary}</p>
        </div>

        {/* Cryptographic Solana Sig */}
        <div className="p-4 bg-zinc-950 border border-teal-500/15 rounded-xl space-y-2.5 text-xs text-left relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] text-teal-400 font-mono block uppercase font-bold">On-Chain Transaction Anchor (Solana Cryptographic Anchor)</span>
            <button
              onClick={handleCopy}
              className={`px-3 py-1 text-[9px] font-mono rounded-full font-bold transition-all cursor-pointer ${
                copied ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 hover:bg-white/10 text-zinc-350'
              }`}
            >
              {copied ? 'Copied Sig' : 'Copy Signature'}
            </button>
          </div>
          <p className="font-mono text-[10px] text-zinc-400 break-all select-all selection:bg-teal-500/20 leading-relaxed font-semibold">
            {certificate.solanaTxSignature}
          </p>
        </div>
      </Card>
    </div>
  );
}
export default CertificateDetailPage;
