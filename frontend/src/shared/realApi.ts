import type { AuthUser, LoginPayload, RegisterPayload, UserRole } from '../features/auth/authTypes';
import type { Campaign, Certificate, ContributorAgreement, Recording, ReviewDecision } from './types';
import { apiAssetUrl, apiRequest, apiToken } from './apiClient';
import { safeStorage } from './safeStorage';

type BackendCampaign = { id: string; buyerId: string; name: string; description: string; context: string; aiCustomerRole: string; contributorRole: string; conversationBoundary: string; maxTurnsPerSide: number; targetAcceptedRecordings: number; rewardPerAcceptedRecording: number; budgetSecured: number; platformFee: number; status: Campaign['status']; pendingReviewCount: number; acceptedCount: number; retakeRequestedCount: number; rejectedCount: number; payoutAccrued: number; createdAt: string; updatedAt: string };
type BackendReview = { id: string; recordingId: string; buyerId: string; decision: string; audioClarity: number; roleFit: number; scenarioHandling: number; conversationNaturalness: number; brandSafety: number; totalScore: number; note: string | null; createdAt: string };
type BackendRecording = { id: string; campaignId: string; contributorId: string; sessionId: string | null; audioUrl: string; durationSeconds: number; status: Recording['status']; recordingNumber: number; contextSnapshot: string; createdAt: string; review: BackendReview | null };
type BackendProof = { proofRef: string; txSignature: string; payloadHash: string; status: string };
type BackendCertificate = { id: string; type: string; title: string; campaignId: string | null; subjectId: string; status: Certificate['status']; parties: string[]; summary: string; proofRecordId: string | null; createdAt: string; proofRecord?: BackendProof | null };
type BackendAgreement = { id: string; campaignId: string; contributorId: string; status: string; rewardRule: string; termsText: string; acceptedAt: string | null; certificateId: string | null };
type BackendUser = { id: string; role: 'Buyer' | 'Contributor'; fullName: string; email: string; createdAt?: string };
type BackendLogin = { user: BackendUser; token: string };

export type StudioSession = { sessionId: string; campaignId: string; channelName: string; appId: string; uid: number; token: string; expiresIn: number; agentName: string; agentJoinMode: 'manual'; maxTurnsPerSide: number; status: 'Active' };

const AUTH_USER_KEY = 'voiceturk_demo_user';
let campaignCache = new Map<string, Campaign>();

const initials = (name: string) => name.trim().split(/\s+/).map(part => part[0] ?? '').join('').slice(0, 2).toUpperCase() || 'VT';
const toBackendRole = (role: UserRole) => role === 'buyer' ? 'Buyer' : 'Contributor';
const toFrontendRole = (role: BackendUser['role']): UserRole => role === 'Buyer' ? 'buyer' : 'contributor';
const toAuthUser = (user: BackendUser): AuthUser => ({ id: user.id, fullName: user.fullName, email: user.email, role: toFrontendRole(user.role), avatarInitials: initials(user.fullName), createdAt: user.createdAt ?? new Date().toISOString() });
const currentUser = (): AuthUser => {
  const stored = safeStorage.getItem(AUTH_USER_KEY);
  if (!stored) throw new Error('Please sign in before using the VoiceTurk API');
  return JSON.parse(stored) as AuthUser;
};
const formatDuration = (seconds: number) => `${Math.floor(seconds / 60) ? `${Math.floor(seconds / 60)}m ` : ''}${seconds % 60}s`;

