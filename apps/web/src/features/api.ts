import { json, request } from '../shared/api/httpClient'
import type { Campaign, Dataset, Sample, Session } from '../types/domain'

export const api = {
  health: () => request<{status: string}>('/health'),
  seed: () => request<{campaign_id: string; total_items: number}>('/demo/seed', json('POST')),
  campaigns: () => request<Campaign[]>('/campaigns'),
  createCampaign: (body: unknown) => request<Campaign>('/campaigns', json('POST', body)),
  generate: (id: string) => request(`/campaigns/${id}/generate-items`, json('POST')),
  activate: (id: string) => request(`/campaigns/${id}/activate`, json('POST')),
  coverage: (id: string) => request<Record<string, unknown>>(`/campaigns/${id}/coverage`),
  startSession: (campaign_id: string) => request<Session>('/recording-sessions/start', json('POST', {campaign_id, contributor_id: 'contributor_001'})),
  completeSession: (id: string) => request(`/recording-sessions/${id}/complete`, json('POST')),
  submitAudio: (itemId: string, data: FormData) => request<{action: string; message_vi: string; sample_id: string | null}>(`/recording-items/${itemId}/submit-audio`, {method: 'POST', body: data}),
  queue: () => request<Sample[]>('/validation/review-queue'),
  review: (id: string, decision: string) => request(`/validation/audio-samples/${id}/review`, json('POST', {decision, validator_id: 'validator_001', validator_notes: 'Reviewed in demo UI.'})),
  build: (campaign_id: string) => request<Dataset>('/datasets/build', json('POST', {campaign_id, version: '1.0'})),
  verify: (dataset_version_id: string, manifest_hash: string) => request<{result: string}>('/datasets/verify', json('POST', {dataset_version_id, manifest_hash})),
}
