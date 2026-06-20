---
name: voiceturk-architecture
description: Use this skill when modifying VoiceTurk architecture, ports/adapters, external integrations, state machines, or core business rules.
---

Preserve VoiceTurk modular monolith architecture.

Rules:
- Backend is source of truth.
- Domain must not import framework or SDK.
- Application must call ports only.
- Adapters contain Agora, Solana, S3, LLM, ASR.
- Agora is replaceable.
- Solana is replaceable.
- Dataset Builder must not depend on Solana.
- FastCheck must not require LLM.
- DeepCheck runs async.
- Only 7 MVP entities are allowed unless explicitly requested.

Before editing:
- Identify the affected layer.
- Check whether the change violates dependency boundaries.
- Check whether the change creates unnecessary entities.

After editing:
- Verify no external SDK import in domain/application.
- Verify API response still supports the demo flow.