# VoiceTurk Detailed Phase Prompts

Use this document with `docs/AGENTS.md`, `docs/API_CONTRACT.md`, and `docs/BE_PHASE_PROMPTS.md`. `docs/API_CONTRACT.md` is the source of truth whenever another instruction is ambiguous.

## 1. Global rules

- VoiceTurk collects Vietnamese customer-support voice conversation datasets. It is not a fixed-script reading or recording app.
- Preserve this flow: Buyer creates campaign → Contributor joins and consents → Contributor enters Studio → Contributor talks with the AI Customer → Buyer reviews the recording → only accepted recordings count toward the dataset and payout.
- Create the backend only under `backend/`. Do not use `services/api` unless explicitly requested.
- Backend stack: Node.js, Express, TypeScript, Prisma, SQLite, Zod, CORS, dotenv, and tsx.
- Keep the existing React/Vite frontend. Add adapters and wiring; do not rewrite pages or components.
- Follow every endpoint, request, response, field name, and behavior in `docs/API_CONTRACT.md` exactly. Do not infer contract details from this document when the contract is more specific.
- Wrap every success as `{ "ok": true, "data": ... }` and every error as `{ "ok": false, "error": { "code": "...", "message": "..." } }`. `error.details` may be included only as described by the contract.
- Use exact status strings:
  - Campaign: `Draft`, `Active`, `Reviewing`, `Completed`
  - Recording: `Pending review`, `Accepted`, `Retake requested`, `Rejected`
  - Certificate: `Pending`, `Confirmed`, `Verified`
  - ConversationSession: `Active`, `Finished`, `Cancelled`
  - Review decision: `Accept`, `Request Retake`, `Reject`
- Review metrics are `audioClarity`, `roleFit`, `scenarioHandling`, `conversationNaturalness`, and `brandSafety`. Validate each as an integer from 1 through 5 and compute `totalScore` on the backend as their sum.
- Map review decisions exactly: `Accept` → `Accepted`; `Request Retake` → `Retake requested`; `Reject` → `Rejected`.
- Only accepted recordings count toward accepted campaign progress, contributor payout, and dataset delivery.
- Buyer is the final validator. Do not add a Validator role, AI grading, DeepCheck, ASR scoring, or transcript scoring.
- Agora uses Option B only. The backend creates sessions/channels and contributor RTC tokens. It never calls Agora Agent Join/Leave APIs and never starts the AI Customer. The preconfigured agent joins manually or through an external script.
- Keep Agora code isolated in `backend/src/agora/` and support `AGORA_MOCK_MODE=true`.
- LazorKit runs in the frontend. The backend accepts wallet identity fields, links them to a user, and issues a JWT; it must not trigger passkey/WebAuthn interactions.
- Keep Solana code isolated in `backend/src/solana/`. Use mock proof mode first with `SOLANA_MOCK_MODE=true`; no real transaction is required.
- Keep core business logic in `backend/src/modules/`. Agora and Solana adapters must not control campaign status, review decisions, or payout rules.
- Never hardcode JWT, Agora, Solana, database, or other secrets. Validate environment variables and document safe mock defaults in `.env.example`.
- Implement one phase at a time. Do not pull later-phase work forward except for schema placeholders or compilation necessities explicitly called out in the phase.
- After each phase, run available typecheck/build/test commands and execute its smoke tests. Report exactly what is mocked.

## 2. Anti-drift checklist

Before completing any phase, verify:

- [ ] `docs/API_CONTRACT.md` was read immediately before implementation.
- [ ] Work stayed inside the requested phase.
- [ ] Backend work is under `backend/`, not `services/api`.
- [ ] All responses use the standard success/error wrapper.
- [ ] No endpoint, payload, response field, or response shape was invented.
- [ ] All status and decision strings match the contract character-for-character.
- [ ] Review scores are backend-validated integers from 1 to 5 and `totalScore` is backend-computed.
- [ ] Only `Accepted` recordings affect accepted progress, payout, and dataset delivery.
- [ ] Buyer remains the final validator.
- [ ] No DeepCheck, ASR/transcript scoring, LLM grading, or fixed-script workflow was added.
- [ ] Agora remains Option B: no Join API, Leave API, or backend agent lifecycle.
- [ ] Agora and Solana code remain isolated from core business rules.
- [ ] LazorKit passkey/wallet interaction remains frontend-side.
- [ ] Solana proof remains mock-first and no real transaction is claimed.
- [ ] No secret or credential was committed or logged.
- [ ] Existing frontend components were preserved; compatibility mapping lives in the API adapter.
- [ ] Seed data still represents the livestream missing-gift conversation scenario.
- [ ] Commands and smoke-test results were recorded honestly.

## 3. Phase 1 — Backend scaffold + core APIs

### Goal

Create a runnable `backend/` with Express, TypeScript, Prisma, SQLite, shared response/error handling, demo seed data, and contract-compatible campaign, recording, review, finance, and certificate APIs. Keep auth permissive/demo-safe for this phase; real JWT handling belongs to Phase 2.

