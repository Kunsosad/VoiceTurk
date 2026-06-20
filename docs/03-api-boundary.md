
VoiceTurk MVP — API Boundary
1. API Design Goal

APIs should support the demo flow with minimum endpoints.

Do not over-engineer.

Do not create endpoints for payment, payout, wallet, marketplace, or public listing.

2. Minimal Backend APIs

Health:

GET /health

Campaign:

POST /campaigns
GET /campaigns
GET /campaigns/{campaign_id}
POST /campaigns/{campaign_id}/generate-items
POST /campaigns/{campaign_id}/activate
GET /campaigns/{campaign_id}/coverage

Recording:

POST /recording-sessions/start
GET /recording-sessions/{session_id}/items
POST /recording-items/{item_id}/start
POST /recording-items/{item_id}/submit-audio
POST /recording-sessions/{session_id}/complete

Validation:

GET /validation/review-queue
GET /validation/audio-samples/{sample_id}
POST /validation/audio-samples/{sample_id}/review

Dataset:

POST /datasets/build
GET /datasets/{dataset_version_id}
POST /datasets/verify
3. Simplified MVP Upload

For speed, MVP may use:

POST /recording-items/{item_id}/submit-audio

This endpoint can:

accept multipart audio
store local file
run FastCheck
return RETAKE_NOW or CONTINUE_NEXT
create AudioSample if FastCheck passes
trigger mock DeepCheck

Later this can split into:

init upload
complete upload
fast check
create sample
4. Start Session Response

Example:

{
"session_id": "session_001",
"campaign_id": "camp_001",
"contributor_id": "contributor_001",
"realtime": {
"provider": "browser_tts",
"agora_channel": null,
"agora_token": null
},
"items": [
{
"item_id": "item_001",
"line_id": "line_001",
"transcript": "Tôi chưa nhận được hàng.",
"intent": "delivery_delay",
"target_emotion": "impatient",
"context_brief": "Khách hàng đã chờ đơn hàng lâu hơn ngày dự kiến."
}
]
}

5. Submit Audio Response

FastCheck fail:

{
"action": "RETAKE_NOW",
"reason_code": "AUDIO_TOO_SHORT",
"message_vi": "Audio hơi ngắn, bạn đọc lại câu này rõ hơn nhé.",
"retry_same_item": true,
"sample_id": null
}

FastCheck pass:

{
"action": "CONTINUE_NEXT",
"reason_code": "FAST_CHECK_PASSED",
"message_vi": "Ổn rồi, mình chuyển sang câu tiếp theo nhé.",
"sample_id": "sample_001",
"next_item_available": true
}

6. Review Request

{
"decision": "ACCEPT",
"validator_notes": "Audio rõ, đúng câu, đúng cảm xúc."
}

Allowed decisions:

ACCEPT
REJECT
NEED_RETAKE
7. Dataset Build Request

{
"campaign_id": "camp_001",
"version": "1.0"
}

8. Dataset Verify Request

{
"dataset_version_id": "dataset_v1",
"manifest_hash": "abc123"
}

9. API Contract Rule

Every endpoint should document:

role
method
path
request
response
state side effect
frontend notes
backend notes
