# AGENTS.md — VoiceTurk Coding Agent Guide

## 0. Read This First

You are working on VoiceTurk MVP.

Your job is to build fast, but not randomly.

This project has already been designed. Do not invent a new architecture.

If a real integration blocks progress, use a mock/local adapter and keep the port/interface stable.

The MVP must run end-to-end even when Agora, Solana, S3, ASR, LLM, and Redis are disabled.

## 1. Project Summary

VoiceTurk is an MVP for guided Vietnamese prosody recording and dataset packaging.

The MVP proves this end-to-end pipeline:

Buyer creates dataset campaign
-> Backend generates recording items
-> Contributor records audio with AI Voice Coach support
-> Backend runs FastCheck and DeepCheck
-> Validator reviews samples
-> Dataset Builder exports dataset package
-> Proof provider verifies manifest hash

VoiceTurk is not a general marketplace in the MVP.
VoiceTurk is not a full CSKH voicebot simulator in the MVP.
VoiceTurk is not a blockchain audio storage system in the MVP.

## 2. Product Scope

In scope:
- Buyer campaign creation
- ScriptLine creation
- RecordingItem generation
- Contributor recording session
- Browser recording
- Agora or Browser TTS coach
- Rule-based FastCheck
- Mock async DeepCheck
- Validator review
- Dataset package build
- Manifest hash verify

Out of scope:
- Marketplace
- Real payment
- Contributor payout
- Tokenomics
- Real wallet flow
- Voicebot CSKH simulation
- Production-grade emotion recognition
- Full anti-fraud
- Blockchain audio storage
- Multi-review workflow
- Advanced quota engine

## 3. Architecture Style

Use:
- Monorepo
- Modular monolith backend
- Ports/adapters architecture
- Event-oriented workflow, not microservices
- Web2 frontend for demo
- Mock/local providers first

Do not implement microservices for the MVP.

Backend is the source of truth.

Client and Agora support realtime experience, but they do not own final business state.

## 4. Core Dependency Rule

Never make Agora, Solana, S3, LLM, ASR, Redis, or external SDKs part of the core domain.

Core business logic must depend on ports, not concrete adapters.

## 5. Backend Dependency Rules

Allowed:
- domain contains pure business concepts, enums, policies
- application -> domain
- application -> ports
- adapters -> ports
- adapters -> external SDKs
- http routers -> application use cases
- composition wires concrete providers by environment

Forbidden:
- domain -> FastAPI
- domain -> SQLAlchemy
- domain -> Agora SDK
- domain -> Solana SDK
- domain -> boto3/S3 SDK
- domain -> Redis SDK
- domain -> OpenAI/Whisper SDK
- application -> Agora SDK directly
- application -> Solana SDK directly
- application -> S3 client directly
- application -> OpenAI/Whisper SDK directly
- Dataset Builder -> Solana SDK directly

## 6. Main MVP Entities

The MVP has exactly 7 core entities:

1. User
2. Campaign
3. ScriptLine
4. RecordingItem
5. RecordingSession
6. AudioSample
7. DatasetVersion

Do not create these entities unless explicitly requested:
- RecordingAttempt
- ValidationReview
- ProofRecord
- SampleCheckResult
- CampaignCoverage
- Payment
- Payout
- Marketplace
- Wallet
- Transaction
- Token

## 7. Recording Rule

One ScriptLine × one TargetEmotion = one RecordingItem.

One RecordingItem needs one accepted AudioSample.

If sample is accepted:
- AudioSample.status = ACCEPTED
- RecordingItem.status = ACCEPTED

If sample needs retake:
- AudioSample.status = NEED_RETAKE
- RecordingItem.status = NEED_RETAKE

If sample is rejected:
- AudioSample.status = REJECTED
- RecordingItem.status = OPEN

## 8. State Machines

Campaign:
- DRAFT
- PREVIEW_READY
- ACTIVE
- COLLECTION_COMPLETED
- DATASET_READY
- ARCHIVED
- CANCELLED

