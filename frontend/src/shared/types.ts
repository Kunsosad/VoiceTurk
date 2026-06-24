export interface ChatMessage {
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export type Role = 'buyer' | 'contributor';

export interface Campaign {
  id: string;
  name: string;
  description: string;
  context: string;
  aiCustomerRole: string;
  contributorRole: string;
  boundary?: string;
  conversationLimit?: string;
  reviewGuide?: string[];
  targetRecordings?: number; // compat
  targetAcceptedRecordings: number;
  acceptedRecordings: number;
  pendingReviewCount: number;
  retakeCount: number;
  retakeRequestedCount?: number; // compat
  rejectedCount: number;
  pricePerRecording?: number; // compat
  securedBudget: number;
  payoutAccrued: number;
  platformFee?: number; // compat
  totalBudget?: number; // compat
  status: 'Draft' | 'Active' | 'Reviewing' | 'Completed';
  dateCreated?: string;
  chatHistory?: ChatMessage[];
  industry?: string;
  emotion?: string;
  contributor?: string;
  proofStatus?: 'Pending' | 'Confirmed' | 'Verified' | 'None';
}

export type RecordingStatus = 'Pending review' | 'Accepted' | 'Retake requested' | 'Rejected';

export interface Recording {
  id: string;
  campaignId: string;
  campaignName?: string;
  contributorName: string;
  recordedTime: string;
  duration: string;
  status: RecordingStatus;
  rewardAmount: number;
  quality?: string;
  contextSnapshot: string;
  audioDurationSec: number;
  audioUrl?: string;
  retakeReason?: string;
  transcript?: string;
  customerContext?: string;
  agentContext?: string;
  useCaseDomain?: string;
}

export type ReviewDecision = 'accept' | 'request_retake' | 'reject';

export interface Certificate {
  id: string;
  campaignId: string;
  campaignName?: string; // compat
  type: string;
  title: string;
  status: 'Pending' | 'Confirmed' | 'Verified';
  parties: string[];
  confirmedAt: string;
  dateTime?: string; // compat
  termsSummary: string;
  proofRef: string;
  solanaTxSignature?: string; // compat
}

export interface ContributorAgreement {
  id: string;
  campaignName: string;
  consentStatus: 'Agreed' | 'Pending';
  confirmedTime: string;
  rewardRule: string;
  consentDetails: string;
}

export type AppView =
  | 'landing'
  | 'login'
  | 'buyer-campaigns'
  | 'buyer-create-agent'
  | 'buyer-campaign-setup'
  | 'buyer-campaign-review'
  | 'buyer-recording-review'
  | 'buyer-finance'
  | 'buyer-certificates'
  | 'buyer-certificate-detail'
  | 'contributor-campaigns'
  | 'contributor-consent'
  | 'contributor-studio'
  | 'contributor-session-summary'
  | 'contributor-finance'
  | 'contributor-agreements';
