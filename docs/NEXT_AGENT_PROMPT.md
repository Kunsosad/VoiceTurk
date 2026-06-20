# Next Agent Prompt

VoiceTurk’s post-precheck path is now deadline-bound and observable. Upload init and next-action time out after 10 seconds, presigned PUT after 30 seconds, upload complete after 20 seconds, and backend FastCheck after 15 seconds. MinIO presigning uses `S3_PUBLIC_BASE_URL`, bucket creation is development-only, and the Studio exposes a pipeline timeline plus terminal retry state.

Run `powershell -ExecutionPolicy Bypass -File .\scripts\smoke_test.ps1` first. For a credentialed integration check, start MinIO, run `scripts/configure_minio_cors.ps1`, set `OBJECT_STORAGE_PROVIDER=minio`, and run the backend tests with S3 environment variables.

Recommended next improvements:

1. Add Vitest/Testing Library state-machine tests with mocked timeout and PUT failures.
2. Move the recording state machine from `App.tsx` into a reducer/hook for easier deterministic testing.
3. Add credentialed MinIO CI and a health endpoint that reports bucket/browser-endpoint readiness.
4. Lazy-load Agora and replace ScriptProcessorNode with AudioWorklet.
