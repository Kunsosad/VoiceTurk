from collections import defaultdict
from typing import Any

from app.ports.repositories import RepositoryPort


class MemoryRepository(RepositoryPort):
    def __init__(self) -> None:
        self._data: dict[str, dict[str, Any]] = defaultdict(dict)

    def add(self, kind: str, entity: Any) -> None:
        values = entity if isinstance(entity, dict) else vars(entity)
        entity_id = next(value for key, value in values.items() if key.endswith("_id"))
        self._data[kind][entity_id] = entity

    def get(self, kind: str, entity_id: str) -> Any | None:
        return self._data[kind].get(entity_id)

    def list(self, kind: str) -> list[Any]:
        return list(self._data[kind].values())

    def delete(self, kind: str, entity_id: str) -> None:
        self._data[kind].pop(entity_id, None)