const mapCampaign = (campaign: BackendCampaign): Campaign => ({
  id: campaign.id, name: campaign.name, description: campaign.description, context: campaign.context,
  aiCustomerRole: campaign.aiCustomerRole, contributorRole: campaign.contributorRole,
  boundary: campaign.conversationBoundary, conversationLimit: campaign.conversationBoundary,
  targetRecordings: campaign.targetAcceptedRecordings, targetAcceptedRecordings: campaign.targetAcceptedRecordings,
  acceptedRecordings: campaign.acceptedCount, pendingReviewCount: campaign.pendingReviewCount,
  retakeCount: campaign.retakeRequestedCount, retakeRequestedCount: campaign.retakeRequestedCount,
  rejectedCount: campaign.rejectedCount, pricePerRecording: campaign.rewardPerAcceptedRecording,
  securedBudget: campaign.budgetSecured, payoutAccrued: campaign.payoutAccrued,
  platformFee: campaign.platformFee, totalBudget: campaign.budgetSecured, status: campaign.status,
  dateCreated: campaign.createdAt, proofStatus: campaign.budgetSecured > 0 ? 'Confirmed' : 'None',
});
const rememberCampaigns = (campaigns: Campaign[]) => { campaignCache = new Map(campaigns.map(campaign => [campaign.id, campaign])); return campaigns; };
const mapRecording = (recording: BackendRecording): Recording => {
  const campaign = campaignCache.get(recording.campaignId);
  return { id: recording.id, campaignId: recording.campaignId, campaignName: campaign?.name, contributorName: recording.contributorId,
    recordedTime: recording.createdAt, duration: formatDuration(recording.durationSeconds), status: recording.status,
    rewardAmount: campaign?.pricePerRecording ?? 0, contextSnapshot: recording.contextSnapshot,
    audioDurationSec: recording.durationSeconds, audioUrl: apiAssetUrl(recording.audioUrl),
    retakeReason: recording.review?.note ?? undefined, customerContext: campaign?.context, agentContext: campaign?.contributorRole };
};
const mapCertificate = (certificate: BackendCertificate): Certificate => ({
  id: certificate.id, campaignId: certificate.campaignId ?? '', campaignName: certificate.campaignId ? campaignCache.get(certificate.campaignId)?.name : undefined,
  type: certificate.type, title: certificate.title, status: certificate.status, parties: certificate.parties,
  confirmedAt: certificate.createdAt, dateTime: certificate.createdAt, termsSummary: certificate.summary,
  proofRef: certificate.proofRecord?.proofRef ?? certificate.proofRecordId ?? 'Proof pending', solanaTxSignature: certificate.proofRecord?.txSignature,
});
const mapAgreement = (agreement: BackendAgreement): ContributorAgreement => ({
  id: agreement.id, campaignName: campaignCache.get(agreement.campaignId)?.name ?? agreement.campaignId,
  consentStatus: agreement.status === 'Accepted' ? 'Agreed' : 'Pending', confirmedTime: agreement.acceptedAt ?? '',
  rewardRule: agreement.rewardRule, consentDetails: agreement.termsText,
});
const decisionToBackend: Record<ReviewDecision, 'Accept' | 'Request Retake' | 'Reject'> = { accept: 'Accept', request_retake: 'Request Retake', reject: 'Reject' };

