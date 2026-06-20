
VoiceTurk MVP — Entity and State Machine
1. Entity Rule

The MVP has exactly 7 main entities:

User
Campaign
ScriptLine
RecordingItem
RecordingSession
AudioSample
DatasetVersion

Do not split these yet:

RecordingAttempt
ValidationReview
ProofRecord
SampleCheckResult
CampaignCoverage
2. Core Recording Rule

One ScriptLine × one TargetEmotion = one RecordingItem.

One RecordingItem needs one accepted AudioSample.

Example:

ScriptLines:

"Tôi chưa nhận được hàng."

Target emotions:

neutral
confused
impatient
angry

Generated RecordingItems:

line_001 × neutral
line_001 × confused
line_001 × impatient
line_001 × angry
3. User

Represents a system user.

Roles:

BUYER
CONTRIBUTOR
VALIDATOR
ADMIN

Fields:

user_id
role
name
email
status
created_at
4. Campaign

Represents a dataset request.

Fields:

campaign_id
buyer_id
name
domain
target_emotions
accent_targets
environment_targets
quality_rules
status
created_at
activated_at
completed_at

States:

DRAFT
PREVIEW_READY
ACTIVE
COLLECTION_COMPLETED
DATASET_READY
ARCHIVED
CANCELLED

Flow:
DRAFT -> PREVIEW_READY -> ACTIVE -> COLLECTION_COMPLETED -> DATASET_READY

5. ScriptLine

Represents a sentence/utterance buyer wants recorded.

Fields:

line_id
campaign_id
transcript
intent
context_brief
status
created_at

States:

DRAFT
APPROVED
DISABLED
6. RecordingItem

Represents one specific item to record.

RecordingItem = ScriptLine × TargetEmotion

Fields:

item_id
campaign_id
line_id
target_emotion
assigned_to
status
created_at
assigned_at
completed_at

States:

OPEN
ASSIGNED
REVIEW_PENDING
ACCEPTED
NEED_RETAKE
DISABLED

Main flow:
OPEN -> ASSIGNED -> REVIEW_PENDING -> ACCEPTED

Retake/error flow:
ASSIGNED -> OPEN
REVIEW_PENDING -> NEED_RETAKE
REVIEW_PENDING -> OPEN
NEED_RETAKE -> ASSIGNED

7. RecordingSession

Represents a contributor recording session.

Fields:

session_id
campaign_id
contributor_id
agora_session_id
status
started_at
ended_at

States:

STARTED
ACTIVE
COMPLETED
ABANDONED
EXPIRED

Flow:
STARTED -> ACTIVE -> COMPLETED

If session is abandoned:
RecordingItems assigned but without AudioSample should return to OPEN.

8. AudioSample

Represents official audio after FastCheck passes.

AudioSample is only created after backend FastCheck passes.

Fields:

sample_id
campaign_id
line_id
item_id
session_id
contributor_id
audio_path
duration_ms
transcript_snapshot
intent_snapshot
target_emotion_snapshot
accent
environment
loudness_db
speech_rate_wps
silence_ratio
pitch_summary
quality_score
fast_check_status
deep_check_status
validator_status
validator_id
validator_notes
reviewed_at
consent_version
status
created_at

States:

CHECKING
REVIEW_PENDING
ACCEPTED
REJECTED
NEED_RETAKE

Flow:
CHECKING -> REVIEW_PENDING -> ACCEPTED

Error/retake:
CHECKING -> NEED_RETAKE
CHECKING -> REJECTED
REVIEW_PENDING -> NEED_RETAKE
REVIEW_PENDING -> REJECTED

9. DatasetVersion

Represents an exported dataset package.

Fields:

dataset_version_id
campaign_id
version
sample_count
package_path
annotations_path
quality_report_path
data_card_path
manifest_path
license_path
manifest_hash
proof_network
proof_tx_signature
proof_status
status
created_at

States:

BUILDING
READY
PROOF_PENDING
VERIFIED
FAILED

Flow:
BUILDING -> READY -> PROOF_PENDING -> VERIFIED

10. Validator Decision Mapping

ACCEPT:

AudioSample.status = ACCEPTED
RecordingItem.status = ACCEPTED

REJECT:

AudioSample.status = REJECTED
RecordingItem.status = OPEN

NEED_RETAKE:

AudioSample.status = NEED_RETAKE
RecordingItem.status = NEED_RETAKE
11. Campaign Completion

When all required RecordingItems are ACCEPTED:

Campaign.status = COLLECTION_COMPLETED

Then buyer/admin can build DatasetVersion.