### Files

- Create `backend/package.json`, `backend/tsconfig.json`, `backend/.env.example`, and `backend/.gitignore` if absent.
- Create `backend/src/index.ts`, `backend/src/app.ts`, `backend/src/config/env.ts`, `backend/src/db/prisma.ts`, and `backend/src/db/seed.ts`.
- Create shared helpers under `backend/src/shared/`: `AppError.ts`, `asyncHandler.ts`, `response.ts`, `validators.ts`, and the central error/not-found middleware as needed.
- Create modules under `backend/src/modules/`: `campaigns/`, `recordings/`, `reviews/`, `finance/`, and `certificates/`, using route/controller/service/mapper/schema files only where useful.
- Create `backend/prisma/schema.prisma` and `backend/uploads/recordings/.gitkeep`.
- Do not modify `docs/API_CONTRACT.md` or frontend files in this phase.

### Commands

```bash
cd backend
npm install express cors dotenv zod @prisma/client
npm install -D typescript tsx prisma @types/node @types/express @types/cors
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run typecheck
npm run build
npm run dev
```

Define scripts for `dev`, `build`, `start`, `typecheck`, `prisma:generate`, `prisma:migrate`, and `seed`. Adjust only for the repository's package manager if it is already standardized.

### Endpoints

- `GET /api/health`
- `GET /api/campaigns`
- `POST /api/campaigns`
- `GET /api/campaigns/:id`
- `PATCH /api/campaigns/:id`
- `POST /api/campaigns/:id/fund`
- `POST /api/campaigns/:id/activate`
- `GET /api/recordings`
- `POST /api/recordings`
- `GET /api/recordings/:id`
- `GET /api/campaigns/:id/recordings`
- `POST /api/recordings/:id/review`
- `GET /api/buyer/finance`
- `GET /api/contributor/finance`
- `POST /api/contributor/withdraw`
- `GET /api/certificates`
- `GET /api/certificates/:id`

Implement the precise queries, bodies, response shapes, aggregates, and side effects from `docs/API_CONTRACT.md`. Funding creates the budget ledger and certificate but not the Phase 4 proof. Accepted review creates the payout ledger and certificate response expected by the contract but not the Phase 4 proof.

### DB changes

- Configure SQLite through `DATABASE_URL`.
- Add `User`, `WalletAccount`, `Campaign`, `ContributorAgreement`, `ConversationSession`, `Recording`, `Review`, `FinanceLedger`, `Certificate`, and `ProofRecord` using `cuid()` identifiers and appropriate relations.
- Use strings for frontend-visible statuses and preserve exact display values.
- Store recording `audioQuality` in a SQLite-compatible form and map it back to the contract object.
- Enforce one review per recording unless the contract or existing UI explicitly requires replacement; make review creation and all related status/ledger/certificate changes transactional.
- Make accepted-review payout creation idempotent so retries cannot double-pay.
- Seed Buyer `Vy Tran`, Contributor `Minh Pham`, the `Livestream Gift Complaint Dataset` campaign, representative recordings/statuses, finance entries, and certificates matching the contract scenario.

### Test steps

1. Generate Prisma client, migrate a clean SQLite database, and run the seed twice or document why the seed is reset-based.
2. Start the backend and verify `/api/health` uses the success wrapper.
3. List, create, read, patch, fund, and activate campaigns; confirm exact fields and status strings.
4. Create/list/read recordings and list by campaign; verify new status is `Pending review`.
5. Submit each review decision and verify its exact recording-status mapping.
6. Submit metric values `0`, `6`, decimals, missing metrics, and invalid decisions; verify wrapped validation errors.
7. Confirm `totalScore` is computed by the server and an accepted review creates only one payout on retry.
8. Verify buyer/contributor finance summaries and certificate list/detail shapes against the contract.
9. Verify unknown IDs/routes and malformed JSON produce the error wrapper without stack traces.

### Do not do

- Do not implement JWT/LazorKit auth, consent routes, Agora, uploads, or Solana proof behavior yet.
- Do not return raw Prisma records when their shape differs from the contract.
- Do not trust client-supplied totals, counts, payout values, or recording status.
- Do not count pending, retake-requested, or rejected recordings as accepted.
- Do not create real payouts or blockchain transactions.
- Do not touch or rewrite frontend components.

### Done checklist

- [ ] Backend installs and starts from `backend/`.
- [ ] Prisma migration and demo seed succeed.
- [ ] Every listed endpoint matches the contract and wrapper.
- [ ] Review validation, score calculation, decision mapping, and accepted-only payout are correct.
- [ ] Finance/campaign aggregates are derived consistently and retry-safe.
- [ ] Typecheck and build pass.
- [ ] Phase 1 smoke tests pass on a clean database.

### Copy-paste coding prompt

