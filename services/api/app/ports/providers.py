from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO

from app.domain.entities import AudioSample


@dataclass
class FastCheckResult:
    passed: bool
    reason_code: str
    message_vi: str


class ObjectStoragePort(ABC):
    @abstractmethod
    def save(self, name: str, source: BinaryIO) -> Path: ...


class FastCheckPort(ABC):
    @abstractmethod
    def check(self, path: Path, duration_ms: int, content_type: str | None) -> FastCheckResult: ...


class DeepCheckPort(ABC):
    @abstractmethod
    def enrich(self, sample: AudioSample) -> None: ...


class ProofProviderPort(ABC):
    @abstractmethod
    def issue_proof(self, dataset_version_id: str, manifest_hash: str) -> dict[str, str]: ...

    @abstractmethod
    def verify_proof(self, dataset_version_id: str, manifest_hash: str) -> bool: ...

