import pickle
import sqlite3
from dataclasses import MISSING, fields, is_dataclass
from pathlib import Path
from threading import RLock
from typing import Any

from app.ports.repositories import RepositoryPort


class SQLiteRepository(RepositoryPort):
    """Small durable repository adapter for trusted local MVP state.

    Pickled payloads keep persistence infrastructure out of the seven domain entities.
    A future SQLAlchemy adapter can replace this through the same repository port.
    """

    def __init__(self, database_path: Path) -> None:
        database_path.parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(database_path, check_same_thread=False)
        self.connection.execute("PRAGMA journal_mode=WAL")
        self.connection.execute("CREATE TABLE IF NOT EXISTS entities (kind TEXT NOT NULL, entity_id TEXT NOT NULL, payload BLOB NOT NULL, PRIMARY KEY(kind, entity_id))")
        self.connection.commit()
        self.lock = RLock()

    def add(self, kind: str, entity: Any) -> None:
        values = entity if isinstance(entity, dict) else vars(entity)
        entity_id = next(value for key, value in values.items() if key.endswith("_id"))
        with self.lock:
            self.connection.execute("INSERT INTO entities(kind, entity_id, payload) VALUES(?, ?, ?) ON CONFLICT(kind, entity_id) DO UPDATE SET payload=excluded.payload",
                                    (kind, entity_id, pickle.dumps(entity)))
            self.connection.commit()

    def get(self, kind: str, entity_id: str) -> Any | None:
        with self.lock:
            row = self.connection.execute("SELECT payload FROM entities WHERE kind=? AND entity_id=?", (kind, entity_id)).fetchone()
        return self._hydrate(pickle.loads(row[0])) if row else None

    def list(self, kind: str) -> list[Any]:
        with self.lock:
            rows = self.connection.execute("SELECT payload FROM entities WHERE kind=? ORDER BY rowid", (kind,)).fetchall()
        return [self._hydrate(pickle.loads(row[0])) for row in rows]

    def delete(self, kind: str, entity_id: str) -> None:
        with self.lock:
            self.connection.execute("DELETE FROM entities WHERE kind=? AND entity_id=?", (kind, entity_id))
            self.connection.commit()

    @staticmethod
    def _hydrate(entity: Any) -> Any:
        """Apply newly-added dataclass defaults to trusted local records from older MVP versions."""
        if not is_dataclass(entity):
            return entity
        for value in fields(entity):
            if hasattr(entity, value.name):
                continue
            if value.default is not MISSING:
                setattr(entity, value.name, value.default)
            elif value.default_factory is not MISSING:
                setattr(entity, value.name, value.default_factory())
        return entity