```text
You are implementing VoiceTurk Phase 1 only: backend scaffold and core business APIs.

Before editing, read docs/AGENTS.md, docs/API_CONTRACT.md, docs/BE_PHASE_PROMPTS.md, and docs/DETAILED_PHASE_PROMPTS.md. Inspect the repository and preserve existing work. Treat API_CONTRACT.md as the source of truth.

Create backend/ using Node.js + Express + TypeScript + Prisma + SQLite + Zod + CORS + dotenv + tsx. Add a runnable Express app, environment validation, Prisma client, shared async/error/response helpers, migrations, and idempotent demo seed data for the VoiceTurk livestream missing-gift scenario.

Implement only Phase 1 endpoints listed in DETAILED_PHASE_PROMPTS.md: health; campaigns including fund/activate; recordings including campaign recordings; review; buyer/contributor finance and demo withdrawal; certificates. Match every contract request and response exactly. Wrap success as {ok:true,data:...} and errors as {ok:false,error:{code,message}}. Use exact status strings.

Validate all five review rubric metrics as integers 1-5, compute totalScore on the backend, and map Accept/Request Retake/Reject exactly. Only Accepted recordings count toward accepted progress, contributor payout, and delivery. Make multi-record side effects transactional and retry-safe. Use mapper functions instead of leaking incompatible Prisma records.

Do not implement Phase 2 auth/agreements, Phase 3 Agora, Phase 4 uploads/proofs, or Phase 5 frontend wiring. Schema placeholders for later models are allowed only as required by the approved schema. Do not modify API_CONTRACT.md, services/api, or frontend components. Do not add other frameworks or hardcode secrets.

Run Prisma generation/migration/seed, typecheck, build, and curl smoke tests. Finish with a concise report of files changed, commands run, smoke-test results, and anything still mocked.
```

## 4. Phase 2 — Auth + LazorKit + Agreements

### Goal

Add demo JWT authentication, LazorKit wallet identity linking, authenticated-user lookup, agreement listing, and contributor campaign consent while keeping the frontend responsible for LazorKit/passkey interaction.

### Files

- Update `backend/package.json` and `backend/.env.example`.
- Create/update `backend/src/modules/auth/` for routes, validation, JWT issuance/verification, and middleware.
- Create/update `backend/src/modules/users/` and `backend/src/modules/agreements/`.
- Update campaign routes/service for consent only.
- Update `backend/src/app.ts`, `backend/src/config/env.ts`, `backend/src/db/seed.ts`, and Prisma schema/migration only as required.
- Keep wallet-linking business code in the auth/users modules; do not add backend LazorKit SDK/passkey UI code.

### Commands

```bash
cd backend
npm install jsonwebtoken
npm install -D @types/jsonwebtoken
npx prisma generate
npx prisma migrate dev --name auth_wallet_agreements
npm run seed
npm run typecheck
npm run build
npm run dev
```

### Endpoints

- `POST /api/auth/demo-login`
- `POST /api/auth/lazorkit-login`
- `GET /api/auth/me`
- `GET /api/agreements`
- `POST /api/campaigns/:id/consent`

Match the exact bodies and outputs in the contract. Accept the contract's wallet identity fields, including optional `smartWallet`; if the existing schema also supports `vaultPda`, normalize it without changing the public response shape. Protect `/api/auth/me`; apply authentication elsewhere only where compatible with the contract and `AUTH_DEMO_MODE`.

### DB changes

- Finalize `User`, `WalletAccount`, and `ContributorAgreement` fields and relations required by the contract.
- Make wallet address/provider linkage unique and safe to upsert.
- Store only a password-free wallet identity link; no passkey private material.
- Consent creates an accepted agreement plus `ContributorAgreement` certificate transactionally.
- Prevent duplicate active agreement/certificate creation for the same contributor and campaign.
- Leave `proofRecordId` absent until Phase 4 creates the mock proof.

### Test steps

1. Demo-login as Buyer and Contributor; decode/verify that returned JWTs work without exposing the secret.
2. Call `/api/auth/me` with a valid token, no token, malformed token, and expired/invalid token.
3. LazorKit-login with a new wallet, then repeat with the same wallet; verify user/wallet upsert behavior and contract response.
4. Validate role, email, wallet fields, and missing required input with wrapped errors.
5. Create contributor consent; confirm agreement and certificate are returned and persisted.
6. Repeat consent and verify it is idempotent or returns a stable contract-compatible conflict, without duplicates.
7. Filter agreements by `contributorId` and verify exact response shape.

### Do not do

- Do not initiate LazorKit, WebAuthn, passkey prompts, or wallet signing on the backend.
- Do not store passkey secrets or private keys.
- Do not create proof records yet.
- Do not add OAuth, password authentication, refresh-token infrastructure, or new roles.
- Do not silently change Phase 1 endpoint shapes or frontend components.

### Done checklist

