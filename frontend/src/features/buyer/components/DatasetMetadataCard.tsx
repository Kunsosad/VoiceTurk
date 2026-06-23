import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Database, Disc, Settings } from 'lucide-react';
import { Campaign } from '../../../shared/types';

interface DatasetMetadataCardProps {
  campaign: Campaign;
  acceptedCount: number;
}

export function DatasetMetadataCard({ campaign, acceptedCount }: DatasetMetadataCardProps) {
  const targetSize = campaign.targetAcceptedRecordings || campaign.targetRecordings || 60;
  const totalDurationSec = acceptedCount * 35; // average duration
  const minutes = Math.floor(totalDurationSec / 60);
  const seconds = totalDurationSec % 60;
  const durationStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  return (
    <Card className="p-5 border border-white/5 bg-[#0B0B12]/80 hover:border-cyan-500/20 transition-all text-left">
      <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-3">
        <Database className="w-4 h-4 text-cyan-400 shrink-0" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-white">Dataset Metadata</h3>
      </div>
      <div className="space-y-3 font-sans text-xs">
        <div className="flex justify-between items-center py-1 border-b border-white/2">
          <span className="text-zinc-400">Sample Rate</span>
          <span className="text-white font-mono font-semibold">16,000 Hz</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-white/2">
          <span className="text-zinc-400">Bit Depth</span>
          <span className="text-white font-mono font-semibold">16-bit PCM</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-white/2">
          <span className="text-zinc-400">Audio Format</span>
          <span className="text-white font-mono font-semibold">WAV</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-white/2">
          <span className="text-zinc-400">Label Format</span>
          <span className="text-white font-mono font-semibold">JSON metadata</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-white/2">
          <span className="text-zinc-400">Accepted Recordings</span>
          <span className="text-cyan-400 font-mono font-extrabold">{acceptedCount} / {targetSize}</span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-zinc-400">Total Duration</span>
          <span className="text-white font-mono font-semibold">{durationStr}</span>
        </div>
      </div>
    </Card>
  );
}
