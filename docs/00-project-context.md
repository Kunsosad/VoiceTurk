
VoiceTurk MVP — Project Context
1. What VoiceTurk Is

VoiceTurk is an MVP for guided Vietnamese prosody recording and dataset packaging.

The product helps buyers create structured voice/prosody datasets for Vietnamese voicebot, callbot, and AI customer service systems.

The MVP focuses on one narrow use case:

Vietnamese e-commerce customer support prosody dataset

Minimum intents:

order_status
delivery_delay
refund_request

Minimum target emotions:

neutral
confused
impatient
angry
2. What VoiceTurk Is Not

The MVP is not:

a general data marketplace
a payment/payout platform
a tokenomics demo
a full voicebot simulator
a blockchain storage system
a production-grade emotion recognition engine
3. User Roles

Buyer:

creates campaign
inputs script lines
selects target emotions
activates campaign
views coverage
builds dataset
verifies manifest/proof

Contributor:

selects available campaign
starts recording session
receives AI Coach instruction
records audio
retries if needed
completes session

Validator:

views review queue
listens to audio
checks transcript/emotion/context
accepts, rejects, or requests retake

Admin/Internal Operator:

can seed demo data
can build dataset
can verify proof
can inspect system state
4. MVP End-to-End Flow

Buyer creates Campaign
-> Buyer enters ScriptLines
-> Buyer selects TargetEmotions
-> Backend generates RecordingItems
-> Buyer activates Campaign
-> Contributor starts RecordingSession
-> Backend assigns RecordingItems
-> Coach gives instruction
-> Contributor records audio
-> Client pre-checks audio
-> Backend FastChecks audio
-> Backend creates AudioSample
-> DeepCheck mock moves sample to review
-> Validator accepts sample
-> RecordingItem becomes ACCEPTED
-> Campaign coverage increases
-> Dataset Builder exports package
-> Manifest hash is computed
-> Proof provider verifies manifest

5. Design Principle

The MVP must be demoable quickly, but the architecture must not be ruined.

Use mock providers when real integrations are slow.

Keep external services replaceable.

Backend owns business state.

Agora improves realtime experience but does not own dataset truth.