- [ ] Demo login returns user plus JWT for both roles.
- [ ] LazorKit login safely upserts wallet/user and returns the contract shape.
- [ ] `/api/auth/me` handles valid and invalid bearer tokens correctly.
- [ ] Agreement listing/filtering works.
- [ ] Consent creates exactly one agreement and certificate per contributor/campaign.
- [ ] No passkey/private wallet material is processed or stored.
- [ ] Typecheck, build, and Phase 2 smoke tests pass.

### Copy-paste coding prompt

```text
Implement VoiceTurk Phase 2 only: Auth + LazorKit identity linking + Agreements.

First read docs/AGENTS.md, docs/API_CONTRACT.md, docs/BE_PHASE_PROMPTS.md, and Phase 2 in docs/DETAILED_PHASE_PROMPTS.md. Inspect the completed Phase 1 backend and preserve its API behavior.

Add jsonwebtoken-based demo auth with AUTH_DEMO_MODE and environment-provided JWT configuration. Implement exactly POST /api/auth/demo-login, POST /api/auth/lazorkit-login, GET /api/auth/me, GET /api/agreements, and POST /api/campaigns/:id/consent. Match the contract bodies, response fields, wrappers, roles, and errors exactly.

LazorKit remains frontend-side. Receive walletAddress, optional smartWallet/vaultPda-compatible identity data, fullName, email, role, and authMethod; safely upsert User and WalletAccount, then issue JWT. Never trigger WebAuthn/passkeys or store private key material. Consent must transactionally create an accepted ContributorAgreement and ContributorAgreement certificate, be duplicate-safe, and leave Solana proof absent for Phase 4.

Do not implement Agora, upload, proof creation, real wallet transactions, extra auth systems, new roles, or frontend rewrites. Do not modify API_CONTRACT.md or hardcode secrets.

Run any migration/seed needed, typecheck, build, and endpoint smoke tests including invalid-token and duplicate-consent cases. Report files changed, commands, results, and mock/demo limitations.
```

## 5. Phase 3 — Agora Option B session/token

### Goal

Let Studio create/end conversation sessions and obtain a contributor RTC channel/token. The AI Customer remains preconfigured and joins manually or via an external script; the backend never controls the agent lifecycle.

### Files

- Update `backend/package.json` and `backend/.env.example`.
- Create `backend/src/agora/agora.routes.ts`, `agora.service.ts`, `agora.types.ts`, and `README.md`.
- Create/update `backend/src/modules/conversations/` for session persistence and lifecycle.
- Update `backend/src/app.ts` and `backend/src/config/env.ts`.
- Update Prisma schema/migration only if the Phase 1 `ConversationSession` model lacks contract fields.

### Commands

```bash
cd backend
npm install agora-access-token2
npx prisma generate
npx prisma migrate dev --name agora_option_b_sessions
npm run typecheck
npm run build
npm run dev
```

Run first with `AGORA_MOCK_MODE=true`. Run a real token-generation check only when valid environment credentials are supplied outside source control.

### Endpoints

- `POST /api/conversations/sessions`
- `POST /api/conversations/sessions/:id/end`
- `POST /api/agora/token`
- `POST /api/agora/session/start`
- `POST /api/agora/session/end`

Return the exact contract fields, including `sessionId`, `campaignId`, channel name (`agoraChannel` or `channelName` according to the specific endpoint), contributor UID, app ID/token where required, expiry, agent name, `agentJoinMode: "manual"`, max turns, and exact status.

### DB changes

- Ensure `ConversationSession` stores campaign/contributor relations, unique `agoraChannel`, contributor RTC UID, agent name, `agentJoinMode`, max turns, status, start time, and nullable end time.
- Generate collision-resistant channel names based on persisted IDs without exposing secrets.
- Session creation starts at `Active`; end transitions an active session to `Finished` and records `endedAt`.
- Make repeated end calls safe; never create a second session when `/api/agora/session/start` receives a valid existing `sessionId`.

### Test steps

1. Set `AGORA_MOCK_MODE=true`, start a session, and verify all exact response fields and an obviously non-secret mock token/app ID.
2. Create a raw conversation session, request a token for its channel/UID, then end it through both contract end routes.
3. Verify persisted channel uniqueness, `agentJoinMode: "manual"`, `maxTurnsPerSide: 5`, `Active` → `Finished`, and `endedAt`.
4. Retry session end and session start with an existing session; verify safe behavior without duplication.
5. Test missing campaign/contributor, invalid UID/role/channel, unknown session, and attempts to end another terminal state.
6. With credentials supplied only through environment variables, verify real RTC token generation locally; do not require an agent Join call.
7. Search the codebase to confirm there are no Agora Agent Join/Leave REST calls.

### Do not do

- Do not call Agora Agent Join API or Leave API.
- Do not auto-start, stop, configure, or poll the AI Customer agent.
- Do not add Option C lifecycle endpoints, agent IDs, or remote-agent state machines.
- Do not make Agora responsible for recording review, campaign state, finance, or payout.
- Do not hardcode or return the Agora App Certificate.
- Do not modify Studio/frontend yet.

