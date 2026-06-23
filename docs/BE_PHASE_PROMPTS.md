# VoiceTurk Backend Phase Prompts

Use this with:

* docs/AGENTS.md
* docs/API_CONTRACT.md

Rules:

* Backend folder: backend/
* Stack: Node.js + Express + TypeScript + Prisma + SQLite
* Frontend is existing React + Vite. Do not rewrite components.
* Keep API response wrapper from API_CONTRACT.md.
* Keep exact status strings.
* Agora = Option B only: session/channel/token, no Join API, no Leave API.
* Solana proof = mock first.
* LazorKit wallet flow is frontend-side; backend only links wallet data.

---

## Phase 1 — Backend scaffold + core business APIs

Goal:
Create backend/ and replace most mockApi business data.

Implement:

* Express app, CORS, JSON, error handler
* Prisma + SQLite
* Seed data
* Campaign APIs
* Recording APIs
* Review rubric APIs
* Finance APIs
* Certificate APIs

Dependencies:
express, cors, dotenv, zod, prisma, @prisma/client, typescript, tsx

Endpoints:

* GET /api/health
* GET /api/campaigns
* POST /api/campaigns
* GET /api/campaigns/:id
* PATCH /api/campaigns/:id
* POST /api/campaigns/:id/fund
* POST /api/campaigns/:id/activate
* GET /api/recordings
* POST /api/recordings
* GET /api/recordings/:id
* POST /api/recordings/:id/review
* GET /api/buyer/finance
* GET /api/contributor/finance
* POST /api/contributor/withdraw
* GET /api/certificates
* GET /api/certificates/:id

DB:
User, Campaign, Recording, Review, FinanceLedger, Certificate, ProofRecord, WalletAccount, ContributorAgreement, ConversationSession.

Done:
curl tests pass and responses match API_CONTRACT.md.

---

## Phase 2 — Auth + LazorKit + Agreements

Goal:
Add demo auth, wallet login, and contributor consent.

Dependencies:
jsonwebtoken, @types/jsonwebtoken

Implement:

* JWT demo login
* LazorKit wallet login endpoint
* auth middleware with AUTH_DEMO_MODE
* agreements list
* campaign consent

Endpoints:

* POST /api/auth/demo-login
* POST /api/auth/lazorkit-login
* GET /api/auth/me
* GET /api/agreements
* POST /api/campaigns/:id/consent

Rules:
LazorKit happens on frontend. Backend receives walletAddress/smartWallet/vaultPda and links it to User.

Done:
Buyer/contributor demo login works. Consent creates agreement + certificate mock.

---

## Phase 3 — Agora Option B session/token

Goal:
Make Studio able to request session/channel/token.

Dependencies:
agora-access-token or agora-access-token2

Implement:

* ConversationSession creation
* Unique agoraChannel
* RTC token generation
* Session end
* Mock mode support

Endpoints:

* POST /api/conversations/sessions
* POST /api/conversations/sessions/:id/end
* POST /api/agora/session/start
* POST /api/agora/session/end

Rules:

* Do NOT call Agora Join API.
* Do NOT call Agora Leave API.
* Do NOT auto-start agent.
* Return appId, channelName, uid, token, sessionId, agentName.
* Agent may join manually/external script during demo.

Done:
FE can receive channel/token and join RTC.

---

## Phase 4 — Solana mock proof + audio upload

Goal:
Add proof records and recording file upload.

Dependencies:
multer, @types/multer, @solana/web3.js

Implement:

* Mock proof service
* SHA-256 payload hash
* ProofRecord creation
* Audio upload to uploads/recordings/
* Static serve /uploads
* Backfill proof on fund/consent/accept

Endpoints:

* POST /api/solana/proof
* POST /api/recordings/upload
* GET /uploads/recordings/:file

Rules:
No real Solana tx required. Keep Solana code in backend/src/solana/.

Done:
Audio upload returns audioUrl. Proof records appear in certificates/details.

---

## Phase 5 — FE wiring mockApi → real API

Goal:
Replace mockApi gradually without rewriting components.

Implement:

* src/shared/apiClient.ts
* src/shared/realApi.ts
* Same function names and return shapes as mockApi
* Auth login uses /api/auth/demo-login
* Campaigns, recordings, review, finance, certificates use BE
* Studio start uses /api/agora/session/start
* Recording submit uses upload + POST /api/recordings

Rules:

* Do not rewrite components.
* Map BE response shape inside realApi if needed.
* Keep mock fallback if useful.

Done:
Core demo flow works with backend:
Buyer campaign → Contributor studio → Recording submit → Buyer review → Finance/certificates update.
