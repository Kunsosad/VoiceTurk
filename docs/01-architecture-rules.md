
VoiceTurk MVP — Architecture Rules
1. Architecture Style

VoiceTurk uses:

monorepo
modular monolith backend
ports/adapters architecture
Web2 frontend for MVP
mock/local providers first

Do not create microservices for MVP.

2. Backend Is Source of Truth

Backend owns:

Campaign
ScriptLine
RecordingItem
RecordingSession
AudioSample
DatasetVersion
state transitions
validation decisions
dataset build
manifest/proof status

Frontend displays and triggers actions.

Agora speaks and supports realtime experience.

3. Integration Boundaries

External integrations must only live in adapters.

Examples:

Agora:

allowed in adapters/realtime or frontend integrations/realtime
not allowed in domain/application

Solana:

allowed in adapters/proof
not allowed in dataset builder core

S3/MinIO:

allowed in adapters/storage
not allowed in domain/application

LLM/ASR:

allowed in adapters/ai
not allowed in FastCheck core
DeepCheck may use through ports later
4. Ports

Required backend ports:

Repositories:

UserRepository
CampaignRepository
ScriptLineRepository
RecordingItemRepository
RecordingSessionRepository
AudioSampleRepository
DatasetVersionRepository

Storage:

ObjectStoragePort

Realtime:

RealtimeVoicePort
CoachVoicePort

Quality:

FastCheckPort
DeepCheckPort
AudioMetadataPort

AI:

ASRPort
LLMFeedbackPort

Proof:

ProofProviderPort

Queue:

JobQueuePort
5. Recommended Backend Folders

services/api/app/

main.py
core/
domain/
application/
ports/
adapters/
jobs/
composition/
shared/

domain/

entities/
enums/
policies/
events/

application/

use_cases/
services/

ports/

repositories/
storage/
realtime/
proof/
check/
ai/
queue/

adapters/

http/
persistence/
storage/
realtime/
proof/
check/
ai/
queue/
6. Recommended Frontend Folders

apps/web/src/

app/
features/
integrations/
components/
types/

features/

buyer/
contributor/
validator/
dataset/
shared/

integrations/

realtime/
recorder/
storage/
7. Provider Switch

MVP should run with:

OBJECT_STORAGE_PROVIDER=local
REALTIME_PROVIDER=browser_tts
PROOF_PROVIDER=local_hash
FAST_CHECK_PROVIDER=rule_based
DEEP_CHECK_PROVIDER=mock
ASR_PROVIDER=mock
LLM_FEEDBACK_PROVIDER=template
QUEUE_PROVIDER=background_tasks

Real integrations should be swappable by env later.
