name: recording-and-agora
description: Use this skill when implementing contributor recording flow, MediaRecorder, Agora SDK integration, Browser TTS fallback, or AI Voice Coach behavior.
Recording and Agora Skill
Goal

Implement the contributor recording experience without making Agora the source of truth.

Agora is only a realtime voice/coach layer.

Backend owns:

task assignment
sample creation
QC
validation
retake
dataset
proof
Required Frontend Interface

Create a RealtimeCoachClient interface:

join(input)
speak(message)
setCurrentTaskContext(context)
leave()

Required implementations:

MockRealtimeCoachClient
BrowserTTSCoachClient
AgoraRealtimeCoachClient
Fallback Rule

The MVP must work without Agora credentials.

Fallback order:

AgoraRealtimeCoachClient if env is configured
BrowserTTSCoachClient
Text-only coach message
Agora May Receive

Agora may receive:

session_id
item_id
transcript
target_emotion
context_brief
message_vi
Agora Must Not Receive

Agora should not receive:

full campaign
full dataset
validation decision
manifest/proof data
core state machine logic
Agora Must Not Decide

Agora must not decide:

whether AudioSample is created
whether sample passes FastCheck
whether sample needs retake
whether sample is accepted
whether dataset is ready
Recording Flow

Contributor flow:

Frontend calls backend to start RecordingSession.
Backend returns session_id, items, and optional Agora info.
Frontend joins coach provider.
Frontend displays current RecordingItem.
Coach speaks instruction.
Contributor records audio using Browser MediaRecorder.
Frontend runs basic pre-check.
Frontend uploads audio to backend.
Backend runs FastCheck.
Backend returns RETAKE_NOW or CONTINUE_NEXT.
Coach speaks backend message.
Frontend moves to next item only when backend says continue.
Client Pre-check

Check:

microphone permission
audio blob exists
duration is not too short
upload did not fail

If pre-check fails:

do not create AudioSample
do not call validator flow
ask user to retry same item
Implementation Notes

Use Agora SDK only in:

apps/web/src/integrations/realtime/AgoraRealtimeCoachClient.ts

Do not import Agora SDK in:

backend domain
backend application
backend use cases
backend dataset builder
