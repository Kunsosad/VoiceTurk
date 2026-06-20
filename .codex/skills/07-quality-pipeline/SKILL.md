name: quality-pipeline
description: Use this skill when implementing FastCheck, DeepCheck, audio metadata, retake decision, or sample status transitions.
Quality Pipeline Skill
Goal

Implement a cheap, deterministic MVP quality pipeline.

Pipeline:

Client Pre-check
-> Backend FastCheck
-> Backend DeepCheck
-> Validator Review

FastCheck Rule

FastCheck must be deterministic and cheap.

FastCheck must not use LLM.

FastCheck may check:

file exists
file size
duration
basic silence
basic loudness
clipping if easy
basic transcript match only if ASR adapter exists
FastCheck Output

FastCheck returns either:

RETAKE_NOW:

no official AudioSample should be created
RecordingItem remains ASSIGNED
frontend should retry same item

CONTINUE_NEXT:

create official AudioSample
AudioSample.status = CHECKING
RecordingItem.status = REVIEW_PENDING
frontend can move to next item
DeepCheck Rule

DeepCheck runs async.

For MVP, mock DeepCheck is acceptable.

DeepCheck may:

attach mock metadata
compute simple quality score
move AudioSample from CHECKING to REVIEW_PENDING
or mark NEED_RETAKE / REJECTED
Metadata Fields

AudioSample should include:

duration_ms
loudness_db
speech_rate_wps
silence_ratio
pitch_summary
quality_score
fast_check_status
deep_check_status

Mock values are acceptable for MVP if real audio analysis is not ready.

Validator Review

Validator only reviews:

AudioSample.status = REVIEW_PENDING

Decision mapping:

ACCEPT:

AudioSample.status = ACCEPTED
RecordingItem.status = ACCEPTED

REJECT:

AudioSample.status = REJECTED
RecordingItem.status = OPEN

NEED_RETAKE:

AudioSample.status = NEED_RETAKE
RecordingItem.status = NEED_RETAKE
