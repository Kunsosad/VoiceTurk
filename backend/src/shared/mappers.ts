import type {
  Campaign,
  Certificate,
  FinanceLedger,
  ProofRecord,
  Recording,
  Review,
} from "@prisma/client";

type CampaignWithRecordings = Campaign & { recordings: Array<Pick<Recording, "status">> };
type RecordingWithReview = Recording & { review: Review | null };
type CertificateWithProof = Certificate & { proofRecord?: ProofRecord | null };

export const mapReview = (review: Review) => ({
  id: review.id,
  recordingId: review.recordingId,
  buyerId: review.buyerId,
  decision: review.decision,
  audioClarity: review.audioClarity,
  roleFit: review.roleFit,
  scenarioHandling: review.scenarioHandling,
  conversationNaturalness: review.conversationNaturalness,
  brandSafety: review.brandSafety,
  totalScore: review.totalScore,
  note: review.note,
  createdAt: review.createdAt.toISOString(),
});

export const mapRecording = (recording: RecordingWithReview) => ({
  id: recording.id,
  campaignId: recording.campaignId,
  contributorId: recording.contributorId,
  sessionId: recording.sessionId,
  audioUrl: recording.audioUrl,
  durationSeconds: recording.durationSeconds,
  status: recording.status,
  recordingNumber: recording.recordingNumber,
  contextSnapshot: recording.contextSnapshot,
  audioQuality: JSON.parse(recording.audioQualityJson) as {
    voiceDetected: boolean;
    volumeOk: boolean;
    silenceOk: boolean;
    durationOk: boolean;
  },
  createdAt: recording.createdAt.toISOString(),
  review: recording.review ? mapReview(recording.review) : null,
});

export const mapCampaign = (campaign: CampaignWithRecordings) => {
  const count = (status: string) => campaign.recordings.filter((item) => item.status === status).length;
  const acceptedCount = count("Accepted");

  return {
    id: campaign.id,
    buyerId: campaign.buyerId,
    name: campaign.name,
    description: campaign.description,
    context: campaign.context,
    aiCustomerRole: campaign.aiCustomerRole,
    contributorRole: campaign.contributorRole,
    conversationBoundary: campaign.conversationBoundary,
    maxTurnsPerSide: campaign.maxTurnsPerSide,
    targetAcceptedRecordings: campaign.targetAcceptedRecordings,
    rewardPerAcceptedRecording: campaign.rewardPerAcceptedRecording,
    budgetSecured: campaign.budgetSecured,
    platformFee: campaign.platformFee,
    status: campaign.status,
    pendingReviewCount: count("Pending review"),
    acceptedCount,
    retakeRequestedCount: count("Retake requested"),
    rejectedCount: count("Rejected"),
    payoutAccrued: acceptedCount * campaign.rewardPerAcceptedRecording,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
};

export const mapFinanceLedger = (ledger: FinanceLedger) => ({
  id: ledger.id,
  type: ledger.type,
  status: ledger.status,
  amount: ledger.amount,
  campaignId: ledger.campaignId,
  userId: ledger.userId,
  recordingId: ledger.recordingId,
  walletAddress: ledger.walletAddress,
  createdAt: ledger.createdAt.toISOString(),
});

export const mapProofRecord = (proof: ProofRecord) => ({
  id: proof.id,
  type: proof.type,
  subjectId: proof.subjectId,
  network: proof.network,
  status: proof.status,
  walletAddress: proof.walletAddress,
  proofRef: proof.proofRef,
  txSignature: proof.txSignature,
  payloadHash: proof.payloadHash,
  createdAt: proof.createdAt.toISOString(),
});

export const mapCertificate = (certificate: CertificateWithProof) => ({
  id: certificate.id,
  type: certificate.type,
  title: certificate.title,
  campaignId: certificate.campaignId,
  subjectId: certificate.subjectId,
  status: certificate.status,
  parties: JSON.parse(certificate.partiesJson) as string[],
  summary: certificate.summary,
  proofRecordId: certificate.proofRecordId,
  createdAt: certificate.createdAt.toISOString(),
  ...(Object.prototype.hasOwnProperty.call(certificate, "proofRecord")
    ? { proofRecord: certificate.proofRecord ? mapProofRecord(certificate.proofRecord) : null }
    : {}),
});