### Done checklist

- [ ] All five endpoints match the contract.
- [ ] Mock mode works without Agora credentials.
- [ ] Real token generation reads credentials only from environment variables.
- [ ] Sessions persist and end safely with exact statuses.
- [ ] Channel names are unique and response endpoint field names are correct.
- [ ] `agentJoinMode` is `manual`; no Join/Leave code exists.
- [ ] Typecheck, build, and Phase 3 smoke tests pass.

### Copy-paste coding prompt

```text
Implement VoiceTurk Phase 3 only: Agora Option B session/channel/token support.

Read docs/AGENTS.md, docs/API_CONTRACT.md, docs/BE_PHASE_PROMPTS.md, and Phase 3 of docs/DETAILED_PHASE_PROMPTS.md before editing. Inspect and preserve Phases 1-2.

Keep all Agora integration in backend/src/agora and conversation persistence in backend/src/modules/conversations. Install/use agora-access-token2. Implement exactly the two conversation-session endpoints and the three Agora endpoints in the contract. Persist unique ConversationSession rows, generate contributor RTC tokens, support AGORA_MOCK_MODE=true, and return the precise per-endpoint field names and wrappers. Session start is Active; end is Finished with endedAt. Existing-session start/end must be safe and duplicate-resistant.

This is Option B. The endpoint only provides the frontend with a contributor channel and token. The preconfigured VoiceTurk AI Customer joins manually or through an external script. Do not call Agora Join/Leave APIs, auto-start an agent, implement Option C, or expose the App Certificate. Agora must not influence business decisions.

Add environment documentation without secrets, a short backend/src/agora/README.md explaining manual agent joining, then run typecheck/build and mock-mode smoke tests. If real credentials are already available via environment, test token generation only—never agent lifecycle. Report files, commands, results, and mock status.
```

## 6. Phase 4 — Solana mock proof + audio upload

### Goal

Add safe local audio upload/static serving and deterministic mock Solana proof records, then attach proofs to budget funding, contributor consent, and accepted-recording certificate flows.

### Files

- Update `backend/package.json`, `backend/.env.example`, and `backend/.gitignore`.
- Create `backend/src/storage/upload.middleware.ts`, `storage.routes.ts`, and `local-storage.service.ts`.
- Create `backend/src/solana/lazorkit.routes.ts` only if routing organization needs it, plus `mock-proof.service.ts`, `proof.service.ts`, `proof.types.ts`, and `README.md`.
- Update `backend/src/app.ts`, `backend/src/config/env.ts`, and the fund/consent/review services to call the proof adapter after core records exist.
- Update certificate mapping/detail and Prisma schema/migration only as required.
- Keep `backend/uploads/recordings/.gitkeep`; ignore uploaded media, not the directory.

### Commands

```bash
cd backend
npm install multer @solana/web3.js
npm install -D @types/multer
npx prisma generate
npx prisma migrate dev --name mock_proofs_and_uploads
npm run typecheck
npm run build
npm run dev
```

Use `SOLANA_MOCK_MODE=true` for all required tests.

### Endpoints

- `POST /api/solana/proof`
- `POST /api/recordings/upload`
- `GET /uploads/recordings/:file`

Also extend existing behaviors without changing their response shapes:

- `POST /api/campaigns/:id/fund` creates/links `BUDGET_SECURED` proof.
- `POST /api/campaigns/:id/consent` creates/links `CONTRIBUTOR_CONSENT` proof.
- Accepted `POST /api/recordings/:id/review` creates/links `RECORDING_ACCEPTED` proof.
- `GET /api/certificates/:id` includes its linked proof record exactly as the contract requires.

### DB changes

- Finalize `ProofRecord`: type, subject ID, network, exact proof status, proof reference, mock transaction signature, SHA-256 payload hash, optional wallet address, and created time.
- Link certificates to proof records without changing certificate response fields.
- Canonicalize the proof payload before hashing so retrying an equivalent request is stable.
- Make proof creation/backfill idempotent per proof type and subject; do not duplicate finance, certificate, or proof records on retries.
- No audio binary is stored in SQLite; recordings store returned relative `audioUrl`.

### Test steps

1. Upload valid allowed audio with multipart field `audio`; verify exact metadata response and retrievable `/uploads/...` URL.
2. Test missing file, wrong field, disallowed MIME/extension, oversized file, and unsafe filename; verify wrapped errors and no path traversal.
3. Create a recording using the returned `audioUrl`; verify its initial status remains `Pending review`.
4. Create the same mock proof twice and verify stable/idempotent behavior, SHA-256 hash, `solana-devnet`, mock signature/reference, and `Verified` status per contract examples.
5. Fund, consent, and accept a recording; verify each intended proof exists and is linked to certificate detail.
6. Request retake/reject and verify no accepted-recording proof or payout is created.
7. Retry fund/consent/accept requests and verify no duplicate ledgers, certificates, or proofs.
8. Search for real transaction submission/signing code; required mock implementation must not contain it.

