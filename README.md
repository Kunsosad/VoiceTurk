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
S3_BUCKET_NAME=voiceturk
S3_ACCESS_KEY_ID=voiceturk
S3_SECRET_ACCESS_KEY=voiceturk-secret
S3_REGION=us-east-1
S3_PUBLIC_BASE_URL=
S3_SECURE=false
```

Start the optional local service with `docker compose up -d minio`. The adapter checks/creates the bucket and returns presigned PUT/GET URLs. Configure MinIO bucket CORS to allow PUT from `http://localhost:5173`. Local uploads use the same init/complete application flow via a backend PUT endpoint.

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
