import React, { useState } from 'react';
import { AppView, Campaign, Recording, Certificate, ContributorAgreement } from './shared/types';
import { mockCampaigns as initialCampaigns, mockRecordings as initialRecordings, mockCertificates as initialCertificates, mockAgreements as initialAgreements } from './shared/mockData';
import { appApi, usingRealApi } from './shared/api';
import { realApi, StudioSession } from './shared/realApi';
import { MessageSquare, ShieldAlert, Check, X, ShieldCheck, Lock, Mail, ArrowRight, User } from 'lucide-react';

// Decoupled modular layouts & feature pages
import { Header } from './components/layout/Header';
import { AuthPage } from './features/auth/pages/AuthPage';
import { useAuth } from './features/auth/useAuth';

import { BuyerCampaignsPage } from './features/buyer/pages/BuyerCampaignsPage';
import { CampaignBuilderPage } from './features/buyer/pages/CampaignBuilderPage';
import { CampaignSetupPage } from './features/buyer/pages/CampaignSetupPage';
import { CampaignReviewPage } from './features/buyer/pages/CampaignReviewPage';
import { RecordingReviewPage } from './features/buyer/pages/RecordingReviewPage';
import { BuyerFinancePage } from './features/buyer/pages/BuyerFinancePage';
import { CertificatesPage } from './features/buyer/pages/CertificatesPage';
import { CertificateDetailPage } from './features/buyer/pages/CertificateDetailPage';

import { ContributorCampaignsPage } from './features/contributor/pages/ContributorCampaignsPage';
import { ContributorConsentPage } from './features/contributor/pages/ContributorConsentPage';
import { ContributorStudioPage } from './features/contributor/pages/ContributorStudioPage';
import { ContributorSessionSummaryPage } from './features/contributor/pages/ContributorSessionSummaryPage';
import { ContributorFinancePage } from './features/contributor/pages/ContributorFinancePage';
import { ContributorAgreementsPage } from './features/contributor/pages/ContributorAgreementsPage';
import { LandingPage } from './features/landing/pages/LandingPage';

