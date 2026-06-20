# VoiceTurk MVP

VoiceTurk is a guided Vietnamese prosody recording and dataset packaging MVP.

## MVP Flow

Buyer creates campaign  
-> Backend generates recording items  
-> Contributor records audio with AI Voice Coach support  
-> Backend runs FastCheck and DeepCheck  
-> Validator reviews samples  
-> Dataset Builder exports dataset package  
-> Manifest/proof verify returns MATCH  

## Architecture

VoiceTurk uses:

- Monorepo
- Modular monolith backend
- Ports/adapters architecture
- Web2 demo frontend
- Mock/local providers first

Backend is the source of truth.

Agora is only a realtime voice/AI Coach layer.

Dataset audio must go:

Client -> Backend/Object Storage -> AudioSample

## Setup Agent Context

Run from repo root:

```bash
mkdir -p .agent-skills
git clone https://github.com/openai/skills .agent-skills/openai-skills || true
git clone https://github.com/AgoraIO/skills .agent-skills/agora-skills || true
git clone https://github.com/agentsmd/agents.md .agent-skills/agents-md || true

On Windows PowerShell, use:

mkdir .agent-skills -Force
git clone https://github.com/openai/skills .agent-skills/openai-skills
git clone https://github.com/AgoraIO/skills .agent-skills/agora-skills
git clone https://github.com/agentsmd/agents.md .agent-skills/agents-md
Environment

Copy:

cp .env.example .env

MVP defaults should run without:

Agora
Solana
S3
ASR
LLM
Redis

Use mock/local providers first.

Critical Rules

Read AGENTS.md before coding.

Do not bypass ports/adapters.

Do not import Agora/Solana/S3/LLM/ASR SDKs into domain or application layers.

Do not create extra MVP entities unless explicitly requested.

Expected Demo Screens

Buyer:

Campaign list
Create campaign
Campaign detail / coverage
Dataset export / verify

Contributor:

Home / available campaigns
Recording session
Session summary

Validator:

Review queue
Sample review detail
Expected Dataset Package
dataset_v1/
  audio/
  annotations.jsonl
  quality_report.json
  data_card.md
  manifest.json
  license.json
Agent Workflow
Read AGENTS.md.
Read docs/.
Read .codex/skills/.
Build phase by phase.
Keep MVP running end-to-end.
Prefer mock adapter over blocking on real external integration.
