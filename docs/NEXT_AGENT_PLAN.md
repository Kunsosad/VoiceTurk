# VoiceTurk Production-Ready MVP Hardening Plan

## Audit Findings

### What is solid
- Seven core domain entities intact: User, Campaign, ScriptLine, RecordingItem, RecordingSession, AudioSample, DatasetVersion
- Ports/adapters architecture respected - no forbidden SDK imports in domain/application
- Auth with bcrypt passwords + HMAC token, login/register/logout/me all working
- RBAC: BUYER, CONTRIBUTOR, ADMIN roles with resource-level authorize helpers
- Campaign CRUD: create, update, archive, script-line CRUD, generate-items, activate, coverage
- Dual-pipeline: upload init -> presigned PUT -> complete -> FastCheck -> official audio -> DeepCheck queue
- FastCheck: decoded PCM WAV, deterministic, 15s timeout, no LLM
- DeepCheck: queued, async, heuristic, non-blocking
- SQLite persistence via SQLiteRepository
- MinIO/local storage adapter
- Dataset export: ACCEPTED samples only, manifest + checksums + annotations
- Health + readiness endpoints
- Request IDs and structured JSON pipeline logs
- Debug endpoints gated to development env
- Frontend: login page, dark/light mode, role-aware nav, recording studio with pipeline timeline

### Key gaps (production blockers)
1. **App.tsx is 1086 lines** — monolithic, hard to maintain, inline styles, minified sections
2. **RecordingPanel UI** — raw JSON in telemetry, no waveform SVG animation, basic meter
3. **ReviewPanel** — uses hardcoded `validator_id: "user_001"` in API call instead of authenticated user
4. **api.ts review** — hardcoded `validator_id`, `contributor_id: "authenticated"` in startSession  
5. **Empty states** — some exist but inconsistent; loading skeletons absent
6. **Campaign create UI** — click-to-create only, no form; no edit form for draft
7. **Contributor flow** — no dedicated campaign discovery/detail before joining
8. **No toast/notification system** — errors shown as plain text paragraphs
9. **FontFamily uses DM Sans/Manrope** but styles.css is minified one-liners (hard to maintain)
10. **App shell** — needs role-aware page routing instead of tab-based workflow
11. **Config** — CORS_ALLOWED_ORIGINS missing from .env.example comments
12. **docker-compose.yml** — empty stub; needs real dev compose
13. **Tests** — only one test file; no auth/RBAC/campaign CRUD tests
14. **Docs** — no PRODUCTION_READINESS.md or UI_UX_SYSTEM.md

## Implementation Phases

### Phase 1: Fix Auth API calls and backend RBAC (immediate blockers)
- Fix `api.ts`: remove hardcoded `contributor_id`, `validator_id`
- Fix `reviewer id` to use authenticated user from token
- Ensure `SessionStart.contributor_id` is not required from frontend (backend derives from token)

### Phase 2: Refactor App.tsx into maintainable components
- Split into: LoginPage, AppShell, CampaignPage, RecordingPage, ReviewPage, DatasetPage, VerifyPage
- Add dedicated routing (React state-based, no react-router needed for MVP)
- Add toast/notification context
- Fix all inline minified code sections

### Phase 3: Premium UI/UX Polish
- Rewrite styles.css with proper CSS custom properties and organized sections
- Add loading skeleton components
- Add proper empty states with illustrations/icons
- Add waveform visualization (CSS/SVG animated bars)
- Add campaign create/edit form (modal or page)
- Add contributor discovery page with campaign cards
- Ensure all buttons have proper hover/active states with transitions

### Phase 4: Campaign Management UX (Buyer flow)
- Campaign create form with all fields
- Campaign edit form for DRAFT/PREVIEW_READY
- Script line management UI
- Campaign detail view with coverage metrics and charts
- Dataset export progress UI

### Phase 5: Contributor UX
- Available campaigns grid with search/filter
- Campaign detail preview before joining
- Recording studio UX improvements
- Retake view within studio

### Phase 6: Tests expansion
- Auth register/login/me/logout tests
- RBAC tests (buyer cannot edit other buyer's campaign)
- Campaign CRUD tests
- Architecture scan test (already exists, verify passes)

### Phase 7: Docker + Deployment docs
- Write proper docker-compose.dev.yml
- Write Dockerfile.backend, Dockerfile.frontend  
- Write PRODUCTION_READINESS.md
- Write docs/UI_UX_SYSTEM.md

## Guardrails
- Keep exactly User, Campaign, ScriptLine, RecordingItem, RecordingSession, AudioSample, DatasetVersion
- Keep external SDKs in adapters
- Keep FastCheck deterministic and LLM-free
- Do not make DeepCheck part of synchronous recording response
- Do not add wallet, payment, payout, marketplace, or blockchain
- Do not break the working dual-pipeline
