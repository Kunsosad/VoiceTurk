# Agent Progress

## Phase 0 — Inspect and Plan

- Read the required project, architecture, state-machine, API, contract, example, and skill files in the prescribed order.
- Confirmed the repository currently contains design documentation but no backend or frontend implementation.
- Confirmed the MVP boundary: exactly seven entities, backend-owned state, local/mock providers, and no external integration requirement.
- Planned a vertical implementation: backend scaffold and domain, complete API flow, quality and dataset adapters, frontend role flows, then seed/smoke verification.
- Preserved pre-existing deleted legacy skill files shown by Git; they are not part of this agent's changes.

### Verification

- Repository inventory completed with `rg --files`.
- Working tree reviewed before edits.

### Known limitations

- No executable product exists yet; implementation starts in Phase 1.

## Phase 1 — Backend and Frontend Scaffold

- Added FastAPI and React/Vite package configuration.
- Added the API application, health route, CORS setup, provider composition, and frontend role shell.
- Added local-first environment configuration and reproducible pnpm lockfile.

## Phase 2 — Domain and Persistence

- Implemented exactly the seven specified domain entities and their enums.
- Added explicit validator transition policy, repository/provider ports, and an in-memory repository adapter.
- Added local storage, deterministic FastCheck, mock DeepCheck, and local-hash proof adapters.

## Phase 3 — Use Cases and APIs

- Implemented campaign creation/list/detail/item generation/activation/coverage.
- Implemented session assignment/completion and multipart audio submission.
- Implemented review queue/detail/media/review and dataset build/detail/verify.
- Kept routers as transport-only delegates to the application service.

## Phase 4 — Recording and Quality Pipeline

- Added browser MediaRecorder and client duration/blob checks.
- FastCheck failures delete the upload and create no AudioSample.
- FastCheck passes create CHECKING AudioSamples and background mock DeepCheck moves them to REVIEW_PENDING.
- Added Browser TTS, mock, and Agora-placeholder coach adapters behind one interface.

## Phase 5 — Dataset Builder

- Exported accepted samples only into audio, annotations, quality report, data card, manifest, and license files.
- Added SHA-256 file checksums, manifest hash, functional local proof issue/verify, and MATCH/MISMATCH responses.

## Phases 6–9 — Web Demo Flows

- Buyer can seed/create, generate, activate, inspect coverage, build, and verify.
- Contributor can choose an active campaign, record, pre-check, upload, retry/continue from backend decisions, and complete a session.
- Validator can refresh review items, play backend-served audio, and submit all three decisions.
- Frontend API paths are centralized and backend responses remain authoritative.

## Phase 10 — Seed, Smoke Test, and Documentation

- Added idempotent process-local seed data with three users, five lines, four emotions, and 20 items.
- Added an end-to-end API test and combined smoke script.
- Rewrote local setup/demo documentation and synchronized contract changes.

### Verification

- Backend: `1 passed` for the complete API flow.
- Frontend: TypeScript typecheck passed.
- Frontend: Vite production build passed.

### Known limitations

- Business persistence is in memory and resets with the API process.
- Acoustic metadata is mocked and FastCheck does not decode audio frames.
- Agora, Solana, S3/MinIO, ASR, LLM, Redis, and authentication remain unconnected by design.

## Unified User + Agora + MinIO + Dual-Pipeline Hardening

### Phase A/B — Audit and Unified Operator

- Re-read project rules, contracts, all repository skills, backend, and frontend before editing.
- Replaced the Buyer/Contributor/Validator role switch with one five-step VoiceTurk Studio workflow.
- Seed now creates `user_001`; backend retains distinct buyer/contributor/validator audit fields with the same user ID.

### Phase C/D — Persistence, Object Storage, and Upload Lifecycle

- Added durable SQLite repository adapter without adding a domain entity.
- Expanded ObjectStoragePort and implemented local and S3-compatible MinIO adapters.
- Added upload init, local PUT/presigned MinIO PUT, completion, temporary-object FastCheck, and official-object promotion.
- Preserved the backward-compatible multipart submit endpoint through the same application flow.

### Phase E/F — Client Pre-check and Agora

- Browser recorder now captures analyzable 16-bit PCM WAV and reports live dBFS/speech events.
- Added client checks/messages for permission/device/track/mute/no speech/blob/duration/volume/silence/clipping/upload failures.
- Added Agora RTC SDK adapter with channel join, microphone publication, level/speech/mute/connection callbacks, and Browser TTS coach composition.
- Added backend Agora token adapter and endpoint; missing/failed Agora falls back to Browser TTS/text without changing business state.