const compatibleRealApi = {
  async listCampaigns(): Promise<Campaign[]> { return rememberCampaigns((await apiRequest<BackendCampaign[]>('/api/campaigns')).map(mapCampaign)); },
  async getCampaign(id: string): Promise<Campaign | undefined> {
    try { const campaign = mapCampaign(await apiRequest<BackendCampaign>(`/api/campaigns/${encodeURIComponent(id)}`)); campaignCache.set(campaign.id, campaign); return campaign; }
    catch (error: any) { if (error?.code === 'NOT_FOUND') return undefined; throw error; }
  },
  async createCampaign(payload: Partial<Campaign>): Promise<Campaign> {
    const campaign = mapCampaign(await apiRequest<BackendCampaign>('/api/campaigns', { method: 'POST', body: {
      buyerId: currentUser().id, name: payload.name || 'Chiến dịch mới', description: payload.description || '', context: payload.context || '',
      aiCustomerRole: payload.aiCustomerRole || '', contributorRole: payload.contributorRole || '',
      conversationBoundary: payload.boundary || payload.conversationLimit || 'Maximum 5 turns per side.', maxTurnsPerSide: 5,
      targetAcceptedRecordings: payload.targetAcceptedRecordings || payload.targetRecordings || 50, rewardPerAcceptedRecording: payload.pricePerRecording || 8000,
    }})); campaignCache.set(campaign.id, campaign); return campaign;
  },
  async updateCampaign(campaignId: string, patch: Partial<Campaign>): Promise<Campaign> {
    const body: Record<string, unknown> = {};
    if (patch.name !== undefined) body.name = patch.name; if (patch.description !== undefined) body.description = patch.description;
    if (patch.context !== undefined) body.context = patch.context; if (patch.aiCustomerRole !== undefined) body.aiCustomerRole = patch.aiCustomerRole;
    if (patch.contributorRole !== undefined) body.contributorRole = patch.contributorRole; if (patch.boundary !== undefined) body.conversationBoundary = patch.boundary;
    if (patch.targetAcceptedRecordings !== undefined || patch.targetRecordings !== undefined) body.targetAcceptedRecordings = patch.targetAcceptedRecordings ?? patch.targetRecordings;
    if (patch.pricePerRecording !== undefined) body.rewardPerAcceptedRecording = patch.pricePerRecording;
    if (!Object.keys(body).length) return (await compatibleRealApi.getCampaign(campaignId))!;
    const campaign = mapCampaign(await apiRequest<BackendCampaign>(`/api/campaigns/${encodeURIComponent(campaignId)}`, { method: 'PATCH', body }));
    campaignCache.set(campaign.id, campaign); return campaign;
  },
  async fundCampaign(campaignId: string, amount: number, _useWalletBalance = true): Promise<Campaign> {
    const result = await apiRequest<{ campaign: BackendCampaign }>(`/api/campaigns/${encodeURIComponent(campaignId)}/fund`, { method: 'POST', body: { buyerId: currentUser().id, amount } });
    const campaign = mapCampaign(result.campaign); campaignCache.set(campaign.id, campaign); return campaign;
  },
  async activateCampaign(campaignId: string): Promise<Campaign> {
    const campaign = mapCampaign(await apiRequest<BackendCampaign>(`/api/campaigns/${encodeURIComponent(campaignId)}/activate`, { method: 'POST', body: { buyerId: currentUser().id } }));
    campaignCache.set(campaign.id, campaign); return campaign;
  },
  async listRecordings(campaignId?: string): Promise<Recording[]> { return (await apiRequest<BackendRecording[]>(`/api/recordings${campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : ''}`)).map(mapRecording); },
  async reviewRecording(recordingId: string, decision: ReviewDecision, reason?: string): Promise<Recording> {
    const result = await apiRequest<{ recording: BackendRecording }>(`/api/recordings/${encodeURIComponent(recordingId)}/review`, { method: 'POST', body: {
      buyerId: currentUser().id, decision: decisionToBackend[decision],
      rubric: { audioClarity: 4, roleFit: 4, scenarioHandling: 4, conversationNaturalness: 4, brandSafety: 4 }, note: reason,
    }}); return mapRecording(result.recording);
  },
  async listCertificates(): Promise<Certificate[]> { return (await apiRequest<BackendCertificate[]>('/api/certificates')).map(mapCertificate); },
  async mockWithdrawContributor(amount: number): Promise<boolean> { await apiRequest('/api/contributor/withdraw', { method: 'POST', body: { contributorId: currentUser().id, amount } }); return true; },
  async listAgreements(): Promise<ContributorAgreement[]> { return (await apiRequest<BackendAgreement[]>(`/api/agreements?contributorId=${encodeURIComponent(currentUser().id)}`)).map(mapAgreement); },
  async joinCampaignConsent(campaign: Campaign, customDetails: string): Promise<ContributorAgreement> {
    const result = await apiRequest<{ agreement: BackendAgreement }>(`/api/campaigns/${encodeURIComponent(campaign.id)}/consent`, { method: 'POST', body: { contributorId: currentUser().id, customDetails } });
    return mapAgreement(result.agreement);
  },
  async submitRecording(_campaignId: string, _durationStr: string, _durationSec: number): Promise<Recording> { throw new Error('Studio audio and session are required for a real recording submission'); },
};

