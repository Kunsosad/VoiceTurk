# VoiceTurk API Contract — Backend Source of Truth

Use this file as the hard API contract for the VoiceTurk backend. Put this file at:

```text
backend/docs/API_CONTRACT.md
```

The backend must remain compatible with the current React/Vite frontend and the existing mock API shapes.

Updated: 2026-06-24
Agora mode: Option B minimal integration.

---

## 1. Product summary

VoiceTurk creates Vietnamese customer-support voice conversation datasets.

Core flow:

```text
Buyer creates campaign
Contributor accepts terms
Contributor talks with AI Customer in Studio
AI Customer is an Agora Agent configured in Agora Console / Agent Studio
Conversation becomes Recording
Buyer reviews Recording with 5 rubric metrics
Only Accepted recordings count toward payout and dataset progress
Certificates/proofs are created for important records
```

No DeepCheck, ASR scoring, transcript scoring, or AI grading in MVP.

---

## 2. Response wrapper

All successful responses:

```json
{
  "ok": true,
  "data": {}
}
```

All error responses:

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

---

## 3. Status strings

Keep these strings exactly in API responses to avoid breaking the frontend.

```text
User.role:
"Buyer" | "Contributor"

Campaign.status:
"Draft" | "Active" | "Reviewing" | "Completed"

Recording.status:
"Pending review" | "Accepted" | "Retake requested" | "Rejected"

Review.decision:
"Accept" | "Request Retake" | "Reject"

Certificate.status:
"Pending" | "Confirmed" | "Verified"

ConversationSession.status:
"Active" | "Finished" | "Cancelled"

FinanceLedger.type:
"Budget secured" | "Contributor payout" | "Withdrawal" | "Platform fee"

FinanceLedger.status:
"Pending" | "Completed" | "Scheduled" | "Failed"

ProofRecord.status:
"Pending" | "Verified" | "Failed"
```

---

## 4. Core data shapes

### User

```json
{
  "id": "usr_...",
  "role": "Buyer",
  "fullName": "Vy Tran",
  "email": "vy@voiceturk.demo",
  "avatarUrl": null,
  "walletAddress": null,
  "createdAt": "2026-06-24T00:00:00.000Z"
}
```

### Campaign

```json
{
  "id": "cmp_...",
  "buyerId": "usr_...",
  "name": "Livestream Gift Complaint Dataset",
  "description": "AI customer plays a frustrated livestream buyer missing a promised gift.",
  "context": "Customer bought cosmetics through a livestream because the shop promised a mini gift, but the order arrived without it.",
  "aiCustomerRole": "Frustrated customer who suspects the shop lied about the gift.",
  "contributorRole": "Customer support person for the shop.",
  "conversationBoundary": "Maximum 5 turns per side.",
  "maxTurnsPerSide": 5,
  "targetAcceptedRecordings": 60,
  "rewardPerAcceptedRecording": 8000,
  "budgetSecured": 528000,
  "platformFee": 48000,
  "status": "Active",
  "pendingReviewCount": 7,
  "acceptedCount": 24,
  "retakeRequestedCount": 4,
  "rejectedCount": 2,
  "payoutAccrued": 192000,
  "createdAt": "2026-06-24T00:00:00.000Z",
  "updatedAt": "2026-06-24T00:00:00.000Z"
}
```

### Recording

```json
{
  "id": "rec_...",
  "campaignId": "cmp_...",
  "contributorId": "usr_...",
  "sessionId": "ses_...",
  "audioUrl": "/uploads/recordings/demo.wav",
  "durationSeconds": 78,
  "status": "Pending review",
  "recordingNumber": 1,
  "contextSnapshot": "Missing livestream gift · angry customer · customer support role",
  "audioQuality": {
    "voiceDetected": true,
    "volumeOk": true,
    "silenceOk": true,
    "durationOk": true
  },
  "createdAt": "2026-06-24T00:00:00.000Z",
  "review": null
}
```

### Review

```json
{
  "id": "rev_...",
  "recordingId": "rec_...",
  "buyerId": "usr_...",
  "decision": "Accept",
  "audioClarity": 5,
  "roleFit": 4,
  "scenarioHandling": 4,
  "conversationNaturalness": 5,
  "brandSafety": 5,
  "totalScore": 23,
  "note": "Good customer support handling.",
  "createdAt": "2026-06-24T00:00:00.000Z"
}
```

