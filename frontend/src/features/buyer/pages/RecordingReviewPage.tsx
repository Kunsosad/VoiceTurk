import React, { useState } from 'react';
import { Pause, Play, RotateCcw, XCircle, CheckCircle2, ArrowLeft, AlertCircle } from 'lucide-react';
import { Recording, AppView } from '../../../shared/types';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { formatMoneyVND } from '../../../shared/formatters';

interface RecordingReviewPageProps {
  recording: Recording;
  onDecision: (id: string, decision: 'Accepted' | 'Retake requested' | 'Rejected', reason?: string) => void;
  onNavigate: (view: AppView) => void;
}

export function RecordingReviewPage({ recording, onDecision, onNavigate }: RecordingReviewPageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showRetakeModal, setShowRetakeModal] = useState(false);
  const [selectedRetakeReason, setSelectedRetakeReason] = useState('Unnatural acoustic pacing');
  const [isSaving, setIsSaving] = useState(false);

  const handleDecision = (decision: 'Accepted' | 'Retake requested' | 'Rejected', reason?: string) => {
    setIsSaving(true);
    setTimeout(() => {
      onDecision(recording.id, decision, reason);
      setIsSaving(false);
      onNavigate('buyer-campaign-review');
    }, 1000);
  };

  const retakeOptions = [
    "Heavy background noise or high-frequency hiss",
    "Unnatural dialogue flow with overlapping speaker turns",
    "Agent persona incorrect or lacking helpful, warm empathy",
    "Rigid or mechanical resolution lacking human-like flexibility",
    "Speaker turns too brief (under 10 seconds per turn)"
  ];

  return (
    <div id="recording-review-screen" className="max-w-4xl mx-auto space-y-6 text-left py-4 animate-fadeIn font-sans text-white">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <button
          onClick={() => onNavigate('buyer-campaign-review')}
          className="text-xs text-[#A8A5B5] hover:text-white font-semibold px-2 py-1.5 hover:bg-white/5 rounded transition-all cursor-pointer"
        >
          ← Back to submissions
        </button>
        <span className="text-zinc-650 font-mono text-xs">/</span>
        <h1 className="text-sm font-bold text-white uppercase tracking-tight">Recording Verification: {recording.contributorName}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Playback Stage */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 relative overflow-hidden bg-[#0B0B12]">
            <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/5 rounded-full filter blur-3xl pointer-events-none" />

            {/* Context snapshot header */}
            <div className="space-y-1.5 border-b border-white/5 pb-3">
              <span className="text-[10px] text-cyan-400 font-mono uppercase font-extrabold tracking-widest block font-bold">Recording Metainfo</span>
              <span className="text-sm font-bold text-white block">Acoustic Dialogue Tracks</span>
              <p className="text-[11px] text-[#6F6B7E] font-mono">Digital waveform logged on {recording.recordedTime}</p>
            </div>

            {/* Simulated audio waveform player */}
            <div className="my-6 p-6 bg-zinc-950/60 rounded-xl border border-white/5 flex flex-col items-center justify-center space-y-6">
              
              {/* Play Trigger */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all text-center border border-white/15 cursor-pointer"
              >
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
              </button>

              {/* Dynamic waveform simulation */}
              <div className="w-full flex items-center justify-center gap-0.5 h-14 overflow-hidden select-none">
                {[...Array(32)].map((_, i) => {
                  const multiplier = isPlaying ? Math.abs(Math.sin(Date.now() * 0.05 + i)) * 14 + 18 : 6;
                  return (
                    <div
                      key={i}
                      className={`w-1 bg-[#2cd4bf] rounded-full transition-all duration-300 ${isPlaying ? 'opacity-90' : 'opacity-45'}`}
                      style={{ height: `${Math.max(4, multiplier)}px` }}
                    />
                  );
                })}
              </div>

              <div className="w-full flex justify-between text-[10.5px] font-mono text-[#6F6B7E]">
                <span>Playback time: {isPlaying ? '0:14' : '0:00'}</span>
                <span>Total duration: {recording.duration}</span>
              </div>
            </div>

            {/* Auto telemetry markers */}
            <div className="space-y-2.5">
              <span className="text-[10px] text-[#6F6B7E] font-mono uppercase tracking-wider block font-bold border-b border-white/5 pb-1">AI Spectral Pre-Audit Verification</span>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-[10px] font-mono text-teal-400 font-bold">
                <div className="bg-teal-500/5 px-2 py-2 rounded border border-teal-500/20 flex items-center gap-1.5 justify-center">
                  <CheckCircle2 size={12} /> NATIVE ENUNCIATION
                </div>
                <div className="bg-teal-500/5 px-2 py-2 rounded border border-teal-500/20 flex items-center gap-1.5 justify-center">
                  <CheckCircle2 size={12} /> ZERO CROSS-TALK
                </div>
                <div className="bg-teal-500/5 px-2 py-2 rounded border border-teal-500/20 flex items-center gap-1.5 justify-center">
                  <CheckCircle2 size={12} /> NO SILENT GAPS
                </div>
                <div className="bg-teal-500/5 px-2 py-2 rounded border border-teal-500/20 flex items-center gap-1.5 justify-center">
                  <CheckCircle2 size={12} /> NO REVERBERATION
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right side: checklists & decisions */}
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <span className="text-[10.5px] text-[#6F6B7E] font-mono uppercase block font-bold border-b border-white/5 pb-2">Human Verification Checklist</span>
            
            <div className="space-y-3.5 text-left">
              <div className="flex items-start gap-3 text-xs text-[#A8A5B5] select-none">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-cyan-600 bg-zinc-950 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-white block">Candid and natural expression</span>
                  <p className="text-[10.5px] text-[#6F6B7E] leading-relaxed mt-0.5">Contributor conveys fluid vocal depth, natural pacing, and regional accents correctly.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-[#A8A5B5] select-none">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-cyan-600 bg-zinc-950 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-white block">Active negotiation flow</span>
                  <p className="text-[10.5px] text-[#6F6B7E] leading-relaxed mt-0.5">Actively listens to issues, handles the roleplay, and de-escalates live conflicts professionally.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-[#A8A5B5] select-none">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-cyan-600 bg-zinc-950 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-white block">Professional conduct</span>
                  <p className="text-[10.5px] text-[#6F6B7E] leading-relaxed mt-0.5">Avoids inappropriate language, slangs, or making non-compliant offers to the customer.</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Impact and CTA Actions */}
          <Card className="p-5 space-y-4 bg-gradient-to-b from-[#0B0B12] to-zinc-950">
            <span className="text-[10px] text-[#6F6B7E] font-mono uppercase block font-bold border-b border-white/5 pb-2">Distribution Escrow Logic</span>
            
            <p className="text-xs text-[#A8A5B5] leading-relaxed text-left">
              Once you click <b className="text-white">Accept</b>, the locked escrow automatic trigger will immediately dispatch <b className="text-[#2cd4bf] font-bold">8,000 VND</b> from secured vaults to the contributor's wallet.
            </p>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <Button
                variant="emerald"
                id="btn-audit-accept"
                disabled={isSaving}
                onClick={() => handleDecision('Accepted')}
                className="py-2 px-1 text-[11px] font-bold text-white flex items-center justify-center gap-1"
              >
                {isSaving ? "Saving..." : "Accept"}
              </Button>

              <Button
                variant="cyan"
                id="btn-audit-retake"
                disabled={isSaving}
                onClick={() => setShowRetakeModal(true)}
                className="py-2 px-1 text-[11px] font-bold text-white flex items-center justify-center gap-1 bg-amber-600 border-amber-500/30 hover:bg-amber-500"
              >
                Request retake
              </Button>

              <Button
                variant="dark"
                id="btn-audit-reject"
                disabled={isSaving}
                onClick={() => handleDecision('Rejected')}
                className="py-2 px-1 text-[11px] font-bold text-white bg-rose-900 border-rose-800 hover:bg-rose-850 flex items-center justify-center gap-1"
              >
                Reject
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Retake specific reason modal dialog */}
      {showRetakeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B0B12] border border-white/12 rounded-xl p-6 max-w-md w-full space-y-4 relative text-left text-white">
            <h3 className="text-sm font-bold text-white uppercase tracking-tight">Select Retake Correction Reason</h3>
            <p className="text-xs text-[#A8A5B5] leading-relaxed">Provide direct, constructive correction feedback to the contributor for their next recording session:</p>

            <div className="space-y-1.5 pt-1.5 selection:bg-cyan-500/30">
              {retakeOptions.map((opt, i) => (
                <label key={i} className="flex items-center gap-2.5 text-xs text-[#A8A5B5] p-2 hover:bg-white/5 rounded-lg cursor-pointer leading-normal text-left">
                  <input
                    type="radio"
                    name="retake-reason"
                    checked={selectedRetakeReason === opt}
                    onChange={() => setSelectedRetakeReason(opt)}
                    className="cursor-pointer text-cyan-600 bg-zinc-950 focus:ring-cyan-500 border-zinc-700 w-4 h-4"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-3">
              <Button
                variant="violet"
                id="btn-confirm-retake"
                disabled={isSaving}
                onClick={() => {
                  handleDecision('Retake requested', selectedRetakeReason);
                  setShowRetakeModal(false);
                }}
                className="flex-1 font-bold text-xs py-2"
              >
                {isSaving ? "Saving..." : "Request retake"}
              </Button>
              <button
                onClick={() => setShowRetakeModal(false)}
                className="px-4 py-2 bg-transparent hover:bg-white/5 text-[#A8A5B5] hover:text-white text-xs font-bold rounded-lg transition-all border border-white/10 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
export default RecordingReviewPage;
