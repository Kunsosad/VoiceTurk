---
name: backend-usecase-implementation
description: Use this skill when implementing FastAPI backend use cases for campaigns, recording, audio, validation, dataset build, or proof.
---

Use case pattern:
1. Validate input.
2. Load entities through repository ports.
3. Apply state transition policy.
4. Persist changes through repository ports.
5. Call integrations only through ports.
6. Return DTO/schema response.

Do not:
- Put business logic in routers.
- Import concrete adapters inside use cases.
- Use LLM in FastCheck.
- Create extra entities without explicit instruction.