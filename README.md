# VoiceTurk Studio

VoiceTurk is a unified, coach-led Vietnamese prosody recording and dataset packaging MVP. One operator (`user_001`) creates campaigns, records, self-reviews, exports accepted samples, and verifies the manifest while the backend preserves separate `buyer_id`, `contributor_id`, and `validator_id` audit fields.

## Architecture

- FastAPI modular monolith with seven core domain entities and ports/adapters boundaries.
- SQLite persistence; local object storage by default, MinIO through an S3-compatible adapter.
- Deterministic decoded-audio FastCheck, queued heuristic DeepCheck, self-review, and accepted-only dataset export.
- React/Vite unified Studio with Agora RTC when configured and Browser TTS/text fallback.
- Agora owns realtime experience only. Object storage owns bytes only. Backend owns all business state.

## Start locally

```powershell
cd services/api
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -e ".[test]"
uvicorn app.main:app --reload --port 8000
```

```powershell
cd apps/web
pnpm install
pnpm dev
```

Open `http://localhost:5173`, choose **Campaign**, and click **Seed 20-item demo**. The guided Recording step automatically speaks the instruction, listens, pre-checks, uploads, waits for FastCheck, gives feedback, and advances without a Next button.

## Unified workflow

1. Campaign: create/generate/activate or seed the active demo.
2. Recording: start a session; coach-led state transitions and backend `next-action` drive tasks and retakes.
3. Review & Retake: process pending DeepChecks, inspect metrics/feedback, and self-review as `user_001`.
4. Dataset Export: package only ACCEPTED samples.
5. Verify: verify the stored manifest hash and receive MATCH/MISMATCH.

## Audio pipelines

Client pipeline checks microphone permission/device/track/mute, no speech after 7 seconds, duration 0.9–15 seconds, RMS below -45 dBFS, peak below -35 dBFS, silence ratio above 0.65, clipping above 0.02, and upload failures. It records 16-bit PCM WAV so no FFmpeg is required.

Backend FastCheck decodes WAV and checks integrity, size, PCM format, duration, RMS/peak dBFS, clipping, 20 ms-frame silence/speech ratios, speech duration, leading/trailing silence, estimated SNR, and a deterministic score. Hard failures create no AudioSample and no official object.

Passing files move from `tmp/audio/{session}/{item}/...` to `audio/{campaign}/{item}/{sample}.wav`. DeepCheck is queued in process, uses deterministic quality/prosody heuristics, and maps samples to REVIEW_PENDING, NEED_RETAKE, or REJECTED. `POST /deep-check/run-pending` processes/recover pending CHECKING samples without Redis.

## Agora

Frontend:

```env
NEXT_PUBLIC_REALTIME_PROVIDER=agora
NEXT_PUBLIC_AGORA_APP_ID=your-app-id
```

Backend:

```env
REALTIME_PROVIDER=agora
AGORA_APP_ID=your-app-id
AGORA_APP_CERTIFICATE=your-certificate
```

The backend issues an RTC token in the session response or through `POST /realtime/agora/token`. The frontend joins/publishes a microphone track with `agora-rtc-sdk-ng`; Browser TTS remains the coach voice. If Agora is disabled or cannot join, recording and Browser TTS/text continue without Agora. Never commit credentials.

## MinIO

Local storage remains the zero-configuration default. To use MinIO:

```env
OBJECT_STORAGE_PROVIDER=minio
S3_ENDPOINT_URL=http://localhost:9000
S3_PUBLIC_BASE_URL=http://localhost:9000
S3_BUCKET_NAME=voiceturk-dev
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_REGION=us-east-1
S3_SECURE=false
S3_PRESIGNED_EXPIRE_SECONDS=900
```

Start the optional local service with `docker compose up -d minio`. In development the adapter creates a missing bucket; staging/production fail clearly instead. `S3_ENDPOINT_URL` is used by the backend while `S3_PUBLIC_BASE_URL` signs browser-reachable URLs. They may differ when the backend uses `http://minio:9000` but the browser must use `http://localhost:9000`.

Configure local CORS after installing MinIO Client (`mc`):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\configure_minio_cors.ps1
```

This permits the localhost/127.0.0.1 frontend origins on ports 3000 and 5173, upload/read methods and preflight, all request headers, and exposes ETag/content headers. Local uploads use the same init/complete application flow via a backend PUT endpoint.

## Recording stuck after pre-check

Open the browser Network tab and the Studio debug timeline. A successful attempt shows:

```text
POST /audio/uploads/init
PUT {presigned MinIO/S3 URL}
POST /audio/uploads/complete
GET /recording-sessions/{id}/next-action
```

The frontend enforces 10-second upload-init/next-action deadlines, a 30-second PUT deadline, and a 20-second upload-complete deadline. Backend FastCheck has a 15-second deadline. A timeout moves the UI to `PIPELINE_ERROR` or returns `FAST_CHECK_TIMEOUT`; Retry keeps the same item.

Common causes:

1. Browser-unreachable signed host: `http://minio:9000` works inside Docker but not in the browser. Set `S3_PUBLIC_BASE_URL=http://localhost:9000`; URLs are signed with that host and are never rewritten afterward.
2. MinIO CORS: run the CORS script and confirm the frontend origin is listed. S3-compatible servers handle OPTIONS preflight from the configured PUT/GET/POST/HEAD rules.
3. Content-Type mismatch: upload init signs the actual Blob type and browser PUT sends that exact type.
4. Missing bucket: development auto-creates `S3_BUCKET_NAME`; staging/production intentionally fail.
5. Upload complete absent: inspect `UPLOAD_INIT_*` and `PRESIGNED_PUT_*` timeline events to locate the terminal step.
6. FastCheck timeout: inspect backend `voiceturk.pipeline` JSON logs for `FAST_CHECK_TIMEOUT`.
7. DeepCheck blocking: this is a bug—completion returns `CONTINUE_NEXT` immediately after enqueue; DeepCheck runs separately.

## Seed and checks

With the API running:

```powershell
python scripts/seed_demo.py
```

Run all backend, architecture, type, and build checks:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke_test.ps1
```

## Known limitations

- DeepCheck emotion/prosody output is explicitly heuristic, not scientific emotion recognition.
- The in-process queue is restart-recoverable from CHECKING samples but is not a multi-process production worker.
- MinIO and Agora code paths require external services/credentials and are not exercised by the default offline test.
- The Agora SDK increases the initial frontend bundle; lazy loading is a recommended follow-up.
- FastCheck supports 16-bit mono/stereo PCM WAV. Other containers require a future decoder adapter.
