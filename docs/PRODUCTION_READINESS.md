# VoiceTurk Production Readiness

## Status: MVP Pilot Ready

This document summarises the hardening changes applied and what remains out of scope for the MVP pilot.

---

## Architecture Integrity

| Boundary | Status | Notes |
|---|---|---|
| Domain has no FastAPI/SQLAlchemy/SDK imports | ✅ Verified | `test_architecture_boundaries` scans all domain + application source |
| Application has no Agora/S3/OpenAI SDK imports | ✅ Verified | Same test |
| FastCheck has no LLM dependency | ✅ Verified | Scan confirmed |
| Dataset Builder uses no Solana SDK | ✅ N/A | Proof provider is local-hash for MVP |
| External SDKs only in adapters | ✅ Verified | MinIO in `adapters.storage.minio`, Agora in `adapters.realtime.agora` |

---

## Auth & Identity

| Control | Status |
|---|---|
| Passwords hashed with bcrypt | ✅ |
| JWT-like HMAC tokens with expiry | ✅ |
| Login / register / me / logout endpoints | ✅ |
| `contributor_id` derived from JWT token, not client body | ✅ Fixed in this hardening |
| `validator_id` derived from JWT token, not client body | ✅ Fixed in this hardening |
| RBAC: buyer-only vs contributor-only route guards | ✅ |
| Auth secret key validated (≥32 chars in staging/prod) | ✅ Config validator |
| Cookie settings validated for staging/prod | ✅ `cookie_secure=true` required outside dev |
| CORS origins validated (no localhost in staging/prod) | ✅ Config validator |

---

## Recording Pipeline

| Check | Status |
|---|---|
| Client pre-check (mic permission, blob, duration, RMS, clipping, silence) | ✅ |
| Backend upload init / presigned PUT / complete flow | ✅ |
| FastCheck: decoded PCM WAV, deterministic, no LLM, 15s timeout | ✅ |
| Tmp → official audio promotion on FastCheck pass | ✅ |
| Failed uploads cleaned up when `KEEP_FAILED_UPLOADS=false` | ✅ |
| DeepCheck: async, queued, non-blocking | ✅ |
| `POST /deep-check/run-pending` recovers CHECKING samples | ✅ |
| Session state machine: STARTED → ACTIVE → COMPLETED | ✅ |
| Items released on session complete | ✅ |

---

## Data Quality & Export

| Check | Status |
|---|---|
| Validator accepts only `REVIEW_PENDING` samples | ✅ |
| Dataset built from `ACCEPTED` samples only | ✅ |
| manifest.json + checksums + annotations.jsonl + data_card.md + quality_report.json | ✅ |
| Manifest hash stored and verifiable | ✅ |
| Proof via local hash (Solana devnet opt-in) | ✅ |

---

## Configuration Checklist (deployment)

```env
# Required for staging/production
APP_ENV=production
AUTH_SECRET_KEY=<min-32-char-random-secret>
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# Object storage (local or MinIO/S3)
OBJECT_STORAGE_PROVIDER=minio        # or local
S3_ENDPOINT_URL=http://minio:9000
S3_PUBLIC_BASE_URL=https://minio.yourdomain.com
S3_BUCKET_NAME=voiceturk
S3_ACCESS_KEY_ID=<key>
S3_SECRET_ACCESS_KEY=<secret>
S3_REGION=us-east-1
S3_SECURE=true

# Optional realtime (Agora)
REALTIME_PROVIDER=agora              # or browser_tts
AGORA_APP_ID=<id>
AGORA_APP_CERTIFICATE=<cert>

DATABASE_URL=sqlite:///./voiceturk.db
```

---

## Known MVP Limitations

- **API-process worker**: DeepCheck automatically scans durable CHECKING state and survives queue loss/restarts, but a true durable queue/claim mechanism is recommended for multi-process production.
- **SQLite**: Works for pilot but does not support concurrent writes well. PostgreSQL recommended for multi-user load.
- **ASR/prosody unavailable**: DeepCheck currently measures technical audio only and explicitly marks transcript, alignment, and emotion/prosody checks unavailable.
- **FastCheck supports 16-bit mono/stereo PCM WAV only**: Other containers need a future decoder adapter.
- **Agora bundle size**: The Agora SDK is included in the main bundle. Lazy loading is a recommended follow-up.
- **Single validator**: The MVP uses self-review (buyer acts as validator). Multi-reviewer workflow is out of scope.

---

## Running the Test Suite

```powershell
python -m pytest tests/ -v --basetemp="./tmp_pytest"
```

Expected: 8 passed, 1 skipped (MinIO integration)

The `test_architecture_boundaries` test performs static analysis of all Python source files in `domain/` and `application/` to ensure no forbidden SDK imports are present.