### Phase G/H — FastCheck v2 and DeepCheck Queue

- FastCheck now decodes PCM and calculates duration, rate/channels, RMS/peak, clipping, speech/silence, leading/trailing silence, SNR, file size/container, warnings, and score.
- Added an in-process idempotent queue, pending recovery, one-sample processing, status, and retry APIs.
- Heuristic DeepCheck deterministically maps to REVIEW_PENDING, NEED_RETAKE, or REJECTED and stores feedback/metadata on AudioSample.

### Phase I/J/K — Retakes, Self-review, and Automatic Progression

- Added campaign/session retake queues, start-retake, skip, and backend next-action APIs.
- Unified self-review shows FastCheck and DeepCheck metrics while saving `validator_id=user_001`.
- Coach-led state machine speaks instructions, starts listening, auto-stops after silence, retries failures, and auto-advances only after backend CONTINUE_NEXT.

### Phase L — Contracts, Infrastructure, and Verification

- Updated contracts/examples, environment template, README, smoke script, and optional MinIO Docker Compose.
- Backend tests: 3 passed, 1 MinIO integration test skipped without environment.
- Frontend typecheck and production build passed.
- Architecture boundary test passed; no external SDK imports in domain/application and no LLM in FastCheck.

### Known limitations

- DeepCheck emotion/prosody scoring is heuristic.
- Local queue is single-process; CHECKING samples are recovered after restart when pending processing runs.
- Agora and MinIO require external credentials/services and default tests do not contact them.
- Agora currently uses Browser TTS for coach speech; Conversational AI Agent lifecycle is not implemented.
- PCM WAV is the supported decoded format; the bundled Agora SDK increases the initial frontend chunk size.

## Post-Precheck Pipeline Hardening

- Root cause audit found four unbounded/failure-prone seams: frontend fetches had no AbortController deadlines, MinIO signed only with the backend endpoint, bucket creation ignored environment, and FastCheck had no request deadline.
- Added explicit `UPLOAD_INIT`, `PRESIGNED_PUT`, `UPLOAD_COMPLETE`, `WAITING_FASTCHECK`, and `PIPELINE_ERROR` states with 10s/30s/20s request limits and retry on the same item.
- Added a visible 30-event debug timeline and required client events from pre-check through auto-advance.
- Added browser-reachable MinIO signing through `S3_PUBLIC_BASE_URL`; internal Docker hostnames now require that setting instead of returning an unusable URL.
- Development may create `voiceturk-dev`; staging/production fail when the bucket is absent.
- Added MinIO CORS setup script for localhost/127.0.0.1 origins on ports 3000/5173.
- Added a 15-second backend FastCheck deadline and terminal `FAST_CHECK_TIMEOUT`; missing temporary objects return `UPLOAD_OBJECT_NOT_FOUND`.
- Added structured JSON pipeline logs for upload init/completion, object checks, FastCheck, promotion, AudioSample creation, enqueue, and response.
- Expanded backend coverage to browser URL signing, missing objects, FastCheck timeout, environment-specific bucket behavior, and log events.

### Verification

- Backend: 7 passed, 1 MinIO live integration skipped without environment.
- Frontend typecheck passed after timeout/instrumentation changes.
- Frontend production build and complete smoke script passed; only the known Agora bundle-size warning remains.

## MinIO Diagnostics and Recording-Termination Guard

- Fixed environment discovery so the API loads the repository-root `.env` even when Uvicorn starts from `services/api`; service-local overrides remain supported.
- Added sanitized S3/MinIO diagnostics, a development-only health API, and a browser PUT/verify probe in Studio.
- Added direct, presigned, CORS, and API upload smoke tools. The live `voiceturk` bucket passed direct PUT, presigned PUT/GET, browser-origin preflight, object verification, FastCheck, and next-action checks.
- Guarded next-action from completing while recordable or submitted work remains and added development decision counts/reasons.
- Expanded timing/event logs from session start and recording through upload, FastCheck, next-action, and explicit completion.

### Verification

- Backend: 8 passed, 1 credential-gated MinIO integration test skipped.
- Frontend production build passed; the known Agora bundle-size warning remains.
- Live diagnostic and API storage smoke passed against `127.0.0.1:9000`.

### Remaining manual check

- Click Studio's development Storage Probe to confirm the user's browser route. The equivalent signed PUT and localhost:5173 CORS preflight already pass on this machine.
