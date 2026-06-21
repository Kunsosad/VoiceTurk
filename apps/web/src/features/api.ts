import {
  apiUrl,
  authHeaders,
  fetchWithTimeout,
  json,
  request,
} from "../shared/api/httpClient";
import type {
  AudioMetrics,
  AuthResponse,
  Campaign,
  Coverage,
  Dataset,
  FastCheckResponse,
  NextAction,
  RecordingItem,
  Sample,
  Session,
  User,
} from "../types/domain";

export const api = {
  /* Health */
  health: () => request<{ status: string }>("/health"),
  ready: () => request<{ status: string }>("/ready"),

  /* Auth */
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", json("POST", { email, password })),
  register: (body: {
    email: string;
    password: string;
    name: string;
    role: "BUYER" | "CONTRIBUTOR";
  }) => request<AuthResponse>("/auth/register", json("POST", body)),
  me: () => request<User>("/auth/me"),
  logout: () => request<void>("/auth/logout", json("POST")),

  /* Demo */
  seed: () =>
    request<{ user_id: string; campaign_id: string; total_items: number }>(
      "/demo/seed-unified-user",
      json("POST"),
    ),

  /* Campaigns */
  campaigns: () => request<Campaign[]>("/campaigns"),
  availableCampaigns: (query = "", domain = "", emotion = "") =>
    request<Campaign[]>(
      `/campaigns/available/discover?q=${encodeURIComponent(query)}&domain=${encodeURIComponent(domain)}&emotion=${encodeURIComponent(emotion)}`,
    ),
  createCampaign: (body: unknown) =>
    request<Campaign>("/campaigns", json("POST", body)),
  updateCampaign: (id: string, body: unknown) =>
    request<Campaign>(`/campaigns/${id}`, json("PATCH", body)),
  archiveCampaign: (id: string) =>
    request(`/campaigns/${id}/archive`, json("POST")),
  generate: (id: string) =>
    request<{ created_items: number; total_items: number }>(
      `/campaigns/${id}/generate-items`,
      json("POST"),
    ),
  activate: (id: string) =>
    request<{ campaign_id: string; status: string }>(
      `/campaigns/${id}/activate`,
      json("POST"),
    ),
  coverage: (id: string) => request<Coverage>(`/campaigns/${id}/coverage`),
  retakes: (campaignId: string) =>
    request<RecordingItem[]>(`/campaigns/${campaignId}/retakes`),

  /* Script lines */
  addScriptLine: (
    campaignId: string,
    body: { transcript: string; intent: string; context_brief?: string },
  ) => request(`/campaigns/${campaignId}/script-lines`, json("POST", body)),
  updateScriptLine: (campaignId: string, lineId: string, body: unknown) =>
    request(
      `/campaigns/${campaignId}/script-lines/${lineId}`,
      json("PATCH", body),
    ),
  deleteScriptLine: (campaignId: string, lineId: string) =>
    request(`/campaigns/${campaignId}/script-lines/${lineId}`, {
      method: "DELETE",
    }),

  /* Recording sessions */
  startSession: (campaign_id: string) =>
    request<Session>(
      "/recording-sessions/start",
      json("POST", { campaign_id }),
    ),
  nextAction: (id: string) =>
    request<NextAction>(
      `/recording-sessions/${id}/next-action`,
      undefined,
      10000,
      "NEXT_ACTION",
    ),
  completeSession: (id: string) =>
    request(`/recording-sessions/${id}/complete`, json("POST")),
  skipItem: (itemId: string) =>
    request(`/recording-items/${itemId}/skip`, json("POST")),

  /* Upload pipeline */
  initUpload: (body: {
    session_id: string;
    item_id: string;
    filename: string;
    content_type: string;
    size_bytes: number;
  }) =>
    request<{
      upload_id: string;
      object_key: string;
      upload_url: string;
      expires_in: number;
    }>("/audio/uploads/init", json("POST", body), 10000, "UPLOAD_INIT"),

  putUpload: async (url: string, blob: Blob) => {
    const contentType = blob.type || "audio/wav";
    const external = url.startsWith("http");
    const response = await fetchWithTimeout(
      external ? url : apiUrl(url),
      {
        method: "PUT",
        headers: {
          ...(external ? {} : authHeaders()),
          "Content-Type": contentType,
        },
        body: blob,
      },
      30000,
      "PRESIGNED_PUT",
    );
    if (!response.ok) throw new Error(`Upload PUT failed (${response.status})`);
  },

  completeUpload: (body: {
    upload_id: string;
    session_id: string;
    item_id: string;
    object_key: string;
    client_metrics: AudioMetrics;
  }) =>
    request<FastCheckResponse>(
      "/audio/uploads/complete",
      json("POST", body),
      20000,
      "UPLOAD_COMPLETE_FASTCHECK",
    ),

  /* DeepCheck diagnostics (processing is backend-owned) */
  runDeepCheck: () =>
    request<{ processed: number; pending: number }>(
      "/deep-check/run-pending",
      json("POST"),
    ),
  deepCheckStatus: () =>
    request<Record<string, number>>("/deep-check/status"),

  /* Validation / review */
  queue: () => request<Sample[]>("/validation/review-queue"),
  review: (
    id: string,
    decision: string,
    notes = "Self-reviewed in VoiceTurk Studio.",
  ) =>
    request(
      `/validation/audio-samples/${id}/review`,
      json("POST", { decision, validator_notes: notes }),
    ),

  /* Dataset */
  build: (campaign_id: string) =>
    request<Dataset>(
      "/datasets/build",
      json("POST", { campaign_id, version: "1.0" }),
    ),
  verify: (dataset_version_id: string, manifest_hash: string) =>
    request<{ result: string }>(
      "/datasets/verify",
      json("POST", { dataset_version_id, manifest_hash }),
    ),

  /* Debug / dev only */
  storageHealth: () =>
    request<Record<string, unknown>>(
      "/debug/storage/health",
      undefined,
      10000,
      "STORAGE_HEALTH",
    ),
  debugStorageInit: () =>
    request<{ probe_id: string; object_key: string; upload_url: string }>(
      "/debug/storage/uploads/init",
      json("POST", { content_type: "text/plain" }),
      10000,
      "STORAGE_PROBE_INIT",
    ),
  debugStoragePut: async (url: string, blob: Blob) => {
    const external = url.startsWith("http");
    const response = await fetchWithTimeout(
      external ? url : apiUrl(url),
      {
        method: "PUT",
        headers: {
          ...(external ? {} : authHeaders()),
          "Content-Type": blob.type || "text/plain",
        },
        body: blob,
      },
      30000,
      "STORAGE_PROBE_PUT",
    );
    if (!response.ok)
      throw new Error(`Storage probe PUT failed (${response.status})`);
  },
  debugStorageVerify: (probeId: string) =>
    request<{ exists: boolean; metadata: Record<string, unknown> }>(
      `/debug/storage/uploads/${probeId}/verify`,
      json("POST"),
      10000,
      "STORAGE_PROBE_VERIFY",
    ),
};
