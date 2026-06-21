# Agora Realtime Status

## Current project and CLI reality

- Agora CLI `0.2.4` is installed at `C:\Users\LENOVO\AppData\Local\Programs\Agora\bin\agora.exe`. The agent process may need that directory prepended to its local PATH; with it present, install doctor is healthy with no blocking issue.
- The bound project is `VoiceTurk`; RTC, RTM, and ConvoAI are enabled. App ID and App Certificate are present according to project diagnostics.
- `project doctor` is healthy with no blocking issue, but warns `TOKEN_CAPABILITY_DISABLED`.
- `.agora/project.json` contains non-secret repo binding metadata. `.agora.env.local` and `services/api/.env` are git-ignored and were populated through `agora project env write`; both contain non-empty credentials without exposing them to frontend code.

Never print, log, document, or commit the App Certificate.

## Verified code path

Set the backend environment:

```env
REALTIME_PROVIDER=agora
AGORA_APP_ID=<private value>
AGORA_APP_CERTIFICATE=<private value>
AGORA_REGION=global
AGORA_FEATURE_RTC=true
AGORA_FEATURE_RTM=true
AGORA_FEATURE_CONVOAI=true
```

The backend creates a per-session RTC publisher token and returns the provider, channel, token, UID, coach provider, and ConvoAI availability. The frontend treats this response as source of truth. It joins the returned channel, creates and publishes a microphone track, subscribes and plays remote audio, and exposes the actual outcome as either:

- `Agora RTC · mic published`
- `browser microphone`

The voice-coach status is shown separately as Agora ConvoAI, Browser TTS, Browser TTS fallback, or text only. An RTC exception cleans up any partial track/channel state and does not block recording.

## ConvoAI lifecycle

The official `agent-quickstart-nextjs` source was inspected for lifecycle alignment. It confirms that the server starts/stops the managed agent, the client joins the same RTC channel, and agent readiness requires remote-user/runtime evidence rather than a successful start response alone.

CLI `0.2.4` cloned and configured the official Next.js quickstart in a temporary directory. Its dependency install and local doctor passed, the documented `pnpm dev` command was run, and the app returned HTTP 200. Browser interaction has not yet proved that the agent joins and completes a voice roundtrip.

No custom `/join` payload or fake start/status/speak/stop implementation is included. `AgoraConvoAIUnavailableAdapter` is an explicit port boundary that returns `LIFECYCLE_NOT_VERIFIED`/`FALLBACK_REQUIRED`. Setting `REALTIME_PROVIDER=agora_convoai` fails configuration explicitly until lifecycle proof exists; use `REALTIME_PROVIDER=agora` for working RTC with Browser TTS fallback.

Current runtime proof:

| Proof | Status |
| --- | --- |
| Project control plane | Pass with token warning |
| Official quickstart cloned/configured | Pass |
| Official quickstart doctor and HTTP startup | Pass |
| Backend RTC token generation with local credentials | Pass |
| Browser RTC join | Implemented; requires manual credentialed browser run |
| Browser microphone publish | Implemented; requires manual credentialed browser run |
| ConvoAI agent joins channel | Not verified |
| Agent speaks feedback | Not verified |

## Feedback ownership and fallback

DeepCheck stores `feedback_context` with measured evidence, backend decision, reason codes, target transcript, and constraints. Retake actions return this context plus a deterministic Vietnamese message. Browser TTS speaks that message when ConvoAI is unavailable. Agora never creates an `AudioSample`, changes quality state, or accepts/rejects a sample; Validator remains the only final accept step.

## Manual RTC verification

1. Start the API with the private backend environment above and `DEEP_CHECK_WORKER_ENABLED=true`.
2. Start the web app and open Recording Studio.
3. Start a session and allow microphone permission.
4. Confirm the timeline reports `agora_rtc · joined=true · mic=true` and the UI shows `Agora RTC · mic published`.
5. Confirm voice-coach status is `Browser TTS fallback` while ConvoAI remains unavailable.
6. Disconnect or invalidate RTC configuration and confirm recording still works with Browser TTS/text fallback.

## Official ConvoAI baseline verification

The remaining baseline gates are interactive:

1. In the running official quickstart, open `http://localhost:3000`.
2. Select **Try it now**, grant microphone permission, and start a conversation.
3. Confirm the agent joins the same RTC channel and its audio is audible.
4. End the conversation and confirm the agent leaves cleanly.

Only after those runtime gates pass should the official start/status/speak/stop lifecycle be mapped into VoiceTurk.