### Do not do

- Do not submit, sign, or require a real Solana transaction.
- Do not store private keys, seed phrases, or wallet secrets.
- Do not make proof success control campaign, review, or payout business state.
- Do not accept arbitrary files, preserve unsafe client filenames, or expose filesystem paths.
- Do not invent upload/proof response fields.
- Do not wire the frontend yet.

### Done checklist

- [ ] Valid audio upload returns the exact contract metadata and is statically retrievable.
- [ ] Upload limits/type/name/path protections work.
- [ ] Mock proof creation produces all required fields and a SHA-256 payload hash.
- [ ] Fund, consent, and accepted-review proofs are linked and retry-safe.
- [ ] Non-accepted reviews create no payout/accepted proof.
- [ ] No real transaction or secret material is used.
- [ ] Typecheck, build, and Phase 4 smoke tests pass.

### Copy-paste coding prompt

```text
Implement VoiceTurk Phase 4 only: Solana mock proofs and local recording upload.

Read docs/AGENTS.md, docs/API_CONTRACT.md, docs/BE_PHASE_PROMPTS.md, and Phase 4 of docs/DETAILED_PHASE_PROMPTS.md first. Inspect and preserve Phases 1-3 and all contract shapes.

Add multer-based multipart upload for field audio, safe generated filenames, explicit audio type/size limits, storage under backend/uploads/recordings, and static /uploads serving. POST /api/recordings/upload must return exactly audioUrl, fileName, mimeType, and size inside the success wrapper.

Keep proof code in backend/src/solana. Implement SOLANA_MOCK_MODE=true, canonical SHA-256 payload hashing, and contract-shaped ProofRecord persistence for POST /api/solana/proof. Backfill idempotent proofs for campaign funding (BUDGET_SECURED), contributor consent (CONTRIBUTOR_CONSENT), and accepted recording review (RECORDING_ACCEPTED), linking them to certificate detail without changing existing endpoint response shapes. Core business records remain authoritative even though proof is an adapter.

Do not perform/sign real Solana transactions, store keys, allow unsafe uploads, rewrite frontend code, or invent shapes. Keep retry behavior duplicate-safe across ledgers, certificates, and proofs.

Run migrations if needed, typecheck/build, upload/static-file tests, mock-proof tests, and fund/consent/accept retry tests. Report files, commands, outcomes, and clearly state that Solana is mocked.
```

## 7. Phase 5 — FE wiring mockApi → real API

### Goal

Connect the existing React/Vite frontend to the completed backend through a small client and a contract-to-frontend adapter that preserves the existing `mockApi` interface and UI behavior.

### Files

- First locate the existing frontend source root and `mockApi.ts`; do not assume aliases before inspecting `vite.config.ts`, `tsconfig*`, and imports.
- Create the equivalent of `frontend/src/shared/apiClient.ts` and `frontend/src/shared/realApi.ts` at the actual existing source root.
- Update the smallest existing API selection/export point so callers can use `realApi` with the same function names and return shapes as `mockApi`.
- Update frontend environment examples/types for `VITE_API_BASE_URL` and an explicit mock/real selection flag if used.
- Touch pages/components only for minimal import replacement or unavoidable transport hookup. Do not restructure markup, state, routes, styling, or component ownership.
- Update Vite proxy config only if the repository already uses proxy-based local development; otherwise use `VITE_API_BASE_URL`.

### Commands

```bash
cd backend
npm run dev

cd frontend
npm install
npm run typecheck
npm run build
npm run dev
```

Use the repository's actual frontend directory and package-manager scripts after inspection. Do not add a second frontend toolchain.

### Endpoints

Wire existing mock methods to these real routes as their current UI usage requires:

- Auth: `POST /api/auth/demo-login`, `POST /api/auth/lazorkit-login`, `GET /api/auth/me`
- Campaigns: list/create/detail/update/fund/activate/consent routes
- Agreements: `GET /api/agreements`
- Studio: `POST /api/agora/session/start`, `POST /api/agora/session/end`
- Recording: upload first, then create; list/detail/campaign list routes
- Review: `POST /api/recordings/:id/review`
- Finance: buyer, contributor, withdrawal routes
- Certificates: list/detail routes

The generic client unwraps `{ok:true,data}` and turns `{ok:false,error}` into one consistent frontend error. `realApi.ts` maps backend data to existing frontend types; UI components must not learn backend wrapper/internal details.

### DB changes

- None expected.
- If a frontend mismatch reveals missing data, correct mapping in `realApi.ts`; change backend only when it demonstrably violates `docs/API_CONTRACT.md`.
- Never modify the database schema merely to mirror component-local presentation fields.

### Test steps

