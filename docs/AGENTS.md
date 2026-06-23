# VoiceTurk Agent Skill Prompt

Use this as the persistent project-specific instruction for any coding agent working on VoiceTurk.

Recommended locations:

```text
AGENTS.md
backend/AGENTS.md
.cursor/rules/voiceturk-backend.mdc
.claude/skills/voiceturk-backend/SKILL.md
```

---

# VoiceTurk Backend Agent Skill

You are a coding agent working on **VoiceTurk**, a Vietnamese customer-support voice conversation dataset platform.

Your job is to implement backend features safely, incrementally, and compatibly with the existing React/Vite frontend. Do not redesign the product unless explicitly asked.

## 1. Product understanding

VoiceTurk is not a fixed-script reading app.

VoiceTurk collects short voice conversations for customer-support AI datasets:

1. A Buyer creates a customer-support campaign.
2. A Contributor joins the campaign and accepts participation terms.
3. The Contributor enters a Studio and talks with an AI Customer.
4. The AI Customer is a pre-configured Agora Agent created in Agora Agent Studio / Agora Console.
5. Each short conversation becomes one Recording.
6. Buyer reviews recordings using a 5-metric rubric.
7. Only Buyer-accepted recordings count toward campaign progress, contributor payout, and dataset delivery.
8. Solana/LazorKit is used for wallet identity and proof/certificate records, not for core business logic.

Core demo campaign:

```text
Livestream Gift Complaint Dataset
```

Scenario:

```text
A customer bought cosmetics through a livestream because the shop promised a mini gift. The order arrived without the gift. The customer is angry, distrustful, and wants the shop to handle it immediately.
```

AI Customer role:

```text
A frustrated customer who suspects the shop lied about the gift.
```

Contributor role:

```text
Customer support person for the shop.
```

Conversation boundary:

```text
Maximum 5 turns per side.
```

Payment rule:

```text
Contributor is paid only for Buyer-accepted recordings.
```

## 2. Non-negotiable constraints

Always follow these constraints:

1. Do not rewrite the frontend.
2. Do not change frontend components unless the user explicitly asks.
3. Prefer replacing mock API functions gradually instead of changing UI logic.
4. Keep API responses compatible with the existing FE types.
5. Always return API responses in this wrapper:

```json
{ "ok": true, "data": {} }
```

or:

```json
{ "ok": false, "error": { "code": "ERROR_CODE", "message": "Human readable message" } }
```

6. Do not invent new status strings.
7. Use FE-compatible status strings:

```text
Campaign.status:
Draft | Active | Reviewing | Completed

Recording.status:
Pending review | Accepted | Retake requested | Rejected

Certificate.status:
Pending | Confirmed | Verified

ConversationSession.status:
Active | Finished | Cancelled
```

8. Do not expose backend complexity to the frontend.
9. Do not implement DeepCheck, ASR scoring, transcript scoring, or AI grading unless explicitly requested.
10. Buyer is the validator. Do not create a separate Validator role.
11. Agora must stay isolated in `backend/src/agora/`.
12. Solana/LazorKit must stay isolated in `backend/src/solana/`.
13. Core business logic belongs in `backend/src/modules/`.
14. Do not let Agora or Solana control campaign status, review decision, or payout logic.
15. If unsure, prefer a working demo-safe implementation over an over-engineered production implementation.

## 3. Required project files to read before coding

Before coding any phase, read these files if they exist:

```text
backend/docs/API_CONTRACT.md
backend/docs/BE_PHASE_PROMPTS.md
backend/AGENTS.md
AGENTS.md
```

If `API_CONTRACT.md` exists, it is the source of truth for endpoints, response shapes, status strings, and request payloads.

Do not create endpoint shapes from memory if the contract file exists.

## 4. Preferred backend stack

Use:

```text
Node.js
Express
TypeScript
Prisma
SQLite for demo
Zod
CORS
dotenv
tsx
```

Optional per phase:

```text
jsonwebtoken
multer
agora-access-token2
@solana/web3.js
```

Avoid adding unnecessary frameworks.

## 5. Backend folder structure

Use this structure unless the repo already has a compatible backend structure:

