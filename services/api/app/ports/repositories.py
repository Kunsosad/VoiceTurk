from abc import ABC, abstractmethod
from typing import Any, TypeVar

T = TypeVar("T")


class RepositoryPort(ABC):
    @abstractmethod
    def add(self, kind: str, entity: Any) -> None: ...

    @abstractmethod
    def get(self, kind: str, entity_id: str) -> Any | None: ...

    @abstractmethod
    def list(self, kind: str) -> list[Any]: ...

    @abstractmethod
    def delete(self, kind: str, entity_id: str) -> None: ...


class UnitOfWorkPort(ABC):
    repository: RepositoryPort
