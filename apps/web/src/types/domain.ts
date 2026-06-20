export type Role = 'Buyer' | 'Contributor' | 'Validator'
export type Campaign = { campaign_id: string; name: string; domain: string; status: string; target_emotions: string[]; item_count: number }
export type RecordingItem = { item_id: string; transcript: string; intent: string; target_emotion: string; context_brief: string; status: string }
export type Session = { session_id: string; items: RecordingItem[] }
export type Sample = { sample_id: string; transcript_snapshot: string; target_emotion_snapshot: string; context_brief: string; quality_score: number; audio_url: string; status: string }
export type Dataset = { dataset_version_id: string; version: string; sample_count: number; manifest_hash: string; status: string }

