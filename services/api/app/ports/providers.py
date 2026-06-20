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
    reason_code: str
    message_vi: str
    metadata: dict[str, Any]


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


class ProofProviderPort(ABC):
    @abstractmethod
    def issue_proof(self, dataset_version_id: str, manifest_hash: str) -> dict[str, str]: ...
    @abstractmethod
    def verify_proof(self, dataset_version_id: str, manifest_hash: str) -> bool: ...
