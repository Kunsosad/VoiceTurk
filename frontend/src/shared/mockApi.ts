import { Campaign, Recording, Certificate, ContributorAgreement, ReviewDecision } from './types';
import { mockCampaigns, mockRecordings, mockCertificates, mockAgreements } from './mockData';
import { safeStorage } from './safeStorage';

// Simulated latency helper
const delay = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms));

// Fallback initializers for localStorage
const getStored = <T>(key: string, fallback: T): T => {
  const data = safeStorage.getItem(`voiceturk_${key}`);
  if (!data) {
    safeStorage.setItem(`voiceturk_${key}`, JSON.stringify(fallback));
    return fallback;
  }
  return JSON.parse(data);
};

const setStored = <T>(key: string, value: T) => {
  safeStorage.setItem(`voiceturk_${key}`, JSON.stringify(value));
};

export const getStoredCampaigns = (): Campaign[] => getStored('campaigns', mockCampaigns);
export const getStoredRecordings = (): Recording[] => getStored('recordings', mockRecordings);
export const getStoredCertificates = (): Certificate[] => getStored('certificates', mockCertificates);
export const getStoredAgreements = (): ContributorAgreement[] => getStored('agreements', mockAgreements);

export const saveStoredCampaigns = (data: Campaign[]) => setStored('campaigns', data);
export const saveStoredRecordings = (data: Recording[]) => setStored('recordings', data);
export const saveStoredCertificates = (data: Certificate[]) => setStored('certificates', data);
export const saveStoredAgreements = (data: ContributorAgreement[]) => setStored('agreements', data);

// Global Finance status
export interface WalletState {
  buyerBalance: number;
  contributorBalance: number;
  totalWithdrawn: number;
}

const defaultWallet: WalletState = {
  buyerBalance: 5000000, // 5M VND starting funds
  contributorBalance: 128000,
  totalWithdrawn: 0
};

export const getStoredWallet = (): WalletState => getStored('wallet', defaultWallet);
export const saveStoredWallet = (wallet: WalletState) => setStored('wallet', wallet);

