from pathlib import Path

from fastapi.testclient import TestClient

from app.adapters.check.local import MockDeepCheckAdapter, RuleBasedFastCheckAdapter
from app.adapters.persistence.memory import MemoryRepository
from app.adapters.proof.local_hash import LocalHashProofAdapter
from app.adapters.storage.local import LocalStorageAdapter
from app.application.service import VoiceTurkService
from app.composition.container import get_service
from app.main import app


def test_end_to_end_demo(tmp_path: Path):
    service = VoiceTurkService(MemoryRepository(), LocalStorageAdapter(tmp_path / "storage"),
        RuleBasedFastCheckAdapter(), MockDeepCheckAdapter(), LocalHashProofAdapter(), tmp_path / "exports")
    app.dependency_overrides[get_service] = lambda: service
    client = TestClient(app)
    try:
        assert client.get("/health").json() == {"status": "ok", "service": "voiceturk-api"}
        seeded = client.post("/demo/seed").json()
        assert seeded["total_items"] == 20
        campaign_id = seeded["campaign_id"]
        session = client.post("/recording-sessions/start", json={
            "campaign_id": campaign_id, "contributor_id": "contributor_001"}).json()
        assert len(session["items"]) == 20
        item_id = session["items"][0]["item_id"]
        retake = client.post(f"/recording-items/{item_id}/submit-audio",
            data={"session_id": session["session_id"], "contributor_id": "contributor_001", "duration_ms": "100"},
            files={"audio": ("short.webm", b"x" * 128, "audio/webm")}).json()
        assert retake["action"] == "RETAKE_NOW"
        assert not service.repo.list("samples")
        submitted = client.post(f"/recording-items/{item_id}/submit-audio",
            data={"session_id": session["session_id"], "contributor_id": "contributor_001", "duration_ms": "1200"},
            files={"audio": ("sample.webm", b"voice" * 100, "audio/webm")}).json()
        assert submitted["action"] == "CONTINUE_NEXT"
        queue = client.get("/validation/review-queue").json()
        assert [x["sample_id"] for x in queue] == [submitted["sample_id"]]
        review = client.post(f"/validation/audio-samples/{submitted['sample_id']}/review",
            json={"decision": "ACCEPT", "validator_id": "validator_001", "validator_notes": "Audio rõ."}).json()
        assert review["sample_status"] == review["item_status"] == "ACCEPTED"
        assert client.get(f"/campaigns/{campaign_id}/coverage").json()["accepted_items"] == 1
        dataset = client.post("/datasets/build", json={"campaign_id": campaign_id, "version": "1.0"}).json()
        assert dataset["sample_count"] == 1
        assert Path(dataset["manifest_path"]).exists()
        verified = client.post("/datasets/verify", json={"dataset_version_id": dataset["dataset_version_id"],
                                                         "manifest_hash": dataset["manifest_hash"]}).json()
        assert verified["result"] == "MATCH"
    finally:
        app.dependency_overrides.clear()
