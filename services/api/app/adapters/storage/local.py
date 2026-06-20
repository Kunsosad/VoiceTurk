import shutil
from io import BufferedIOBase
from pathlib import Path
from typing import Any, BinaryIO

from app.ports.providers import ObjectStoragePort


class LocalStorageAdapter(ObjectStoragePort):
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, object_key: str) -> Path:
        path = (self.root / object_key).resolve()
        if self.root not in path.parents:
            raise ValueError("Invalid object key")
        return path

    def diagnostics(self) -> dict[str, Any]:
        return {"provider": "local", "endpoint_url": str(self.root), "public_base_url": None,
                "bucket": None, "region": None, "warnings": []}

    def create_presigned_put_url(self, object_key: str, content_type: str, expires_seconds: int = 900) -> str | None:
        return None

    def create_presigned_get_url(self, object_key: str, expires_seconds: int = 900) -> str | None:
        return None

    def put_object(self, object_key: str, data: bytes | BinaryIO, content_type: str) -> None:
        path = self._path(object_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("wb") as target:
            if isinstance(data, bytes):
                target.write(data)
            else:
                shutil.copyfileobj(data, target)

    def get_object(self, object_key: str) -> bytes:
        return self._path(object_key).read_bytes()

    def get_object_metadata(self, object_key: str) -> dict[str, Any]:
        path = self._path(object_key)
        return {"size_bytes": path.stat().st_size, "object_key": object_key}

    def copy_object(self, source_key: str, dest_key: str) -> None:
        target = self._path(dest_key)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(self._path(source_key), target)

    def delete_object(self, object_key: str) -> None:
        self._path(object_key).unlink(missing_ok=True)

    def object_exists(self, object_key: str) -> bool:
        return self._path(object_key).is_file()

    def get_public_or_signed_url(self, object_key: str) -> str | None:
        return None