1. Inspect and record every existing `mockApi` method/signature and its call sites; ensure `realApi` implements the used interface.
2. Start seeded backend and frontend with the real API flag/base URL.
3. Log in as Buyer and Contributor; refresh and verify token/session behavior expected by the existing app.
4. Buyer creates, funds, and activates a campaign.
5. Contributor views/joins the campaign, consents, enters Studio, and receives an Option B channel/token while the agent remains manual.
6. Upload audio, create a recording, and verify `Pending review` in both contributor and buyer views.
7. Buyer submits all five metrics and `Accept`; verify accepted count, payout/finance, certificate, and mock proof update.
8. Repeat with `Request Retake` and `Reject`; verify exact display strings and no accepted payout/proof.
9. Test backend-down, unauthorized, validation, and not-found states; ensure the existing UI handles consistent errors without crashing.
10. Switch back to mock mode if retained and verify it still works.
11. Run frontend typecheck/build and confirm no broad component rewrite occurred.

### Do not do

- Do not rewrite pages/components, routing, global state, styling, or the Vite app.
- Do not change existing frontend types merely to expose raw backend/Prisma shapes.
- Do not scatter `fetch` calls through components; centralize transport and mapping.
- Do not implement Agora Join/Leave or pretend the manual AI agent is backend-started.
- Do not move LazorKit passkey UI to the backend.
- Do not remove the mock path unless the user explicitly asks.
- Do not hardcode localhost, tokens, wallets, or secrets in production code.

### Done checklist

- [ ] `apiClient` consistently handles base URL, JSON/multipart, auth header, wrappers, and errors.
- [ ] `realApi` covers every used `mockApi` method with compatible frontend return shapes.
- [ ] Components remain structurally unchanged apart from minimal wiring.
- [ ] Full Buyer → Contributor Studio → recording → Buyer review → finance/certificate flow works.
- [ ] Studio uses Agora Option B and clearly relies on manual/external agent joining.
- [ ] Real and retained mock modes behave as intended.
- [ ] Frontend typecheck/build and end-to-end smoke tests pass.

### Copy-paste coding prompt

```text
Implement VoiceTurk Phase 5 only: wire the existing React/Vite frontend from mockApi to the completed real backend.

Before editing, read docs/AGENTS.md, docs/API_CONTRACT.md, docs/BE_PHASE_PROMPTS.md, and Phase 5 of docs/DETAILED_PHASE_PROMPTS.md. Inspect the actual frontend directory, vite/tsconfig aliases, existing mockApi.ts, its exported method signatures, types, and every call site. Preserve the UI architecture.

Create a small shared apiClient that handles VITE_API_BASE_URL, bearer JWT, JSON and multipart requests, {ok:true,data} unwrapping, and consistent {ok:false,error} failures. Create realApi with the same used interface and frontend return shapes as mockApi. Put all backend-to-frontend mapping in realApi, not components. Add a controlled real/mock selection while retaining mock fallback unless explicitly unnecessary.

Wire auth, campaigns, agreements, Agora Option B Studio start/end, recording upload then creation, recordings, review, finance/withdrawal, and certificates to their exact contract endpoints. LazorKit/passkey remains frontend-side and only sends wallet identity to the backend. Do not add agent Join/Leave behavior.

Make only minimal import/transport changes in existing components. Do not rewrite components, routes, state, styles, types to raw backend shapes, or scatter fetch calls. Do not hardcode base URLs, credentials, tokens, or wallet values.

Run frontend typecheck/build and exercise the full seeded demo flow against the backend, including Accept, Request Retake, Reject, error states, and retained mock mode. Report changed files, commands, test results, mappings added, and any manual Agora-agent step.
```

## 8. Smoke tests

Run these after their owning phase and run the complete set after Phase 5. Substitute IDs from prior responses; do not hardcode seed IDs in implementation.