### ContributorAgreement

```json
{
  "id": "agr_...",
  "campaignId": "cmp_...",
  "contributorId": "usr_...",
  "status": "Accepted",
  "rewardRule": "Only buyer-accepted recordings are paid.",
  "termsText": "Contributor agrees to record for this campaign...",
  "acceptedAt": "2026-06-24T00:00:00.000Z",
  "certificateId": "cert_..."
}
```

### Certificate

```json
{
  "id": "cert_...",
  "type": "ContributorAgreement",
  "title": "Contributor Consent",
  "campaignId": "cmp_...",
  "subjectId": "agr_...",
  "status": "Verified",
  "parties": ["Vy Tran", "Minh Pham", "VoiceTurk"],
  "summary": "Contributor accepted participation terms for this campaign.",
  "proofRecordId": "proof_...",
  "createdAt": "2026-06-24T00:00:00.000Z"
}
```

### ProofRecord

```json
{
  "id": "proof_...",
  "type": "CONTRIBUTOR_CONSENT",
  "subjectId": "agr_...",
  "network": "solana-devnet",
  "status": "Verified",
  "walletAddress": "optional_wallet_address",
  "proofRef": "solana-devnet://VTK_abc123",
  "txSignature": "mock_tx_abc123",
  "payloadHash": "sha256_hex",
  "createdAt": "2026-06-24T00:00:00.000Z"
}
```

### ConversationSession

```json
{
  "id": "ses_...",
  "campaignId": "cmp_...",
  "contributorId": "usr_...",
  "agoraChannel": "voiceturk__cmp123__ses123",
  "contributorRtcUid": 1002,
  "agentName": "VoiceTurk AI Customer",
  "agentJoinMode": "manual",
  "maxTurnsPerSide": 5,
  "status": "Active",
  "startedAt": "2026-06-24T00:00:00.000Z",
  "endedAt": null
}
```

---

## 5. Auth API

### POST /api/auth/demo-login

Request:

```json
{
  "role": "Buyer",
  "fullName": "Vy Tran",
  "email": "vy@voiceturk.demo"
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "user": { "id": "usr_...", "role": "Buyer", "fullName": "Vy Tran", "email": "vy@voiceturk.demo" },
    "token": "jwt_token"
  }
}
```

### POST /api/auth/lazorkit-login

Request:

```json
{
  "walletAddress": "wallet_or_vault_address",
  "smartWallet": "optional_smart_wallet",
  "fullName": "Minh Pham",
  "email": "minh@voiceturk.demo",
  "role": "Contributor",
  "authMethod": "lazorkit"
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "user": { "id": "usr_...", "role": "Contributor", "fullName": "Minh Pham", "walletAddress": "wallet_or_vault_address" },
    "wallet": { "walletAddress": "wallet_or_vault_address", "provider": "lazorkit" },
    "token": "jwt_token"
  }
}
```

### GET /api/auth/me

Headers:

```text
Authorization: Bearer <token>
```

Response:

```json
{
  "ok": true,
  "data": {
    "id": "usr_...",
    "role": "Buyer",
    "fullName": "Vy Tran",
    "email": "vy@voiceturk.demo"
  }
}
```

---

## 6. Campaign API

### GET /api/campaigns

Query params optional:

```text
role=Buyer|Contributor
buyerId=usr_...
status=Active
```

Response:

```json
{
  "ok": true,
  "data": [
    {
      "id": "cmp_...",
      "name": "Livestream Gift Complaint Dataset",
      "status": "Active",
      "acceptedCount": 24,
      "targetAcceptedRecordings": 60,
      "pendingReviewCount": 7,
      "rewardPerAcceptedRecording": 8000
    }
  ]
}
```

### POST /api/campaigns

Request:

```json
{
  "buyerId": "usr_...",
  "name": "Livestream Gift Complaint Dataset",
  "description": "AI customer plays a frustrated livestream buyer missing a promised gift.",
  "context": "Customer bought cosmetics through a livestream because the shop promised a mini gift, but the order arrived without it.",
  "aiCustomerRole": "Frustrated customer who suspects the shop lied about the gift.",
  "contributorRole": "Customer support person for the shop.",
  "conversationBoundary": "Maximum 5 turns per side.",
  "maxTurnsPerSide": 5,
  "targetAcceptedRecordings": 60,
  "rewardPerAcceptedRecording": 8000
}
```