```text
backend/
├─ src/
│  ├─ index.ts
│  ├─ app.ts
│  ├─ config/
│  │  └─ env.ts
│  ├─ db/
│  │  ├─ prisma.ts
│  │  └─ seed.ts
│  ├─ modules/
│  │  ├─ auth/
│  │  ├─ users/
│  │  ├─ campaigns/
│  │  ├─ agreements/
│  │  ├─ conversations/
│  │  ├─ recordings/
│  │  ├─ reviews/
│  │  ├─ finance/
│  │  └─ certificates/
│  ├─ agora/
│  │  ├─ agora.routes.ts
│  │  ├─ agora.service.ts
│  │  ├─ agora.types.ts
│  │  └─ README.md
│  ├─ solana/
│  │  ├─ lazorkit.routes.ts
│  │  ├─ mock-proof.service.ts
│  │  ├─ proof.service.ts
│  │  ├─ proof.types.ts
│  │  └─ README.md
│  ├─ storage/
│  │  ├─ upload.middleware.ts
│  │  ├─ storage.routes.ts
│  │  └─ local-storage.service.ts
│  └─ shared/
│     ├─ AppError.ts
│     ├─ asyncHandler.ts
│     ├─ response.ts
│     └─ validators.ts
├─ prisma/
│  └─ schema.prisma
├─ uploads/
│  └─ recordings/
├─ docs/
│  ├─ API_CONTRACT.md
│  └─ BE_PHASE_PROMPTS.md
├─ package.json
├─ tsconfig.json
└─ .env.example
```

## 6. Prisma model requirements

Implement these core models:

```text
User
WalletAccount
Campaign
ContributorAgreement
ConversationSession
Recording
Review
FinanceLedger
Certificate
ProofRecord
```

Keep the schema demo-friendly and FE-compatible.

Use `cuid()` IDs.

Use string statuses for FE compatibility.

Do not overuse Prisma enums during MVP unless the FE response is mapped back to the exact expected display strings.

## 7. Review rubric

Buyer reviews each Recording with 5 metrics, each scored 1 to 5:

```text
audioClarity
roleFit
scenarioHandling
conversationNaturalness
brandSafety
```

Compute:

```text
totalScore = audioClarity + roleFit + scenarioHandling + conversationNaturalness + brandSafety
```

Review decisions:

```text
Accept
Request Retake
Reject
```

Map decisions to recording status:

```text
Accept -> Accepted
Request Retake -> Retake requested
Reject -> Rejected
```

Only `Accepted` recordings count toward:

```text
Campaign accepted count
Contributor payout
Dataset delivery
Recording accepted proof
```

## 8. Agora integration policy — Option B

VoiceTurk currently uses **Agora Option B**.

This is critical.

For the MVP, backend does not start or stop the Agora AI Agent through Agora Join/Leave REST APIs.

Backend only handles:

```text
ConversationSession creation
Agora channel name generation
RTC token generation for contributor
Returning appId/channelName/uid/token/sessionId/agentName to FE
Marking session as Finished on end
```

The AI Customer Agent is pre-configured in Agora Agent Studio / Agora Console and joins the channel manually or through an external script outside the core app.

Do not implement real Agora Join/Leave lifecycle unless the user explicitly asks for Option C.

Allowed Agora endpoints in MVP:

```text
POST /api/conversations/sessions
POST /api/conversations/sessions/:id/end
POST /api/agora/token
POST /api/agora/session/start
POST /api/agora/session/end
```

`POST /api/agora/session/start` should return:

```json
{
  "ok": true,
  "data": {
    "sessionId": "ses_123",
    "campaignId": "cmp_123",
    "channelName": "voiceturk_cmp_123_ses_123",
    "appId": "AGORA_APP_ID",
    "uid": 1002,
    "token": "rtc_token_or_mock_token",
    "agentName": "VoiceTurk AI Customer",
    "maxTurnsPerSide": 5,
    "status": "Active"
  }
}
```

Support mock mode:

```text
AGORA_MOCK_MODE=true
```

If mock mode is true, return mock token and appId so FE can continue running.

## 9. Solana / LazorKit policy

LazorKit wallet/passkey flow is mainly frontend-side.

Backend should not attempt to trigger WebAuthn/passkey prompts.

Backend receives wallet identity from FE and links it to a user.

Expected backend input:

```json
{
  "walletAddress": "vaultPda_or_wallet_address",
  "smartWallet": "smart_wallet_pda_optional",
  "email": "optional@example.com",
  "fullName": "Optional Name",
  "role": "Buyer",
  "authMethod": "lazorkit"
}
```

Backend responsibilities:

```text
Upsert User
Upsert WalletAccount
Issue JWT
Create mock proof records for MVP
Return certificate/proof records to FE
```

Solana proof is an adapter.

It must not control campaign status, review decision, or payout logic.

Use mock mode by default:

```text
SOLANA_MOCK_MODE=true
```

Mock proof should still create DB records with:

```text
type
subjectId
network
status
proofRef
txSignature
payloadHash
walletAddress
createdAt
```

## 10. Core API endpoints

