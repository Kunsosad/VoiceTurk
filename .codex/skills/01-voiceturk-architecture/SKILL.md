name: voiceturk-architecture
description: Use this skill whenever modifying architecture, folder structure, domain entities, state machines, ports/adapters, or integration boundaries.
VoiceTurk Architecture Skill
Goal

Preserve the VoiceTurk MVP architecture while allowing fast implementation.

VoiceTurk is a guided Vietnamese prosody recording and dataset packaging MVP.

Core flow:

Buyer creates Campaign
-> Backend creates ScriptLine and RecordingItem
-> Contributor records AudioSample with AI Voice Coach support
-> Backend runs FastCheck and DeepCheck
-> Validator reviews AudioSample
-> Dataset Builder exports DatasetVersion
-> Proof provider verifies manifest hash

Architecture

Use:

monorepo
modular monolith backend
ports/adapters architecture
simple Web2 frontend
mock/fallback providers first

Do not use microservices in MVP.

Core Rule

Backend is source of truth.

Agora, Solana, S3, LLM, ASR, Redis, or any external SDK must not enter domain or application layer.

Allowed Dependencies

Allowed:

application -> domain
application -> ports
adapters -> ports
adapters -> external SDKs
http routers -> application use cases

Forbidden:

domain -> FastAPI
domain -> SQLAlchemy
domain -> Agora SDK
domain -> Solana SDK
domain -> S3 SDK
application -> Agora SDK
application -> Solana SDK
application -> OpenAI/Whisper SDK
application -> S3 client
MVP Entities

Only create these 7 entities:

User
Campaign
ScriptLine
RecordingItem
RecordingSession
AudioSample
DatasetVersion

Do not create:

RecordingAttempt
ValidationReview
ProofRecord
SampleCheckResult
CampaignCoverage
Payment
Payout
Marketplace
Recording Rule

One ScriptLine × one TargetEmotion = one RecordingItem.

One RecordingItem needs one accepted AudioSample.

State Ownership

Backend owns:

Campaign state
RecordingItem state
RecordingSession state
AudioSample state
DatasetVersion state

Frontend may display state but must not invent state.

Agora may speak instructions but must not decide state.

Before Editing

Check:

Which layer is affected?
Is this domain, application, port, adapter, router, or frontend?
Does this introduce an SDK into the wrong layer?
Does this create an unnecessary entity?
Does this break the demo flow?
After Editing

Verify:

No external SDK imports in domain/application.
Use case still works through ports.
API response supports frontend demo.
State transition remains explicit.
Mock/fallback still works.
