import hashlib
import json
import shutil
from collections import Counter
from pathlib import Path
from typing import BinaryIO, Any
from uuid import uuid4

from app.domain.entities import (
    AudioSample, Campaign, DatasetVersion, RecordingItem, RecordingSession, ScriptLine, User, now,
)
from app.domain.enums import (
    AudioSampleStatus, CampaignStatus, DatasetVersionStatus, RecordingItemStatus,
    RecordingSessionStatus, ScriptLineStatus, UserRole, ValidatorDecision,
)
from app.domain.policies import validator_states
from app.ports.providers import DeepCheckPort, FastCheckPort, ObjectStoragePort, ProofProviderPort
from app.ports.repositories import RepositoryPort


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:10]}"


class VoiceTurkService:
    def __init__(self, repository: RepositoryPort, storage: ObjectStoragePort, fast_check: FastCheckPort,
                 deep_check: DeepCheckPort, proof: ProofProviderPort, export_root: Path) -> None:
        self.repo = repository
        self.storage = storage
        self.fast_check = fast_check
        self.deep_check = deep_check
        self.proof = proof
        self.export_root = export_root

    def seed_demo(self) -> dict[str, Any]:
        existing = next((x for x in self.repo.list("campaigns") if x.name == "E-commerce Prosody Dataset"), None)
        if existing:
            return {"campaign_id": existing.campaign_id, "status": existing.status,
                    "total_items": len(self._campaign("items", existing.campaign_id)), "created": False}
        users = [
            User("buyer_001", UserRole.BUYER, "Demo Buyer", "buyer@voiceturk.local"),
            User("contributor_001", UserRole.CONTRIBUTOR, "Demo Contributor", "contributor@voiceturk.local"),
            User("validator_001", UserRole.VALIDATOR, "Demo Validator", "validator@voiceturk.local"),
        ]
        for user in users:
            self.repo.add("users", user)
        lines = [
            {"transcript": "Tôi chưa nhận được hàng.", "intent": "delivery_delay", "context_brief": "Khách hàng đã chờ đơn hàng lâu hơn ngày dự kiến."},
            {"transcript": "Đơn hàng của tôi đang ở đâu?", "intent": "order_status", "context_brief": "Khách hàng muốn biết trạng thái hiện tại của đơn hàng."},
            {"transcript": "Tôi muốn hoàn tiền cho đơn này.", "intent": "refund_request", "context_brief": "Khách hàng không hài lòng và muốn hoàn tiền."},
            {"transcript": "Sao đơn hàng giao trễ vậy?", "intent": "delivery_delay", "context_brief": "Khách hàng khó chịu vì đơn hàng giao muộn."},
            {"transcript": "Tôi cần kiểm tra trạng thái đơn hàng.", "intent": "order_status", "context_brief": "Khách hàng cần tổng đài kiểm tra đơn giúp mình."},
        ]
        campaign = self.create_campaign({"buyer_id": "buyer_001", "name": "E-commerce Prosody Dataset",
            "domain": "ecommerce_cskh", "target_emotions": ["neutral", "confused", "impatient", "angry"],
            "accent_targets": ["southern", "northern", "central"], "environment_targets": ["quiet", "light_noise"],
            "quality_rules": {}, "script_lines": lines})
        generated = self.generate_items(campaign["campaign_id"])
        self.activate_campaign(campaign["campaign_id"])
        return {"campaign_id": campaign["campaign_id"], "status": CampaignStatus.ACTIVE,
                "total_items": generated["total_items"], "created": True}

    def create_campaign(self, data: dict[str, Any]) -> dict[str, Any]:
        campaign = Campaign(
            campaign_id=new_id("camp"), buyer_id=data["buyer_id"], name=data["name"], domain=data["domain"],
            target_emotions=data["target_emotions"], accent_targets=data.get("accent_targets", []),
            environment_targets=data.get("environment_targets", []), quality_rules=data.get("quality_rules", {}),
        )
        self.repo.add("campaigns", campaign)
        for line in data["script_lines"]:
            self.repo.add("script_lines", ScriptLine(
                line_id=new_id("line"), campaign_id=campaign.campaign_id,
                transcript=line["transcript"], intent=line["intent"], context_brief=line.get("context_brief", ""),
            ))
        return self.campaign_detail(campaign.campaign_id)

    def list_campaigns(self) -> list[dict[str, Any]]:
        return [self.campaign_detail(c.campaign_id) for c in self.repo.list("campaigns")]

    def campaign_detail(self, campaign_id: str) -> dict[str, Any]:
        campaign = self._required("campaigns", campaign_id)
        result = campaign.to_dict()
        result["script_lines"] = [x.to_dict() for x in self._campaign("script_lines", campaign_id)]
        result["item_count"] = len(self._campaign("items", campaign_id))
        return result

    def generate_items(self, campaign_id: str) -> dict[str, Any]:
        campaign = self._required("campaigns", campaign_id)
        if campaign.status not in (CampaignStatus.DRAFT, CampaignStatus.PREVIEW_READY):
            raise ValueError("Items can only be generated before campaign activation")
        existing = {(x.line_id, x.target_emotion) for x in self._campaign("items", campaign_id)}
        created = 0
        for line in self._campaign("script_lines", campaign_id):
            line.status = ScriptLineStatus.APPROVED
            for emotion in campaign.target_emotions:
                if (line.line_id, emotion) not in existing:
                    self.repo.add("items", RecordingItem(new_id("item"), campaign_id, line.line_id, emotion))
                    created += 1
        campaign.status = CampaignStatus.PREVIEW_READY
        return {"campaign_id": campaign_id, "status": campaign.status, "created_items": created,
                "total_items": len(self._campaign("items", campaign_id))}

    def activate_campaign(self, campaign_id: str) -> dict[str, Any]:
        campaign = self._required("campaigns", campaign_id)
        if campaign.status != CampaignStatus.PREVIEW_READY:
            raise ValueError("Campaign must be PREVIEW_READY before activation")
        campaign.status = CampaignStatus.ACTIVE
        campaign.activated_at = now()
        return {"campaign_id": campaign_id, "status": campaign.status}

    def coverage(self, campaign_id: str) -> dict[str, Any]:
        self._required("campaigns", campaign_id)
        items = self._campaign("items", campaign_id)
        counts = Counter(x.status.value for x in items)
        by_emotion: dict[str, dict[str, int]] = {}
        for item in items:
            bucket = by_emotion.setdefault(item.target_emotion, {"total": 0, "accepted": 0})
            bucket["total"] += 1
            bucket["accepted"] += item.status == RecordingItemStatus.ACCEPTED
        total = len(items)
        accepted = counts[RecordingItemStatus.ACCEPTED]
        return {"campaign_id": campaign_id, "total_items": total, "accepted_items": accepted,
                "review_pending_items": counts[RecordingItemStatus.REVIEW_PENDING],
                "need_retake_items": counts[RecordingItemStatus.NEED_RETAKE],
                "open_items": counts[RecordingItemStatus.OPEN],
                "assigned_items": counts[RecordingItemStatus.ASSIGNED],
                "coverage_ratio": accepted / total if total else 0, "by_emotion": by_emotion}

    def start_session(self, campaign_id: str, contributor_id: str) -> dict[str, Any]:
        campaign = self._required("campaigns", campaign_id)
        if campaign.status != CampaignStatus.ACTIVE:
            raise ValueError("Campaign is not active")
        session = RecordingSession(new_id("session"), campaign_id, contributor_id)
        session.status = RecordingSessionStatus.ACTIVE
        self.repo.add("sessions", session)
        assigned = []
        for item in self._campaign("items", campaign_id):
            if item.status in (RecordingItemStatus.OPEN, RecordingItemStatus.NEED_RETAKE):
                item.status = RecordingItemStatus.ASSIGNED
                item.assigned_to = contributor_id
                item.assigned_at = now()
                assigned.append(self._item_dto(item))
        return {"session_id": session.session_id, "campaign_id": campaign_id, "contributor_id": contributor_id,
                "status": session.status, "realtime": {"provider": "browser_tts", "agora_channel": None,
                "agora_token": None}, "items": assigned}

    def session_items(self, session_id: str) -> list[dict[str, Any]]:
        session = self._required("sessions", session_id)
        return [self._item_dto(x) for x in self._campaign("items", session.campaign_id)
                if x.assigned_to == session.contributor_id and x.status == RecordingItemStatus.ASSIGNED]

    def complete_session(self, session_id: str) -> dict[str, Any]:
        session = self._required("sessions", session_id)
        for item in self._campaign("items", session.campaign_id):
            if item.assigned_to == session.contributor_id and item.status == RecordingItemStatus.ASSIGNED:
                item.status, item.assigned_to, item.assigned_at = RecordingItemStatus.OPEN, None, None
        session.status, session.ended_at = RecordingSessionStatus.COMPLETED, now()
        return {"session_id": session_id, "status": session.status}

    def submit_audio(self, item_id: str, session_id: str, contributor_id: str, duration_ms: int,
                     filename: str, content_type: str | None, source: BinaryIO) -> tuple[dict[str, Any], AudioSample | None]:
        item = self._required("items", item_id)
        session = self._required("sessions", session_id)
        if item.status != RecordingItemStatus.ASSIGNED or item.assigned_to != contributor_id:
            raise ValueError("Recording item is not assigned to this contributor")
        if session.status != RecordingSessionStatus.ACTIVE or session.campaign_id != item.campaign_id:
            raise ValueError("Recording session is not active for this item")
        suffix = Path(filename or "audio.webm").suffix or ".webm"
        path = self.storage.save(f"{new_id('upload')}{suffix}", source)
        result = self.fast_check.check(path, duration_ms, content_type)
        if not result.passed:
            path.unlink(missing_ok=True)
            return ({"action": "RETAKE_NOW", "reason_code": result.reason_code, "message_vi": result.message_vi,
                     "retry_same_item": True, "sample_id": None}, None)
        line = self._required("script_lines", item.line_id)
        sample = AudioSample(new_id("sample"), item.campaign_id, item.line_id, item.item_id, session_id,
                             contributor_id, str(path), duration_ms, line.transcript, line.intent, item.target_emotion)
        self.repo.add("samples", sample)
        item.status = RecordingItemStatus.REVIEW_PENDING
        response = {"action": "CONTINUE_NEXT", "reason_code": result.reason_code, "message_vi": result.message_vi,
                    "sample_id": sample.sample_id, "next_item_available": bool(self.session_items(session_id))}
        return response, sample

    def run_deep_check(self, sample_id: str) -> None:
        sample = self._required("samples", sample_id)
        if sample.status == AudioSampleStatus.CHECKING:
            self.deep_check.enrich(sample)

    def review_queue(self) -> list[dict[str, Any]]:
        return [self.sample_detail(x.sample_id) for x in self.repo.list("samples")
                if x.status == AudioSampleStatus.REVIEW_PENDING]

    def sample_detail(self, sample_id: str) -> dict[str, Any]:
        sample = self._required("samples", sample_id)
        result = sample.to_dict()
        line = self._required("script_lines", sample.line_id)
        result["context_brief"] = line.context_brief
        result["audio_url"] = f"/media/{sample.sample_id}"
        return result

    def sample_audio_path(self, sample_id: str) -> Path:
        return Path(self._required("samples", sample_id).audio_path)

    def review_sample(self, sample_id: str, decision: ValidatorDecision, validator_id: str,
                      notes: str | None) -> dict[str, Any]:
        sample = self._required("samples", sample_id)
        if sample.status != AudioSampleStatus.REVIEW_PENDING:
            raise ValueError("Only REVIEW_PENDING samples can be reviewed")
        item = self._required("items", sample.item_id)
        sample.status, item.status = validator_states(decision)
        sample.validator_status, sample.validator_id = decision.value, validator_id
        sample.validator_notes, sample.reviewed_at = notes, now()
        if item.status == RecordingItemStatus.ACCEPTED:
            item.completed_at = now()
        campaign = self._required("campaigns", sample.campaign_id)
        campaign_items = self._campaign("items", campaign.campaign_id)
        if campaign_items and all(x.status == RecordingItemStatus.ACCEPTED for x in campaign_items):
            campaign.status, campaign.completed_at = CampaignStatus.COLLECTION_COMPLETED, now()
        return {"sample_id": sample_id, "sample_status": sample.status, "item_id": item.item_id,
                "item_status": item.status}

    def build_dataset(self, campaign_id: str, version: str) -> dict[str, Any]:
        campaign = self._required("campaigns", campaign_id)
        samples = [x for x in self._campaign("samples", campaign_id) if x.status == AudioSampleStatus.ACCEPTED]
        if not samples:
            raise ValueError("At least one accepted sample is required")
        dataset = DatasetVersion(new_id("dataset"), campaign_id, version, sample_count=len(samples))
        self.repo.add("datasets", dataset)
        root = (self.export_root / campaign_id / f"dataset_v{version}").resolve()
        audio_dir = root / "audio"
        audio_dir.mkdir(parents=True, exist_ok=True)
        annotations = []
        for sample in samples:
            target = audio_dir / f"{sample.sample_id}{Path(sample.audio_path).suffix}"
            shutil.copy2(sample.audio_path, target)
            annotations.append({"sample_id": sample.sample_id, "audio_path": str(target.relative_to(root)),
                "transcript": sample.transcript_snapshot, "domain": campaign.domain, "intent": sample.intent_snapshot,
                "target_emotion": sample.target_emotion_snapshot, "accent": sample.accent,
                "environment": sample.environment, "duration_ms": sample.duration_ms,
                "loudness_db": sample.loudness_db, "speech_rate_wps": sample.speech_rate_wps,
                "silence_ratio": sample.silence_ratio, "pitch_summary": sample.pitch_summary,
                "quality_score": sample.quality_score, "validator_status": sample.validator_status,
                "consent_version": sample.consent_version})
        annotations_path = root / "annotations.jsonl"
        annotations_path.write_text("\n".join(json.dumps(x, ensure_ascii=False) for x in annotations) + "\n", encoding="utf-8")
        report = {"campaign_id": campaign_id, "dataset_version": version, "sample_count": len(samples),
            "emotion_distribution": dict(Counter(x.target_emotion_snapshot for x in samples)),
            "intent_distribution": dict(Counter(x.intent_snapshot for x in samples)),
            "average_quality_score": sum(x.quality_score or 0 for x in samples) / len(samples),
            "generated_at": now().isoformat()}
        report_path = root / "quality_report.json"
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        card_path = root / "data_card.md"
        card_path.write_text(f"# {campaign.name}\n\nDomain: {campaign.domain}\n\n## Intended use\nVietnamese prosody research and voice systems.\n\n## Collection method\nGuided browser recordings reviewed by a validator.\n\n## Labels and metadata\nTranscript, intent, target emotion, accent, environment, and quality metadata.\n\n## Quality process\nClient pre-check, deterministic FastCheck, mock DeepCheck, and human validation.\n\n## Limitations\nMVP-scale collection; mock acoustic metadata is not production analysis.\n\n## Consent and license\nSamples use consent version mvp-v1 and the bundled MVP license.\n", encoding="utf-8")
        license_path = root / "license.json"
        license_path.write_text(json.dumps({"license": "VoiceTurk MVP Research License", "consent_version": "mvp-v1"}, indent=2), encoding="utf-8")
        files = [p for p in root.rglob("*") if p.is_file()]
        manifest = {"dataset_version_id": dataset.dataset_version_id, "campaign_id": campaign_id,
                    "version": version, "files": [str(p.relative_to(root)).replace("\\", "/") for p in files],
                    "checksums": {str(p.relative_to(root)).replace("\\", "/"): hashlib.sha256(p.read_bytes()).hexdigest() for p in files},
                    "generated_at": now().isoformat()}
        manifest_path = root / "manifest.json"
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
        manifest_hash = hashlib.sha256(manifest_path.read_bytes()).hexdigest()
        dataset.package_path, dataset.annotations_path = str(root), str(annotations_path)
        dataset.quality_report_path, dataset.data_card_path = str(report_path), str(card_path)
        dataset.manifest_path, dataset.license_path, dataset.manifest_hash = str(manifest_path), str(license_path), manifest_hash
        dataset.status = DatasetVersionStatus.PROOF_PENDING
        proof = self.proof.issue_proof(dataset.dataset_version_id, manifest_hash)
        dataset.proof_network, dataset.proof_tx_signature, dataset.proof_status = proof["provider"], proof["signature"], proof["status"]
        dataset.status, campaign.status = DatasetVersionStatus.VERIFIED, CampaignStatus.DATASET_READY
        return dataset.to_dict()

    def dataset_detail(self, dataset_version_id: str) -> dict[str, Any]:
        return self._required("datasets", dataset_version_id).to_dict()

    def verify_dataset(self, dataset_version_id: str, manifest_hash: str) -> dict[str, str]:
        dataset = self._required("datasets", dataset_version_id)
        matched = dataset.manifest_hash == manifest_hash and self.proof.verify_proof(dataset_version_id, manifest_hash)
        return {"result": "MATCH" if matched else "MISMATCH", "dataset_version_id": dataset_version_id}

    def _required(self, kind: str, entity_id: str) -> Any:
        entity = self.repo.get(kind, entity_id)
        if entity is None:
            raise KeyError(f"{kind[:-1].title()} not found")
        return entity

    def _campaign(self, kind: str, campaign_id: str) -> list[Any]:
        return [x for x in self.repo.list(kind) if x.campaign_id == campaign_id]

    def _item_dto(self, item: RecordingItem) -> dict[str, Any]:
        line = self._required("script_lines", item.line_id)
        return {"item_id": item.item_id, "line_id": item.line_id, "transcript": line.transcript,
                "intent": line.intent, "target_emotion": item.target_emotion,
                "context_brief": line.context_brief, "status": item.status}
