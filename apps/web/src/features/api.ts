import { apiUrl, fetchWithTimeout, json, request } from '../shared/api/httpClient'
import type { AudioMetrics, Campaign, Dataset, FastCheckResponse, NextAction, Sample, Session } from '../types/domain'

export const api = {
  health: () => request<{status: string}>('/health'),
  seed: () => request<{user_id: string; campaign_id: string; total_items: number}>('/demo/seed-unified-user', json('POST')),
  campaigns: () => request<Campaign[]>('/campaigns'),
  createCampaign: (body: unknown) => request<Campaign>('/campaigns', json('POST', body)),
  generate: (id: string) => request(`/campaigns/${id}/generate-items`, json('POST')),
  activate: (id: string) => request(`/campaigns/${id}/activate`, json('POST')),
  coverage: (id: string) => request<Record<string, unknown>>(`/campaigns/${id}/coverage`),
  startSession: (campaign_id: string) => request<Session>('/recording-sessions/start', json('POST', {campaign_id, contributor_id:'user_001'})),
  nextAction: (id: string) => request<NextAction>(`/recording-sessions/${id}/next-action`, undefined, 10000, 'NEXT_ACTION'),
  completeSession: (id: string) => request(`/recording-sessions/${id}/complete`, json('POST')),
  retakes: (campaignId: string) => request(`/campaigns/${campaignId}/retakes`),
  skipItem: (itemId: string) => request(`/recording-items/${itemId}/skip`, json('POST')),
  initUpload: (body: {session_id:string;item_id:string;filename:string;content_type:string;size_bytes:number}) => request<{upload_id:string;object_key:string;upload_url:string;expires_in:number}>('/audio/uploads/init', json('POST',body), 10000, 'UPLOAD_INIT'),
  putUpload: async (url: string, blob: Blob) => { const contentType=blob.type||'audio/webm'; const response=await fetchWithTimeout(url.startsWith('http')?url:apiUrl(url),{method:'PUT',headers:{'Content-Type':contentType},body:blob},30000,'PRESIGNED_PUT');if(!response.ok)throw new Error(`Upload PUT failed (${response.status})`) },
  completeUpload: (body: {upload_id:string;session_id:string;item_id:string;object_key:string;client_metrics:AudioMetrics}) => request<FastCheckResponse>('/audio/uploads/complete',json('POST',body),20000,'UPLOAD_COMPLETE_FASTCHECK'),
  runDeepCheck: () => request<{processed:number;pending:number}>('/deep-check/run-pending',json('POST')),
  deepCheckStatus: () => request<Record<string,number>>('/deep-check/status'),
  queue: () => request<Sample[]>('/validation/review-queue'),
  review: (id: string, decision: string) => request(`/validation/audio-samples/${id}/review`,json('POST',{decision,validator_id:'user_001',validator_notes:'Self-reviewed in VoiceTurk Studio.'})),
  build: (campaign_id: string) => request<Dataset>('/datasets/build',json('POST',{campaign_id,version:'1.0'})),
  verify: (dataset_version_id: string, manifest_hash: string) => request<{result:string}>('/datasets/verify',json('POST',{dataset_version_id,manifest_hash})),
}