Response: Campaign.

### GET /api/campaigns/:id

Response: Campaign detail.

### PATCH /api/campaigns/:id

Request: partial Campaign editable fields.

Response: updated Campaign.

### POST /api/campaigns/:id/fund

Request:

```json
{
  "buyerId": "usr_...",
  "amount": 528000
}
```

Behavior:
- Mark budget secured.
- Create FinanceLedger type "Budget secured".
- Create Certificate type "CampaignBudgetSecured".
- Phase 4 creates mock proof.

Response:

```json
{
  "ok": true,
  "data": {
    "campaign": {},
    "financeLedger": {},
    "certificate": {}
  }
}
```

### POST /api/campaigns/:id/activate

Request:

```json
{
  "buyerId": "usr_..."
}
```

Behavior:
- Set Campaign.status = "Active".

Response: updated Campaign.

---

## 7. Agreements API

### GET /api/agreements

Query params optional:

```text
contributorId=usr_...
```

Response:

```json
{
  "ok": true,
  "data": []
}
```

### POST /api/campaigns/:id/consent

Request:

```json
{
  "contributorId": "usr_...",
  "customDetails": "optional"
}
```

Behavior:
- Create ContributorAgreement.
- Create Certificate type "ContributorAgreement".
- Phase 4 creates ProofRecord type CONTRIBUTOR_CONSENT.

Response:

```json
{
  "ok": true,
  "data": {
    "agreement": {},
    "certificate": {}
  }
}
```

---

## 8. Conversation + Agora Option B API

### POST /api/conversations/sessions

Request:

```json
{
  "campaignId": "cmp_...",
  "contributorId": "usr_..."
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "sessionId": "ses_...",
    "campaignId": "cmp_...",
    "contributorId": "usr_...",
    "agoraChannel": "voiceturk__cmp123__ses123",
    "contributorRtcUid": 1002,
    "maxTurnsPerSide": 5,
    "status": "Active"
  }
}
```

### POST /api/conversations/sessions/:id/end

Response: updated session with status "Finished".

### POST /api/agora/token

Request:

```json
{
  "channelName": "voiceturk__cmp123__ses123",
  "uid": 1002,
  "role": "publisher"
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "appId": "agora_app_id",
    "channelName": "voiceturk__cmp123__ses123",
    "uid": 1002,
    "token": "rtc_token_or_mock_token",
    "expiresIn": 3600
  }
}
```

### POST /api/agora/session/start

Request:

```json
{
  "campaignId": "cmp_...",
  "contributorId": "usr_...",
  "sessionId": "optional_existing_session_id"
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "sessionId": "ses_...",
    "campaignId": "cmp_...",
    "channelName": "voiceturk__cmp123__ses123",
    "appId": "agora_app_id",
    "uid": 1002,
    "token": "rtc_token_or_mock_token",
    "expiresIn": 3600,
    "agentName": "VoiceTurk AI Customer",
    "agentJoinMode": "manual",
    "maxTurnsPerSide": 5,
    "status": "Active"
  }
}
```

Important Option B rule:

```text
This endpoint does not start the Agora AI Customer Agent.
It only gives the frontend a channel and contributor token.
The AI Customer Agent must join manually or through an external script.
```

### POST /api/agora/session/end

Request:

```json
{
  "sessionId": "ses_..."
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "sessionId": "ses_...",
    "status": "Finished"
  }
}
```

---

## 9. Recording API

### POST /api/recordings/upload

Request:

```text
multipart/form-data
field: audio
```

Response:

```json
{
  "ok": true,
  "data": {
    "audioUrl": "/uploads/recordings/file.webm",
    "fileName": "file.webm",
    "mimeType": "audio/webm",
    "size": 123456
  }
}
```

### POST /api/recordings

Request:

```json
{
  "campaignId": "cmp_...",
  "contributorId": "usr_...",
  "sessionId": "ses_...",
  "audioUrl": "/uploads/recordings/file.webm",
  "durationSeconds": 78,
  "audioQuality": {
    "voiceDetected": true,
    "volumeOk": true,
    "silenceOk": true,
    "durationOk": true
  }
}
```

