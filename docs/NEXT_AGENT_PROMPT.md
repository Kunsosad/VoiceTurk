# Next Agent Prompt

VoiceTurk's post-precheck path is deadline-bound, observable, and locally verified against MinIO. The API loads the repository-root `.env`; `GET /debug/storage/health` and Studio's Storage Probe provide sanitized development diagnostics. Backend next-action returns decision counts/reasons and cannot complete a session while recordable or submitted work remains.

Run `python scripts/check_minio_connection.py`, then `powershell -ExecutionPolicy Bypass -File .\scripts\smoke_storage_upload.ps1` with the API running. Use the development Storage Probe in the Campaign tab for the final browser-origin check. Never print root `.env` credentials.

Recommended next improvements:

1. Add Vitest/Testing Library state-machine tests with mocked timeout and PUT failures.
2. Move the recording state machine from `App.tsx` into a reducer/hook for deterministic testing.
3. Add credentialed MinIO CI and browser automation for the Storage Probe.
4. Lazy-load Agora and replace ScriptProcessorNode with AudioWorklet.
