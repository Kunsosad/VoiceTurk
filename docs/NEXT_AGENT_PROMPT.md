# Next Agent Prompt

The VoiceTurk MVP vertical slice is implemented and verified. Start by running `scripts/smoke_test.ps1`, then inspect `docs/AGENT_PROGRESS.md` and current Git status. Preserve the seven-entity and ports/adapters boundaries.

Recommended next improvement: replace the in-memory repository adapter with SQLite persistence behind the existing repository port, add migration/setup coverage, and retain the local/mock provider defaults. Do not add marketplace, payments, wallets, or production external integrations before persistence and audio-decoding FastCheck are solid.
