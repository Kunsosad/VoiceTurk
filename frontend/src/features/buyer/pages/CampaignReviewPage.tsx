import React, { useState, useEffect } from 'react';
import { 
  Check, Play, Edit, Trash2, ArrowLeft, RotateCcw, 
  ChevronRight, CheckCircle2, ShieldCheck, Landmark, Mic, Bot, Sparkles, AlertCircle 
} from 'lucide-react';
import { Campaign, Recording, AppView } from '../../../shared/types';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { formatMoneyVND } from '../../../shared/formatters';
import { DatasetMetadataCard } from '../components/DatasetMetadataCard';
import { CampaignLabelsCard } from '../components/CampaignLabelsCard';
import { ExportRulesCard } from '../components/ExportRulesCard';
import { DatasetPackagePreview } from '../components/DatasetPackagePreview';

interface CampaignReviewPageProps {
  campaign: Campaign;
  recordings: Recording[];
  onSelectRecording: (rec: Recording) => void;
  onNavigate: (view: AppView) => void;
  onUpdateCampaign?: (camp: Campaign) => void;
  buyerWalletBalance: number;
  setBuyerWalletBalance: React.Dispatch<React.SetStateAction<number>>;
}

export function CampaignReviewPage({
  campaign,
  recordings,
  onSelectRecording,
  onNavigate,
  onUpdateCampaign,
  buyerWalletBalance,
  setBuyerWalletBalance
}: CampaignReviewPageProps) {
  const [activeMainTab, setActiveMainTab] = useState<'info' | 'funds' | 'records' | 'dataset'>('info');
  const [activeTab, setActiveTab] = useState<'Pending review' | 'Accepted' | 'Retake requested' | 'Rejected'>('Pending review');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Local recordings synchronizer to allow interactive updates
  const [localRecordings, setLocalRecordings] = useState<Recording[]>(recordings);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    setLocalRecordings(recordings);
  }, [recordings]);

  const showLocalSuccess = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  const handleRemoveFromDataset = (id: string) => {
    setLocalRecordings(prev => 
      prev.map(r => r.id === id ? { ...r, status: 'Pending review' as const } : r)
    );
    showLocalSuccess(`File '${id}' status reverted to Pending Review.`);
  };

  // Dataset packing states
  const [isBuildingDataset, setIsBuildingDataset] = useState(false);
  const [datasetProgress, setDatasetProgress] = useState(0);
  const [datasetBuildLogs, setDatasetBuildLogs] = useState<string[]>([]);
  const [builtDatasetList, setBuiltDatasetList] = useState<any[]>(() => {
    const acceptedCount = campaign.acceptedRecordings;
    const targetLimit = campaign.targetAcceptedRecordings || campaign.targetRecordings || 60;
    if (acceptedCount >= targetLimit) {
      return [
        {
          id: "dataset-v1.0.0",
          createdAt: "22/06/2026 15:30",
          fileCount: acceptedCount,
          totalDuration: `${acceptedCount * 35} seconds`,
          hash: "0x8fa3d9b4c0e25f7a18ffb8c0e2a39fbc417ea9b11029c85718dfdcba564bd4b1",
          downloadUrl: "#",
          version: "1.0.0"
        }
      ];
    }
    return [];
  });

  const handleBuildDataset = () => {
    const acceptedCount = localRecordings.filter(r => r.campaignId === campaign.id && r.status === 'Accepted').length;
    if (acceptedCount === 0) {
      showLocalSuccess("No recordings are marked 'Accepted' to package. Please approve at least one recording first.");
      return;
    }

    setIsBuildingDataset(true);
    setDatasetProgress(5);
    setDatasetBuildLogs(["[System] Starting dataset export process... "]);

    const steps = [
      { prg: 20, log: "Scanning and referencing accepted recordings..." },
      { prg: 45, log: "Extracting audio files from secure cloud storage..." },
      { prg: 65, log: "Retrieving contributor verification proof signatures..." },
      { prg: 80, log: "Normalizing audio formats and aligning customer labels..." },
      { prg: 95, log: "Generating JSON metadata for training labels..." },
      { prg: 100, log: "ZIP compilation complete! Dataset package verified." }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        const stepVal = steps[currentStep];
        setDatasetProgress(stepVal.prg);
        setDatasetBuildLogs(prev => [...prev, stepVal.log]);
        currentStep++;
      } else {
        clearInterval(interval);
        
        const randHash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join("");
        const totalSecs = acceptedCount * 35;
        const durStr = `${Math.floor(totalSecs / 60)}m ${totalSecs % 60}s`;
        
        const nextVer = `1.0.${builtDatasetList.length}`;
        const newDataset = {
          id: `dataset-v${nextVer}`,
          createdAt: new Date().toLocaleDateString('vi-VN') + " " + new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}),
          fileCount: acceptedCount,
          totalDuration: durStr,
          hash: randHash,
          downloadUrl: "#",
          version: nextVer
        };

        setBuiltDatasetList(prev => [newDataset, ...prev]);
        setIsBuildingDataset(false);
        showLocalSuccess(`Successfully compiled Dataset package v${nextVer}!`);
      }
    }, 900);
  };

  // Funding Interactive States
  const [fundingSource, setFundingSource] = useState<'main_wallet' | 'online_direct'>('main_wallet');
  const [onlineProvider, setOnlineProvider] = useState<'vietqr' | 'momo' | 'zalopay' | 'visamaster'>('vietqr');
  const [topupAmount, setTopupAmount] = useState<number>(500000);
  const [isProcessingFunding, setIsProcessingFunding] = useState(false);

  // Editor States (Direct Editing)
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(campaign.name);
  const [editContext, setEditContext] = useState(campaign.context);
  const [editAiRole, setEditAiRole] = useState(campaign.aiCustomerRole);
  const [editContributorRole, setEditContributorRole] = useState(campaign.contributorRole);
  const [editTarget, setEditTarget] = useState(campaign.targetRecordings || 60);
  const [editPrice, setEditPrice] = useState(campaign.pricePerRecording || 8000);

  // Live Chat refiner elements
  const [isContinuingChat, setIsContinuingChat] = useState(false);
  const [refinerChatHistory, setRefinerChatHistory] = useState<any[]>(campaign.chatHistory || []);
  const [refinerInput, setRefinerInput] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState('');

  // Sync edits when campaign prop changes
  useEffect(() => {
    setEditName(campaign.name);
    setEditContext(campaign.context);
    setEditAiRole(campaign.aiCustomerRole);
    setEditContributorRole(campaign.contributorRole);
    setEditTarget(campaign.targetRecordings || 60);
    setEditPrice(campaign.pricePerRecording || 8000);
    setRefinerChatHistory(campaign.chatHistory || []);
  }, [campaign]);

  // Handle refinement submissions
  const handleRefinerSend = (userInputText: string) => {
    if (!userInputText.trim() || isAiProcessing) return;

    const userMsg = {
      sender: 'user',
      text: userInputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    const nextHistory = [...refinerChatHistory, userMsg];
    setRefinerChatHistory(nextHistory);
    setIsAiProcessing(true);

    setTimeout(() => {
      setIsAiProcessing(false);
      let botReply = '';
      const norm = userInputText.toLowerCase();
      
      if (norm.includes('80') || norm.includes('tám mươi')) {
        setEditTarget(80);
        botReply = `Review logged! Campaign target scale raised to 80 accepted recordings.`;
      } else if (norm.includes('100') || norm.includes('một trăm')) {
        setEditTarget(100);
        botReply = `Target limit changed to 100 clean recordings. Best for neural speech acoustic patterns!`;
      } else if (norm.includes('40') || norm.includes('bốn mươi')) {
        setEditTarget(40);
        botReply = `Target limit compacted to 40 records successfully.`;
      } else if (norm.includes('giận dữ') || norm.includes('gắt') || norm.includes('lớn tiếng') || norm.includes('cáu')) {
        setEditAiRole('Extremely irritated and angry consumer demanding immediate refunds');
        botReply = `Recorded. Customer virtual roleplay changed to irritated context.`;
      } else if (norm.includes('lo lắng') || norm.includes('sợ') || norm.includes('hoang mang')) {
        setEditAiRole('Extremely anxious consumer afraid of transaction delays');
        botReply = `Saved. Customer attitude switched to highly anxious dialogue style.`;
      } else if (norm.includes('quản lý') || norm.includes('sếp') || norm.includes('trưởng')) {
        setEditContributorRole('Escalation manager with immediate discretionary override authority');
        botReply = `Contributor job title updated to branch manager.`;
      } else if (norm.includes('nhân viên') || norm.includes('cskh') || norm.includes('tư vấn')) {
        setEditContributorRole('Calm customer support professional handling raw complaints');
        botReply = `Contributor role reverted to support representative.`;
      } else if (norm.includes('mỹ phẩm') || norm.includes('son') || norm.includes('quà')) {
        setEditContext('Customer complaints about missing promotional lipstick inside premium cosmetics packages.');
        botReply = `Dialogue plot changed to missing gift on cosmetics.`;
      } else if (norm.includes('tủ lạnh') || norm.includes('bảo hành') || norm.includes('biên nhận')) {
        setEditContext('Customer needs guidance on activating electronic warranty sheets.');
        botReply = `Dialogue plot converted to consumer warranty support issue.`;
      } else {
        botReply = `Heard constraint refiner: "${userInputText}". This is directly updated in the structural form. Press "Sync" to commit.`;
      }

      const aiMsg = {
        sender: 'ai',
        text: botReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setRefinerChatHistory(prev => [...prev, aiMsg]);
    }, 1100);
  };

  const handleMicSimulation = () => {
    if (isAiProcessing || isRecordingVoice) return;
    setIsRecordingVoice(true);
    setVoiceDraft("Decoding raw audio accents...");
    
    setTimeout(() => {
      setIsRecordingVoice(false);
      setVoiceDraft("");
      
      const textSug = editTarget !== 100 
        ? "Tăng chỉ tiêu mốc lên thành 100 tệp ghi âm sạch"
        : "Đổi thái độ của AI Customer sang hướng giận dữ và khiếu nại kịch tính";
      handleRefinerSend(textSug);
    }, 2000);
  };

  const handleApplyDirectChanges = () => {
    if (onUpdateCampaign) {
      onUpdateCampaign({
        ...campaign,
        name: editName,
        context: editContext,
        aiCustomerRole: editAiRole,
        contributorRole: editContributorRole,
        targetRecordings: editTarget,
        pricePerRecording: editPrice,
        chatHistory: refinerChatHistory
      });
    }
    setIsEditing(false);
    showLocalSuccess("Successfully updated campaign scenario brief guidelines!");
  };

  const handleTopupFromMainWallet = (amount?: number) => {
    const activeAmount = amount !== undefined ? amount : topupAmount;
    if (activeAmount <= 0) {
      showLocalSuccess("Please enter a valid amount!");
      return;
    }
    if (buyerWalletBalance < activeAmount) {
      showLocalSuccess("Primary wallet balance insufficient!");
      return;
    }
    
    setIsProcessingFunding(true);
    setTimeout(() => {
      setBuyerWalletBalance(prev => prev - activeAmount);
      if (onUpdateCampaign) {
        onUpdateCampaign({
          ...campaign,
          totalBudget: (campaign.totalBudget || campaign.securedBudget || 528000) + activeAmount
        });
      }
      setIsProcessingFunding(false);
      showLocalSuccess(`Successfully deposited ${activeAmount.toLocaleString()} VND from system balance to campaign escrow!`);
    }, 800);
  };

  const handleTopupOnlineSuccess = (amount?: number) => {
    const activeAmount = amount !== undefined ? amount : topupAmount;
    if (activeAmount <= 0) {
      showLocalSuccess("Please enter a valid amount!");
      return;
    }
    
    setIsProcessingFunding(true);
    setTimeout(() => {
      if (onUpdateCampaign) {
        onUpdateCampaign({
          ...campaign,
          totalBudget: (campaign.totalBudget || campaign.securedBudget || 528000) + activeAmount
        });
      }
      setIsProcessingFunding(false);
      showLocalSuccess(`Online secure gateway accepted payment of ${activeAmount.toLocaleString()} VND successfully!`);
    }, 800);
  };

  const filteredRecordings = localRecordings.filter(
    (r) => r.campaignId === campaign.id && r.status === activeTab
  );

  const campaignRecordings = localRecordings.filter(r => r.campaignId === campaign.id);
  const targetSize = campaign.targetAcceptedRecordings || campaign.targetRecordings || 60;

  return (
    <div id="buyer-campaign-review-screen" className="space-y-6 py-4 animate-scaleIn text-left font-sans text-white">
      
      {/* Banner message */}
      {successBanner && (
        <div className="fixed top-24 right-4 z-55 max-w-sm bg-zinc-950 border-2 border-emerald-500/40 text-emerald-400 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
          <div className="text-xs font-semibold">{successBanner}</div>
        </div>
      )}

      {/* Breadcrumb Header */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <button
          onClick={() => onNavigate('buyer-campaigns')}
          className="text-xs text-[#A8A5B5] hover:text-white font-semibold px-2 py-1.5 hover:bg-white/5 rounded transition-all cursor-pointer"
        >
          ← Campaign List
        </button>
        <span className="text-zinc-600 font-mono text-xs">/</span>
        <h1 className="text-lg font-bold text-white uppercase tracking-tight">Campaign Controller: {campaign.name}</h1>
      </div>

      {/* Main navigation tabs */}
      <div id="buyer-review-horizontal-steer" className="bg-[#0B0B13] border border-white/10 rounded-xl p-1.5 flex flex-col md:flex-row gap-1.5 shadow-xl items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-1.5 border-r border-white/5 mr-1 hidden md:flex shrink-0 select-none">
          <span className="text-[10px] text-[#A8A5B5] font-mono uppercase font-bold tracking-wider">
            CONTROLLER NAVIGATION:
          </span>
        </div>
        <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-4 gap-1.5">
          <button
            onClick={() => setActiveMainTab('info')}
            className={`py-2 px-1 text-center rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === 'info' 
                ? 'bg-gradient-to-r from-pink-600/30 to-purple-850 text-white border border-purple-500/30' 
                : 'text-[#A8A5B5] hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <span>1. AI Assistant & Brief</span>
            <span className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-violet-300">
              Brief
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab('funds')}
            className={`py-2 px-1 text-center rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === 'funds' 
                ? 'bg-gradient-to-r from-violet-600/30 to-indigo-850 text-white border border-indigo-500/30' 
                : 'text-[#A8A5B5] hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <span>2. Escrow & Balance</span>
            <span className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-teal-400 font-bold">
              Escrow
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab('records')}
            className={`py-2 px-1 text-center rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === 'records' 
                ? 'bg-gradient-to-r from-cyan-600/30 to-indigo-850 text-white border border-cyan-500/30' 
                : 'text-[#A8A5B5] hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <span>3. Review Recordings</span>
            <span className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-cyan-300 font-bold">
              {campaignRecordings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveMainTab('dataset')}
            className={`py-2 px-1 text-center rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeMainTab === 'dataset' 
                ? 'bg-gradient-to-r from-emerald-600/30 to-teal-850 text-white border border-teal-500/30' 
                : 'text-[#A8A5B5] hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <span>4. Dataset Packager</span>
            <span className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-emerald-300 font-bold">
              ZIP
            </span>
          </button>
        </div>
      </div>

      {/* Main split dashboard area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative text-left">
        
        {/* LEFT COLUMN: ACTIVE SCENARIO SUMMARY */}
        {activeMainTab !== 'info' && activeMainTab !== 'dataset' && (
          <div className="lg:col-span-4 lg:sticky lg:top-20">
            <Card className="p-5 space-y-4">
              <span className="text-[10px] text-[#6F6B7E] font-mono uppercase block font-bold border-b border-white/5 pb-1">Active Scenario Summary</span>
              <div className="space-y-3 text-xs leading-relaxed text-left">
                <div>
                  <label className="text-[9px] text-[#6F6B7E] font-mono block">CAMPAIGN TITLE:</label>
                  <p className="text-white font-bold">{campaign.name}</p>
                </div>
                <div>
                  <label className="text-[9px] text-[#6F6B7E] font-mono block">SCENARIO PLOT:</label>
                  <p className="text-zinc-300 line-clamp-3">{campaign.context}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-[#6F6B7E] font-mono block">TARGET LIMIT:</label>
                    <p className="text-white font-bold font-mono">{campaign.acceptedRecordings} / {targetSize}</p>
                  </div>
                  <div>
                    <label className="text-[9px] text-[#6F6B7E] font-mono block">SECURED BUDGET:</label>
                    <p className="text-teal-400 font-bold font-mono">{formatMoneyVND(campaign.totalBudget || campaign.securedBudget || 528000)}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 1 CONTENT: AI REFINER & BRIEF SPEC */}
        {activeMainTab === 'info' && (
          <>
            {/* Left brief panel */}
            <div className="lg:col-span-4 lg:sticky lg:top-20">
              <Card className="p-5 space-y-5">
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <span className="text-[10px] text-cyan-400 font-mono font-bold uppercase">Original Scenario Brief</span>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-2 py-1 text-[10px] bg-zinc-900 border border-white/10 text-cyan-400 hover:text-white hover:bg-cyan-950/40 rounded transition-all font-mono font-bold cursor-pointer"
                    >
                      Edit Brief
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#6F6B7E] font-mono uppercase font-bold block">Campaign Name:</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/40 font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-[#6F6B7E] font-mono uppercase font-bold block">Dialogue Context / Plot:</label>
                      <textarea
                        rows={4}
                        value={editContext}
                        onChange={(e) => setEditContext(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-[#6F6B7E] font-mono uppercase block">AI Customer Attitude:</label>
                        <input
                          type="text"
                          value={editAiRole}
                          onChange={(e) => setEditAiRole(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/10 rounded px-2 py-1 text-xs text-violet-300 font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-[#6F6B7E] font-mono uppercase block">CS Agent Role:</label>
                        <input
                          type="text"
                          value={editContributorRole}
                          onChange={(e) => setEditContributorRole(e.target.value)}
                          className="w-full bg-zinc-950 border border-white/10 rounded px-2 py-1 text-xs text-cyan-300 font-semibold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <label className="text-[10px] text-[#6F6B7E] font-mono uppercase block">Minimum Target:</label>
                        <input
                          type="number"
                          value={editTarget}
                          onChange={(e) => setEditTarget(Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-white/10 rounded px-2 py-1 text-xs text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-[#6F6B7E] font-mono uppercase block">Payout Reward:</label>
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-white/10 rounded px-2 py-1 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        variant="cyan"
                        size="sm"
                        className="w-full"
                        onClick={handleApplyDirectChanges}
                      >
                        Apply Changes
                      </Button>
                      <Button
                        variant="dark"
                        size="sm"
                        className="w-full"
                        onClick={() => setIsEditing(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-xs leading-relaxed text-left">
                    <div>
                      <dt className="text-[10px] text-[#6F6B7E] font-mono uppercase">Campaign Name</dt>
                      <dd className="text-sm font-bold text-white mt-0.5">{campaign.name}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] text-[#6F6B7E] font-mono uppercase">Dialogue Context / Plot</dt>
                      <dd className="text-zinc-350">{campaign.context}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] text-[#6F6B7E] font-mono uppercase">AI Customer Roleplay Attitude</dt>
                      <dd className="text-violet-300 font-semibold">{campaign.aiCustomerRole}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] text-[#6F6B7E] font-mono uppercase">CS Agent Role</dt>
                      <dd className="text-cyan-300 font-semibold">{campaign.contributorRole}</dd>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-2 font-mono">
                      <div>
                        <span className="text-[9px] text-[#6F6B7E] block uppercase">Minimum Target</span>
                        <span className="text-white font-extrabold block">{targetSize} records</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-[#6F6B7E] block uppercase">Payout Reward</span>
                        <span className="text-cyan-400 font-extrabold block">{formatMoneyVND(campaign.pricePerRecording || 8000)} / recording</span>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Right Chat Refiner Column */}
            <div className="lg:col-span-8 space-y-4">
              <Card className="min-h-[460px] flex flex-col justify-between relative bg-black/45">
                <div className="absolute top-0 right-0 w-80 h-80 bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />
                
                {/* Refiner status header */}
                <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-zinc-950/40 rounded-t-xl z-10 select-none">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-ping" />
                    <span className="text-[10px] font-mono text-zinc-300 font-bold tracking-widest uppercase">
                      AI CAMPAIGN REFINER VOICEBOT
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-violet-400 font-bold bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                    Vocal feedback active
                  </span>
                </div>

                {/* Refiner Chat historical viewport */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[300px]">
                  {refinerChatHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 h-full text-center text-zinc-500 space-y-2">
                      <Bot size={28} className="text-violet-400 animate-pulse" />
                      <p className="text-xs">Interactive brief refiner logs are empty.</p>
                      <p className="text-[10px] text-zinc-650">Send text prompts or use voice commands to fine-tune campaign guidelines seamlessly.</p>
                    </div>
                  ) : (
                    refinerChatHistory.map((msg, index) => (
                      <div 
                        key={index} 
                        className={`flex gap-3 max-w-[85%] animate-fadeIn ${
                          msg.sender === 'user' ? 'ml-auto justify-end text-right' : 'mr-auto justify-start text-left'
                        }`}
                      >
                        {msg.sender === 'ai' && (
                          <div className="w-6 h-6 rounded-full bg-violet-950 border border-violet-500/20 flex items-center justify-center shrink-0">
                            <Bot size={11} className="text-violet-400" />
                          </div>
                        )}
                        <div className="space-y-1 text-left">
                          <span className="text-[8px] font-mono text-zinc-500 block">
                            {msg.sender === 'ai' ? 'AI Script Assistant' : 'Vy Tran (Enterprise)'}
                          </span>
                          <div className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                            msg.sender === 'ai'
                              ? 'bg-zinc-900 border border-white/5 text-zinc-200 text-left'
                              : 'bg-indigo-950/40 border border-indigo-500/20 text-cyan-200 text-left'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Bottom refiner action tools */}
                <div className="p-4 border-t border-white/5 bg-zinc-950/60 rounded-b-xl space-y-3 z-10">
                  <div className="flex flex-col items-center justify-center py-1">
                    <button
                      onClick={handleMicSimulation}
                      disabled={isAiProcessing || isRecordingVoice}
                      className={`relative w-12 h-12 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                        isRecordingVoice 
                          ? 'bg-red-950/60 border-red-500 text-red-400 scale-105 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse' 
                          : 'bg-zinc-900 hover:bg-zinc-800 border-white/10 text-cyan-400'
                      } disabled:opacity-35`}
                    >
                      <Mic size={18} className={isRecordingVoice ? 'animate-bounce' : ''} />
                    </button>
                    <span className="text-[9px] text-[#A8A5B5] font-mono font-bold uppercase mt-1">
                      {isRecordingVoice ? "COLLECTING AUDIO..." : isAiProcessing ? "COMPILING PROMPT..." : "Click Microphone (Simulate Voice)"}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[9px] text-[#6F6B7E] font-mono block text-left">
                      You can input text commands or click the mic button to change variables (e.g. "set target to 100", "make customer angry").
                    </span>
                    {refinerChatHistory.length > 0 && (
                      <Button
                        variant="violet"
                        size="sm"
                        onClick={handleApplyDirectChanges}
                        className="font-bold shrink-0 ml-4 font-mono text-[10px]"
                      >
                        APPLY CHANGES
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}

        {/* TAB 2 CONTENT: FUNDS / ESCROW WORKSPACE */}
        {activeMainTab === 'funds' && (
          <div className="lg:col-span-8 space-y-6 animate-fadeIn">
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className="text-[10px] text-cyan-400 font-mono font-bold uppercase tracking-wider block">
                  CAMPAIGN SECURED ESCROW BALANCE
                </span>
                <Button
                  variant="cyan"
                  size="sm"
                  onClick={() => setShowPaymentModal(true)}
                  className="font-bold flex items-center gap-1.5 animate-pulse"
                >
                  Top up escrow budget
                </Button>
              </div>
              
              <p className="text-xs text-[#A8A5B5] leading-relaxed text-left">
                Campaign reward balances are securely held in trust escrow. Funds are automatically transferred to contributor accounts only upon your explicit approval of their recorded audio.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-left">
                <div className="bg-zinc-950 p-4 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[9.5px] text-[#6F6B7E] font-mono uppercase block">Total Secured Budget</span>
                  <p className="text-lg font-mono font-bold text-white">{formatMoneyVND(campaign.totalBudget || campaign.securedBudget || 528000)}</p>
                  <span className="text-[9px] text-[#6F6B7E] block">Locked Escrow + 10% platform fee</span>
                </div>
                
                <div className="bg-zinc-950 p-4 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[9.5px] text-[#6F6B7E] font-mono uppercase block">Accrued Contributor Payouts</span>
                  <p className="text-lg font-mono font-bold text-emerald-400">{formatMoneyVND(campaign.payoutAccrued || 0)}</p>
                  <span className="text-[9px] text-teal-400 block font-semibold">Distributed for {campaign.acceptedRecordings} approved recordings</span>
                </div>

                <div className="bg-zinc-950 p-4 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[9.5px] text-[#6F6B7E] font-mono uppercase block">Remaining Escrow Balance</span>
                  <p className="text-lg font-mono font-bold text-cyan-400">
                    {formatMoneyVND(Math.max(0, (campaign.totalBudget || campaign.securedBudget || 528000) - (campaign.payoutAccrued || 0)))}
                  </p>
                  <span className="text-[9px] text-[#6F6B7E] block">Available for future contributions</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs font-mono text-zinc-400 bg-white/2 p-3 rounded border border-white/5 leading-relaxed">
                <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                  SECURED 100%: Escrow pool locked. Status: ACTIVE
                </span>
                <span>Smart Escrow Node Routing: Active</span>
              </div>
            </Card>

            {/* Historical transaction lists */}
            <Card className="p-6 space-y-4 text-left">
              <div className="border-b border-white/5 pb-2">
                <h3 className="text-sm font-bold text-white font-sans">
                  Escrow Cashflow Ledger
                </h3>
                <p className="text-xs text-[#A8A5B5] mt-1">Auditable history of escrow injections and platform reward disbursements.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left antialiased">
                  <thead className="bg-[#151522]/80 border-b border-white/10 text-[#6F6B7E] uppercase font-mono text-[9px] tracking-wider font-semibold">
                    <tr>
                      <th className="p-3">Transaction ID</th>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Funding Source</th>
                      <th className="p-3 text-right font-medium">Amount Injected</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-[11px] text-zinc-300">
                    <tr className="hover:bg-white/2">
                      <td className="p-3 text-[#A8A5B5] font-bold">#ES-902-SOL</td>
                      <td className="p-3">23/06/2026 07:15</td>
                      <td className="p-3 font-sans text-left">Internal balance transfer</td>
                      <td className="p-3 text-right font-bold text-teal-400">+{formatMoneyVND(200000)}</td>
                      <td className="p-3 text-right text-emerald-400"><b>SUCCESSFUL</b></td>
                    </tr>
                    <tr className="hover:bg-white/2">
                      <td className="p-3 text-[#A8A5B5] font-bold">#ES-221-MOMO</td>
                      <td className="p-3">22/06/2026 14:10</td>
                      <td className="p-3 font-sans text-left">Online payment gateway (MoMo Wallet)</td>
                      <td className="p-3 text-right font-bold text-teal-400">+{formatMoneyVND(300000)}</td>
                      <td className="p-3 text-right text-emerald-400"><b>SUCCESSFUL</b></td>
                    </tr>
                    <tr className="hover:bg-white/2 text-zinc-400">
                      <td className="p-3 font-medium">#ES-GNS-INIT</td>
                      <td className="p-3">15/06/2026 09:00</td>
                      <td className="p-3 font-sans text-left">Initial campaign launch escrow lock</td>
                      <td className="p-3 text-right font-semibold">{formatMoneyVND(campaign.securedBudget || 528000)}</td>
                      <td className="p-3 text-right font-bold text-zinc-450 text-xs">ORIGIN LOCKED</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3 CONTENT: DUYỆT BẢN THOẠI (REVIEW RECORDINGS) */}
        {activeMainTab === 'records' && (
          <div className="lg:col-span-8 space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-center justify-between border-b border-white/5 pb-3.5 gap-4">
              <div className="space-y-1 text-left">
                <h3 className="text-sm font-bold text-white font-sans">Contributor Submissions</h3>
                <p className="text-xs text-[#A8A5B5]">Review recordings, request corrections, or add verified audio to your training parameters.</p>
              </div>

              {/* Badged subtabs */}
              <div className="flex flex-wrap gap-1 bg-zinc-950 p-1 rounded-lg border border-white/5 select-none text-[11px] font-sans">
                {(['Pending review', 'Accepted', 'Retake requested', 'Rejected'] as const).map((tab) => {
                  const count = localRecordings.filter(r => r.campaignId === campaign.id && r.status === tab).length;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                        activeTab === tab
                          ? 'bg-cyan-600 text-white shadow'
                          : 'text-[#A8A5B5] hover:text-white'
                      }`}
                    >
                      {tab === 'Pending review' ? 'Pending' : tab === 'Accepted' ? 'Accepted' : tab === 'Retake requested' ? 'Retakes' : 'Rejected'}
                      <span className="ml-1.5 px-1 bg-white/10 rounded font-mono text-[9.5px] font-extrabold">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List */}
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {filteredRecordings.length === 0 ? (
                <div className="bg-[#0B0B12]/40 border border-dashed border-white/10 rounded-xl p-12 text-center text-[#6F6B7E] text-xs leading-relaxed">
                  No submissions currently in "{activeTab}" status.
                </div>
              ) : (
                filteredRecordings.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-[#0B0B12] border border-white/5 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md transition-all hover:border-cyan-500/15"
                  >
                    <div className="space-y-2 text-left flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${rec.status === 'Pending review' ? 'bg-amber-400' : rec.status === 'Accepted' ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
                        <span className="text-xs text-white font-bold">{rec.contributorName}</span>
                        <span className="text-[10px] text-[#6F6B7E] font-mono">· Submitted: {rec.recordedTime}</span>
                      </div>

                      <p className="text-xs text-[#A8A5B5] leading-relaxed italic block p-2 bg-white/2 rounded">
                        "{rec.contextSnapshot}"
                      </p>

                      <div className="flex items-center gap-4 text-[10.5px] text-[#6F6B7E] font-mono">
                        <span>Duration: <b className="text-[#A8A5B5]">{rec.duration}</b></span>
                        <span>Acoustic Fidelity: <b className="text-teal-400">EXCELLENT SPECTRUM (+24dB SNR)</b></span>
                      </div>

                      {rec.retakeReason && (
                        <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded text-[10.5px] text-amber-350">
                          Retake requested feedback: {rec.retakeReason}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="dark"
                      size="sm"
                      onClick={() => {
                        onSelectRecording(rec);
                        onNavigate('buyer-recording-review');
                      }}
                      className="w-full md:w-auto flex items-center justify-center gap-1.5 font-bold"
                    >
                      Review & Decide
                      <ChevronRight size={13} />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4 CONTENT: DATASET PACKAGER (CUSTOM TWO-COLUMN LAYOUT) */}
        {activeMainTab === 'dataset' && (
          <>
            {/* LEFT COLUMN: Metadata, Labels, Rules (~32% width on desktop) */}
            <div className="lg:col-span-4 space-y-6">
              <DatasetMetadataCard
                campaign={campaign}
                acceptedCount={localRecordings.filter(r => r.campaignId === campaign.id && r.status === 'Accepted').length}
              />
              <CampaignLabelsCard />
              <ExportRulesCard />
            </div>

            {/* RIGHT COLUMN: Packager, Recordings List, JSON Preview, History (~68% width on desktop) */}
            <div className="lg:col-span-8 animate-fadeIn">
              <DatasetPackagePreview
                campaign={campaign}
                campaignRecordings={campaignRecordings}
                isBuildingDataset={isBuildingDataset}
                datasetProgress={datasetProgress}
                datasetBuildLogs={datasetBuildLogs}
                builtDatasetList={builtDatasetList}
                onBuildDataset={handleBuildDataset}
                showLocalSuccess={showLocalSuccess}
              />
            </div>
          </>
        )}

      </div>

      {/* Payment Topup Drawer Modal */}
      {showPaymentModal && (
        <Modal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          title="Deposit Escrow Top-Up"
          maxWidth="md"
        >
          <div className="space-y-5 text-zinc-300 font-sans text-xs text-left leading-relaxed">
            <p className="text-zinc-400">Select transaction source to inject supplementary reward pools into the secure sandbox escrow.</p>

            <div className="grid grid-cols-2 gap-3 pb-2 select-none">
              <button
                onClick={() => setFundingSource('main_wallet')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center cursor-pointer transition-all ${
                  fundingSource === 'main_wallet'
                    ? 'bg-cyan-950/40 border-cyan-500/50 text-white font-sans'
                    : 'bg-zinc-950 border-white/5 text-zinc-400 hover:text-white font-sans'
                }`}
              >
                <Landmark size={18} />
                <span className="font-bold">Primary System Balance</span>
                <span className="text-[9.5px] text-[#6F6B7E]">Available: {formatMoneyVND(buyerWalletBalance)}</span>
              </button>

              <button
                onClick={() => setFundingSource('online_direct')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center cursor-pointer transition-all ${
                  fundingSource === 'online_direct'
                    ? 'bg-violet-950/40 border-violet-500/50 text-white font-sans'
                    : 'bg-zinc-950 border-white/5 text-zinc-400 hover:text-white font-sans'
                }`}
              >
                <Sparkles size={18} />
                <span className="font-bold">Connected Payments Interface</span>
                <span className="text-[9.5px] text-[#6F6B7E]">ZaloPay, Visa, MoMo, VietQR</span>
              </button>
            </div>

            {/* Topup Amount Selection */}
            <div className="space-y-2 text-left">
              <label className="text-[10px] text-[#6F6B7E] font-mono uppercase block">Deposit Amount:</label>
              <div className="relative">
                <input
                  type="number"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-white/10 rounded-lg p-2.5 text-sm font-mono text-teal-400 font-extrabold focus:outline-none focus:border-teal-500/40 pl-3.5"
                />
                <span className="absolute right-3.5 top-3 text-[10px] font-bold text-[#6F6B7E]">VND</span>
              </div>
            </div>

            {/* Conditional provider visual fields */}
            {fundingSource === 'online_direct' && (
              <div className="p-3 bg-zinc-950 rounded-xl border border-white/5 space-y-2 text-left">
                <span className="text-[9px] text-[#6F6B7E] font-mono block uppercase">Gateway Provider Selection:</span>
                <div className="grid grid-cols-4 gap-1.5 select-none">
                  {(['vietqr', 'momo', 'zalopay', 'visamaster'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setOnlineProvider(p)}
                      className={`py-1.5 rounded-lg border text-[10px] font-bold uppercase cursor-pointer transition-all ${
                        onlineProvider === p
                          ? 'bg-violet-950/50 border-violet-500/50 text-violet-400'
                          : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-white'
                      }`}
                    >
                      {p === 'vietqr' ? 'VietQR NFC' : p === 'momo' ? 'V-MOMO' : p === 'zalopay' ? 'ZALOPAY' : 'CARDS'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Secure confirmation button */}
            <div className="pt-2 text-left">
              {isProcessingFunding ? (
                <div className="p-3 bg-cyan-950/20 text-cyan-400 rounded-xl font-mono text-center text-xs animate-pulse font-bold">
                  Establishing secure SSL payment tunnel...
                </div>
              ) : (
                <Button
                  variant={fundingSource === 'main_wallet' ? 'cyan' : 'violet'}
                  className="w-full font-bold uppercase tracking-wider text-xs"
                  onClick={() => {
                    if (fundingSource === 'main_wallet') {
                      handleTopupFromMainWallet();
                    } else {
                      handleTopupOnlineSuccess();
                    }
                    setShowPaymentModal(false);
                  }}
                >
                  Approve Deposit & Secure Escrow
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
export default CampaignReviewPage;
