You are working on VoiceTurk.

Do NOT code yet.

Read:

* docs/AGENTS.md
* docs/API_CONTRACT.md
* docs/BE_PHASE_PROMPTS.md

Create:

* docs/DETAILED_PHASE_PROMPTS.md

Goal:
Expand the 5 phases into detailed copy-paste coding prompts.

Context:
VoiceTurk collects Vietnamese customer-support voice conversation datasets.
It is NOT a fixed-script recording app.

Flow:
Buyer creates campaign → Contributor joins → Contributor enters Studio → Contributor talks with AI Customer → Buyer reviews recording → accepted recordings count toward dataset and payout.

Architecture:

* Backend: Node.js + Express + TypeScript + Prisma + SQLite.
* Frontend: existing React + Vite. Do not rewrite components.
* New backend folder: backend/.
* Do not use services/api unless explicitly asked.
* Agora Option B only: backend creates session/channel/token. No Join API. No Leave API. Agent joins manually/external script.
* LazorKit is frontend-side. Backend receives walletAddress/smartWallet/vaultPda and links wallet to user.
* Solana proof is mock first. No real Solana tx required.

Must follow docs/API_CONTRACT.md exactly.

Response wrapper:
Success: { "ok": true, "data": ... }
Error: { "ok": false, "error": { "code": "...", "message": "..." } }

Exact status strings:
Campaign: "Draft", "Active", "Reviewing", "Completed"
Recording: "Pending review", "Accepted", "Retake requested", "Rejected"
Certificate: "Pending", "Confirmed", "Verified"
ConversationSession: "Active", "Finished", "Cancelled"

Review:
Metrics: audioClarity, roleFit, scenarioHandling, conversationNaturalness, brandSafety.
Each metric is 1-5.
totalScore = sum.
Decision: "Accept", "Request Retake", "Reject".

Create DETAILED_PHASE_PROMPTS.md with:

1. Global rules
2. Anti-drift checklist
3. Phase 1 — Backend scaffold + core APIs
4. Phase 2 — Auth + LazorKit + Agreements
5. Phase 3 — Agora Option B session/token
6. Phase 4 — Solana mock proof + audio upload
7. Phase 5 — FE wiring mockApi → real API
8. Smoke tests
9. Definition of Done
10. Common failures

For each phase include only:

* Goal
* Files
* Commands
* Endpoints
* DB changes
* Test steps
* Do not do
* Done checklist
* Copy-paste coding prompt

Do not:

* change API_CONTRACT.md
* invent response shapes
* change status strings
* implement Agora Option C
* rewrite frontend components
* add Python/FastAPI/Next.js/GraphQL/tRPC
* hardcode secrets