export const realApi = {
  ...compatibleRealApi,
  async getCertificate(id: string): Promise<Certificate> { return mapCertificate(await apiRequest<BackendCertificate>(`/api/certificates/${encodeURIComponent(id)}`)); },
  async startStudioSession(campaignId: string, contributorId = currentUser().id): Promise<StudioSession> { return apiRequest<StudioSession>('/api/agora/session/start', { method: 'POST', body: { campaignId, contributorId } }); },
  async endStudioSession(sessionId: string): Promise<void> { await apiRequest('/api/agora/session/end', { method: 'POST', body: { sessionId } }); },
  async submitStudioRecording(campaignId: string, sessionId: string, audio: Blob, durationSeconds: number): Promise<Recording> {
    const formData = new FormData(); formData.append('audio', audio, `voiceturk-${Date.now()}.webm`);
    const upload = await apiRequest<{ audioUrl: string }>('/api/recordings/upload', { method: 'POST', formData });
    return mapRecording(await apiRequest<BackendRecording>('/api/recordings', { method: 'POST', body: {
      campaignId, contributorId: currentUser().id, sessionId, audioUrl: upload.audioUrl, durationSeconds: Math.max(1, Math.round(durationSeconds)),
      audioQuality: { voiceDetected: true, volumeOk: true, silenceOk: true, durationOk: true },
    }}));
  },
  async getBuyerFinance(buyerId = currentUser().id) { return apiRequest<any>(`/api/buyer/finance?buyerId=${encodeURIComponent(buyerId)}`); },
  async getContributorFinance(contributorId = currentUser().id) { return apiRequest<any>(`/api/contributor/finance?contributorId=${encodeURIComponent(contributorId)}`); },
  async lazorkitLogin(payload: { walletAddress: string; smartWallet?: string; fullName: string; email: string; role: UserRole }) {
    const result = await apiRequest<{ user: BackendUser; token: string }>('/api/auth/lazorkit-login', { method: 'POST', body: { ...payload, role: toBackendRole(payload.role), authMethod: 'lazorkit' } });
    apiToken.set(result.token); return toAuthUser(result.user);
  },
};

export const realAuthApi = {
  async login(payload: LoginPayload): Promise<AuthUser> {
    const result = await apiRequest<BackendLogin>('/api/auth/demo-login', { method: 'POST', body: { role: toBackendRole(payload.role), fullName: payload.role === 'buyer' ? 'Vy Tran' : 'Minh Pham', email: payload.email } });
    apiToken.set(result.token); const user = toAuthUser(result.user); safeStorage.setItem(AUTH_USER_KEY, JSON.stringify(user)); return user;
  },
  async register(payload: RegisterPayload): Promise<AuthUser> {
    const result = await apiRequest<BackendLogin>('/api/auth/demo-login', { method: 'POST', body: { role: toBackendRole(payload.role), fullName: payload.fullName, email: payload.email } });
    apiToken.set(result.token); const user = toAuthUser(result.user); safeStorage.setItem(AUTH_USER_KEY, JSON.stringify(user)); return user;
  },
  async googleLogin(accessToken: string, role: UserRole): Promise<AuthUser> {
    const result = await apiRequest<BackendLogin>('/api/auth/google-login', { method: 'POST', body: { accessToken, role: toBackendRole(role) } });
    apiToken.set(result.token); const user = toAuthUser(result.user); safeStorage.setItem(AUTH_USER_KEY, JSON.stringify(user)); return user;
  },
  async logout(): Promise<void> { apiToken.clear(); safeStorage.removeItem(AUTH_USER_KEY); },
  async getCurrentUser(): Promise<AuthUser | null> {
    if (!apiToken.get()) return null;
    try { const user = toAuthUser(await apiRequest<BackendUser>('/api/auth/me')); safeStorage.setItem(AUTH_USER_KEY, JSON.stringify(user)); return user; }
    catch { apiToken.clear(); safeStorage.removeItem(AUTH_USER_KEY); return null; }
  },
};
