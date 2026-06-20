# Next Agent Prompt

VoiceTurk now has a unified operator workflow, SQLite persistence, local/MinIO object storage, upload init/complete promotion, decoded WAV FastCheck v2, queued heuristic DeepCheck, retakes, self-review, backend next-action, and a real Agora RTC adapter with Browser TTS fallback.

Start with `powershell -ExecutionPolicy Bypass -File .\scripts\smoke_test.ps1`. Preserve exactly seven core entities and all external SDK boundaries.

Recommended next improvements:

1. Lazy-load the Agora SDK to reduce the initial frontend bundle.
2. Replace ScriptProcessorNode with AudioWorklet while preserving WAV output and metric semantics.
3. Add a durable multi-process JobQueuePort adapter and scheduled worker loop.
4. Add a decoder adapter for WebM/Opus without introducing FFmpeg into domain/application.
5. Exercise Agora and MinIO in credentialed CI, including MinIO CORS and token expiry tests.
