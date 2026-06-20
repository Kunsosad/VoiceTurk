name: project-analysis
description: Use this skill before implementing large changes, planning phases, or creating the super prompt for VoiceTurk MVP.
VoiceTurk Project Analysis Skill
Goal

Analyze the project before coding so the agent does not vibe randomly.

Required Reading Order

Before large implementation:

AGENTS.md
docs/00-project-context.md
docs/01-architecture-rules.md
docs/02-entity-state-machine.md
docs/03-api-boundary.md
docs/04-vibe-phases.md
packages/contracts/api-contract.md
Analysis Checklist

Answer internally:

What is the smallest vertical slice?
Which user role is affected?
Which entity state changes?
Which layer should own this logic?
Which ports are needed?
Which adapter can be mock/local?
What should not be implemented yet?
What is the demo proof after this change?
MVP Bias

Prefer:

working local demo
mock provider
simple API
explicit state transition
small files
readable code
seed data

Avoid:

premature microservices
advanced queue system too early
Solana integration before local hash works
Agora dependency before Browser TTS works
ASR/LLM before basic recording works
payment/payout/wallet
