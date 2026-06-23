import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { FileCode, Copy, Check } from 'lucide-react';
import { Recording } from '../../../shared/types';

interface MetadataJsonPreviewProps {
  selectedRecording?: Recording | null;
  campaignId: string;
}

export function MetadataJsonPreview({ selectedRecording, campaignId }: MetadataJsonPreviewProps) {
  const [copied, setCopied] = useState(false);

  const cleanId = selectedRecording ? selectedRecording.id.replace(/[^0-9]/g, '') : '1';
  const recId = selectedRecording ? selectedRecording.id : 'rec-acc-1';
  const audioFile = selectedRecording ? `rec-acc-${cleanId}.wav` : 'rec-acc-1.wav';
  const durationSec = selectedRecording ? selectedRecording.audioDurationSec || 35 : 78;
  const rewardVnd = selectedRecording ? selectedRecording.rewardAmount : 8000;

  const jsonObject = {
    dataset_id: "vt-lv-gift-v1",
    campaign_id: campaignId || "livestream-gift-complaint",
    recording_id: recId,
    audio_file: audioFile,
    language: "vi-VN",
    scenario: "livestream_gift_complaint",
    ai_customer_role: "angry_customer",
    contributor_role: "shop_customer_support",
    status: "accepted",
    duration_sec: durationSec,
    reward_vnd: rewardVnd
  };

  const jsonString = JSON.stringify(jsonObject, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-5 border border-white/5 bg-[#0B0B12]/90 hover:border-violet-500/10 transition-all text-left">
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-violet-400 shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Metadata JSON Preview</h3>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-white font-mono bg-zinc-900 border border-white/10 px-2.5 py-1 rounded hover:bg-zinc-800 transition-all cursor-pointer"
        >
          {copied ? (
            <>
              <Check size={10} className="text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={10} />
              <span>Copy JSON</span>
            </>
          )}
        </button>
      </div>

      <div className="text-[11px] font-mono leading-relaxed bg-black/40 border border-white/5 rounded-lg p-3 text-violet-300 max-h-48 overflow-y-auto selection:bg-violet-500/30">
        <pre className="whitespace-pre-wrap word-break">{jsonString}</pre>
      </div>
    </Card>
  );
}
