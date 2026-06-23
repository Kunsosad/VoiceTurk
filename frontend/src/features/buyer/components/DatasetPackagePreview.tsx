import React, { useState, useEffect } from 'react';
import { Campaign, Recording } from '../../../shared/types';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { AcceptedRecordingCard } from './AcceptedRecordingCard';
import { MetadataJsonPreview } from './MetadataJsonPreview';
import { Package, CheckCircle, AlertCircle, Play, Archive, Check } from 'lucide-react';

interface DatasetPackagePreviewProps {
  campaign: Campaign;
  campaignRecordings: Recording[];
  isBuildingDataset: boolean;
  datasetProgress: number;
  datasetBuildLogs: string[];
  builtDatasetList: any[];
  onBuildDataset: () => void;
  showLocalSuccess: (msg: string) => void;
}

export function DatasetPackagePreview({
  campaign,
  campaignRecordings,
  isBuildingDataset,
  datasetProgress,
  datasetBuildLogs,
  builtDatasetList,
  onBuildDataset,
  showLocalSuccess
}: DatasetPackagePreviewProps) {
  const targetSize = campaign.targetAcceptedRecordings || campaign.targetRecordings || 60;
  
  // Local state for tracking which recording's audio is active/playing
  const [activePlayId, setActivePlayId] = useState<string | null>(null);
  
  // Filter accepted recordings to list in preview
  const acceptedRecordings = campaignRecordings.filter(r => r.status === 'Accepted');
  
  // Selected recording for JSON preview (defaults to first accepted recording if available)
  const [selectedRecForJson, setSelectedRecForJson] = useState<Recording | null>(null);

  useEffect(() => {
    if (acceptedRecordings.length > 0 && !selectedRecForJson) {
      setSelectedRecForJson(acceptedRecordings[0]);
    }
  }, [acceptedRecordings, selectedRecForJson]);

  // Handle playing state
  const handleTogglePlay = (recId: string) => {
    const rec = campaignRecordings.find(r => r.id === recId);
    if (rec) {
      setSelectedRecForJson(rec);
    }
    setActivePlayId(prev => (prev === recId ? null : recId));
  };

  // Get count stats
  const pendingCount = campaignRecordings.filter(r => r.status === 'Pending review').length;
  const retakeCount = campaignRecordings.filter(r => r.status === 'Retake requested').length;
  const rejectedCount = campaignRecordings.filter(r => r.status === 'Rejected').length;

  const isReady = acceptedRecordings.length >= targetSize;

  return (
    <div className="space-y-6">
      {/* 1. Dataset Package Preview Card */}
      <Card className="p-5 border border-white/5 bg-[#0B0B12]/80 hover:border-cyan-500/10 transition-all text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5 mb-3">
          <div>
            <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
              <Package className="w-4 h-4 text-cyan-400" />
              Dataset Package Preview
            </h3>
            <p className="text-xs text-[#A8A5B5] mt-1 font-sans">
              Review accepted recordings, labels, and metadata before exporting the dataset package.
            </p>
          </div>
          <div>
            {isReady ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold font-sans bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full select-none">
                <CheckCircle size={12} /> Ready to export
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold font-sans bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full select-none">
                <AlertCircle size={12} /> Not ready
              </span>
            )}
          </div>
        </div>

        {/* 2. Accepted Recordings List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-[#6F6B7E] font-mono uppercase font-bold">
              Accepted Recordings ({acceptedRecordings.length})
            </span>
            <span className="text-[10px] text-zinc-500 font-sans">
              Only approved files will be compiled
            </span>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {acceptedRecordings.length === 0 ? (
              <div className="p-6 bg-zinc-950/40 rounded-xl border border-white/5 text-center text-xs text-zinc-500 font-sans">
                No recordings have been approved yet. Use the "Review Recordings" tab to approve files.
              </div>
            ) : (
              acceptedRecordings.map((rec, index) => (
                <AcceptedRecordingCard
                  key={rec.id}
                  recording={rec}
                  index={index}
                  isPlaying={activePlayId === rec.id}
                  onTogglePlay={() => handleTogglePlay(rec.id)}
                />
              ))
            )}
          </div>
        </div>
      </Card>

      {/* 3. Metadata JSON Preview */}
      <MetadataJsonPreview
        selectedRecording={selectedRecForJson}
        campaignId={campaign.id}
      />

      {/* 4. Export Action Area */}
      <Card className="p-5 border border-white/5 bg-[#0B0B12]/80 text-left">
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950/60 p-3.5 rounded-xl border border-white/5 text-center font-mono">
            <div>
              <span className="text-[9px] text-[#6F6B7E] uppercase block font-bold">Accepted</span>
              <span className="text-sm font-extrabold text-emerald-400">{acceptedRecordings.length} / {targetSize}</span>
            </div>
            <div>
              <span className="text-[9px] text-[#6F6B7E] uppercase block font-bold">Pending</span>
              <span className="text-sm font-extrabold text-amber-400">{pendingCount}</span>
            </div>
            <div>
              <span className="text-[9px] text-[#6F6B7E] uppercase block font-bold">Retake Req</span>
              <span className="text-sm font-extrabold text-indigo-400">{retakeCount}</span>
            </div>
            <div>
              <span className="text-[9px] text-[#6F6B7E] uppercase block font-bold">Rejected</span>
              <span className="text-sm font-extrabold text-rose-400">{rejectedCount}</span>
            </div>
          </div>

          <div className="pt-1.5">
            {!isBuildingDataset ? (
              <div className="space-y-2">
                <Button
                  variant={isReady ? "emerald" : "dark"}
                  className="w-full font-bold uppercase tracking-wider text-xs py-3"
                  onClick={onBuildDataset}
                  disabled={!isReady}
                >
                  {isReady ? "Export Dataset" : "Export Dataset Disabled"}
                </Button>
                {!isReady && (
                  <p className="text-[11px] text-zinc-500 font-sans text-center">
                    Needs {targetSize} accepted recordings. Currently {acceptedRecordings.length} accepted.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-emerald-400 font-bold">Compiling metadata & building index ({datasetProgress}%) ...</span>
                  <span className="text-[#6F6B7E]">SHA256 checksum generation</span>
                </div>
                <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-white/5">
                  <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${datasetProgress}%` }} />
                </div>
                
                <div className="p-3 bg-zinc-950 text-[10.5px] font-mono text-emerald-400 rounded-lg max-h-[140px] overflow-y-auto space-y-1 block leading-relaxed text-left border border-white/5">
                  {datasetBuildLogs.map((log, lIdx) => (
                    <div key={lIdx} className="flex gap-1.5">
                      <span className="text-zinc-600 font-bold">&gt;</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 5. Compiled Package History */}
      <Card className="p-5 border border-white/5 bg-[#0B0B12]/80 text-left">
        <span className="text-[10px] text-[#6F6B7E] font-mono uppercase block font-bold border-b border-white/5 pb-2 mb-3">
          Compiled Packages
        </span>
        
        {builtDatasetList.length === 0 ? (
          <div className="py-4 bg-zinc-950/30 rounded-lg text-center text-xs text-zinc-500 font-sans border border-dashed border-white/5">
            No dataset package has been exported yet.
          </div>
        ) : (
          <div className="space-y-3">
            {builtDatasetList.map((dt) => (
              <div 
                key={dt.id}
                className="p-3.5 bg-zinc-950 border border-white/5 hover:border-emerald-500/30 rounded-xl flex items-center justify-between gap-4 transition-all"
              >
                <div className="space-y-1.5 text-left min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="emerald">VERSION {dt.version}</Badge>
                    <span className="text-xs font-bold text-white font-mono truncate">{dt.id}</span>
                  </div>
                  <div className="text-[10.5px] text-[#A8A5B5] font-sans">
                    Recordings bundled: <b>{dt.fileCount} records</b> · Duration: <b>{dt.totalDuration}</b>
                  </div>
                  <div className="text-[9.5px] text-[#6F6B7E] font-mono truncate font-semibold leading-none">
                    SHA256: {dt.hash}
                  </div>
                </div>

                <Button
                  variant="emerald"
                  size="sm"
                  onClick={() => {
                    showLocalSuccess(`Triggered secure transmission of '${dt.id}'!`);
                  }}
                  className="font-bold shrink-0 font-sans cursor-pointer text-[11px]"
                >
                  Download ZIP
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
