import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Campaign, AppView } from '../../../shared/types';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

interface ContributorConsentPageProps {
  campaign: Campaign;
  onAccept: () => void;
  onCancel: () => void;
}

export function ContributorConsentPage({ campaign, onAccept, onCancel }: ContributorConsentPageProps) {
  const [agreed1, setAgreed1] = useState(false);
  const [agreed2, setAgreed2] = useState(false);
  const [agreed3, setAgreed3] = useState(false);

  return (
    <div id="contributor-consent-screen" className="max-w-2xl mx-auto space-y-6 text-left py-4 animate-scaleIn font-sans text-white">
      <div className="space-y-1 border-b border-white/10 pb-4">
        <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Release Consent & Voice Agreement</h1>
        <p className="text-xs text-[#A8A5B5] font-mono">Acknowledge participant rights, intellectual property releases, and system quality rules</p>
      </div>

      {/* Campaign Details summary */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-violet-400">
          <Sparkles size={16} />
          <h2 className="text-sm font-bold uppercase font-sans tracking-wide">PARTICIPATION SUMMARY: {campaign.name}</h2>
        </div>

        <div className="space-y-3.5 text-xs text-[#A8A5B5] leading-relaxed text-left">
          <p>
            In this recording session, you will assume the role of: <b className="text-white">"{campaign.contributorRole}"</b>.
            Your AI Customer counterpart will roleplay as: <b className="text-white">"{campaign.aiCustomerRole}"</b>.
            You will hold an interactive voice call using your microphone, limited to <b className="text-white">5 speaker turns each</b>.
          </p>
          
          <div className="p-3 bg-zinc-950 rounded border border-white/5">
            <span className="block font-bold text-teal-400 text-[10px] uppercase font-mono tracking-wider">Secured Sandbox Escrow Rules (Guardrails)</span>
            <p className="leading-relaxed text-[10.5px] mt-1 text-zinc-400">
              The rewards of this campaign are fully loaded and secured in escrow. Compensation will resolve automatically to your contributor balance provided your submission complies with zero noise distortion guidelines and is approved by the project owner.
            </p>
          </div>
        </div>
      </Card>

      {/* Checkbox Checklist */}
      <Card className="p-5 space-y-4 text-left">
        <h3 className="text-xs font-bold uppercase text-white font-mono tracking-wider">Vocal Release Terms & Affirmation</h3>

        <div className="space-y-4 text-left">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              id="consent-check-1"
              type="checkbox"
              checked={agreed1}
              onChange={() => setAgreed1(!agreed1)}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-650 focus:ring-violet-500 mt-1 cursor-pointer"
            />
            <span className="text-xs text-[#A8A5B5] leading-relaxed">
              I affirm that I will use my authentic, natural voice during the recording session, with no computer-generated filters or deepfake synthesis instruments.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              id="consent-check-2"
              type="checkbox"
              checked={agreed2}
              onChange={() => setAgreed2(!agreed2)}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-650 focus:ring-violet-500 mt-1 cursor-pointer"
            />
            <span className="text-xs text-[#A8A5B5] leading-relaxed">
              I agree that the campaign manager retains discretionary review options over the recording quality, and payouts will execute only upon explicit manual verification.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              id="consent-check-3"
              type="checkbox"
              checked={agreed3}
              onChange={() => setAgreed3(!agreed3)}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-650 focus:ring-violet-500 mt-1 cursor-pointer"
            />
            <span className="text-xs text-[#A8A5B5] leading-relaxed">
              I grant legal release authorizations to utilize this anonymized audio record strictly for machine learning, acoustic training, and speech recognition neural modeling.
            </span>
          </label>
        </div>
      </Card>

      {/* Buttons */}
      <div className="flex items-center gap-4">
        <Button
          variant={agreed1 && agreed2 && agreed3 ? 'violet' : 'dark'}
          id="btn-agree-start-recording"
          disabled={!agreed1 || !agreed2 || !agreed3}
          onClick={onAccept}
          className="flex-1 py-3 font-bold text-xs uppercase tracking-wider"
        >
          Accept Agreement & Start Recording
        </Button>

        <button
          onClick={onCancel}
          className="px-6 py-3 bg-transparent hover:bg-white/5 text-[#A8A5B5] hover:text-white text-xs font-bold rounded-full transition-all border border-white/10 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
export default ContributorConsentPage;