export const mockApi = {
  async listCampaigns(): Promise<Campaign[]> {
    await delay();
    return getStoredCampaigns();
  },

  async getCampaign(id: string): Promise<Campaign | undefined> {
    await delay(200);
    const campaigns = getStoredCampaigns();
    return campaigns.find(c => c.id === id);
  },

  async createCampaign(payload: Partial<Campaign>): Promise<Campaign> {
    await delay(600);
    const campaigns = getStoredCampaigns();
    const newCampaign: Campaign = {
      id: `campaign-${Date.now()}`,
      name: payload.name || 'Chiến dịch mới',
      description: payload.description || '',
      context: payload.context || '',
      aiCustomerRole: payload.aiCustomerRole || '',
      contributorRole: payload.contributorRole || '',
      boundary: payload.boundary || 'Tối đa 5 lượt mỗi bên',
      conversationLimit: payload.boundary || 'Tối đa 5 lượt mỗi bên',
      reviewGuide: payload.reviewGuide || [
        'Giọng nói chuẩn xác, không tạp âm bối cảnh',
        'Tương tác đúng với vai diễn CSKH/Khách hàng'
      ],
      targetAcceptedRecordings: payload.targetAcceptedRecordings || 50,
      targetRecordings: payload.targetAcceptedRecordings || 50,
      acceptedRecordings: 0,
      pendingReviewCount: 0,
      retakeCount: 0,
      rejectedCount: 0,
      pricePerRecording: payload.pricePerRecording || 8000,
      securedBudget: 0,
      payoutAccrued: 0,
      platformFee: 0,
      totalBudget: 0,
      status: 'Draft',
      dateCreated: new Date().toISOString(),
      proofStatus: 'None',
      chatHistory: payload.chatHistory || []
    };

    campaigns.push(newCampaign);
    saveStoredCampaigns(campaigns);
    return newCampaign;
  },

  async updateCampaign(campaignId: string, patch: Partial<Campaign>): Promise<Campaign> {
    await delay(300);
    const campaigns = getStoredCampaigns();
    const index = campaigns.findIndex(c => c.id === campaignId);
    if (index === -1) throw new Error('Không tìm thấy chiến dịch');

    const updated = { ...campaigns[index], ...patch };
    campaigns[index] = updated;
    saveStoredCampaigns(campaigns);
    return updated;
  },

  async fundCampaign(campaignId: string, amount: number, useWalletBalance = true): Promise<Campaign> {
    await delay(800);
    const campaigns = getStoredCampaigns();
    const index = campaigns.findIndex(c => c.id === campaignId);
    if (index === -1) throw new Error('Không tìm thấy chiến dịch');

    const wallet = getStoredWallet();
    if (useWalletBalance) {
      if (wallet.buyerBalance < amount) throw new Error('Số dư tài khoản chính không khả dụng!');
      wallet.buyerBalance -= amount;
      saveStoredWallet(wallet);
    }

    const campaign = campaigns[index];
    const newSecuredBudget = (campaign.securedBudget || 0) + amount;
    const platformFee = Math.round(newSecuredBudget * 0.1);
    
    const updated: Campaign = {
      ...campaign,
      securedBudget: newSecuredBudget,
      totalBudget: newSecuredBudget,
      platformFee,
      status: campaign.status === 'Draft' ? 'TermsPending' : campaign.status
    };

    campaigns[index] = updated;
    saveStoredCampaigns(campaigns);

    // Create a certificate for escrow
    const certificates = getStoredCertificates();
    const newCert: Certificate = {
      id: `cert-${Date.now()}`,
      campaignId,
      type: 'Escrow',
      title: 'Ký quỹ Ngân sách Chiến dịch',
      status: 'Verified',
      parties: ['Vy Tran (Buyer)', 'VoiceTurk Escrow Account'],
      confirmedAt: new Date().toISOString(),
      termsSummary: `Ký quỹ thành công ${amount.toLocaleString('vi-VN')} VND thành khoản bảo chứng cho cộng tác viên.`,
      proofRef: `solana-tx://${Math.random().toString(36).substring(2, 17)}`
    };
    certificates.push(newCert);
    saveStoredCertificates(certificates);

    return updated;
  },

  async activateCampaign(campaignId: string): Promise<Campaign> {
    await delay(500);
    const campaigns = getStoredCampaigns();
    const index = campaigns.findIndex(c => c.id === campaignId);
    if (index === -1) throw new Error('Không tìm thấy chiến dịch');

    const updated: Campaign = {
      ...campaigns[index],
      status: 'Active',
      proofStatus: 'Confirmed'
    };
    campaigns[index] = updated;
    saveStoredCampaigns(campaigns);
    return updated;
  },

  async listRecordings(campaignId?: string): Promise<Recording[]> {
    await delay();
    const recordings = getStoredRecordings();
    if (campaignId) {
      return recordings.filter(r => r.campaignId === campaignId);
    }
    return recordings;
  },

  async reviewRecording(recordingId: string, decision: ReviewDecision, reason?: string): Promise<Recording> {
    await delay(600);
    const recordings = getStoredRecordings();
    const recIndex = recordings.findIndex(r => r.id === recordingId);
    if (recIndex === -1) throw new Error('Không tìm thấy tệp đàm thoại');

    const rec = recordings[recIndex];
    const campaigns = getStoredCampaigns();
    const campIndex = campaigns.findIndex(c => c.id === rec.campaignId);

    let finalStatus: Recording['status'] = 'Pending review';
    let rewardModifier = 0;

    if (decision === 'accept') {
      finalStatus = 'Accepted';
      rewardModifier = rec.rewardAmount || 8000;
      
      // Credit contributor wallet
      const wallet = getStoredWallet();
      wallet.contributorBalance += rewardModifier;
      saveStoredWallet(wallet);

    } else if (decision === 'request_retake') {
      finalStatus = 'Retake requested';
    } else if (decision === 'reject') {
      finalStatus = 'Rejected';
    }

    const updatedRec: Recording = {
      ...rec,
      status: finalStatus,
      retakeReason: reason
    };
    recordings[recIndex] = updatedRec;
    saveStoredRecordings(recordings);

    if (campIndex !== -1) {
      const camp = campaigns[campIndex];
      let acceptedRecordings = camp.acceptedRecordings;
      let pendingReviewCount = camp.pendingReviewCount;
      let retakeCount = camp.retakeCount;
      let rejectedCount = camp.rejectedCount;

      // Recalculate stats based on true list
      const campRecs = recordings.filter(r => r.campaignId === camp.id);
      acceptedRecordings = campRecs.filter(r => r.status === 'Accepted').length;
      pendingReviewCount = campRecs.filter(r => r.status === 'Pending review').length;
      retakeCount = campRecs.filter(r => r.status === 'Retake requested').length;
      rejectedCount = campRecs.filter(r => r.status === 'Rejected').length;

      campaigns[campIndex] = {
        ...camp,
        acceptedRecordings,
        pendingReviewCount,
        retakeCount,
        retakeRequestedCount: retakeCount,
        rejectedCount,
        payoutAccrued: acceptedRecordings * (camp.pricePerRecording || 8000)
      };
      saveStoredCampaigns(campaigns);
    }

    return updatedRec;
  },

  async listCertificates(): Promise<Certificate[]> {
    await delay();
    return getStoredCertificates();
  },

  async mockWithdrawContributor(amount: number): Promise<boolean> {
    await delay(800);
    const wallet = getStoredWallet();
    if (wallet.contributorBalance < amount) return false;
    wallet.contributorBalance -= amount;
    wallet.totalWithdrawn += amount;
    saveStoredWallet(wallet);
    return true;
  },

  async listAgreements(): Promise<ContributorAgreement[]> {
    await delay();
    return getStoredAgreements();
  },

  async joinCampaignConsent(campaign: Campaign, customDetails: string): Promise<ContributorAgreement> {
    await delay(600);
    const agreements = getStoredAgreements();
    const newAgreement: ContributorAgreement = {
      id: `agree-${Date.now()}`,
      campaignName: campaign.name,
      consentStatus: 'Agreed',
      confirmedTime: new Date().toISOString(),
      rewardRule: `${(campaign.pricePerRecording || 8000).toLocaleString('vi-VN')} VND cho mỗi bản ghi được chấp nhận.`,
      consentDetails: customDetails
    };
    agreements.push(newAgreement);
    saveStoredAgreements(agreements);

    // Create a trust certificate as proof
    const certificates = getStoredCertificates();
    const newCert: Certificate = {
      id: `cert-${Date.now()}`,
      campaignId: campaign.id,
      type: 'ContributorAgreement',
      title: 'Cam kết Tham gia của Cộng tác viên',
      status: 'Verified',
      parties: ['Minh Pham (Contributor)', 'VoiceTurk Trust Module'],
      confirmedAt: new Date().toISOString(),
      termsSummary: `Chấp thuận cam kết tham gia thu âm chiến dịch: "${campaign.name}"`,
      proofRef: `ipfs://Qm${Math.random().toString(36).substring(2, 17)}`
    };
    certificates.push(newCert);
    saveStoredCertificates(certificates);

    return newAgreement;
  },

  async submitRecording(campaignId: string, durationStr: string, durationSec: number): Promise<Recording> {
    await delay(1000);
    const campaigns = getStoredCampaigns();
    const camp = campaigns.find(c => c.id === campaignId);
    if (!camp) throw new Error('Không tìm thấy chiến dịch');

    const recordings = getStoredRecordings();
    const newRec: Recording = {
      id: `rec-${Date.now()}`,
      campaignId,
      campaignName: camp.name,
      contributorName: 'Minh Pham',
      recordedTime: 'Vừa xong',
      duration: durationStr,
      status: 'Pending review',
      rewardAmount: camp.pricePerRecording || 8000,
      contextSnapshot: camp.context.substring(0, 50) + '...',
      audioDurationSec: durationSec,
      customerContext: camp.context,
      agentContext: camp.contributorRole,
      useCaseDomain: 'Chăm sóc và tương tác tự nhiên thiết kế bởi AI',
      transcript: '[AI - Khách hàng]: Chào em, chị vừa nhận hàng xong nhưng tại sao bị thiếu quà tặng như cam kết?\n[Contributor - CSKH]: Dạ em chào chị, em xin lỗi rất nhiều vì sơ suất đóng gói này ạ. Chị vui lòng cho em xin số điện thoại để em kiểm tra ngay lập tức ạ.'
    };

    recordings.push(newRec);
    saveStoredRecordings(recordings);

    // Increment pending review count in active campaign
    const campIndex = campaigns.findIndex(c => c.id === campaignId);
    if (campIndex !== -1) {
      campaigns[campIndex].pendingReviewCount += 1;
      saveStoredCampaigns(campaigns);
    }

    return newRec;
  }
};
