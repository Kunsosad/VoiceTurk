export type StudioStep =
  | "Campaign"
  | "Recording"
  | "Review"
  | "Dataset";

export type User = {
  user_id: string;
  name: string;
  email: string;
  role: "BUYER" | "CONTRIBUTOR" | "ADMIN";
  status: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type Campaign = {
  campaign_id: string;
  buyer_id: string;
  name: string;
  description?: string;
  domain: string;
  intents?: string[];
  status: string;
  target_emotions: string[];
  item_count: number;
  script_lines?: Array<{
    line_id: string;
    transcript: string;
    intent: string;
    context_brief: string;
  }>;
  open_item_count?: number;
  accepted_count?: number;
  review_pending_count?: number;
  estimated_time_minutes?: number;
  sample_prompts?: string[];
};

export type RecordingItem = {
  item_id: string;
  line_id?: string;
  transcript: string;
  intent: string;
  target_emotion: string;
  context_brief: string;
  status: string;
};

export type RealtimeInfo = {
  provider: "agora" | "agora_convoai" | "browser_tts";
  realtime_provider?: "agora" | "agora_convoai" | "browser_tts";
  agora_channel: string | null;
  agora_token: string | null;
  agora_app_id: string | null;
  uid: string;
  agora_uid?: string;
  expires_at?: string;
  coach_provider?: "agora_convoai" | "browser_tts" | "browser_tts_fallback";
  convoai_available?: boolean;
  coach_status?: "starting" | "ready" | "fallback" | "error";
  coach_session_id?: string | null;
  agora_agent_uid?: string | null;
};

export type CoachStatus = {
  available: boolean;
  provider: "agora_convoai" | "browser_tts";
  status: string;
  message?: string;
  coach_session_id?: string | null;
  agent_uid?: string | null;
};

export type FeedbackContext = {
  sample_id?: string;
  item_id?: string;
  decision?: string;
  reason_codes?: string[];
  target_transcript?: string;
  asr_transcript?: string | null;
  missing_words?: string[];
  extra_words?: string[];
  target_emotion?: string;
  context_brief?: string;
  metrics?: Record<string, number>;
  coach_constraints?: Record<string, string | number | boolean>;
};

export type Session = {
  session_id: string;
  campaign_id: string;
  contributor_id: string;
  items: RecordingItem[];
  realtime: RealtimeInfo;
  status: string;
};

export type NextAction = {
  action:
    | "START_ITEM"
    | "RETAKE_ITEM"
    | "WAITING_FOR_RECORDING"
    | "SESSION_COMPLETE"
    | "WAIT_DEEPCHECK"
    | "ERROR";
  item: RecordingItem | null;
  coach_message_vi: string;
  feedback_context?: FeedbackContext | null;
  retake_count: number;
  progress: { completed: number; total: number };
  debug?: Record<string, unknown>;
};

export type AudioMetrics = {
  duration_ms: number;
  rms_dbfs?: number;
  peak_dbfs?: number;
  silence_ratio?: number;
  clipping_ratio?: number;
  speech_ratio?: number;
  speech_duration_ms?: number;
  leading_silence_ms?: number;
  trailing_silence_ms?: number;
  estimated_snr_db?: number;
  file_size_bytes?: number;
  fast_check_score?: number;
  sample_rate?: number;
  channels?: number;
};

export type FastCheckResponse = {
  action: "RETAKE_NOW" | "CONTINUE_NEXT";
  reason_code: string;
  severity: string;
  message_vi: string;
  metrics: Record<string, number>;
  warnings: string[];
  sample_id: string | null;
};

export type Sample = {
  sample_id: string;
  campaign_id: string;
  item_id: string;
  session_id: string;
  transcript_snapshot: string;
  intent_snapshot?: string;
  target_emotion_snapshot: string;
  context_brief: string;
  quality_score?: number;
  audio_url: string;
  status: string;
  // FastCheck metrics
  fast_check_status?: string;
  fast_check_score?: number;
  duration_ms?: number;
  loudness_db?: number;
  peak_dbfs?: number;
  silence_ratio?: number;
  speech_ratio?: number;
  clipping_ratio?: number;
  // DeepCheck
  deep_check_status?: string;
  deep_check_reason_code?: string;
  deep_check_message_vi?: string;
  deep_check_feedback_context?: FeedbackContext;
  speech_rate_wps?: number;
  pitch_summary?: string;
  // Review
  validator_status?: string;
  validator_id?: string;
  validator_notes?: string;
};

export type Dataset = {
  dataset_version_id: string;
  campaign_id: string;
  version: string;
  sample_count: number;
  manifest_hash: string;
  status: string;
  package_path?: string;
  annotations_path?: string;
  proof_network?: string;
  proof_status?: string;
};

export type Coverage = {
  campaign_id: string;
  total_items: number;
  accepted_items: number;
  review_pending_items: number;
  need_retake_items: number;
  open_items: number;
  assigned_items: number;
  coverage_ratio: number;
  by_emotion: Record<string, { total: number; accepted: number }>;
};