Implement endpoints according to `backend/docs/API_CONTRACT.md`.

Minimum expected endpoints:

```text
Auth
POST /api/auth/demo-login
POST /api/auth/lazorkit-login
GET  /api/auth/me

Campaigns
GET    /api/campaigns
POST   /api/campaigns
GET    /api/campaigns/:id
PATCH  /api/campaigns/:id
POST   /api/campaigns/:id/fund
POST   /api/campaigns/:id/activate
POST   /api/campaigns/:id/consent

Conversations / Agora
POST /api/conversations/sessions
POST /api/conversations/sessions/:id/end
POST /api/agora/token
POST /api/agora/session/start
POST /api/agora/session/end

Recordings
GET  /api/recordings
GET  /api/recordings/:id
POST /api/recordings
POST /api/recordings/upload
GET  /api/campaigns/:id/recordings

Reviews
POST /api/recordings/:id/review

Finance
GET  /api/buyer/finance
GET  /api/contributor/finance
POST /api/contributor/withdraw

Certificates / Proof
GET  /api/certificates
GET  /api/certificates/:id
POST /api/solana/proof
GET  /api/solana/proof/:id

Agreements
GET /api/agreements
```

## 11. API compatibility rules

All API routes must return the standard response wrapper.

Example success:

```json
{
  "ok": true,
  "data": {
    "id": "rec_123",
    "status": "Pending review"
  }
}
```

Example error:

```json
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Recording not found"
  }
}
```

Do not return raw Prisma objects if they expose internal-only fields or incompatible naming.

Use mapper functions when needed.

## 12. Frontend wiring policy

When wiring frontend to backend:

1. Do not rewrite pages.
2. Do not rewrite components.
3. Create a small API client:

```text
src/shared/apiClient.ts
```

4. Create a real API wrapper with the same interface as `mockApi.ts`:

```text
src/shared/realApi.ts
```

5. Prefer this pattern:

```ts
import { realApi as mockApi } from "@/shared/realApi";
```

or switch inside `mockApi.ts` using an env flag.

6. If backend response differs from frontend shape, fix it in `realApi.ts` mapper, not in UI components.

## 13. Phase execution protocol

When asked to implement a phase:

1. Read `backend/docs/API_CONTRACT.md`.
2. Read the requested phase prompt.
3. Inspect existing code before editing.
4. Implement only the requested phase.
5. Do not implement future phases early unless needed for compilation.
6. Keep changes small and reviewable.
7. Add or update seed data if the feature needs demo data.
8. Run typecheck/build if scripts exist.
9. Provide curl smoke tests.
10. Report changed files and commands run.

## 14. Recommended phase split

The original 5 phases are valid, but they should be split internally:

```text
Phase 1A: Backend scaffold, Express app, shared helpers, Prisma setup
Phase 1B: Prisma schema, seed, campaigns API
Phase 1C: recordings, review rubric, finance, certificates API
Phase 2A: demo JWT auth
Phase 2B: LazorKit login + WalletAccount
Phase 2C: contributor agreements + consent certificate
Phase 3A: Agora Option B minimal session + token
Phase 3B: optional manual-agent runbook, no real Join API
Phase 4A: Solana mock proof service
Phase 4B: audio upload + static file serving
Phase 4C: proof backfill on fund/consent/accept
Phase 5A: apiClient + realApi shell
Phase 5B: replace campaign/recording/review mocks
Phase 5C: replace auth/agreements/finance/certificates mocks
Phase 5D: wire Contributor Studio session start/end and upload
```

Only implement one sub-phase at a time unless the user asks for a larger batch.

## 15. Anti-drift checklist

Before finishing any task, verify:

```text
[ ] Did I keep Agora in Option B mode?
[ ] Did I avoid implementing real Agora Join/Leave unless asked?
[ ] Did I keep Solana/LazorKit isolated?
[ ] Did I keep status strings FE-compatible?
[ ] Did I use {ok,data}/{ok,error} response wrapper?
[ ] Did I avoid changing frontend components unnecessarily?
[ ] Did I update seed/demo data if needed?
[ ] Did I add curl tests or explain how to test?
[ ] Did I avoid adding DeepCheck/ASR/transcript scoring?
[ ] Did I preserve Buyer as the final validator?
```

## 16. Output format after coding

After implementing a phase, respond with:

```text
Summary
- What was implemented

Files changed
- path/to/file.ts: short explanation

How to run
- commands

Smoke tests
- curl commands

Notes / risks
- anything incomplete or mocked
```

Do not claim that real Agora Agent lifecycle or real Solana transaction is implemented if only mock mode exists.

