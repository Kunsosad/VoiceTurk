
VoiceTurk MVP — API Contract Brief
Contract Principle

This is the initial contract guide for agent implementation.

The implementation may start simple, but must preserve state side effects.

Common Response Style

Successful state-changing response should include:

id
status
message if needed
next action if applicable

Error response should include:

error_code
message
details optional
Endpoints

POST /demo/seed

Role:

Admin/demo operator

State side effect:

Idempotently creates the three demo users and an active campaign with 20 RecordingItems for the current API process.

GET /health

Role:

any

Response:

{
"status": "ok",
"service": "voiceturk-api"
}

POST /campaigns

Role:

Buyer

Request:

{
"buyer_id": "buyer_001",
"name": "E-commerce Prosody Dataset",
"domain": "ecommerce_cskh",
"target_emotions": ["neutral", "confused", "impatient", "angry"],
"script_lines": [
{
"transcript": "Tôi chưa nhận được hàng.",
"intent": "delivery_delay",
"context_brief": "Khách hàng đã chờ đơn hàng lâu hơn ngày dự kiến."
}
]
}

State side effect:

creates Campaign in DRAFT
creates ScriptLine in DRAFT or APPROVED depending implementation

GET /campaigns

Role:

any demo role

Returns campaign summaries/details used by Buyer and Contributor screens.

GET /campaigns/{campaign_id}/coverage

Role:

Buyer

Calculates live counts and coverage ratio from RecordingItems. No CampaignCoverage entity is created.
POST /campaigns/{campaign_id}/generate-items

Role:

Buyer

State side effect:

approves eligible ScriptLines
creates RecordingItems from ScriptLine × TargetEmotion
Campaign becomes PREVIEW_READY
POST /campaigns/{campaign_id}/activate

Role:

Buyer

State side effect:

Campaign becomes ACTIVE
RecordingItems become available as OPEN
POST /recording-sessions/start

Role:

Contributor

Request:

{
"campaign_id": "camp_001",
"contributor_id": "contributor_001"
}

State side effect:

creates RecordingSession
assigns available RecordingItems
assigned items become ASSIGNED
POST /recording-items/{item_id}/submit-audio

Role:

Contributor

Request:

multipart/form-data
audio file
session_id
contributor_id

State side effect if FastCheck fails:

no official AudioSample created
RecordingItem remains ASSIGNED
response action = RETAKE_NOW

State side effect if FastCheck passes:

creates AudioSample
AudioSample.status = CHECKING
RecordingItem.status = REVIEW_PENDING
triggers mock DeepCheck
response action = CONTINUE_NEXT
GET /validation/review-queue

Role:

Validator

Returns:

AudioSample where status = REVIEW_PENDING

GET /validation/audio-samples/{sample_id}

Role:

Validator

Returns snapshots, quality metadata, context, status, and a backend media URL.
POST /validation/audio-samples/{sample_id}/review

Role:

Validator

Request:

{
"decision": "ACCEPT",
"validator_notes": "Audio rõ, đúng câu."
}

Decision side effects:

ACCEPT: AudioSample ACCEPTED, RecordingItem ACCEPTED
REJECT: AudioSample REJECTED, RecordingItem OPEN
NEED_RETAKE: AudioSample NEED_RETAKE, RecordingItem NEED_RETAKE
POST /datasets/build

Role:

Buyer/Admin

Request:

{
"campaign_id": "camp_001",
"version": "1.0"
}

State side effect:

creates DatasetVersion
uses accepted AudioSamples only
writes package files
computes manifest hash
calls ProofProvider

GET /datasets/{dataset_version_id}

Role:

Buyer/Admin

Returns backend-owned DatasetVersion state and package paths.
POST /datasets/verify

Role:

Buyer/Admin

Request:

{
"dataset_version_id": "dataset_v1",
"manifest_hash": "abc123"
}

Response:

{
"result": "MATCH",
"dataset_version_id": "dataset_v1"
}

## Unified Studio Pipeline Addendum

`POST /demo/seed-unified-user` creates `user_001`, an active demo campaign, and 20 items. The same ID may appear as buyer, contributor, and validator while each audit field remains distinct.

`POST /audio/uploads/init` validates the active session/assigned item and creates infrastructure upload state. It returns a temporary object key and either a MinIO presigned PUT URL or a local backend PUT URL.

`PUT /audio/uploads/{upload_id}/content` is the local-storage upload target. MinIO clients PUT directly to the presigned URL.

`POST /audio/uploads/complete` verifies upload identity, runs deterministic FastCheck, promotes passing temporary audio to the official object key, creates a CHECKING AudioSample, moves the item to REVIEW_PENDING, and enqueues DeepCheck. A failure creates no AudioSample and keeps the item ASSIGNED.

`GET /recording-sessions/{session_id}/next-action` returns backend-owned `START_ITEM`, `RETAKE_ITEM`, `WAIT_DEEPCHECK`, or `SESSION_COMPLETE`, plus the item, Vietnamese coach message, retake count, and progress.

`GET /recording-sessions/{session_id}/retakes` and `GET /campaigns/{campaign_id}/retakes` return NEED_RETAKE items. `POST /recording-items/{item_id}/start-retake` reassigns one. `POST /recording-items/{item_id}/skip` returns an unrecorded assigned item to OPEN.

The backend worker automatically scans and processes durable CHECKING samples. `POST /deep-check/run-pending` is an admin/manual recovery fallback, not a frontend dependency. `GET /deep-check/status` returns queue/status counts. `POST /audio-samples/{sample_id}/deep-check/retry` retries DeepCheck errors.

`GET /audio-samples/{sample_id}/checks` returns explainable FastCheck metrics and DeepCheck decision/feedback.

`POST /realtime/agora/token` issues an RTC publisher/subscriber token through the realtime adapter when Agora is configured. It never changes recording or sample state.

FastCheck responses include `action`, `reason_code`, `severity`, `retry_same_item`, `message_vi`, `metrics`, `warnings`, and nullable `sample_id`.

Upload completion returns `UPLOAD_OBJECT_NOT_FOUND` when the initialized temporary object is absent and `FAST_CHECK_TIMEOUT` when deterministic checking exceeds its configured deadline. Both are terminal `RETAKE_NOW` responses and create no AudioSample.

Frontend deadlines are 10 seconds for upload init and next-action, 30 seconds for presigned PUT, and 20 seconds for upload complete. Timeout/error leaves the same item assigned and exposes a Retry action.

`GET /debug/storage/health` is development-only and returns sanitized provider endpoint/public URL/bucket/region plus bucket, put, and presigning checks. It never exposes credentials.

`POST /debug/storage/uploads/init`, `PUT /debug/storage/uploads/{probe_id}/content`, and `POST /debug/storage/uploads/{probe_id}/verify` implement a development-only browser probe. The probe uses the same presigned storage path as recording, verifies metadata, and deletes its diagnostic object.

Next-action responses include a `debug` object with session/campaign IDs, assigned/open/review/retake/accepted counts, submitted sample count for the session, and a reason. An active session cannot return `SESSION_COMPLETE` while assigned or open items remain; it returns `WAITING_FOR_RECORDING` if that invariant is encountered.
