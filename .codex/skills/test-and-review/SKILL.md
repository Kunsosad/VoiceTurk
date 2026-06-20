---
name: test-and-review
description: Use this skill before finalizing any phase or pull request.
---

Review checklist:
- Backend starts.
- Frontend starts.
- Full demo flow works.
- No external SDK leaked into domain/application.
- FastCheck does not use LLM.
- DeepCheck is async or mock async.
- Agora has fallback.
- Dataset build uses ACCEPTED AudioSamples only.
- README demo commands are accurate.