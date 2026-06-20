# VoiceTurk MVP

VoiceTurk is a local-first MVP for guided Vietnamese prosody recording and dataset packaging. It proves the full flow from buyer campaign creation through contributor recording, validator review, dataset export, and manifest verification.

## Architecture

- FastAPI modular monolith with domain, application, ports, adapters, and composition layers.
- React/Vite Web2 frontend with Buyer, Contributor, and Validator role switching.
- In-memory repository, local audio/export storage, deterministic FastCheck, mock DeepCheck, Browser TTS, and local-hash proof.
- Exactly seven core entities. External provider SDKs are absent from domain and application code.

## Prerequisites

- Python 3.11+
- Node.js 20+
- pnpm (npm may also be used)

## Run the backend

```powershell
cd services/api
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -e ".[test]"
uvicorn app.main:app --reload --port 8000
```

Runtime data is written to `services/api/storage/` and `services/api/exports/` by default.

## Run the frontend

In another terminal:

```powershell
cd apps/web
pnpm install
pnpm dev
```

Open `http://localhost:5173`. Copy `.env.example` to `.env` only when changing defaults.

## Seed demo data

With the backend running:

```powershell
python scripts/seed_demo.py
```

This creates three demo users and an active `ecommerce_cskh` campaign with five script lines × four emotions = 20 recording items. The endpoint is idempotent for the current API process. You can also click **Seed active demo** in the Buyer UI.

## Run checks and smoke test

```powershell
cd services/api
python -m pytest -q -p no:cacheprovider

cd ../../apps/web
pnpm run typecheck
pnpm run build
```

The backend test executes the complete API flow, including FastCheck retake/pass branches, mock DeepCheck, validation, coverage, dataset file creation, and manifest verification.

Or run both suites from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke_test.ps1
```

## Demo flow

1. Buyer seeds or creates a campaign, generates items, and activates it.
2. Contributor starts a session, follows the coach, records in the browser, and uploads audio.
3. Validator refreshes the queue, plays the audio, and accepts/rejects/requests a retake.
4. Buyer checks coverage, builds a dataset from accepted samples, and verifies its manifest hash.

## Mocked and placeholder integrations

- DeepCheck produces deterministic mock acoustic metadata in a background task.
- Browser speech synthesis is the default coach; text remains visible when TTS is unavailable.
- The Agora adapter is a stable placeholder with no SDK dependency.
- Local-hash proof is functional. Solana, S3/MinIO, ASR, LLM, Redis, and real auth are intentionally not implemented.

## MVP limitations

- Persistence is process-local; restarting the API clears business state, though stored audio/exports remain on disk.
- FastCheck validates duration, file size, MIME type, and presence but does not decode audio frames.
- Dataset builds are synchronous and version uniqueness is not enforced.
- Agora is not connected; the MVP always chooses Browser TTS or text-only coaching.
