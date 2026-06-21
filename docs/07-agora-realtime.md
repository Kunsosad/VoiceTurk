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
ALLOW_COACH_FALLBACK=false
AGORA_APP_ID=<private value>
AGORA_APP_CERTIFICATE=<private value>
AGORA_CUSTOMER_ID=<private value>
AGORA_CUSTOMER_SECRET=<private value>
AGORA_AGENT_NAME=<published agent name>
AGORA_AGENT_PIPELINE_ID=<Studio Agent ID>
AGORA_AGENT_RTC_UID_BASE=900000
AGORA_AGENT_REMOTE_RTC_UIDS=*
AGORA_AGENT_REGION=
AGORA_AGENT_JOIN_TIMEOUT_SECONDS=10
AGORA_FEATURE_RTC=true
AGORA_FEATURE_RTM=true
AGORA_FEATURE_CONVOAI=true
```

The backend creates a per-session RTC channel, separate publisher tokens for contributor and agent UIDs, and calls the Agent Studio `/join` endpoint with Basic Auth. The frontend treats this response as source of truth. It joins the returned channel, publishes its microphone, subscribes and plays remote audio, and exposes the actual outcome as either:

- `Agora RTC · mic published`
- `browser microphone`

The voice-coach status is shown separately as waiting, connected, audio subscribed, or failed. In strict Agora mode, RTC/agent failures do not invoke Browser TTS. Browser TTS is only selected by `REALTIME_PROVIDER=browser_tts|mock` or the explicit escape hatch `ALLOW_COACH_FALLBACK=true`.

## ConvoAI lifecycle

The official `agent-quickstart-nextjs` source was inspected for lifecycle alignment. It confirms that the server starts/stops the managed agent, the client joins the same RTC channel, and agent readiness requires remote-user/runtime evidence rather than a successful start response alone.

CLI `0.2.4` cloned and configured the official Next.js quickstart in a temporary directory. Its dependency install and local doctor passed, the documented `pnpm dev` command was run, and the app returned HTTP 200. Browser interaction has not yet proved that the agent joins and completes a voice roundtrip.

`AgoraAgentStudioAdapter` calls `POST /api/conversational-ai-agent/v2/projects/{appid}/join` from the backend. It sends a unique runtime name derived from `AGORA_AGENT_NAME`, the Studio Agent ID (`pipeline_id`), runtime channel, dedicated agent UID, wildcard remote UID list, and agent RTC token. A successful REST response is only a start acknowledgement; the web client waits up to 10 seconds for the expected remote UID before declaring the agent connected.

Current runtime proof:

| Proof | Status |
| --- | --- |
| Project control plane | Pass with token warning |
| Official quickstart cloned/configured | Pass |
| Official quickstart doctor and HTTP startup | Pass |
| Backend RTC token generation with local credentials | Pass |
| Browser RTC join | Implemented; requires manual credentialed browser run |
| Browser microphone publish | Implemented; requires manual credentialed browser run |
| Agent Studio REST `/join` contract | Implemented and adapter-tested |
| Agent joins credentialed local channel | Requires manual credentialed browser run |
| Agent voice roundtrip | Requires manual credentialed browser run |

## Feedback ownership and fallback

DeepCheck stores `feedback_context` with measured evidence, backend decision, reason codes, target transcript, and constraints. Browser TTS may speak that message only in browser/mock mode or when fallback is explicitly enabled. Agora never creates an `AudioSample`, changes quality state, or accepts/rejects a sample; Validator remains the only final accept step.

## Manual RTC verification

1. Start the API with the private backend environment above and `DEEP_CHECK_WORKER_ENABLED=true`.
2. Start the web app and open Recording Studio.
3. Start a session and allow microphone permission.
4. Confirm the timeline reports `agora_rtc · joined=true · mic=true` and the UI shows `Agora RTC · mic published`.
5. Confirm backend logs `agora.agent.join.request` then `agora.agent.join.success` without tokens or secrets.
6. Confirm the client log shows the expected agent UID in `remote user joined` and `remote audio subscribed`.
7. Confirm the UI shows `Agora Agent Studio connected`, then speak and hear the published agent reply.
8. Invalidate the agent pipeline/name and confirm the session still starts but reports `Agora Agent Studio failed` with the real error and no Browser TTS speech.

## Probe workflow

1. Run `python services/api/scripts/probe_agora_agent_join.py` to validate config and call `/join` with tokens redacted.
2. Re-run with `--print-client-token` only for the interactive browser check.
3. Run `npm --prefix apps/web run dev` and open `http://localhost:5173/agora-agent-probe.html`.
4. Enter the emitted values, join, speak, and confirm `AGENT_JOINED` plus `AGENT_AUDIO_SUBSCRIBED` within 15 seconds.

The published Studio pipeline currently owns ASR/LLM/TTS configuration. VoiceTurk only starts it and joins RTC; no custom Backend LLM callback endpoint is wired in this repo.

## Remaining runtime gate

Automated tests mock Agora's REST boundary and cannot prove a credentialed media roundtrip. Run the manual steps above and confirm a new session in Agora Console Session History/Analytics. Explicit agent stop/status APIs are not wired in this slice; session completion still leaves RTC locally and relies on the published agent's configured idle lifecycle.
