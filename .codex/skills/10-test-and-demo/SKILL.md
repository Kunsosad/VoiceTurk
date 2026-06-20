name: test-and-demo
description: Use this skill before finishing any implementation phase, PR, or large coding task.
Test and Demo Skill
Goal

Keep the MVP runnable end-to-end.

Required Checks

Backend:

health endpoint works
campaign can be created
recording items can be generated
campaign can be activated
recording session can start
audio can be submitted
FastCheck returns a decision
sample can enter review queue
validator can accept sample
dataset can be built
manifest can be verified

Frontend:

app starts
buyer screen works
contributor recording screen works
validator screen works
dataset verify screen works
Agora missing env does not break app
Browser TTS fallback works or text fallback works

Architecture:

no external SDK imports in domain/application
no extra MVP entities created
FastCheck does not call LLM
Dataset Builder does not import Solana
official audio path goes through backend/storage
Demo Seed

Create seed data:

1 buyer
1 contributor
1 validator
1 campaign: ecommerce_cskh
5 script lines
4 target emotions
20 recording items
Smoke Test Flow
GET /health
POST /campaigns
POST /campaigns/{id}/generate-items
POST /campaigns/{id}/activate
POST /recording-sessions/start
POST /recording-items/{id}/submit-audio
GET /validation/review-queue
POST /validation/audio-samples/{id}/review
POST /datasets/build
POST /datasets/verify
Final Output

At the end of a phase, report:

files changed
what works
how to run
known limitations
next recommended phase
