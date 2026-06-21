# Recording Quality Pipeline

VoiceTurk keeps quality decisions backend-owned. Browser Pre-check blocks obvious local failures without uploading. Backend FastCheck synchronously decodes WAV PCM and applies deterministic technical gates; only a pass promotes temporary audio and creates an `AudioSample(CHECKING)`. The backend DeepCheck worker then scans durable `CHECKING` state, recomputes measured technical evidence, and sends viable samples to `REVIEW_PENDING`. Only Validator review can accept a sample.

## Worker operation

- `DEEP_CHECK_WORKER_ENABLED=true` starts the API-process worker.
- `DEEP_CHECK_POLL_INTERVAL_SECONDS=3` controls polling.
- `DEEP_CHECK_BATCH_SIZE=10` caps each scan.
- Startup performs a recovery scan, so loss of the in-memory queue or an API restart does not strand durable `CHECKING` samples.
- Processing is state-idempotent and guarded in-process. Temporary failures remain `CHECKING` with `RETRY_PENDING`; missing official audio and decode failure are non-recoverable.
- `POST /deep-check/run-pending` remains an admin/manual fallback and calls the same application service. The recording frontend does not call it.

No OpenAI, LLM, or ASR is used. DeepCheck explicitly emits `ASR_NOT_CONFIGURED`, `TEXT_CHECK_NOT_AVAILABLE`, and `PROSODY_NOT_CHECKED`; it never invents a transcript, WER, or emotion match.

DeepCheck also persists a structured `feedback_context` containing the backend decision, reason codes, target text, available measured metrics, and coach constraints. A retake action returns that context with a deterministic Vietnamese template. Coach delivery never changes the backend decision or adds reasons; strict Agora mode does not silently substitute Browser TTS.

## Scientific traceability matrix

Thresholds are pilot starting points guided by the research report, not universal limits prescribed by ITU. They require calibration with validator-labelled VoiceTurk audio.

| Check | Layer | Metric | Formula / method | Threshold | Decision type | Scientific basis | Code location | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blob and duration sanity | PRE_CHECK | bytes, duration | Blob size and recorder duration | non-empty; 0.9–15 s | HARD_GATE | Signal sanity; engineering pilot threshold | `apps/web/src/features/recording/precheck.ts` | Type/build; browser test infra not present |
| Level sanity | PRE_CHECK | RMS/peak dBFS | Recorder WebAudio metrics | RMS ≥ -45, peak ≥ -35 dBFS | HARD_GATE | ITU-T P.56 concept; pilot threshold | `precheck.ts` | Type/build |
| Silence/activity | PRE_CHECK | silence ratio | Recorder frame activity | silence ≤ 0.65 | HARD_GATE | VAD/speech activity detection | `precheck.ts` | Type/build |
| Decode/integrity | FAST_CHECK | PCM header/samples | Python WAV decode, PCM16 mono/stereo | must decode | HARD_GATE | Deterministic file integrity | `adapters/check/local.py` | corrupt/empty/unsupported WAV |
| Duration | FAST_CHECK | milliseconds | samples / sample rate | 0.6–30 s | HARD_GATE | Prompt-capture sanity; MVP hard-fail threshold | `local.py`, `core/config.py` | short and valid WAV |
| Active RMS | FAST_CHECK | dBFS | `20 log10(active level / 32768)` | fail below -50; warn from -50 to -42 | HARD_GATE / SOFT_WARN | P.56 active-level concept; MVP threshold | `local.py` | hard-low and borderline-low WAV |
| Clipping | FAST_CHECK | clipped sample ratio | `count(abs(x) ≥ 32439) / N` | fail above 0.03; warn from 0.02 to 0.03 | HARD_GATE / SOFT_WARN | BS.1770 true-peak motivation; sample-peak proxy pending oversampling | `local.py` | clipped and borderline waveform |
| Speech/silence | FAST_CHECK | active frame ratio | 20 ms energy frames at -55 dBFS | fail below 0.15; warn at 0.15–0.30 and for long silence | HARD_GATE / SOFT_WARN | VAD/P.56 active speech concept | `local.py` | no-speech and borderline-activity WAV |
| Technical evidence | DEEP_CHECK | duration, RMS, clipping, activity, SNR proxy | Re-decode official audio and recompute metrics | severe: <0.5 s or clipping >0.10; borderline configured in adapter | HARD_GATE / SOFT_WARN | P.56, VAD, energy SNR; pilot thresholds | `local.py` | pass, borderline, missing/decode/recovery |
| Quality score | DEEP_CHECK | measured components | 0.55 technical + 0.30 activity + 0.15 noise | informational; decision uses explicit rules | ADVISORY | Composite of measured evidence; needs calibration | `local.py` | pass/borderline checks |
| Transcript/WER | DEEP_CHECK | WER | Levenshtein word errors / reference words | unavailable until real ASR | LOG_ONLY | NIST WER | `adapters/check/text.py` | exact/substitution/deletion/insertion |
| Prosody/emotion | DEEP_CHECK | none | Explicitly not checked | no gate | LOG_ONLY | GeMAPS/F0 model integration pending | `local.py` | unavailable flag asserted |

FastCheck intentionally does not gate transcript confidence, text match, prosody, emotion, moderate noise, or speech rate. Those signals are warnings or later-stage evidence. Upload completion is idempotent by `client_attempt_id`/upload identity: a completed retry returns the cached response and sample, while a processing attempt returns `UPLOAD_STILL_PROCESSING` without creating a duplicate.

## What is still not scientifically implemented

- No real ASR, so transcript matching and WER are not run; only the tested WER utility is ready.
- No forced/CTC alignment, keyword coverage, calibrated ASR confidence, or real speech-rate analysis.
- No F0, GeMAPS/eGeMAPS, or validated prosody/emotion classifier. Target emotion never changes score or state.
- RMS, sample peak, energy VAD, and SNR are lightweight proxies; P.56 active level, BS.1770 LUFS/true peak, and robust VAD/SNR remain future adapters.
- Thresholds are pilot starting points and need calibration against real recordings and Validator labels.
- The worker is single-process MVP infrastructure; multi-process deployment needs a durable queue/claim mechanism.
- Agora Agent Studio `/join` is adapter-tested; credentialed RTC voice roundtrip still requires the documented live probe. Strict Agora failures are surfaced and do not invoke Browser TTS.
