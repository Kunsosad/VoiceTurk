name: api-contract-sync
description: Use this skill when changing API routes, request/response schemas, frontend API clients, or packages/contracts.
API Contract Sync Skill
Goal

Keep backend routes, frontend clients, and contract examples aligned.

Source of Truth

Use:

packages/contracts/api-contract.md
packages/contracts/examples/
backend schemas
frontend API client types
When Changing Backend API

Update:

HTTP router
request/response schema
contract brief or example
frontend API client
frontend types if needed
Endpoint Documentation

Each endpoint should document:

role
method
path
request
response
state side effect
error cases
frontend notes
backend notes
State Side Effect Rule

For state-changing endpoints, always be explicit.

Example:

POST /campaigns/{campaign_id}/generate-items:

creates RecordingItems
moves Campaign to PREVIEW_READY

POST /recording-items/{item_id}/submit-audio:

if FastCheck fail: no AudioSample, item remains ASSIGNED
if FastCheck pass: create AudioSample CHECKING, item REVIEW_PENDING

POST /validation/audio-samples/{sample_id}/review:

ACCEPT: sample ACCEPTED, item ACCEPTED
REJECT: sample REJECTED, item OPEN
NEED_RETAKE: sample NEED_RETAKE, item NEED_RETAKE
Frontend Rule

Frontend must use API client/types.

Do not duplicate endpoint strings everywhere.
