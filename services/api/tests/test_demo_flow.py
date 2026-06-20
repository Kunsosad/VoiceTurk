import math
import os
import struct
import wave
from io import BytesIO
from pathlib import Path

from fastapi.testclient import TestClient
import pytest

from app.adapters.check.local import HeuristicDeepCheckAdapter, RuleBasedFastCheckAdapter
from app.adapters.persistence.memory import MemoryRepository
from app.adapters.persistence.sqlite import SQLiteRepository
from app.adapters.proof.local_hash import LocalHashProofAdapter
from app.adapters.queue.in_process import InProcessJobQueueAdapter
from app.adapters.realtime.agora import AgoraRealtimeTokenAdapter
from app.adapters.storage.local import LocalStorageAdapter
from app.adapters.storage.minio import MinioStorageAdapter
from app.application.service import VoiceTurkService
from app.composition.container import get_service
from app.domain.entities import User
from app.domain.enums import UserRole
from app.main import app


def wav_fixture(duration_ms: int = 1300, amplitude: float = 0.25, sample_rate: int = 16000) -> bytes:
    output = BytesIO()
    with wave.open(output, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(sample_rate)
        frames = int(sample_rate * duration_ms / 1000)
        values = (int(amplitude * 32767 * math.sin(2 * math.pi * 220 * i / sample_rate)) for i in range(frames))
        audio.writeframes(b"".join(struct.pack("<h", value) for value in values))
    return output.getvalue()


def make_service(tmp_path: Path, repository=None) -> VoiceTurkService:
    return VoiceTurkService(repository or MemoryRepository(), LocalStorageAdapter(tmp_path / "storage"),
        RuleBasedFastCheckAdapter(), HeuristicDeepCheckAdapter(), LocalHashProofAdapter(),
        InProcessJobQueueAdapter(), AgoraRealtimeTokenAdapter("", ""), tmp_path / "exports")


def upload(client: TestClient, session: dict, item_id: str, audio: bytes) -> dict:
    slot = client.post("/audio/uploads/init", json={"session_id": session["session_id"], "item_id": item_id,
        "filename": "recording.wav", "content_type": "audio/wav", "size_bytes": len(audio)}).json()
    response = client.put(slot["upload_url"], content=audio, headers={"content-type": "audio/wav"})
    assert response.status_code == 200
    return client.post("/audio/uploads/complete", json={"upload_id": slot["upload_id"],
        "session_id": session["session_id"], "item_id": item_id, "object_key": slot["object_key"],
        "client_metrics": {"duration_ms": 1300, "rms_dbfs": -15}}).json()


def test_unified_dual_pipeline(tmp_path: Path):
    service = make_service(tmp_path)
    app.dependency_overrides[get_service] = lambda: service
    client = TestClient(app)
    try:
        seeded = client.post("/demo/seed-unified-user").json()
        assert seeded["user_id"] == "user_001" and seeded["total_items"] == 20
        session = client.post("/recording-sessions/start", json={"campaign_id": seeded["campaign_id"],
                                                                  "contributor_id": "user_001"}).json()
        assert session["realtime"]["provider"] == "browser_tts"
        first, second = session["items"][:2]

        short = upload(client, session, first["item_id"], wav_fixture(400))
        assert short["action"] == "RETAKE_NOW" and short["reason_code"] == "AUDIO_TOO_SHORT"
        assert not service.repo.list("samples")

        passed = upload(client, session, first["item_id"], wav_fixture())
        assert passed["action"] == "CONTINUE_NEXT" and passed["metrics"]["speech_ratio"] > 0.9
        assert service.repo.get("samples", passed["sample_id"]).status == "CHECKING"
        assert client.get(f"/recording-sessions/{session['session_id']}/next-action").json()["action"] == "START_ITEM"
        deep = client.post("/deep-check/run-pending").json()
        assert deep["processed"] == 1
        assert client.get("/deep-check/status").json()["review_pending"] == 1
        checks = client.get(f"/audio-samples/{passed['sample_id']}/checks").json()
        assert checks["fast_check"]["sample_rate"] == 16000
        accepted = client.post(f"/validation/audio-samples/{passed['sample_id']}/review", json={
            "decision": "ACCEPT", "validator_id": "user_001", "validator_notes": "Self-reviewed."}).json()
        assert accepted["validator_id"] == "user_001" and accepted["item_status"] == "ACCEPTED"

        retake_sample = upload(client, session, second["item_id"], wav_fixture())
        client.post("/deep-check/run-pending")
        client.post(f"/validation/audio-samples/{retake_sample['sample_id']}/review", json={
            "decision": "NEED_RETAKE", "validator_id": "user_001"})
        retakes = client.get(f"/campaigns/{seeded['campaign_id']}/retakes").json()
        assert retakes[0]["item_id"] == second["item_id"]
        restarted = client.post(f"/recording-items/{second['item_id']}/start-retake", json={"contributor_id": "user_001"}).json()
        assert restarted["status"] == "ASSIGNED"

        dataset = client.post("/datasets/build", json={"campaign_id": seeded["campaign_id"], "version": "1.0"}).json()
        assert dataset["sample_count"] == 1 and Path(dataset["manifest_path"]).exists()
        verified = client.post("/datasets/verify", json={"dataset_version_id": dataset["dataset_version_id"],
                                                         "manifest_hash": dataset["manifest_hash"]}).json()
        assert verified["result"] == "MATCH"
    finally:
        app.dependency_overrides.clear()


def test_sqlite_repository_survives_restart(tmp_path: Path):
    path = tmp_path / "state.db"
    first = make_service(tmp_path, SQLiteRepository(path))
    seeded = first.seed_demo()
    second = make_service(tmp_path, SQLiteRepository(path))
    restored = second.repo.get("users", "user_001")
    assert restored.name == "VoiceTurk Operator" and restored.role == UserRole.USER
    assert second.campaign_detail(seeded["campaign_id"])["item_count"] == 20


def test_architecture_boundaries():
    root = Path(__file__).parents[1] / "app"
    forbidden = ("fastapi", "sqlalchemy", "boto3", "botocore", "agora_token_builder", "openai", "redis", "solana")
    for layer in (root / "domain", root / "application"):
        source = "\n".join(path.read_text(encoding="utf-8") for path in layer.rglob("*.py"))
        assert not any(f"import {name}" in source or f"from {name}" in source for name in forbidden)
    fast_check_source = (root / "adapters" / "check" / "local.py").read_text(encoding="utf-8").lower()
    assert "llm" not in fast_check_source and "solana" not in (root / "application" / "service.py").read_text(encoding="utf-8").lower()


@pytest.mark.skipif(not os.getenv("S3_ENDPOINT_URL"), reason="MinIO integration environment is not configured")
def test_minio_adapter_roundtrip():
    storage = MinioStorageAdapter(os.environ["S3_ENDPOINT_URL"], os.getenv("S3_BUCKET_NAME", "voiceturk"),
        os.environ["S3_ACCESS_KEY_ID"], os.environ["S3_SECRET_ACCESS_KEY"], os.getenv("S3_REGION", "us-east-1"),
        os.getenv("S3_SECURE", "false").lower() == "true", os.getenv("S3_PUBLIC_BASE_URL", ""))
    key = "tmp/tests/roundtrip.txt"
    storage.put_object(key, b"voiceturk", "text/plain")
    assert storage.object_exists(key) and storage.get_object(key) == b"voiceturk"
    storage.delete_object(key)