Behavior:
- Create Recording with status "Pending review".

Response: Recording.

### GET /api/recordings

Query params optional:

```text
campaignId=cmp_...
contributorId=usr_...
status=Pending%20review
```

Response: Recording[].

### GET /api/recordings/:id

Response: Recording detail.

### GET /api/campaigns/:id/recordings

Response: Recording[] for campaign.

---

## 10. Review API

### POST /api/recordings/:id/review

Request:

```json
{
  "buyerId": "usr_...",
  "decision": "Accept",
  "rubric": {
    "audioClarity": 5,
    "roleFit": 4,
    "scenarioHandling": 4,
    "conversationNaturalness": 5,
    "brandSafety": 5
  },
  "note": "Good support response."
}
```

Behavior:
- Validate each rubric metric is integer 1-5.
- totalScore = sum of all 5 metrics.
- decision "Accept" => Recording.status = "Accepted".
- decision "Request Retake" => Recording.status = "Retake requested".
- decision "Reject" => Recording.status = "Rejected".
- If Accepted, create contributor payout FinanceLedger.
- If Accepted, Phase 4 creates ProofRecord type RECORDING_ACCEPTED.

Response:

```json
{
  "ok": true,
  "data": {
    "recording": {},
    "review": {},
    "financeLedger": {},
    "certificate": {}
  }
}
```

---

## 11. Finance API

### GET /api/buyer/finance

Query optional:

```text
buyerId=usr_...
```

Response:

```json
{
  "ok": true,
  "data": {
    "summary": {
      "totalSecuredBudget": 2400000,
      "payoutAccrued": 720000,
      "remainingBudget": 1680000,
      "pendingReviewImpact": 160000
    },
    "campaigns": [],
    "contributors": []
  }
}
```

### GET /api/contributor/finance

Query optional:

```text
contributorId=usr_...
```

Response:

```json
{
  "ok": true,
  "data": {
    "summary": {
      "submittedRecordings": 5,
      "acceptedRecordings": 3,
      "pendingReview": 2,
      "approvedReward": 24000,
      "pendingPotentialReward": 16000
    },
    "campaigns": []
  }
}
```

### POST /api/contributor/withdraw

Request:

```json
{
  "contributorId": "usr_...",
  "amount": 24000,
  "walletAddress": "optional"
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "status": "Scheduled",
    "amount": 24000,
    "message": "Withdrawal scheduled in demo mode."
  }
}
```

---

## 12. Certificate + proof API

### GET /api/certificates

Query optional:

```text
campaignId=cmp_...
userId=usr_...
```

Response: Certificate[].

### GET /api/certificates/:id

Response: Certificate detail with proof record.

### POST /api/solana/proof

Request:

```json
{
  "type": "BUDGET_SECURED",
  "subjectId": "cmp_...",
  "walletAddress": "optional",
  "payload": {}
}
```

Response: ProofRecord.

---

## 13. Smoke test curl commands

### Health

```bash
curl http://localhost:4000/api/health
```

### Login buyer

```bash
curl -X POST http://localhost:4000/api/auth/demo-login \
  -H "Content-Type: application/json" \
  -d '{"role":"Buyer","fullName":"Vy Tran","email":"vy@voiceturk.demo"}'
```

### List campaigns

```bash
curl http://localhost:4000/api/campaigns
```

### Start Agora Option B session

```bash
curl -X POST http://localhost:4000/api/agora/session/start \
  -H "Content-Type: application/json" \
  -d '{"campaignId":"<campaignId>","contributorId":"<contributorId>"}'
```

### Submit review

```bash
curl -X POST http://localhost:4000/api/recordings/<recordingId>/review \
  -H "Content-Type: application/json" \
  -d '{
    "buyerId":"<buyerId>",
    "decision":"Accept",
    "rubric":{
      "audioClarity":5,
      "roleFit":4,
      "scenarioHandling":4,
      "conversationNaturalness":5,
      "brandSafety":5
    },
    "note":"Good support response."
  }'
```

---

## 14. Non-goals

Do not implement these in MVP:

```text
- DeepCheck
- ASR scoring
- transcript scoring
- LLM grading
- real payout
- complex wallet custody
- backend-started Agora agent lifecycle
- multi-agent sessions
- production Solana transactions unless explicitly requested later
```
