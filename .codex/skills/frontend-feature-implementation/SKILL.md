---
name: frontend-feature-implementation
description: Use this skill when implementing VoiceTurk frontend screens, recording flow, coach voice, or API integration.
---

Frontend rules:
- Keep UI simple and demo-first.
- Use role switch instead of auth.
- Use Browser MediaRecorder for recording.
- Use RealtimeCoachClient interface for coach voice.
- Provide BrowserTTS fallback when Agora is not configured.
- Do not let frontend invent backend state.
- Backend response is source of truth.