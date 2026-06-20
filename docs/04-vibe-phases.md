
VoiceTurk MVP — Vibe Coding Phases
Strategy

Build fast by vertical slice.

Do not spend hours polishing isolated layers.

Keep the end-to-end demo alive.

Use mock/local providers if real services block progress.

Phase 0 — Agent Setup

Goal:

AGENTS.md exists
.codex/skills exists
.env.example exists
docs exist
repo has architecture guardrails

Done when:

Codex can read project rules
agent can understand what not to do
Phase 1 — Monorepo Scaffold

Create:

apps/web
services/api
packages/contracts
docs
infra

Backend:

FastAPI
SQLite local fallback
modular monolith folders

Frontend:

Next.js/React
role switch
minimal layout

Done when:

backend health endpoint works
frontend starts
Phase 2 — Backend Core

Implement:

7 entities
enums
state policies
repository ports
local/in-memory or SQLite persistence
use case skeleton

Done when:

campaign can be created
script lines can be saved
recording items can be generated
Phase 3 — Backend API Vertical Slice

Implement:

create campaign
generate items
activate campaign
start recording session
submit audio
review sample
build dataset
verify manifest

Done when:

API can run demo flow through curl or script
Phase 4 — Frontend Minimal UI

Implement:

Buyer Campaign Console
Contributor Recording Studio
Validator Review Queue
Dataset Export/Verify page

Done when:

user can click through the demo flow without touching backend manually
Phase 5 — Recording Flow

Implement:

Browser MediaRecorder
client pre-check
audio upload
backend FastCheck
AudioSample creation
mock DeepCheck

Done when:

contributor records actual webm audio
validator can play it back
Phase 6 — Coach Layer

Implement:

RealtimeCoachClient interface
BrowserTTSCoachClient
MockRealtimeCoachClient
AgoraRealtimeCoachClient placeholder or real adapter

Done when:

app works without Agora
app can use Agora when env exists
Agora does not own backend state
Phase 7 — Dataset Builder

Implement:

annotations.jsonl
quality_report.json
data_card.md
manifest.json
license.json
manifest hash
local proof provider

Done when:

accepted samples can be exported into dataset package
verify returns MATCH
Phase 8 — Seed and Demo Polish

Implement:

seed buyer/contributor/validator
seed ecommerce campaign
seed 5 script lines
generate 20 items
README demo commands
smoke test

Done when:

full demo flow works from a clean checkout
Final Rule

Every phase should end with:

what changed
how to run
what works
known limitations
next phase