```bash
# Health and campaign list
curl http://localhost:4000/api/health
curl http://localhost:4000/api/campaigns

# Buyer login
curl -X POST http://localhost:4000/api/auth/demo-login \
  -H "Content-Type: application/json" \
  -d '{"role":"Buyer","fullName":"Vy Tran","email":"vy@voiceturk.demo"}'

# Contributor login
curl -X POST http://localhost:4000/api/auth/demo-login \
  -H "Content-Type: application/json" \
  -d '{"role":"Contributor","fullName":"Minh Pham","email":"minh@voiceturk.demo"}'

# LazorKit identity link
curl -X POST http://localhost:4000/api/auth/lazorkit-login \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"demo_wallet_address","smartWallet":"demo_smart_wallet","fullName":"Minh Pham","email":"minh@voiceturk.demo","role":"Contributor","authMethod":"lazorkit"}'

# Authenticated user
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer <token>"

# Consent
curl -X POST http://localhost:4000/api/campaigns/<campaignId>/consent \
  -H "Content-Type: application/json" \
  -d '{"contributorId":"<contributorId>","customDetails":"Demo consent"}'

# Agora Option B session start (does not start the AI agent)
curl -X POST http://localhost:4000/api/agora/session/start \
  -H "Content-Type: application/json" \
  -d '{"campaignId":"<campaignId>","contributorId":"<contributorId>"}'

# Agora Option B session end
curl -X POST http://localhost:4000/api/agora/session/end \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<sessionId>"}'

# Audio upload
curl -X POST http://localhost:4000/api/recordings/upload \
  -F "audio=@./test-audio.webm;type=audio/webm"

# Create recording
curl -X POST http://localhost:4000/api/recordings \
  -H "Content-Type: application/json" \
  -d '{"campaignId":"<campaignId>","contributorId":"<contributorId>","sessionId":"<sessionId>","audioUrl":"/uploads/recordings/<fileName>","durationSeconds":78,"audioQuality":{"voiceDetected":true,"volumeOk":true,"silenceOk":true,"durationOk":true}}'

# Accept recording
curl -X POST http://localhost:4000/api/recordings/<recordingId>/review \
  -H "Content-Type: application/json" \
  -d '{"buyerId":"<buyerId>","decision":"Accept","rubric":{"audioClarity":5,"roleFit":4,"scenarioHandling":4,"conversationNaturalness":5,"brandSafety":5},"note":"Good support response."}'

# Finance and certificates
curl "http://localhost:4000/api/buyer/finance?buyerId=<buyerId>"
curl "http://localhost:4000/api/contributor/finance?contributorId=<contributorId>"
curl "http://localhost:4000/api/certificates?campaignId=<campaignId>"
curl http://localhost:4000/api/certificates/<certificateId>
```

Also verify negative cases: invalid/missing JWT, unknown IDs, invalid status/decision, every rubric boundary and non-integer value, duplicate fund/consent/review/end requests, rejected upload type/size, and malformed JSON. Every API failure must use the error wrapper.

## 9. Definition of Done

- All five phases have been implemented sequentially and each phase's checks pass.
- `backend/` is the only backend and uses Node.js + Express + TypeScript + Prisma + SQLite.
- The frontend remains the existing React/Vite application with a thin API client/adapter, not a rewrite.
- Every endpoint, request, response, field, side effect, wrapper, and status matches `docs/API_CONTRACT.md`.
- The seeded end-to-end flow works: Buyer campaign → funding/activation → Contributor login/consent → Studio Option B session → audio upload/recording → Buyer review → accepted-only progress/payout → certificate/mock proof.
- Review validation and total calculation are server-owned; accepted side effects are transactional and retry-safe.
- Agora mock and credential-based RTC token modes work, while the agent still joins manually/external script. No Join/Leave API exists.
- LazorKit stays frontend-side and the backend stores only wallet identity linkage.
- Solana proof is explicitly mock-first, creates complete proof records, and performs no real transaction.
- Upload handling is constrained and safe; uploaded media is not committed.
- Secrets come only from environment configuration, `.env.example` contains placeholders, and logs/errors expose no secrets or stack traces.
- Clean install, Prisma migration/seed, backend typecheck/build, frontend typecheck/build, curl smoke tests, and manual end-to-end UI tests pass.
- Documentation states what is mocked and includes the manual Agora-agent demo step.

## 10. Common failures

- Coding from memory instead of re-reading `docs/API_CONTRACT.md`, causing subtly different endpoint or response fields.
- Returning `data` directly, raw Prisma rows, Express HTML errors, or `{ error: "..." }` instead of the wrappers.
- Using enum-like spellings such as `PENDING_REVIEW`, `Retake Requested`, or lowercase values instead of exact display strings.
- Treating VoiceTurk as fixed-script reading instead of a bounded support conversation with an AI Customer.
- Accepting `totalScore`, payout, counters, or status from the client instead of deriving them on the backend.
- Paying/counting every submitted recording instead of only Buyer-accepted recordings.
- Creating duplicate payout ledgers, certificates, agreements, or proofs when requests are retried.
- Implementing Agora Option C, calling Join/Leave, or claiming `/api/agora/session/start` starts the AI agent.
- Confusing endpoint-specific `agoraChannel`/`contributorRtcUid` fields with `channelName`/`uid`; use the exact contract for each endpoint.
- Requiring real Agora credentials in mock mode or exposing the App Certificate.
- Moving LazorKit/WebAuthn to the backend or storing passkey/private wallet material.
- Letting Solana proof failure decide review, campaign, or payout state, or claiming mock signatures are real.
- Allowing arbitrary uploads, trusting original paths/names, storing absolute paths in API responses, or committing recordings.
- Rewriting components to fit backend shapes instead of adapting in `realApi.ts`.
- Scattering fetch/base URLs/tokens throughout components or hardcoding `localhost` in production code.
- Adding Python/FastAPI, Next.js, GraphQL, tRPC, a Validator role, AI grading, ASR, transcript scoring, or unrelated infrastructure.
- Editing `docs/API_CONTRACT.md` to make an implementation mismatch disappear.
- Reporting success without running clean migration/seed, typecheck/build, negative tests, and the complete demo flow.