export default function App() {
  // Global states for high-fidelity interactive prototyping
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeRole, setActiveRole] = useState<'buyer' | 'contributor'>('buyer');
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [campaigns, setCampaigns] = useState<Campaign[]>(usingRealApi ? [] : initialCampaigns);
  const [recordings, setRecordings] = useState<Recording[]>(usingRealApi ? [] : initialRecordings);
  const [certificates, setCertificates] = useState<Certificate[]>(usingRealApi ? [] : initialCertificates);
  const [agreements, setAgreements] = useState<ContributorAgreement[]>(usingRealApi ? [] : initialAgreements);
  const [customName, setCustomName] = useState('Vy Tran');
  const [activeStudioSession, setActiveStudioSession] = useState<StudioSession | null>(null);

  // Simulated toast parameters
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastIsError, setToastIsError] = useState(false);

  const showToast = (msg: string, isError: boolean = false) => {
    setToastMessage(msg);
    setToastIsError(isError);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const refreshWorkspace = React.useCallback(async () => {
    const loadedCampaigns = await appApi.listCampaigns();
    setCampaigns(loadedCampaigns);
    const [loadedRecordings, loadedCertificates, loadedAgreements] = await Promise.all([
      appApi.listRecordings(),
      appApi.listCertificates(),
      appApi.listAgreements(),
    ]);
    setRecordings(loadedRecordings);
    setCertificates(loadedCertificates);
    setAgreements(loadedAgreements);

    if (usingRealApi && user) {
      if (user.role === 'buyer') {
        const finance = await realApi.getBuyerFinance(user.id);
        setBuyerWalletBalance(finance.summary.remainingBudget);
      } else {
        const finance = await realApi.getContributorFinance(user.id);
        setContributorBalance(finance.summary.approvedReward);
      }
    }
  }, [user]);

  React.useEffect(() => {
    if (!isAuthenticated || !user) return;
    void refreshWorkspace().catch((error: any) => {
      if (!usingRealApi) {
        setCampaigns(initialCampaigns);
        setRecordings(initialRecordings);
        setCertificates(initialCertificates);
        setAgreements(initialAgreements);
        return;
      }
      const message = usingRealApi
        ? `Failed to load workspace data: ${error?.message || 'workspace API is unavailable'}`
        : error?.message || 'Unable to load VoiceTurk workspace';
      showToast(message, true);
    });
  }, [isAuthenticated, user, refreshWorkspace]);

  // Synchronize authenticated user profile with App core role states
  React.useEffect(() => {
    if (!isLoading) {
      if (user) {
        setActiveRole(user.role);
        setCustomName(user.fullName);
        if (currentView === 'login' || currentView === 'landing') {
          setCurrentView(user.role === 'buyer' ? 'buyer-campaigns' : 'contributor-campaigns');
        }
      } else {
        if (currentView !== 'login') {
          setCurrentView('landing');
        }
      }
    }
  }, [isLoading, user, currentView]);

  // Workspace routing guard for role isolation
  React.useEffect(() => {
    if (isAuthenticated && user) {
      const isBuyerPage = currentView.startsWith('buyer');
      const isContributorPage = currentView.startsWith('contributor') || currentView === 'contributor-consent' || currentView === 'contributor-studio' || currentView === 'contributor-session-summary' || currentView === 'contributor-finance' || currentView === 'contributor-agreements';
      
      if (user.role === 'buyer' && isContributorPage) {
        setCurrentView('buyer-campaigns');
        showToast("Access restricted to Buyer Console resources only.", true);
      } else if (user.role === 'contributor' && isBuyerPage) {
        setCurrentView('contributor-campaigns');
        showToast("Access restricted to Contributor Studio resources only.", true);
      }
    }
  }, [currentView, isAuthenticated, user]);

  // New spectacular interactive states for modern digital studio landing page
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0.0);
  const [simulatedAudioLogs, setSimulatedAudioLogs] = useState<Array<{name: string, ipfs: string, date: string, dialect: string}>>([
    { name: "Demo_Acoustic_01.wav", ipfs: "ipfs://QmYwAPz9yyjgS...42A", date: "Just now", dialect: "Northern Accent" }
  ]);
  const [selectedDemoLanguage, setSelectedDemoLanguage] = useState<'bac' | 'trung' | 'nam'>('bac');
  const [selectedDemoVibe, setSelectedDemoVibe] = useState<'polite' | 'serious' | 'excited'>('polite');
  const [generatedPromptScript, setGeneratedPromptScript] = useState<string>("Scenario: Customer received a dented baby milk formula box but inner seal is intact. CSKH provides resolution with Hanoi / Northern Accent with a polite, respectful customer-centric demeanor.");

  // For live smart contract transaction log
  const [mockTransactions, setMockTransactions] = useState([
    { id: 'TX-8914', type: 'DEPOSIT', party: 'Vy Tran (Enterprise)', amount: '12,500,000 VND', stamp: '1 minute ago', status: 'Success', hash: 'sol-8kLmX2...W4p' },
    { id: 'TX-8913', type: 'DISBURSE', party: 'Minh Pham (Artist)', amount: '80,000 VND', stamp: '12 minutes ago', status: 'Success', hash: 'sol-QzXzS8...PFh' },
    { id: 'TX-8912', type: 'DISBURSE', party: 'Quoc Duy (Artist)', amount: '120,000 VND', stamp: '30 minutes ago', status: 'Success', hash: 'sol-FqXzS8...WgL' },
    { id: 'TX-8911', type: 'WITHDRAW', party: 'Thu Thao (Artist)', amount: '450,000 VND', stamp: '1 hour ago', status: 'Success', hash: 'sol-MpfHwg...LmX' },
  ]);

  // Handle timer simulation inside active mic state safely
  React.useEffect(() => {
    let interval: any = null;
    if (isMicActive) {
      interval = setInterval(() => {
        setRecordingSecs(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingSecs(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMicActive]);

  const handleGenerateDialectScript = () => {
    const dialectName = selectedDemoLanguage === 'bac' ? 'Hanoi / Northern Accent' : selectedDemoLanguage === 'nam' ? 'Saigon / Southern Accent' : 'Central Accent';
    const vibeDescription = selectedDemoVibe === 'polite' 
      ? 'with a polite, respectful customer-centric demeanor' 
      : selectedDemoVibe === 'serious' 
      ? 'with a standard, serious problem-solving posture' 
      : 'with high energy, warm empathy, and conversational charm';
    
    const prompts = [
      `Scenario: Customer received a dented baby milk formula box but inner seal is intact. CSKH provides resolution with ${dialectName} ${vibeDescription}.`,
      `Scenario: Outbound call verifying a promotional vacation voucher win. CSKH pitches with ${dialectName} ${vibeDescription}.`,
      `Scenario: Resolution of a 3-hour courier delay where a birthday cake melted. CSKH speaks with ${dialectName} ${vibeDescription}.`,
      `Scenario: Financial consultation explaining retirement plans. CSKH advises with ${dialectName} ${vibeDescription}.`
    ];
    const randomIndex = Math.floor(Math.random() * prompts.length);
    setGeneratedPromptScript(prompts[randomIndex]);
    showToast("Generated demo prompt script successfully!", false);
  };

  // Expanded Financial states for escrow and deposit/withdrawal tracking
  const [buyerWalletBalance, setBuyerWalletBalance] = useState<number>(3500000); // 3,500,000 VND available in main balance
  const [contributorBalance, setContributorBalance] = useState<number>(184000); // 184,000 VND in accumulated earnings

  // Selected details
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [draftCampaignData, setDraftCampaignData] = useState<any | null>(null);
  
  // State Dispatch: Handle Creating a campaign
  const handleCreateCampaignFromAgent = async (data: any) => {
    const targetRecs = data.targetRecordings || 60;
    const pricePerRec = data.pricePerRecording || 8000;
    const payoutPool = targetRecs * pricePerRec;
    const platformFee = Math.round(payoutPool * 0.1);
    const grandTotal = payoutPool + platformFee;

    try {
      let created = await appApi.createCampaign({
        name: data.name,
        description: `Verified Vietnamese conversational support session in the sector of: ${data.industry || 'FMCG & Customer Support'}. AI Client profile: ${data.aiCustomerRole}.`,
        context: data.context,
        aiCustomerRole: data.aiCustomerRole,
        contributorRole: data.contributorRole,
        boundary: 'Maximum 5 turns per side.',
        targetAcceptedRecordings: targetRecs,
        pricePerRecording: pricePerRec,
        chatHistory: data.chatHistory,
      });
      created = await appApi.fundCampaign(created.id, grandTotal);
      created = await appApi.activateCampaign(created.id);
      await refreshWorkspace();
      setSelectedCampaign(created);
      setCurrentView('buyer-campaign-review');
      showToast('Campaign created, funded, and activated successfully!');
    } catch (error: any) {
      showToast(error?.message || 'Unable to create campaign', true);
    }
    return;

    // Build the new active campaign structure directly from AI VoiceBot parameters
    const newCamp: Campaign = {
      id: `campaign-${Date.now()}`,
      name: data.name,
      description: `Verified Vietnamese conversational support session in the sector of: ${data.industry || 'FMCG & Customer Support'}. AI Client profile: ${data.aiCustomerRole}.`,
      context: data.context,
      aiCustomerRole: data.aiCustomerRole,
      contributorRole: data.contributorRole,
      boundary: 'Max 5 speaker turns per side. Audio length 15s - 90s.',
      reviewGuide: [
        'Acoustics must be clear without severe background noise distortion',
        'Contributor speaking style aligns with roleplay constraints',
        'Resolves the customer complaint logically and politely',
        'Exhibits natural human pacing and tone'
      ],
      targetRecordings: targetRecs,
      targetAcceptedRecordings: targetRecs,
      acceptedRecordings: 0,
      pendingReviewCount: 0,
      retakeCount: 0,
      retakeRequestedCount: 0,
      rejectedCount: 0,
      pricePerRecording: pricePerRec,
      payoutAccrued: 0,
      platformFee: platformFee,
      totalBudget: grandTotal,
      securedBudget: grandTotal,
      status: 'Active',
      dateCreated: new Date().toISOString(),
      chatHistory: data.chatHistory
    };

    // Append activation logging records
    const newTermsCert: Certificate = {
      id: `cert-${Date.now()}-terms`,
      campaignId: newCamp.id,
      type: 'Terms',
      title: 'Campaign Dynamic Genesis Certification',
      campaignName: newCamp.name,
      status: 'Verified',
      parties: ['Vy Tran (Buyer)', 'VoiceTurk Smart Escrow Protocol'],
      dateTime: '2026-06-22 10:24 UTC',
      confirmedAt: '2026-06-22 10:24 UTC',
      termsSummary: `Authorized campaign configuration via AI Builder. Successfully locked budget of ${grandTotal.toLocaleString('en-US')} VND into smart escrow custody.`,
      solanaTxSignature: '4z9mKTmBsfhUfJNsApxG3ny6FqXzS8yd7X5z8mPFhWgLmX2pY',
      proofRef: 'ipfs://QmYwAPzwh3pC...9zT'
    };

    setCampaigns([newCamp, ...campaigns]);
    setCertificates([newTermsCert, ...certificates]);
    setSelectedCampaign(newCamp);
    setCurrentView('buyer-campaign-review');
    showToast("Campaign parameterized and launched successfully!");
  };

  const handleUpdateCampaign = async (updatedCamp: Campaign) => {
    try {
      const saved = await appApi.updateCampaign(updatedCamp.id, updatedCamp);
      setCampaigns(prevCampaigns => prevCampaigns.map(c => c.id === saved.id ? saved : c));
      setSelectedCampaign(saved);
      showToast('Campaign updated successfully!');
    } catch (error: any) {
      showToast(error?.message || 'Unable to update campaign', true);
    }
  };

  const handleActivateCampaign = async () => {
    if (!draftCampaignData) return;

    try {
      let created = await appApi.createCampaign({
        name: draftCampaignData.name,
        description: draftCampaignData.description,
        context: draftCampaignData.context,
        aiCustomerRole: draftCampaignData.aiCustomerRole,
        contributorRole: draftCampaignData.contributorRole,
        boundary: 'Maximum 5 turns per side.',
        targetAcceptedRecordings: draftCampaignData.targetRecordings,
        pricePerRecording: draftCampaignData.pricePerRecording,
        chatHistory: draftCampaignData.chatHistory,
      });
      created = await appApi.fundCampaign(created.id, 528000);
      created = await appApi.activateCampaign(created.id);
      setDraftCampaignData(null);
      await refreshWorkspace();
      setSelectedCampaign(created);
      setCurrentView('buyer-campaign-review');
      showToast('Campaign activated successfully and dispatched to contributor queue!');
    } catch (error: any) {
      showToast(error?.message || 'Unable to activate campaign', true);
    }
    return;

    // Build the new active campaign structure
    const newCamp: Campaign = {
      id: `campaign-${Date.now()}`,
      name: draftCampaignData.name,
      description: draftCampaignData.description || 'AI customer plays a frustrated livestream buyer missing a promised gift. Contributor responds as customer support.',
      context: draftCampaignData.context,
      aiCustomerRole: draftCampaignData.aiCustomerRole,
      contributorRole: draftCampaignData.contributorRole,
      boundary: 'Maximum 5 turns per side. Audio duration 15s - 90s.',
      reviewGuide: [
        'Voice is clear and audible with adequate volume',
        'Conversation flow is responsive and natural',
        'Contributor plays the specified customer support role',
        'Contributor handles the situation with professional decorum',
        'Contributor does not make promises that harm the brand identity'
      ],
      targetRecordings: draftCampaignData.targetRecordings,
      targetAcceptedRecordings: draftCampaignData.targetRecordings,
      acceptedRecordings: 0,
      pendingReviewCount: 0,
      retakeCount: 0,
      retakeRequestedCount: 0,
      rejectedCount: 0,
      pricePerRecording: draftCampaignData.pricePerRecording,
      payoutAccrued: 0,
      platformFee: 48000,
      totalBudget: 528000,
      securedBudget: 528000,
      status: 'Active',
      dateCreated: new Date().toISOString(),
      chatHistory: draftCampaignData.chatHistory
    };

    // Append a new terms certificate
    const newTermsCert: Certificate = {
      id: `cert-${Date.now()}-terms`,
      campaignId: newCamp.id,
      type: 'Terms',
      title: 'Campaign Activation Cryptographic Log',
      campaignName: newCamp.name,
      status: 'Verified',
      parties: ['Vy Tran (Buyer)', 'VoiceTurk Smart Escrow Protocol'],
      dateTime: '2026-06-22 10:24 UTC',
      confirmedAt: '2026-06-22 10:24 UTC',
      termsSummary: 'Successfully activated dialogue boundaries and scenario metadata for the live campaign.',
      solanaTxSignature: '4z9mKTmBsfhUfJNsApxG3ny6FqXzS8yd7X5z8mPFhWgLmX2pY',
      proofRef: 'ipfs://QmYwAPzwh3pC...19x'
    };

    setCampaigns([newCamp, ...campaigns]);
    setCertificates([newTermsCert, ...certificates]);
    setDraftCampaignData(null);
    setSelectedCampaign(newCamp);
    setCurrentView('buyer-campaign-review');
    showToast("Campaign activated successfully and dispatched to contributor queue!");
  };

  // State Dispatch: Handle Recording Studio submission
  const handleFinishRecordingStudioSession = async (duration: string, audio?: Blob, durationSeconds = 75) => {
    const activeCamp = campaigns.find(c => c.id === 'campaign-1') || campaigns[0];

    try {
      let submitted: Recording;
      if (usingRealApi) {
        if (!activeStudioSession || !audio) throw new Error('Studio session or recorded audio is unavailable');
        submitted = await realApi.submitStudioRecording(activeCamp.id, activeStudioSession.sessionId, audio, durationSeconds);
        await realApi.endStudioSession(activeStudioSession.sessionId);
        setActiveStudioSession(null);
      } else {
        submitted = await appApi.submitRecording(activeCamp.id, duration, durationSeconds);
      }
      await refreshWorkspace();
      setSelectedRecording(submitted);
      setCurrentView('contributor-session-summary');
      showToast('Recording transmitted successfully to the enterprise audit queue!');
    } catch (error: any) {
      showToast(error?.message || 'Unable to submit recording', true);
    }
    return;

    // Build the dynamic Recording structure representing the contributor's effort
    const newRecording: Recording = {
      id: `rec-${Date.now()}`,
      campaignId: activeCamp.id,
      campaignName: activeCamp.name,
      contributorName: 'Minh Pham',
      recordedTime: 'Just now',
      duration: duration,
      status: 'Pending review',
      rewardAmount: activeCamp.pricePerRecording || 8000,
      quality: 'Excellent',
      contextSnapshot: 'Missing livestream giveaway cosmetic pack; angry buyer claiming compensation.',
      audioDurationSec: 75,
      customerContext: 'Buyer is extremely frustrated due to 3 missing skincare sheet masks promised during the live broadcast promotion.',
      agentContext: 'Agent listens politely, validates order packaging dispatch error, and authorizes express delivery of 5 skincare masks to reconcile the buyer.',
      useCaseDomain: 'Post-livestream Customer Support - Redeeming buyer loyalty after package fulfillment mishap.',
      transcript: '[AI - Khách hàng]: Em ơi chị nhận bộ sữa rửa mặt rồi mà tìm hoài không thấy 3 miếng mặt nạ trà xanh tặng kèm đâu hết trơn à. Shop làm ăn như thế này là treo đầu dê bán thịt chó rồi đấy nhé!\n[Contributor - CSKH]: Dạ em thành thật xin lỗi chị yêu nhiều lắm ạ. Do buổi live tối hôm đó lượng đơn bùng nổ, bộ phận đóng kho quá tải nên đã sơ suất để thiếu quà tặng của chị ạ. Em xin phép lấy thông tin số điện thoại của chị để tạo đơn gửi bù ngay hỏa tốc 5 miếng mặt nạ trà xanh thay vì 3 miếng đền bù sự bất tiện này cho chị liền nha chị.'
    };

    // Append to certificates a contribution record
    const newConsentCert: Certificate = {
      id: `cert-${Date.now()}-consent`,
      campaignId: activeCamp.id,
      type: 'Consent',
      title: 'Voice Recording Cryptographic Consent',
      campaignName: activeCamp.name,
      status: 'Verified',
      parties: ['Minh Pham (Contributor)', 'VoiceTurk Trust Protocol'],
      dateTime: '2026-06-22 10:25 UTC',
      confirmedAt: '2026-06-22 10:25 UTC',
      termsSummary: 'Granted legal release consent for acoustic research. Uploaded dialogue files to secure IPFS registry.',
      solanaTxSignature: '5z8mPFhW5DksFhUfJNsAdTpxG3Gny6FqXzS8y6E1VfWpLmD7X',
      proofRef: 'ipfs://QmYwAPzwh3pC...7bX'
    };

    // Append to Contributor Agreements log
    const newAgree: ContributorAgreement = {
      id: `agree-${Date.now()}`,
      campaignName: activeCamp.name,
      consentStatus: 'Agreed',
      confirmedTime: '2026-06-22 10:25 UTC',
      rewardRule: '8,000 VND per accepted recording. Paid after buyer validation.',
      consentDetails: 'Participated in natural customer support resolution roleplay, delivering authentic acoustic samples.'
    };

    setRecordings([newRecording, ...recordings]);
    setCertificates([newConsentCert, ...certificates]);
    setAgreements([newAgree, ...agreements]);

    // Update active campaign counts (increases pending review count in state!)
    const updatedCampaigns = campaigns.map(c => {
      if (c.id === activeCamp.id) {
        return {
          ...c,
          pendingReviewCount: c.pendingReviewCount + 1
        };
      }
      return c;
    });
    setCampaigns(updatedCampaigns);

    setCurrentView('contributor-session-summary');
    showToast("Recording transmitted successfully to the enterprise audit queue!");
  };

  // State Dispatch: Handle Buyer review decision
  const handleRecordingDecision = async (recordingId: string, decision: 'Accepted' | 'Retake requested' | 'Rejected', reason?: string) => {
    const activeCamp = campaigns.find(c => c.id === 'campaign-1') || campaigns[0];

    try {
      const apiDecision = decision === 'Accepted' ? 'accept' : decision === 'Retake requested' ? 'request_retake' : 'reject';
      const updated = await appApi.reviewRecording(recordingId, apiDecision, reason);
      setRecordings(current => current.map(item => item.id === updated.id ? updated : item));
      await refreshWorkspace();
      showToast(`Audit decision submitted successfully: marked as "${decision}"`);
    } catch (error: any) {
      showToast(error?.message || 'Unable to submit review', true);
    }
    return;

    // Adjust state lists
    const updatedRecordings = recordings.map((rec) => {
      if (rec.id === recordingId) {
        return {
          ...rec,
          status: decision,
          retakeReason: reason
        };
      }
      return rec;
    });
    setRecordings(updatedRecordings);

    // Re-tally campaign counts reactively!
    const updatedCampaigns = campaigns.map((c) => {
      if (c.id === activeCamp.id) {
        let acceptedDelta = 0;
        let pendingDelta = -1;
        let retakeDelta = 0;
        let rejectedDelta = 0;

        if (decision === 'Accepted') {
          acceptedDelta = 1;
        } else if (decision === 'Retake requested') {
          retakeDelta = 1;
        } else if (decision === 'Rejected') {
          rejectedDelta = 1;
        }

        const nextAccepted = c.acceptedRecordings + acceptedDelta;
        return {
          ...c,
          acceptedRecordings: nextAccepted,
          pendingReviewCount: Math.max(0, c.pendingReviewCount + pendingDelta),
          retakeRequestedCount: c.retakeRequestedCount + retakeDelta,
          rejectedCount: c.rejectedCount + rejectedDelta,
          payoutAccrued: nextAccepted * c.pricePerRecording
        };
      }
      return c;
    });
    setCampaigns(updatedCampaigns);

    // Append to certificates ledger if accepted
    if (decision === 'Accepted') {
      const newDatasetCert: Certificate = {
        id: `cert-${Date.now()}-handover`,
        campaignId: activeCamp.id,
        type: 'Handover',
        title: 'Dialogue Accepted Ledger Verification',
        campaignName: activeCamp.name,
        status: 'Verified',
        parties: ['Vy Tran (Buyer / Reviewer)', 'IPFS Audio Node'],
        dateTime: '2026-06-22 10:28 UTC',
        confirmedAt: '2026-06-22 10:28 UTC',
        termsSummary: 'Dialogue frames accepted and validated. Initiated 8,000 VND contributor payout sequence from escrow pools.',
        solanaTxSignature: '3KyM9A1vKfWsPeK6p7ZsM2bK1Y3AnYtX9XpYg4Wt7JsX9',
        proofRef: 'ipfs://QmYwAPzwh3pC...8hY'
      };
      setCertificates([newDatasetCert, ...certificates]);
    }

    showToast(`Audit decision submitted successfully: marked as "${decision === 'Accepted' ? 'Approved' : decision === 'Retake requested' ? 'Retake Requested' : decision === 'Rejected' ? 'Rejected' : decision}"`);
  };

  // Help calculate overall balances
  const targetCampaign = campaigns.find(c => c.id === 'campaign-1') || campaigns[0];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050509] flex flex-col justify-center items-center relative gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin" />
        <span className="text-xs font-mono text-cyan-400 font-bold tracking-widest uppercase">
          Initializing VoiceTurk Portal...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (currentView === 'landing') {
      return (
        <>
          {toastMessage && (
            <div className="fixed top-6 right-6 z-50 animate-scaleIn max-w-sm w-full">
              <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-2xl backdrop-blur-md ${
                toastIsError
                  ? 'bg-rose-950/80 border-rose-500/30 text-rose-200'
                  : 'bg-zinc-950/90 border-cyan-500/30 text-cyan-200'
              }`}>
                <div className="text-xs font-sans text-left flex-1 font-semibold leading-relaxed">
                  {toastMessage}
                </div>
              </div>
            </div>
          )}
          <LandingPage onNavigateToAuth={() => setCurrentView('login')} />
        </>
      );
    }

    return (
      <div className="min-h-screen bg-[#050509] flex flex-col relative" id="voiceturk-unauth-view">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] z-0 pointer-events-none" />
        <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-900/10 to-transparent blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-cyan-950/10 to-transparent blur-[120px] pointer-events-none" />

        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 animate-scaleIn max-w-sm w-full">
            <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-2xl backdrop-blur-md ${
              toastIsError
                ? 'bg-rose-950/80 border-rose-500/30 text-rose-200'
                : 'bg-zinc-950/90 border-cyan-500/30 text-cyan-200'
            }`}>
              <div className="text-xs font-sans text-left flex-1 font-semibold leading-relaxed">
                {toastMessage}
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10 flex flex-col justify-center">
          <AuthPage
            onLoginSuccess={(role, fullName) => {
              setActiveRole(role);
              setCustomName(fullName);
              setCurrentView(role === 'buyer' ? 'buyer-campaigns' : 'contributor-campaigns');
              showToast(`Welcome back, ${fullName}!`);
            }}
            onNavigateHome={() => setCurrentView('landing')}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050509] flex flex-col relative">
      
      {/* Background ambient stars particles & perspective overlay lines */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] z-0 pointer-events-none" />
      <div className="absolute top-10 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-900/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-cyan-950/10 to-transparent blur-[120px] pointer-events-none" />

      {/* Floating Animated Toast Banner */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-scaleIn max-w-sm w-full">
          <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-2xl backdrop-blur-md ${
            toastIsError
              ? 'bg-rose-950/80 border-rose-500/30 text-rose-200'
              : 'bg-zinc-950/90 border-cyan-500/30 text-cyan-200'
          }`}>
            <div className="text-xs font-sans text-left flex-1 font-semibold leading-relaxed">
              {toastMessage}
            </div>
          </div>
        </div>
      )}

      {/* RENDER TOP GLOBAL NAVIGATION IF NOT ON LANDING LOGINS */}
      {currentView !== 'login' && (
        <Header
          activeRole={activeRole}
          onRoleChange={setActiveRole}
          currentView={currentView}
          onNavigate={setCurrentView}
          onLogout={() => {
            setCurrentView('login');
            showToast("Logged out successfully!");
          }}
        />
      )}

      {/* MAIN SCREEN DISPATCHER */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10 text-white">
        
        {/* SCREEN 1: LOGIN / ROLE SELECT */}
        {currentView === 'login' && (
          <AuthPage
            onLoginSuccess={(role, fullName) => {
              setActiveRole(role);
              setCustomName(fullName);
              setCurrentView(role === 'buyer' ? 'buyer-campaigns' : 'contributor-campaigns');
              showToast(`Welcome back, ${fullName}!`);
            }}
            onNavigateHome={() => setCurrentView('landing')}
          />
        )}

        {/* SCREEN 2: BUYER CAMPAIGNS */}
        {currentView === 'buyer-campaigns' && (
          <BuyerCampaignsPage
            campaigns={campaigns}
            onSelectCampaign={(c) => {
              setSelectedCampaign(c);
              setCurrentView('buyer-campaign-review');
            }}
            onNavigate={setCurrentView}
          />
        )}

        {/* SCREEN 3: BUYER CREATE CAMPAIGN AGENT */}
        {currentView === 'buyer-create-agent' && (
          <CampaignBuilderPage
            onCreate={(campData) => {
              handleCreateCampaignFromAgent(campData);
            }}
            onCancel={() => setCurrentView('buyer-campaigns')}
          />
        )}

        {/* SCREEN 4: BUYER CAMPAIGN SETUP */}
        {currentView === 'buyer-campaign-setup' && (
          <CampaignSetupPage
            draft={draftCampaignData}
            onComplete={handleActivateCampaign}
            onCancel={() => setCurrentView('buyer-campaigns')}
          />
        )}

        {/* SCREEN 5: BUYER CAMPAIGN REVIEW */}
        {currentView === 'buyer-campaign-review' && selectedCampaign && (
          <CampaignReviewPage
            campaign={selectedCampaign}
            recordings={recordings}
            onSelectRecording={(rec) => {
              setSelectedRecording(rec);
              setCurrentView('buyer-recording-review');
            }}
            onNavigate={setCurrentView}
            onUpdateCampaign={handleUpdateCampaign}
            buyerWalletBalance={buyerWalletBalance}
            setBuyerWalletBalance={setBuyerWalletBalance}
          />
        )}

        {/* SCREEN 6: BUYER RECORDING REVIEW */}
        {currentView === 'buyer-recording-review' && selectedRecording && (
          <RecordingReviewPage
            recording={selectedRecording}
            onDecision={handleRecordingDecision}
            onNavigate={setCurrentView}
          />
        )}

        {/* SCREEN 7: BUYER FINANCE */}
        {currentView === 'buyer-finance' && (
          <BuyerFinancePage
            campaigns={campaigns}
            recordings={recordings}
            onNavigate={setCurrentView}
            onSelectCampaign={(c) => {
              setSelectedCampaign(c);
              setCurrentView('buyer-campaign-review');
            }}
            buyerWalletBalance={buyerWalletBalance}
            setBuyerWalletBalance={setBuyerWalletBalance}
          />
        )}

        {/* SCREEN 8: BUYER CERTIFICATES */}
        {currentView === 'buyer-certificates' && (
          <CertificatesPage
            certificates={certificates}
            onSelectCertificate={(cert) => {
              if (usingRealApi) {
                void realApi.getCertificate(cert.id).then((detail) => {
                  setSelectedCertificate(detail);
                  setCurrentView('buyer-certificate-detail');
                }).catch((error: any) => showToast(error?.message || 'Unable to load certificate', true));
              } else {
                setSelectedCertificate(cert);
                setCurrentView('buyer-certificate-detail');
              }
            }}
            onNavigate={setCurrentView}
          />
        )}

        {/* SCREEN 9: CERTIFICATE DETAIL */}
        {currentView === 'buyer-certificate-detail' && selectedCertificate && (
          <CertificateDetailPage
            certificate={selectedCertificate}
            onNavigate={setCurrentView}
          />
        )}

        {/* SCREEN 10: CONTRIBUTOR CAMPAIGNS */}
        {currentView === 'contributor-campaigns' && (
          <ContributorCampaignsPage
            campaigns={campaigns}
            onSelectCampaign={(c) => {
              setSelectedCampaign(c);
              setCurrentView('contributor-consent');
            }}
            onNavigate={setCurrentView}
          />
        )}

        {/* SCREEN 11: CONTRIBUTOR CONSENT */}
        {currentView === 'contributor-consent' && (
          <ContributorConsentPage
            campaign={targetCampaign}
            onAccept={() => {
              void appApi.joinCampaignConsent(targetCampaign, 'Accepted in VoiceTurk contributor consent screen').then(async () => {
                if (usingRealApi && user) {
                  const session = await realApi.startStudioSession(targetCampaign.id, user.id);
                  setActiveStudioSession(session);
                  showToast(`Studio channel ${session.channelName} is ready. The AI Customer must join manually.`);
                }
                await refreshWorkspace();
                setCurrentView('contributor-studio');
              }).catch((error: any) => showToast(error?.message || 'Unable to accept campaign terms', true));
            }}
            onCancel={() => setCurrentView('contributor-campaigns')}
          />
        )}

        {/* SCREEN 12: CONTRIBUTOR STUDIO */}
        {currentView === 'contributor-studio' && (
          <ContributorStudioPage
            campaign={targetCampaign}
            onFinish={handleFinishRecordingStudioSession}
            onToast={(msg, type) => showToast(msg, type === 'error')}
          />
        )}

        {/* SCREEN 13: CONTRIBUTOR SESSION SUMMARY */}
        {currentView === 'contributor-session-summary' && (
          <ContributorSessionSummaryPage
            campaignName={campaigns[0]?.name || "Active Dialogue Campaign"}
            duration="1m 15s"
            onNavigate={setCurrentView}
          />
        )}

        {/* SCREEN 14: CONTRIBUTOR FINANCE */}
        {currentView === 'contributor-finance' && (
          <ContributorFinancePage
            campaigns={campaigns}
            recordings={recordings}
            contributorBalance={contributorBalance}
            setContributorBalance={setContributorBalance}
            onToast={(msg, type) => showToast(msg, type === 'error')}
            onWithdraw={(amount) => appApi.mockWithdrawContributor(amount)}
            onNavigate={setCurrentView}
          />
        )}

        {/* SCREEN 15: CONTRIBUTOR AGREEMENTS */}
        {currentView === 'contributor-agreements' && (
          <ContributorAgreementsPage
            agreements={agreements}
            onNavigate={setCurrentView}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-white/5 relative z-10 text-center text-[10px] text-zinc-500 bg-[#050509] font-sans">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center gap-1">
          <p className="max-w-md select-none leading-relaxed">
            Demo Sandbox Environment. Proof of quality is digitally verified.
          </p>
          <div className="text-[9.5px] text-zinc-600 mt-0.5">
            &copy; {new Date().getFullYear()} VoiceTurk. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
