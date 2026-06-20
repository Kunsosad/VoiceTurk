name: backend-usecase
description: Use this skill when implementing FastAPI backend use cases for campaigns, recording, audio, validation, dataset build, or proof.
Backend Use Case Skill
General Pattern

Each use case should:

Validate input.
Load required entities through repository ports.
Apply domain policy/state transition.
Persist changes through repository ports.
Call integration only through ports.
Return DTO/schema response.
Do Not

Do not:

put business logic in routers
import concrete adapters inside use cases
bypass state transition policy
use LLM in FastCheck
create extra entities without explicit instruction
call Agora from core recording logic
call Solana from Dataset Builder
Campaign Use Cases

Implement:

create_campaign
generate_recording_items
activate_campaign
get_campaign_detail
get_campaign_coverage

Rules:

Campaign starts DRAFT
RecordingItems are generated from ScriptLine × TargetEmotion
Campaign becomes PREVIEW_READY after item generation
Campaign becomes ACTIVE after activation
Recording Use Cases

Implement:

start_recording_session
assign_recording_items
get_session_items
complete_recording_session
abandon_recording_session

Rules:

assign only RecordingItem.OPEN
assigned items become ASSIGNED
abandoned session returns unrecorded assigned items to OPEN
Audio Use Cases

Implement:

submit_audio
run_fast_check
create_audio_sample_after_fast_check
trigger_deep_check

Rules:

if FastCheck fails, do not create official AudioSample
if FastCheck passes, create AudioSample CHECKING
RecordingItem becomes REVIEW_PENDING
DeepCheck runs async or mock async
Validation Use Cases

Implement:

get_review_queue
review_audio_sample

Rules:

validator reviews only REVIEW_PENDING samples
ACCEPT maps sample/item to ACCEPTED
REJECT maps sample to REJECTED and item to OPEN
NEED_RETAKE maps sample/item to NEED_RETAKE
Dataset Use Cases

Implement:

request_dataset_build
verify_dataset_manifest

Rules:

use only ACCEPTED AudioSamples
create dataset package files
compute manifest hash
call ProofProviderPort