ScriptLine:
- DRAFT
- APPROVED
- DISABLED

RecordingItem:
- OPEN
- ASSIGNED
- REVIEW_PENDING
- ACCEPTED
- NEED_RETAKE
- DISABLED

RecordingSession:
- STARTED
- ACTIVE
- COMPLETED
- ABANDONED
- EXPIRED

AudioSample:
- CHECKING
- REVIEW_PENDING
- ACCEPTED
- REJECTED
- NEED_RETAKE

DatasetVersion:
- BUILDING
- READY
- PROOF_PENDING
- VERIFIED
- FAILED

## 9. Realtime Rule

Agora is only a realtime voice layer.

Agora may provide:
- voice room
- AI Voice Coach
- speak instruction
- optional realtime interaction

Agora must not decide:
- whether an AudioSample is created
- whether a sample is accepted
- whether retake is required
- whether dataset is ready
- whether proof is valid

## 10. Audio Rule

Official dataset audio must flow through:

Client -> Backend/Object Storage -> AudioSample

Do not store official dataset audio in Agora as the source of truth.

## 11. Quality Pipeline

The audio quality pipeline is:

Client Pre-check
-> Backend FastCheck
-> Backend DeepCheck
-> Validator Review

Client Pre-check:
- microphone permission
- audio blob exists
- audio duration not too short
- upload did not fail

FastCheck:
- deterministic
- cheap
- no LLM
- may check duration, file size, silence, volume, clipping, file integrity

DeepCheck:
- async
- mock acceptable for MVP
- may later use ASR/prosody/LLM through ports only

Validator Review:
- only reviews AudioSample.status = REVIEW_PENDING
- accept/reject/need retake decision updates AudioSample and RecordingItem

## 12. Dataset Builder Rule

Dataset Builder uses only:

AudioSample.status = ACCEPTED

Dataset Builder creates:
- audio/
- annotations.jsonl
- quality_report.json
- data_card.md
- manifest.json
- license.json
- manifest_hash

Dataset Builder must not import Solana directly.

ProofProvider handles:
- mock proof
- local hash proof
- Solana devnet proof

## 13. Frontend Rule

Use simple Web2 demo UI.

No wallet.
No real auth.
No payment.
No payout.

Use role switch:
- Buyer
- Contributor
- Validator

Frontend must not invent backend state.
Backend response is source of truth.

## 14. Agora Frontend Rule

Use a coach adapter interface.

Required implementations:
- MockRealtimeCoachClient
- BrowserTTSCoachClient
- AgoraRealtimeCoachClient

If Agora env variables are missing, fallback to BrowserTTSCoachClient.
If Browser TTS is unavailable, fallback to text-only coach messages.

## 15. Recommended Monorepo Structure

apps/web
- Next.js/React frontend

services/api
- FastAPI backend modular monolith

packages/contracts
- API contract, examples, schemas

docs
- architecture and product docs

infra
- docker and local dev infra

## 16. Demo Success Criteria

The MVP is successful when this flow works:

Buyer creates campaign
-> Backend generates RecordingItems
-> Buyer activates campaign
-> Contributor starts recording session
-> Coach gives instruction
-> Contributor records audio
-> Backend saves AudioSample
-> FastCheck passes
-> Mock DeepCheck sends sample to review
-> Validator accepts sample
-> Campaign coverage increases
-> Dataset package builds
-> Manifest verify returns MATCH

## 17. Implementation Priority

Build in vertical slices.

Do not spend too long perfecting one layer before proving the end-to-end flow.

Preferred order:
1. scaffold
2. backend entities/state/use cases
3. backend APIs
4. frontend minimal screens
5. recording flow
6. coach adapter/fallback
7. validation
8. dataset build
9. manifest verify
10. seed/demo polish

## 18. Final Agent Rule

Build fast, but do not break the architecture.

If a real integration blocks progress:
- use a mock adapter
- keep the port stable
- document the limitation
- continue the MVP flow
