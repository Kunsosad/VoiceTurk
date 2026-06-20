import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Any, BinaryIO
from uuid import uuid4

from app.domain.entities import AudioSample, Campaign, DatasetVersion, RecordingItem, RecordingSession, ScriptLine, User, now
from app.domain.enums import (AudioSampleStatus, CampaignStatus, DatasetVersionStatus, DeepCheckDecision,
    RecordingItemStatus, RecordingSessionStatus, ScriptLineStatus, UserRole, ValidatorDecision)
from app.domain.policies import validator_states
from app.ports.providers import (DeepCheckPort, FastCheckPort, JobQueuePort, ObjectStoragePort,
                                 ProofProviderPort, RealtimeTokenPort)
from app.ports.repositories import RepositoryPort


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:10]}"


class VoiceTurkService:
    def __init__(self, repository: RepositoryPort, storage: ObjectStoragePort, fast_check: FastCheckPort,
                 deep_check: DeepCheckPort, proof: ProofProviderPort, queue: JobQueuePort,
                 realtime: RealtimeTokenPort, export_root: Path, keep_failed_uploads: bool = False) -> None:
        self.repo, self.storage, self.fast_check = repository, storage, fast_check
        self.deep_check, self.proof, self.queue, self.realtime = deep_check, proof, queue, realtime
        self.export_root, self.keep_failed_uploads = export_root, keep_failed_uploads

    # Unified user and campaign workflow
    def seed_demo(self) -> dict[str, Any]:
        existing = next((x for x in self.repo.list("campaigns") if x.name == "E-commerce Prosody Dataset"), None)
        if existing:
            return {"user_id": "user_001", "campaign_id": existing.campaign_id, "status": existing.status,
                    "total_items": len(self._campaign("items", existing.campaign_id)), "created": False}
        self.repo.add("users", User("user_001", UserRole.USER, "VoiceTurk Operator", "user@voiceturk.local"))
        lines = [
            {"transcript": "Tôi chưa nhận được hàng.", "intent": "delivery_delay", "context_brief": "Khách hàng đã chờ đơn hàng lâu hơn ngày dự kiến."},
            {"transcript": "Đơn hàng của tôi đang ở đâu?", "intent": "order_status", "context_brief": "Khách hàng muốn biết trạng thái hiện tại của đơn hàng."},
            {"transcript": "Tôi muốn hoàn tiền cho đơn này.", "intent": "refund_request", "context_brief": "Khách hàng không hài lòng và muốn hoàn tiền."},
            {"transcript": "Sao đơn hàng giao trễ vậy?", "intent": "delivery_delay", "context_brief": "Khách hàng khó chịu vì đơn hàng giao muộn."},
            {"transcript": "Tôi cần kiểm tra trạng thái đơn hàng.", "intent": "order_status", "context_brief": "Khách hàng cần tổng đài kiểm tra đơn giúp mình."},
        ]
        campaign = self.create_campaign({"buyer_id": "user_001", "name": "E-commerce Prosody Dataset",
            "domain": "ecommerce_cskh", "target_emotions": ["neutral", "confused", "impatient", "angry"],
            "accent_targets": ["southern", "northern", "central"], "environment_targets": ["quiet", "light_noise"],
            "quality_rules": {}, "script_lines": lines})
        generated = self.generate_items(campaign["campaign_id"])
        self.activate_campaign(campaign["campaign_id"])
        return {"user_id": "user_001", "campaign_id": campaign["campaign_id"], "status": CampaignStatus.ACTIVE,
                "total_items": generated["total_items"], "created": True}

    def create_campaign(self, data: dict[str, Any]) -> dict[str, Any]:
        campaign = Campaign(new_id("camp"), data["buyer_id"], data["name"], data["domain"], data["target_emotions"],
            data.get("accent_targets", []), data.get("environment_targets", []), data.get("quality_rules", {}))
        self.repo.add("campaigns", campaign)
        for value in data["script_lines"]:
            self.repo.add("script_lines", ScriptLine(new_id("line"), campaign.campaign_id, value["transcript"],
                value["intent"], value.get("context_brief", "")))
        return self.campaign_detail(campaign.campaign_id)

    def list_campaigns(self) -> list[dict[str, Any]]:
        return [self.campaign_detail(value.campaign_id) for value in self.repo.list("campaigns")]

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
            self.repo.add("script_lines", line)
            for emotion in campaign.target_emotions:
                if (line.line_id, emotion) not in existing:
                    self.repo.add("items", RecordingItem(new_id("item"), campaign_id, line.line_id, emotion))
                    created += 1
        campaign.status = CampaignStatus.PREVIEW_READY
        self.repo.add("campaigns", campaign)
        return {"campaign_id": campaign_id, "status": campaign.status, "created_items": created,
                "total_items": len(self._campaign("items", campaign_id))}

    def activate_campaign(self, campaign_id: str) -> dict[str, Any]:
        campaign = self._required("campaigns", campaign_id)
        if campaign.status != CampaignStatus.PREVIEW_READY:
            raise ValueError("Campaign must be PREVIEW_READY before activation")
        campaign.status, campaign.activated_at = CampaignStatus.ACTIVE, now()
        self.repo.add("campaigns", campaign)
        return {"campaign_id": campaign_id, "status": campaign.status}

    def coverage(self, campaign_id: str) -> dict[str, Any]:
        self._required("campaigns", campaign_id)
        items = self._campaign("items", campaign_id)
        counts = Counter(x.status.value for x in items)
        by_emotion: dict[str, dict[str, int]] = {}
        for item in items:
            bucket = by_emotion.setdefault(item.target_emotion, {"total": 0, "accepted": 0})
            bucket["total"] += 1
            bucket["accepted"] += int(item.status == RecordingItemStatus.ACCEPTED)
        total, accepted = len(items), counts[RecordingItemStatus.ACCEPTED]
        return {"campaign_id": campaign_id, "total_items": total, "accepted_items": accepted,
            "review_pending_items": counts[RecordingItemStatus.REVIEW_PENDING],
            "need_retake_items": counts[RecordingItemStatus.NEED_RETAKE], "open_items": counts[RecordingItemStatus.OPEN],
            "assigned_items": counts[RecordingItemStatus.ASSIGNED], "coverage_ratio": accepted / total if total else 0,
            "by_emotion": by_emotion}

    # Session truth, next action, and retakes
    def start_session(self, campaign_id: str, contributor_id: str) -> dict[str, Any]:
        campaign = self._required("campaigns", campaign_id)
        if campaign.status != CampaignStatus.ACTIVE:
            raise ValueError("Campaign is not active")
        session = RecordingSession(new_id("session"), campaign_id, contributor_id, status=RecordingSessionStatus.ACTIVE)
        self.repo.add("sessions", session)
        items = []
        for item in self._campaign("items", campaign_id):
            if item.status == RecordingItemStatus.OPEN:
                item.status, item.assigned_to, item.assigned_at = RecordingItemStatus.ASSIGNED, contributor_id, now()
                self.repo.add("items", item)
                items.append(self._item_dto(item))
        realtime = {"provider": "browser_tts", "agora_channel": None, "agora_token": None, "agora_app_id": None, "uid": contributor_id}
        if self.realtime.configured():
            token = self.realtime.issue_token(f"vt_{session.session_id}", contributor_id, "publisher")
            realtime = {"provider": "agora", "agora_channel": token["channel"], "agora_token": token["token"],
                        "agora_app_id": token["app_id"], "uid": contributor_id, "expires_at": token["expires_at"]}
        return {"session_id": session.session_id, "campaign_id": campaign_id, "contributor_id": contributor_id,
                "status": session.status, "realtime": realtime, "items": items}

    def session_items(self, session_id: str) -> list[dict[str, Any]]:
        session = self._required("sessions", session_id)
        return [self._item_dto(x) for x in self._campaign("items", session.campaign_id)
                if x.assigned_to == session.contributor_id and x.status in (RecordingItemStatus.ASSIGNED, RecordingItemStatus.NEED_RETAKE)]

    def next_action(self, session_id: str) -> dict[str, Any]:
        session = self._required("sessions", session_id)
        if session.status != RecordingSessionStatus.ACTIVE:
            return {"action": "SESSION_COMPLETE", "item": None, "coach_message_vi": "Phiên thu đã kết thúc.", "retake_count": 0,
                    "progress": self._progress(session.campaign_id)}
        items = self._campaign("items", session.campaign_id)
        normal = next((x for x in items if x.assigned_to == session.contributor_id and x.status == RecordingItemStatus.ASSIGNED), None)
        if normal:
            return {"action": "START_ITEM", "item": self._item_dto(normal),
                    "coach_message_vi": self._instruction(normal), "retake_count": self._retake_count(session.campaign_id),
                    "progress": self._progress(session.campaign_id)}
        retake = next((x for x in items if x.status == RecordingItemStatus.NEED_RETAKE), None)
        if retake:
            retake.status, retake.assigned_to, retake.assigned_at = RecordingItemStatus.ASSIGNED, session.contributor_id, now()
            self.repo.add("items", retake)
            return {"action": "RETAKE_ITEM", "item": self._item_dto(retake),
                "coach_message_vi": "Mình thấy có câu cần thu lại để dữ liệu tốt hơn. Mình sẽ hướng dẫn bạn đọc lại ngay bây giờ.",
                "retake_count": self._retake_count(session.campaign_id), "progress": self._progress(session.campaign_id)}
        checking = any(x.campaign_id == session.campaign_id and x.status == AudioSampleStatus.CHECKING for x in self.repo.list("samples"))
        return {"action": "WAIT_DEEPCHECK" if checking else "SESSION_COMPLETE", "item": None,
            "coach_message_vi": "DeepCheck đang xử lý nền." if checking else "Bạn đã hoàn thành các câu hiện có.",
            "retake_count": 0, "progress": self._progress(session.campaign_id)}

    def session_retakes(self, session_id: str) -> list[dict[str, Any]]:
        return self.campaign_retakes(self._required("sessions", session_id).campaign_id)

    def campaign_retakes(self, campaign_id: str) -> list[dict[str, Any]]:
        return [self._item_dto(x) for x in self._campaign("items", campaign_id) if x.status == RecordingItemStatus.NEED_RETAKE]

    def start_retake(self, item_id: str, contributor_id: str) -> dict[str, Any]:
        item = self._required("items", item_id)
        if item.status != RecordingItemStatus.NEED_RETAKE:
            raise ValueError("Only NEED_RETAKE items can be restarted")
        item.status, item.assigned_to, item.assigned_at = RecordingItemStatus.ASSIGNED, contributor_id, now()
        self.repo.add("items", item)
        return self._item_dto(item)

    def skip_item(self, item_id: str) -> dict[str, Any]:
        item = self._required("items", item_id)
        if item.status != RecordingItemStatus.ASSIGNED:
            raise ValueError("Only an assigned item can be skipped")
        item.status, item.assigned_to, item.assigned_at = RecordingItemStatus.OPEN, None, None
        self.repo.add("items", item)
        return {"item_id": item_id, "status": item.status}

    def complete_session(self, session_id: str) -> dict[str, Any]:
        session = self._required("sessions", session_id)
        for item in self._campaign("items", session.campaign_id):
            if item.assigned_to == session.contributor_id and item.status == RecordingItemStatus.ASSIGNED:
                item.status, item.assigned_to, item.assigned_at = RecordingItemStatus.OPEN, None, None
                self.repo.add("items", item)
        session.status, session.ended_at = RecordingSessionStatus.COMPLETED, now()
        self.repo.add("sessions", session)
        return {"session_id": session_id, "status": session.status}

    # Temporary upload -> FastCheck -> official sample
    def init_upload(self, data: dict[str, Any]) -> dict[str, Any]:
        session = self._required("sessions", data["session_id"])
        item = self._required("items", data["item_id"])
        if session.status != RecordingSessionStatus.ACTIVE or item.status != RecordingItemStatus.ASSIGNED:
            raise ValueError("Session or item is not ready for upload")
        suffix = Path(data.get("filename") or "recording.wav").suffix.lower() or ".wav"
        upload_id = new_id("upload")
        object_key = f"tmp/audio/{session.session_id}/{item.item_id}/{uuid4().hex}{suffix}"
        upload = {"upload_id": upload_id, "session_id": session.session_id, "item_id": item.item_id,
            "object_key": object_key, "filename": data.get("filename") or f"recording{suffix}",
            "content_type": data.get("content_type") or "audio/wav", "size_bytes": data.get("size_bytes", 0),
            "status": "INITIALIZED", "created_at": now()}
        self.repo.add("uploads", upload)
        presigned = self.storage.create_presigned_put_url(object_key, upload["content_type"], 900)
        return {"upload_id": upload_id, "object_key": object_key,
            "upload_url": presigned or f"/audio/uploads/{upload_id}/content", "upload_method": "PUT", "expires_in": 900}

    def put_upload(self, upload_id: str, data: bytes, content_type: str | None = None) -> dict[str, Any]:
        upload = self._required("uploads", upload_id)
        self.storage.put_object(upload["object_key"], data, content_type or upload["content_type"])
        upload["status"], upload["size_bytes"] = "UPLOADED", len(data)
        self.repo.add("uploads", upload)
        return {"upload_id": upload_id, "status": upload["status"], "size_bytes": len(data)}

    def complete_upload(self, data: dict[str, Any]) -> tuple[dict[str, Any], AudioSample | None]:
        upload = self._required("uploads", data["upload_id"])
        if upload["session_id"] != data["session_id"] or upload["item_id"] != data["item_id"] or upload["object_key"] != data["object_key"]:
            raise ValueError("Upload completion does not match initialized upload")
        if not self.storage.object_exists(upload["object_key"]):
            return self._fast_response(False, "FILE_MISSING", "Không tìm thấy file âm thanh. Bạn thử ghi lại nhé.", {}, None), None
        item = self._required("items", upload["item_id"])
        session = self._required("sessions", upload["session_id"])
        audio = self.storage.get_object(upload["object_key"])
        result = self.fast_check.check(audio, upload["filename"], upload["content_type"], data.get("client_metrics"))
        if not result.passed:
            upload["status"] = "FAST_CHECK_FAILED"
            self.repo.add("uploads", upload)
            if not self.keep_failed_uploads:
                self.storage.delete_object(upload["object_key"])
            return self._fast_response(False, result.reason_code, result.message_vi, result.metrics, None, result.severity, result.warnings), None
        line = self._required("script_lines", item.line_id)
        sample_id = new_id("sample")
        suffix = Path(upload["filename"]).suffix.lower() or ".wav"
        official_key = f"audio/{item.campaign_id}/{item.item_id}/{sample_id}{suffix}"
        self.storage.copy_object(upload["object_key"], official_key)
        self.storage.delete_object(upload["object_key"])
        sample = AudioSample(sample_id, item.campaign_id, item.line_id, item.item_id, session.session_id,
            session.contributor_id, official_key, int(result.metrics["duration_ms"]), line.transcript, line.intent, item.target_emotion)
        for field, key in (("loudness_db", "rms_dbfs"), ("silence_ratio", "silence_ratio"), ("sample_rate", "sample_rate"),
            ("channels", "channels"), ("peak_dbfs", "peak_dbfs"), ("clipping_ratio", "clipping_ratio"),
            ("speech_ratio", "speech_ratio"), ("speech_duration_ms", "speech_duration_ms"),
            ("leading_silence_ms", "leading_silence_ms"), ("trailing_silence_ms", "trailing_silence_ms"),
            ("estimated_snr_db", "estimated_snr_db"), ("file_size_bytes", "file_size_bytes"),
            ("audio_container", "container"), ("fast_check_score", "fast_check_score")):
            setattr(sample, field, result.metrics.get(key))
        self.repo.add("samples", sample)
        item.status = RecordingItemStatus.REVIEW_PENDING
        self.repo.add("items", item)
        upload["status"], upload["official_object_key"], upload["sample_id"] = "COMPLETED", official_key, sample_id
        self.repo.add("uploads", upload)
        self.queue.enqueue(sample_id)
        return self._fast_response(True, result.reason_code, result.message_vi, result.metrics, sample_id, result.severity, result.warnings), sample

    def submit_audio(self, item_id: str, session_id: str, contributor_id: str, duration_ms: int,
                     filename: str, content_type: str | None, source: BinaryIO) -> tuple[dict[str, Any], AudioSample | None]:
        item = self._required("items", item_id)
        if item.assigned_to != contributor_id:
            raise ValueError("Recording item is not assigned to this contributor")
        raw = source.read()
        slot = self.init_upload({"session_id": session_id, "item_id": item_id, "filename": filename,
                                 "content_type": content_type or "audio/wav", "size_bytes": len(raw)})
        self.put_upload(slot["upload_id"], raw, content_type)
        return self.complete_upload({"upload_id": slot["upload_id"], "session_id": session_id, "item_id": item_id,
            "object_key": slot["object_key"], "client_metrics": {"duration_ms": duration_ms}})

    # DeepCheck queue and self-review
    def run_pending_deep_checks(self, limit: int = 100) -> dict[str, Any]:
        for sample in self.repo.list("samples"):
            if sample.status == AudioSampleStatus.CHECKING:
                self.queue.enqueue(sample.sample_id)
        processed, results = 0, []
        while processed < limit and (sample_id := self.queue.pop()):
            results.append(self.process_one_deep_check(sample_id))
            processed += 1
        return {"processed": processed, "pending": self.queue.size(), "results": results}

    def process_one_deep_check(self, sample_id: str) -> dict[str, Any]:
        sample = self._required("samples", sample_id)
        if sample.status != AudioSampleStatus.CHECKING:
            return {"sample_id": sample_id, "status": sample.status, "skipped": True}
        item = self._required("items", sample.item_id)
        try:
            result = self.deep_check.analyze(sample, self.storage.get_object(sample.audio_path))
            for key, value in result.metadata.items():
                if hasattr(sample, key):
                    setattr(sample, key, value)
            sample.deep_check_status, sample.deep_check_reason_code = result.decision.value, result.reason_code
            sample.deep_check_message_vi, sample.deep_checked_at = result.message_vi, now()
            if result.decision == DeepCheckDecision.PASS_TO_REVIEW:
                sample.status = AudioSampleStatus.REVIEW_PENDING
            elif result.decision == DeepCheckDecision.NEED_RETAKE_LATER:
                sample.status, item.status = AudioSampleStatus.NEED_RETAKE, RecordingItemStatus.NEED_RETAKE
            else:
                sample.status, item.status = AudioSampleStatus.REJECTED, RecordingItemStatus.OPEN
        except Exception as exc:
            sample.deep_check_status, sample.deep_check_reason_code = "ERROR", "DEEP_CHECK_ERROR"
            sample.deep_check_message_vi = f"DeepCheck failed and can be retried: {exc}"
        self.repo.add("samples", sample)
        self.repo.add("items", item)
        return {"sample_id": sample_id, "status": sample.status, "decision": sample.deep_check_status,
                "reason_code": sample.deep_check_reason_code}

    def deep_check_status(self) -> dict[str, Any]:
        counts = Counter(x.status.value for x in self.repo.list("samples"))
        return {"queued": self.queue.size(), "checking": counts[AudioSampleStatus.CHECKING],
                "review_pending": counts[AudioSampleStatus.REVIEW_PENDING], "need_retake": counts[AudioSampleStatus.NEED_RETAKE]}

    def retry_deep_check(self, sample_id: str) -> dict[str, Any]:
        sample = self._required("samples", sample_id)
        if sample.deep_check_status != "ERROR":
            raise ValueError("Only failed DeepCheck jobs can be retried")
        sample.status, sample.deep_check_status = AudioSampleStatus.CHECKING, "PENDING"
        self.repo.add("samples", sample)
        self.queue.enqueue(sample_id)
        return {"sample_id": sample_id, "status": sample.status, "queued": True}

    def review_queue(self) -> list[dict[str, Any]]:
        return [self.sample_detail(x.sample_id) for x in self.repo.list("samples") if x.status == AudioSampleStatus.REVIEW_PENDING]

    def sample_detail(self, sample_id: str) -> dict[str, Any]:
        sample = self._required("samples", sample_id)
        result = sample.to_dict()
        result["context_brief"] = self._required("script_lines", sample.line_id).context_brief
        result["audio_url"] = f"/media/{sample.sample_id}"
        return result

    def sample_checks(self, sample_id: str) -> dict[str, Any]:
        sample = self._required("samples", sample_id)
        return {"sample_id": sample_id, "fast_check": {key: getattr(sample, key) for key in (
            "fast_check_status", "fast_check_score", "duration_ms", "sample_rate", "channels", "loudness_db",
            "peak_dbfs", "clipping_ratio", "silence_ratio", "speech_ratio", "speech_duration_ms",
            "leading_silence_ms", "trailing_silence_ms", "estimated_snr_db", "file_size_bytes")},
            "deep_check": {"status": sample.deep_check_status, "reason_code": sample.deep_check_reason_code,
                "message_vi": sample.deep_check_message_vi, "quality_score": sample.quality_score,
                "speech_rate_wps": sample.speech_rate_wps, "pitch_summary": sample.pitch_summary}}

    def sample_audio(self, sample_id: str) -> tuple[bytes, str]:
        sample = self._required("samples", sample_id)
        return self.storage.get_object(sample.audio_path), "audio/wav" if sample.audio_path.endswith(".wav") else "audio/webm"

    def review_sample(self, sample_id: str, decision: ValidatorDecision, validator_id: str, notes: str | None) -> dict[str, Any]:
        sample = self._required("samples", sample_id)
        if sample.status != AudioSampleStatus.REVIEW_PENDING:
            raise ValueError("Only REVIEW_PENDING samples can be reviewed")
        item = self._required("items", sample.item_id)
        sample.status, item.status = validator_states(decision)
        sample.validator_status, sample.validator_id, sample.validator_notes, sample.reviewed_at = decision.value, validator_id, notes, now()
        if item.status == RecordingItemStatus.ACCEPTED:
            item.completed_at = now()
        self.repo.add("samples", sample)
        self.repo.add("items", item)
        campaign = self._required("campaigns", sample.campaign_id)
        campaign_items = self._campaign("items", campaign.campaign_id)
        if campaign_items and all(x.status == RecordingItemStatus.ACCEPTED for x in campaign_items):
            campaign.status, campaign.completed_at = CampaignStatus.COLLECTION_COMPLETED, now()
            self.repo.add("campaigns", campaign)
        return {"sample_id": sample_id, "sample_status": sample.status, "item_id": item.item_id, "item_status": item.status,
                "validator_id": validator_id}

    # Dataset export remains accepted-only
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
            suffix = Path(sample.audio_path).suffix
            target = audio_dir / f"{sample.sample_id}{suffix}"
            audio = self.storage.get_object(sample.audio_path)
            target.write_bytes(audio)
            self.storage.put_object(f"exports/{campaign_id}/v{version}/audio/{sample.sample_id}{suffix}", audio,
                                    "audio/wav" if suffix == ".wav" else "audio/webm")
            annotations.append({"sample_id": sample.sample_id, "audio_path": str(target.relative_to(root)).replace("\\", "/"),
                "transcript": sample.transcript_snapshot, "domain": campaign.domain, "intent": sample.intent_snapshot,
                "target_emotion": sample.target_emotion_snapshot, "accent": sample.accent, "environment": sample.environment,
                "duration_ms": sample.duration_ms, "loudness_db": sample.loudness_db, "speech_rate_wps": sample.speech_rate_wps,
                "silence_ratio": sample.silence_ratio, "pitch_summary": sample.pitch_summary, "quality_score": sample.quality_score,
                "validator_status": sample.validator_status, "consent_version": sample.consent_version})
        annotations_path = root / "annotations.jsonl"
        annotations_path.write_text("\n".join(json.dumps(x, ensure_ascii=False) for x in annotations) + "\n", encoding="utf-8")
        report = {"campaign_id": campaign_id, "dataset_version": version, "sample_count": len(samples),
            "emotion_distribution": dict(Counter(x.target_emotion_snapshot for x in samples)),
            "intent_distribution": dict(Counter(x.intent_snapshot for x in samples)),
            "average_quality_score": sum(x.quality_score or 0 for x in samples) / len(samples), "generated_at": now().isoformat()}
        report_path = root / "quality_report.json"
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        card_path = root / "data_card.md"
        card_path.write_text(f"# {campaign.name}\n\nDomain: {campaign.domain}\n\n## Intended use\nVietnamese prosody research.\n\n## Collection method\nCoach-led browser recordings with FastCheck, heuristic DeepCheck, and self-review.\n\n## Labels\nTranscript, intent, emotion, accent, environment, and quality metadata.\n\n## Limitations\nEmotion analysis is heuristic and not production-grade.\n\n## Consent\nConsent version mvp-v1.\n", encoding="utf-8")
        license_path = root / "license.json"
        license_path.write_text(json.dumps({"license": "VoiceTurk MVP Research License", "consent_version": "mvp-v1"}, indent=2), encoding="utf-8")
        files = [path for path in root.rglob("*") if path.is_file()]
        manifest = {"dataset_version_id": dataset.dataset_version_id, "campaign_id": campaign_id, "version": version,
            "files": [str(path.relative_to(root)).replace("\\", "/") for path in files],
            "checksums": {str(path.relative_to(root)).replace("\\", "/"): hashlib.sha256(path.read_bytes()).hexdigest() for path in files},
            "generated_at": now().isoformat()}
        manifest_path = root / "manifest.json"
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
        manifest_hash = hashlib.sha256(manifest_path.read_bytes()).hexdigest()
        dataset.package_path, dataset.annotations_path, dataset.quality_report_path = str(root), str(annotations_path), str(report_path)
        dataset.data_card_path, dataset.manifest_path, dataset.license_path = str(card_path), str(manifest_path), str(license_path)
        dataset.manifest_hash, dataset.status = manifest_hash, DatasetVersionStatus.PROOF_PENDING
        proof = self.proof.issue_proof(dataset.dataset_version_id, manifest_hash)
        dataset.proof_network, dataset.proof_tx_signature, dataset.proof_status = proof["provider"], proof["signature"], proof["status"]
        dataset.status, campaign.status = DatasetVersionStatus.VERIFIED, CampaignStatus.DATASET_READY
        self.repo.add("datasets", dataset)
        self.repo.add("campaigns", campaign)
        return dataset.to_dict()

    def dataset_detail(self, dataset_version_id: str) -> dict[str, Any]:
        return self._required("datasets", dataset_version_id).to_dict()

    def verify_dataset(self, dataset_version_id: str, manifest_hash: str) -> dict[str, str]:
        dataset = self._required("datasets", dataset_version_id)
        matched = dataset.manifest_hash == manifest_hash and self.proof.verify_proof(dataset_version_id, manifest_hash)
        return {"result": "MATCH" if matched else "MISMATCH", "dataset_version_id": dataset_version_id}

    def issue_realtime_token(self, channel: str, uid: str, role: str) -> dict[str, Any]:
        return self.realtime.issue_token(channel, uid, role)

    def _required(self, kind: str, entity_id: str) -> Any:
        entity = self.repo.get(kind, entity_id)
        if entity is None:
            raise KeyError(f"{kind[:-1].title()} not found")
        return entity

    def _campaign(self, kind: str, campaign_id: str) -> list[Any]:
        return [value for value in self.repo.list(kind) if value.campaign_id == campaign_id]

    def _item_dto(self, item: RecordingItem) -> dict[str, Any]:
        line = self._required("script_lines", item.line_id)
        return {"item_id": item.item_id, "line_id": item.line_id, "transcript": line.transcript, "intent": line.intent,
            "target_emotion": item.target_emotion, "context_brief": line.context_brief, "status": item.status}

    def _instruction(self, item: RecordingItem) -> str:
        line = self._required("script_lines", item.line_id)
        return f"Hãy đọc câu sau với cảm xúc {item.target_emotion}: {line.transcript}"

    def _retake_count(self, campaign_id: str) -> int:
        return sum(x.status == RecordingItemStatus.NEED_RETAKE for x in self._campaign("items", campaign_id))

    def _progress(self, campaign_id: str) -> dict[str, int]:
        items = self._campaign("items", campaign_id)
        completed = sum(x.status in (RecordingItemStatus.REVIEW_PENDING, RecordingItemStatus.ACCEPTED) for x in items)
        return {"completed": completed, "total": len(items)}

    def _fast_response(self, passed: bool, reason: str, message: str, metrics: dict[str, Any], sample_id: str | None,
                       severity: str = "hard_fail", warnings: list[str] | None = None) -> dict[str, Any]:
        return {"action": "CONTINUE_NEXT" if passed else "RETAKE_NOW", "reason_code": reason,
            "severity": severity, "retry_same_item": not passed, "message_vi": message, "metrics": metrics,
            "warnings": warnings or [], "sample_id": sample_id, "next_item_available": passed}
