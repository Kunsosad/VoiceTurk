from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Any

from .enums import (
    AudioSampleStatus, CampaignStatus, DatasetVersionStatus, RecordingItemStatus,
    RecordingSessionStatus, ScriptLineStatus, UserRole,
)


def now() -> datetime:
    return datetime.now(UTC)


class Entity:
    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class User(Entity):
    user_id: str
    role: UserRole
    name: str
    email: str
    status: str = "ACTIVE"
    created_at: datetime = field(default_factory=now)


@dataclass
class Campaign(Entity):
    campaign_id: str
    buyer_id: str
    name: str
    domain: str
    target_emotions: list[str]
    accent_targets: list[str] = field(default_factory=list)
    environment_targets: list[str] = field(default_factory=list)
    quality_rules: dict[str, Any] = field(default_factory=dict)
    status: CampaignStatus = CampaignStatus.DRAFT
    created_at: datetime = field(default_factory=now)
    activated_at: datetime | None = None
    completed_at: datetime | None = None


@dataclass
class ScriptLine(Entity):
    line_id: str
    campaign_id: str
    transcript: str
    intent: str
    context_brief: str
    status: ScriptLineStatus = ScriptLineStatus.DRAFT
    created_at: datetime = field(default_factory=now)


@dataclass
class RecordingItem(Entity):
    item_id: str
    campaign_id: str
    line_id: str
    target_emotion: str
    assigned_to: str | None = None
    status: RecordingItemStatus = RecordingItemStatus.OPEN
    created_at: datetime = field(default_factory=now)
    assigned_at: datetime | None = None
    completed_at: datetime | None = None


@dataclass
class RecordingSession(Entity):
    session_id: str
    campaign_id: str
    contributor_id: str
    agora_session_id: str | None = None
    status: RecordingSessionStatus = RecordingSessionStatus.STARTED
    started_at: datetime = field(default_factory=now)
    ended_at: datetime | None = None


@dataclass
class AudioSample(Entity):
    sample_id: str
    campaign_id: str
    line_id: str
    item_id: str
    session_id: str
    contributor_id: str
    audio_path: str
    duration_ms: int
    transcript_snapshot: str
    intent_snapshot: str
    target_emotion_snapshot: str
    accent: str = "unspecified"
    environment: str = "quiet"
    loudness_db: float | None = None
    speech_rate_wps: float | None = None
    silence_ratio: float | None = None
    pitch_summary: str | None = None
    quality_score: float | None = None
    sample_rate: int | None = None
    channels: int | None = None
    peak_dbfs: float | None = None
    clipping_ratio: float | None = None
    speech_ratio: float | None = None
    speech_duration_ms: int | None = None
    leading_silence_ms: int | None = None
    trailing_silence_ms: int | None = None
    estimated_snr_db: float | None = None
    file_size_bytes: int | None = None
    audio_container: str | None = None
    fast_check_score: float | None = None
    fast_check_status: str = "PASSED"
    deep_check_status: str = "PENDING"
    deep_check_reason_code: str | None = None
    deep_check_message_vi: str | None = None
    deep_checked_at: datetime | None = None
    validator_status: str | None = None
    validator_id: str | None = None
    validator_notes: str | None = None
    reviewed_at: datetime | None = None
    consent_version: str = "mvp-v1"
    status: AudioSampleStatus = AudioSampleStatus.CHECKING
    created_at: datetime = field(default_factory=now)


@dataclass
class DatasetVersion(Entity):
    dataset_version_id: str
    campaign_id: str
    version: str
    sample_count: int = 0
    package_path: str | None = None
    annotations_path: str | None = None
    quality_report_path: str | None = None
    data_card_path: str | None = None
    manifest_path: str | None = None
    license_path: str | None = None
    manifest_hash: str | None = None
    proof_network: str | None = None
    proof_tx_signature: str | None = None
    proof_status: str | None = None
    status: DatasetVersionStatus = DatasetVersionStatus.BUILDING
    created_at: datetime = field(default_factory=now)
