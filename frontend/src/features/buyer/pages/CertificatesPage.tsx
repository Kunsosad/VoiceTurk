import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Certificate, AppView } from '../../../shared/types';

interface CertificatesPageProps {
  certificates: Certificate[];
  onSelectCertificate: (cert: Certificate) => void;
  onNavigate: (view: AppView) => void;
}

export function CertificatesPage({ certificates, onSelectCertificate, onNavigate }: CertificatesPageProps) {
  return (
    <div id="buyer-certificates-screen" className="space-y-6 py-4 animate-fadeIn text-left font-sans text-white">
      <div className="space-y-1 pb-2 border-b border-white/10">
        <h1 className="text-xl font-bold text-white font-sans">Conversational Audit Certificates Ledger</h1>
        <p className="text-xs text-[#A8A5B5]">Review cryptographically-signed campaign datasets and audit trails verifying voice dataset integrity on-chain</p>
      </div>

      {/* Grid of cryptographically signed certificates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {certificates.map((cert) => (
          <Card
            key={cert.id}
            className="p-5 flex flex-col justify-between space-y-4 transition-all duration-300 relative group text-left"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant={cert.status === 'Verified' ? 'emerald' : 'cyan'}>
                  {cert.status}
                </Badge>
                <span className="text-[10px] text-[#6F6B7E] font-mono leading-none">Solana Net</span>
              </div>

              <h3 className="text-sm font-bold text-white group-hover:text-violet-400 transition-colors line-clamp-1">
                {cert.title}
              </h3>
              
              <p className="text-xs text-[#A8A5B5] lg:line-clamp-2 leading-relaxed">
                {cert.termsSummary}
              </p>
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-[9.5px] text-[#6F6B7E] font-mono uppercase">Logged: {cert.dateTime?.split(' ')[0]}</span>
              <button
                id={`btn-view-cert-detail-${cert.id}`}
                onClick={() => {
                  onSelectCertificate(cert);
                  onNavigate('buyer-certificate-detail');
                }}
                className="px-3.5 py-1.5 bg-white/5 hover:bg-violet-950/40 text-white hover:text-violet-300 border border-white/5 hover:border-violet-500/20 text-[10px] rounded-lg transition-all cursor-pointer font-bold font-sans"
              >
                Audit Details →
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
export default CertificatesPage;
