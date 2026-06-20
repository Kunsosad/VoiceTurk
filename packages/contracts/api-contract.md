
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
