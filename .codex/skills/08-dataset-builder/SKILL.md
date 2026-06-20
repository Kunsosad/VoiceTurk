name: dataset-builder
description: Use this skill when implementing dataset export, annotations.jsonl, quality report, data card, manifest, license, proof, or verify flow.
Dataset Builder Skill
Goal

Build a dataset package from accepted AudioSamples only.

Dataset Builder must not depend on Solana.

Solana or local proof must be handled through ProofProviderPort.

Input Rule

Only include:

AudioSample.status = ACCEPTED

Do not include:

CHECKING
REVIEW_PENDING
REJECTED
NEED_RETAKE
Package Structure

Create:

dataset_v{version}/
audio/
annotations.jsonl
quality_report.json
data_card.md
manifest.json
license.json

annotations.jsonl

Each line should include:

sample_id
audio_path
transcript
domain
intent
target_emotion
accent
environment
duration_ms
loudness_db
speech_rate_wps
silence_ratio
pitch_summary
quality_score
validator_status
consent_version
quality_report.json

Include:

campaign_id
dataset_version
sample_count
emotion_distribution
intent_distribution
average_quality_score
generated_at
data_card.md

Include:

dataset name
domain
intended use
collection method
labels
metadata fields
quality process
limitations
consent/license note
manifest.json

Include:

dataset_version_id
campaign_id
version
files
checksums
generated_at
Proof Rule

After manifest is created:

Compute manifest_hash.
Call ProofProviderPort.
Store proof result on DatasetVersion.

Allowed providers:

mock
local_hash
solana placeholder

Do not import Solana SDK into Dataset Builder.
