from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, BinaryIO

from app.domain.entities import AudioSample
from app.domain.enums import DeepCheckDecision


@dataclass
class FastCheckResult:
    passed: bool
    reason_code: str
    message_vi: str
    severity: str
    metrics: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


@dataclass
class DeepCheckResult:
    decision: DeepCheckDecision
    quality_score: float
    reason_codes: list[str]
    technical_metrics: dict[str, Any] = field(default_factory=dict)
    transcript_metrics: dict[str, Any] = field(default_factory=dict)
    prosody_metrics: dict[str, Any] = field(default_factory=dict)
    checks_available: dict[str, bool] = field(default_factory=dict)
    score_components: dict[str, float | None] = field(default_factory=dict)
    feedback_vi: str = ""
    feedback_context: dict[str, Any] = field(default_factory=dict)

    @property
    def reason_code(self) -> str:
        return self.reason_codes[0] if self.reason_codes else "DEEP_CHECK_COMPLETED"


class ObjectStoragePort(ABC):
    @abstractmethod
    def diagnostics(self) -> dict[str, Any]: ...
    @abstractmethod
    def create_presigned_put_url(self, object_key: str, content_type: str, expires_seconds: int = 900) -> str | None: ...
    @abstractmethod
    def create_presigned_get_url(self, object_key: str, expires_seconds: int = 900) -> str | None: ...
    @abstractmethod
    def put_object(self, object_key: str, data: bytes | BinaryIO, content_type: str) -> None: ...
    @abstractmethod
    def get_object(self, object_key: str) -> bytes: ...
    @abstractmethod
    def get_object_metadata(self, object_key: str) -> dict[str, Any]: ...
    @abstractmethod
    def copy_object(self, source_key: str, dest_key: str) -> None: ...
    @abstractmethod
    def delete_object(self, object_key: str) -> None: ...
    @abstractmethod
    def object_exists(self, object_key: str) -> bool: ...
    @abstractmethod
    def get_public_or_signed_url(self, object_key: str) -> str | None: ...


class FastCheckPort(ABC):
    @abstractmethod
    def check(self, data: bytes, filename: str, content_type: str | None,
              client_metrics: dict[str, Any] | None = None) -> FastCheckResult: ...


class DeepCheckPort(ABC):
    @abstractmethod
    def analyze(self, sample: AudioSample, data: bytes) -> DeepCheckResult: ...


class JobQueuePort(ABC):
    @abstractmethod
    def enqueue(self, job_id: str) -> bool: ...
    @abstractmethod
    def pop(self) -> str | None: ...
    @abstractmethod
    def size(self) -> int: ...


class RealtimeTokenPort(ABC):
    @abstractmethod
    def configured(self) -> bool: ...
    @abstractmethod
    def issue_token(self, channel: str, uid: str, role: str, expires_seconds: int = 3600) -> dict[str, Any]: ...


@dataclass
class CoachVoiceResult:
    available: bool
    provider: str
    status: str
    message: str = ""
    agent_rtc_uid: str | None = None
    agent_session_id: str | None = None
    error_code: str | None = None
    http_status: int | None = None
    response_summary: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {"available": self.available, "provider": self.provider, "status": self.status,
                "message": self.message, "agent_rtc_uid": self.agent_rtc_uid,
                "agent_session_id": self.agent_session_id, "error_code": self.error_code,
                "http_status": self.http_status, "response_summary": self.response_summary}


class CoachVoicePort(ABC):
    """Boundary for an optional managed voice agent; never owns sample state."""

    @abstractmethod
    def configured(self) -> bool: ...
    @abstractmethod
    def agent_rtc_uid(self, session_id: str, contributor_rtc_uid: str) -> str: ...
    @abstractmethod
    def join_agent(self, session_id: str, channel: str, agent_rtc_uid: str, token: str, contributor_rtc_uid: str | None = None) -> CoachVoiceResult: ...


class ProofProviderPort(ABC):
    @abstractmethod
    def issue_proof(self, dataset_version_id: str, manifest_hash: str) -> dict[str, str]: ...
    @abstractmethod
    def verify_proof(self, dataset_version_id: str, manifest_hash: str) -> bool: ...
