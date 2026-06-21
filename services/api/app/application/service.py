import hashlib
import json
import logging
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from pathlib import Path
from threading import RLock
from typing import Any, BinaryIO
from uuid import uuid4

from app.domain.entities import AudioSample, Campaign, DatasetVersion, RecordingItem, RecordingSession, ScriptLine, User, now
from app.domain.enums import (AudioSampleStatus, CampaignStatus, DatasetVersionStatus, DeepCheckDecision,
    RecordingItemStatus, RecordingSessionStatus, ScriptLineStatus, UserRole, ValidatorDecision)
from app.domain.policies import validator_states
from app.ports.providers import (CoachVoicePort, DeepCheckPort, FastCheckPort, JobQueuePort, ObjectStoragePort,
                                 ProofProviderPort, RealtimeTokenPort)
from app.ports.repositories import RepositoryPort

logger = logging.getLogger("voiceturk.pipeline")


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:10]}"


class VoiceTurkService:
    def __init__(self, repository: RepositoryPort, storage: ObjectStoragePort, fast_check: FastCheckPort,
                 deep_check: DeepCheckPort, proof: ProofProviderPort, queue: JobQueuePort,
                 realtime: RealtimeTokenPort, export_root: Path, keep_failed_uploads: bool = False,
                 presigned_expire_seconds: int = 900, fast_check_timeout_seconds: float = 15.0,
                 coach_voice: CoachVoicePort | None = None) -> None:
        self.repo, self.storage, self.fast_check = repository, storage, fast_check
        self.deep_check, self.proof, self.queue, self.realtime = deep_check, proof, queue, realtime
        self.export_root, self.keep_failed_uploads = export_root, keep_failed_uploads
        self.presigned_expire_seconds, self.fast_check_timeout_seconds = presigned_expire_seconds, fast_check_timeout_seconds
        self.coach_voice = coach_voice
        self._deep_check_lock = RLock()
        self._deep_check_in_progress: set[str] = set()

    # Unified user and campaign workflow
    def seed_demo(self) -> dict[str, Any]:
        buyer = next((x for x in self.repo.list("users") if x.email == "buyer@voiceturk.demo"), None)
        if not buyer:
            buyer = User("user_001", UserRole.BUYER, "VoiceTurk Demo Buyer", "buyer@voiceturk.demo")
            self.repo.add("users", buyer)
        existing = next((x for x in self.repo.list("campaigns") if x.name == "E-commerce Prosody Dataset"), None)
        if existing:
            return {"user_id": buyer.user_id, "campaign_id": existing.campaign_id, "status": existing.status,
                    "total_items": len(self._campaign("items", existing.campaign_id)), "created": False}
        lines = [
            {"transcript": "Tôi chưa nhận được hàng.", "intent": "delivery_delay", "context_brief": "Khách hàng đã chờ đơn hàng lâu hơn ngày dự kiến."},
            {"transcript": "Đơn hàng của tôi đang ở đâu?", "intent": "order_status", "context_brief": "Khách hàng muốn biết trạng thái hiện tại của đơn hàng."},
            {"transcript": "Tôi muốn hoàn tiền cho đơn này.", "intent": "refund_request", "context_brief": "Khách hàng không hài lòng và muốn hoàn tiền."},
            {"transcript": "Sao đơn hàng giao trễ vậy?", "intent": "delivery_delay", "context_brief": "Khách hàng khó chịu vì đơn hàng giao muộn."},
            {"transcript": "Tôi cần kiểm tra trạng thái đơn hàng.", "intent": "order_status", "context_brief": "Khách hàng cần tổng đài kiểm tra đơn giúp mình."},
        ]
        campaign = self.create_campaign({"buyer_id": buyer.user_id, "name": "E-commerce Prosody Dataset",
            "domain": "ecommerce_cskh", "target_emotions": ["neutral", "confused", "impatient", "angry"],
            "accent_targets": ["southern", "northern", "central"], "environment_targets": ["quiet", "light_noise"],
            "quality_rules": {}, "script_lines": lines})
        generated = self.generate_items(campaign["campaign_id"])
        self.activate_campaign(campaign["campaign_id"])
        return {"user_id": buyer.user_id, "campaign_id": campaign["campaign_id"], "status": CampaignStatus.ACTIVE,
                "total_items": generated["total_items"], "created": True}

    def create_campaign(self, data: dict[str, Any]) -> dict[str, Any]:
        campaign = Campaign(campaign_id=new_id("camp"), buyer_id=data["buyer_id"], name=data["name"],
            domain=data["domain"], target_emotions=data["target_emotions"], description=data.get("description", ""),
            intents=data.get("intents", []), target_sample_count=data.get("target_sample_count", 0),
            recording_instructions=data.get("recording_instructions", ""),
            accent_targets=data.get("accent_targets", []), environment_targets=data.get("environment_targets", []),
            quality_rules=data.get("quality_rules", {}))
        self.repo.add("campaigns", campaign)
        for value in data["script_lines"]:
            self.repo.add("script_lines", ScriptLine(new_id("line"), campaign.campaign_id, value["transcript"],
                value["intent"], value.get("context_brief", "")))
        return self.campaign_detail(campaign.campaign_id)

    def list_campaigns(self) -> list[dict[str, Any]]:
        return [self.campaign_detail(value.campaign_id) for value in self.repo.list("campaigns")]

    def list_buyer_campaigns(self, buyer_id: str) -> list[dict[str, Any]]:
        return [self.campaign_detail(value.campaign_id) for value in self.repo.list("campaigns")
                if value.buyer_id == buyer_id]

    def available_campaigns(self, query: str = "", domain: str = "", emotion: str = "") -> list[dict[str, Any]]:
        values = []
        for campaign in self.repo.list("campaigns"):
            if campaign.status != CampaignStatus.ACTIVE or (domain and campaign.domain != domain):
                continue
            if emotion and emotion not in campaign.target_emotions:
                continue
            if query and query.lower() not in f"{campaign.name} {getattr(campaign, 'description', '')}".lower():
                continue
            coverage = self.coverage(campaign.campaign_id)
            detail = self.campaign_detail(campaign.campaign_id)
            values.append({key: detail.get(key) for key in
                           ("campaign_id", "name", "description", "domain", "intents", "target_emotions", "status")})
            values[-1].update({"open_item_count": coverage["open_items"],
                "review_pending_count": coverage["review_pending_items"], "accepted_count": coverage["accepted_items"],
                "estimated_time_minutes": max(1, round(coverage["open_items"] * 0.75)),
                "sample_prompts": [line["transcript"] for line in detail["script_lines"][:3]]})
        return values

    def campaign_detail(self, campaign_id: str) -> dict[str, Any]:
        campaign = self._required("campaigns", campaign_id)
        result = campaign.to_dict()
        result["script_lines"] = [x.to_dict() for x in self._campaign("script_lines", campaign_id)]
        result["item_count"] = len(self._campaign("items", campaign_id))
        return result

    def update_campaign(self, campaign_id: str, changes: dict[str, Any]) -> dict[str, Any]:
        campaign = self._required("campaigns", campaign_id)
        if campaign.status not in (CampaignStatus.DRAFT, CampaignStatus.PREVIEW_READY):
            raise ValueError("Only draft or preview campaigns can be edited")
        for key, value in changes.items():
            if value is not None and hasattr(campaign, key):
                setattr(campaign, key, value)
        campaign.updated_at = now()
        self.repo.add("campaigns", campaign)
        return self.campaign_detail(campaign_id)

    def archive_campaign(self, campaign_id: str) -> dict[str, Any]:
        campaign = self._required("campaigns", campaign_id)
        if campaign.status in (CampaignStatus.ACTIVE, CampaignStatus.PREVIEW_READY, CampaignStatus.DRAFT,
                               CampaignStatus.COLLECTION_COMPLETED, CampaignStatus.DATASET_READY):
            campaign.status, campaign.updated_at = CampaignStatus.ARCHIVED, now()
            self.repo.add("campaigns", campaign)
            return {"campaign_id": campaign_id, "status": campaign.status}
        raise ValueError("Campaign cannot be archived from its current state")

    def add_script_line(self, campaign_id: str, value: dict[str, Any]) -> dict[str, Any]:
        campaign = self._required("campaigns", campaign_id)
        if campaign.status not in (CampaignStatus.DRAFT, CampaignStatus.PREVIEW_READY):
            raise ValueError("Script lines can only be added before activation")
        line = ScriptLine(new_id("line"), campaign_id, value["transcript"], value["intent"], value.get("context_brief", ""))
        self.repo.add("script_lines", line)
        return line.to_dict()

    def update_script_line(self, campaign_id: str, line_id: str, changes: dict[str, Any]) -> dict[str, Any]:
        campaign = self._required("campaigns", campaign_id)
        line = self._required("script_lines", line_id)
        if line.campaign_id != campaign_id:
            raise KeyError("Script line not found")
        if campaign.status not in (CampaignStatus.DRAFT, CampaignStatus.PREVIEW_READY):
            raise ValueError("Script lines can only be edited before activation")
        for key in ("transcript", "intent", "context_brief"):
            if changes.get(key) is not None:
                setattr(line, key, changes[key])
        line.updated_at = now()
        self.repo.add("script_lines", line)
        return line.to_dict()

    def delete_script_line(self, campaign_id: str, line_id: str) -> dict[str, Any]:
        campaign = self._required("campaigns", campaign_id)
        line = self._required("script_lines", line_id)
        if line.campaign_id != campaign_id:
            raise KeyError("Script line not found")
        if campaign.status not in (CampaignStatus.DRAFT, CampaignStatus.PREVIEW_READY):
            raise ValueError("Script lines can only be deleted before activation")
        for item in list(self._campaign("items", campaign_id)):
            if item.line_id == line_id:
                self.repo.delete("items", item.item_id)
        self.repo.delete("script_lines", line_id)
        return {"line_id": line_id, "deleted": True}

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
        assigned_entities: list[RecordingItem] = []
        for item in self._campaign("items", campaign_id):
            if item.status == RecordingItemStatus.OPEN:
                item.status, item.assigned_to, item.assigned_at = RecordingItemStatus.ASSIGNED, contributor_id, now()
                self.repo.add("items", item)
                assigned_entities.append(item)
                items.append(self._item_dto(item))
        realtime = {"provider": "browser_tts", "agora_channel": None, "agora_token": None,
            "agora_app_id": None, "uid": contributor_id, "coach_provider": "browser_tts",
            "convoai_available": False, "coach_status": "fallback", "coach_session_id": None,
            "agora_agent_uid": None}
        if self.realtime.configured():
            token = self.realtime.issue_token(f"vt_{session.session_id}", contributor_id, "publisher")
            coach_result = None
            if self.coach_voice and self.coach_voice.configured():
                first_item = assigned_entities[0] if assigned_entities else None
                first_line = self._required("script_lines", first_item.line_id) if first_item else None
                task_context = ({"transcript": first_line.transcript, "target_emotion": first_item.target_emotion,
                    "context_brief": first_line.context_brief, "instruction": self._instruction(first_item)} if first_item else
                    {"instruction": "Hãy chuẩn bị thu âm câu trên màn hình."})
                try:
                    coach_result = self.coach_voice.start_coach_session(session.session_id, token["channel"],
                        contributor_id, task_context)
                except Exception as exc:
                    logger.warning(json.dumps({"event": "coach_start_fallback", "session_id": session.session_id,
                        "error_type": type(exc).__name__}))
                if coach_result and coach_result.coach_session_id:
                    session.agora_session_id = coach_result.coach_session_id
                    self.repo.add("sessions", session)
            realtime = {"provider": "agora_convoai" if self.coach_voice and self.coach_voice.configured() else "agora",
                        "realtime_provider": "agora_convoai" if self.coach_voice and self.coach_voice.configured() else "agora",
                        "agora_channel": token["channel"], "agora_token": token["token"],
                        "agora_app_id": token["app_id"], "uid": contributor_id, "expires_at": token["expires_at"],
                        "agora_uid": contributor_id,
                        "coach_provider": "agora_convoai" if coach_result and coach_result.available else "browser_tts_fallback",
                        "convoai_available": bool(coach_result and coach_result.available),
                        "coach_status": coach_result.status if coach_result else "fallback",
                        "coach_session_id": coach_result.coach_session_id if coach_result else None,
                        "agora_agent_uid": coach_result.agent_uid if coach_result else None}
        return {"session_id": session.session_id, "campaign_id": campaign_id, "contributor_id": contributor_id,
                "status": session.status, "realtime": realtime, "items": items}

    def session_items(self, session_id: str) -> list[dict[str, Any]]:
        session = self._required("sessions", session_id)
        return [self._item_dto(x) for x in self._campaign("items", session.campaign_id)
                if x.assigned_to == session.contributor_id and x.status in (RecordingItemStatus.ASSIGNED, RecordingItemStatus.NEED_RETAKE)]

    def session_detail(self, session_id: str) -> dict[str, Any]:
        return self._required("sessions", session_id).to_dict()

    def next_action(self, session_id: str) -> dict[str, Any]:
        session = self._required("sessions", session_id)
        items = self._campaign("items", session.campaign_id)
        samples = [value for value in self.repo.list("samples") if value.session_id == session_id]
        def debug(reason: str) -> dict[str, Any]:
            return {"session_id": session_id, "campaign_id": session.campaign_id,
                "assigned_count": sum(x.assigned_to == session.contributor_id and x.status == RecordingItemStatus.ASSIGNED for x in items),
                "open_count": sum(x.status == RecordingItemStatus.OPEN for x in items),
                "review_pending_count": sum(x.status == RecordingItemStatus.REVIEW_PENDING for x in items),
                "need_retake_count": sum(x.status == RecordingItemStatus.NEED_RETAKE for x in items),
                "accepted_count": sum(x.status == RecordingItemStatus.ACCEPTED for x in items),
                "submitted_in_session_count": len(samples), "reason": reason}
        def response(action: str, item: RecordingItem | None, message: str, reason: str,
                     feedback_context: dict[str, Any] | None = None) -> dict[str, Any]:
            value = {"action": action, "item": self._item_dto(item) if item else None,
                "coach_message_vi": message, "retake_count": self._retake_count(session.campaign_id),
                "feedback_context": feedback_context, "progress": self._progress(session.campaign_id),
                "debug": debug(reason)}
            self._log("next_action_decided", action=action, reason_code=reason, **value["debug"])
            return value
        if session.status != RecordingSessionStatus.ACTIVE:
            return response("SESSION_COMPLETE", None, "Phiên thu đã kết thúc.", "session is not active")
        if not items:
            return response("ERROR", None, "Chiến dịch chưa có câu thu âm. Bạn hãy tạo danh sách câu trước.", "campaign has no items")
        normal = next((x for x in items if x.assigned_to == session.contributor_id and x.status == RecordingItemStatus.ASSIGNED), None)
        if normal:
            return response("START_ITEM", normal, self._instruction(normal), "assigned item available")
        open_item = next((x for x in items if x.status == RecordingItemStatus.OPEN), None)
        if open_item:
            open_item.status, open_item.assigned_to, open_item.assigned_at = RecordingItemStatus.ASSIGNED, session.contributor_id, now()
            self.repo.add("items", open_item)
            return response("START_ITEM", open_item, self._instruction(open_item), "open item assigned to active session")
        retake = next((x for x in items if x.status == RecordingItemStatus.NEED_RETAKE), None)
        if retake:
            retake_sample = next((x for x in reversed(self.repo.list("samples"))
                if x.item_id == retake.item_id and x.status == AudioSampleStatus.NEED_RETAKE), None)
            retake.status, retake.assigned_to, retake.assigned_at = RecordingItemStatus.ASSIGNED, session.contributor_id, now()
            self.repo.add("items", retake)
            return response("RETAKE_ITEM", retake,
                retake_sample.deep_check_message_vi if retake_sample and retake_sample.deep_check_message_vi else
                "Mình thấy có câu cần thu lại để dữ liệu tốt hơn. Mình sẽ hướng dẫn bạn đọc lại ngay bây giờ.",
                "retake item assigned", retake_sample.deep_check_feedback_context if retake_sample else None)
        checking = any(x.campaign_id == session.campaign_id and x.status == AudioSampleStatus.CHECKING for x in self.repo.list("samples"))
        if checking:
            return response("WAIT_DEEPCHECK", None, "DeepCheck đang xử lý nền.", "samples are still checking")
        current_debug = debug("completion evaluation")
        if current_debug["assigned_count"] or current_debug["open_count"]:
            return response("WAITING_FOR_RECORDING", None, "Phiên vẫn còn câu chưa thu. Hãy thử tải lại câu tiếp theo.",
                            "unrecorded items remain")
        return response("SESSION_COMPLETE", None, "Bạn đã hoàn thành các câu hiện có.", "no assigned, open, or retake items remain")

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
        coach = self.stop_coach_session(session_id)
        for item in self._campaign("items", session.campaign_id):
            if item.assigned_to == session.contributor_id and item.status == RecordingItemStatus.ASSIGNED:
                item.status, item.assigned_to, item.assigned_at = RecordingItemStatus.OPEN, None, None
                self.repo.add("items", item)
        session.status, session.ended_at = RecordingSessionStatus.COMPLETED, now()
        self.repo.add("sessions", session)
        return {"session_id": session_id, "status": session.status, "coach_status": coach["status"]}

    def coach_status(self, session_id: str) -> dict[str, Any]:
        session = self._required("sessions", session_id)
        if not self.coach_voice:
            return {"available": False, "provider": "browser_tts", "status": "fallback",
                    "coach_session_id": None, "agent_uid": None}
        return self.coach_voice.get_coach_status(session_id, session.agora_session_id).to_dict()

    def speak_coach(self, session_id: str, kind: str, message: str,
                    feedback_context: dict[str, Any] | None = None) -> dict[str, Any]:
        session = self._required("sessions", session_id)
        if session.status != RecordingSessionStatus.ACTIVE or not self.coach_voice:
            return {"available": False, "provider": "browser_tts", "status": "fallback",
                    "coach_session_id": session.agora_session_id, "agent_uid": None}
        safe_message = message.strip()[:1000]
        if not safe_message:
            raise ValueError("Coach message is required")
        if kind == "feedback":
            source = feedback_context or {}
            safe_context = {key: source.get(key) for key in ("sample_id", "item_id", "decision", "reason_codes",
                "target_transcript", "asr_transcript", "missing_words", "extra_words", "target_emotion",
                "context_brief", "metrics", "coach_constraints")}
            safe_context["message_vi"] = safe_message
            result = self.coach_voice.speak_feedback(session_id, safe_context, session.agora_session_id)
        else:
            result = self.coach_voice.speak_instruction(session_id, {"instruction": safe_message},
                                                        session.agora_session_id)
        return result.to_dict()

    def stop_coach_session(self, session_id: str) -> dict[str, Any]:
        session = self._required("sessions", session_id)
        if not self.coach_voice:
            return {"available": False, "provider": "browser_tts", "status": "stopped",
                    "coach_session_id": session.agora_session_id, "agent_uid": None}
        return self.coach_voice.stop_coach_session(session_id, session.agora_session_id).to_dict()

    # Temporary upload -> FastCheck -> official sample
    def init_upload(self, data: dict[str, Any]) -> dict[str, Any]:
        self._log("upload_init_received", session_id=data.get("session_id"), item_id=data.get("item_id"))
        session = self._required("sessions", data["session_id"])
        item = self._required("items", data["item_id"])
        if session.status != RecordingSessionStatus.ACTIVE or item.status != RecordingItemStatus.ASSIGNED:
            raise ValueError("Session or item is not ready for upload")
        if item.campaign_id != session.campaign_id or item.assigned_to != session.contributor_id:
            raise ValueError("Session, item, and contributor assignment do not match")
        if data.get("content_type") not in ("audio/wav", "audio/x-wav", "audio/wave"):
            raise ValueError("Only PCM WAV audio is supported")
        suffix = Path(data.get("filename") or "recording.wav").suffix.lower() or ".wav"
        if suffix != ".wav":
            raise ValueError("Audio filename must use the .wav extension")
        upload_id = new_id("upload")
        object_key = f"tmp/audio/{session.session_id}/{item.item_id}/{uuid4().hex}{suffix}"
        upload = {"upload_id": upload_id, "session_id": session.session_id, "item_id": item.item_id,
            "object_key": object_key, "filename": data.get("filename") or f"recording{suffix}",
            "content_type": data.get("content_type") or "audio/wav", "size_bytes": data.get("size_bytes", 0),
            "status": "INITIALIZED", "created_at": now()}
        self.repo.add("uploads", upload)
        presigned = self.storage.create_presigned_put_url(object_key, upload["content_type"], self.presigned_expire_seconds)
        self._log("presigned_url_created", session_id=session.session_id, item_id=item.item_id,
                  upload_id=upload_id, object_key=object_key)
        return {"upload_id": upload_id, "object_key": object_key,
            "upload_url": presigned or f"/audio/uploads/{upload_id}/content", "upload_method": "PUT",
            "expires_in": self.presigned_expire_seconds}

    def put_upload(self, upload_id: str, data: bytes, content_type: str | None = None) -> dict[str, Any]:
        upload = self._required("uploads", upload_id)
        self.storage.put_object(upload["object_key"], data, content_type or upload["content_type"])
        upload["status"], upload["size_bytes"] = "UPLOADED", len(data)
        self.repo.add("uploads", upload)
        return {"upload_id": upload_id, "status": upload["status"], "size_bytes": len(data)}

    def complete_upload(self, data: dict[str, Any]) -> tuple[dict[str, Any], AudioSample | None]:
        complete_started_at = time.perf_counter()
        upload = self._required("uploads", data["upload_id"])
        context = {"session_id": data.get("session_id"), "item_id": data.get("item_id"),
                   "upload_id": data.get("upload_id"), "object_key": data.get("object_key")}
        self._log("upload_complete_received", **context)
        if upload["session_id"] != data["session_id"] or upload["item_id"] != data["item_id"] or upload["object_key"] != data["object_key"]:
            raise ValueError("Upload completion does not match initialized upload")
        self._log("object_exists_check_started", **context)
        exists = self.storage.object_exists(upload["object_key"])
        self._log("object_exists_check_finished", **context, object_exists=exists)
        if not exists:
            response = self._fast_response(False, "UPLOAD_OBJECT_NOT_FOUND",
                "Không tìm thấy file audio vừa upload. Bạn thử gửi lại câu này nhé.", {}, None)
            self._log("complete_response_returned", **context, action=response["action"], reason_code=response["reason_code"])
            return response, None
        item = self._required("items", upload["item_id"])
        session = self._required("sessions", upload["session_id"])
        audio = self.storage.get_object(upload["object_key"])
        self._log("fastcheck_started", **context)
        fastcheck_started_at = time.perf_counter()
        executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="fastcheck")
        future = executor.submit(self.fast_check.check, audio, upload["filename"], upload["content_type"], data.get("client_metrics"))
        try:
            result = future.result(timeout=self.fast_check_timeout_seconds)
        except FutureTimeoutError:
            future.cancel()
            upload["status"] = "FAST_CHECK_TIMEOUT"
            self.repo.add("uploads", upload)
            if not self.keep_failed_uploads:
                self.storage.delete_object(upload["object_key"])
            response = self._fast_response(False, "FAST_CHECK_TIMEOUT",
                "Kiểm tra audio hơi lâu. Bạn thử gửi lại câu này nhé.", {}, None)
            self._log("fastcheck_finished", **context, action=response["action"], reason_code=response["reason_code"],
                      fastcheck_duration_ms=round((time.perf_counter() - fastcheck_started_at) * 1000))
            self._log("complete_response_returned", **context, action=response["action"], reason_code=response["reason_code"])
            return response, None
        finally:
            executor.shutdown(wait=False, cancel_futures=True)
        self._log("fastcheck_finished", **context, action="CONTINUE_NEXT" if result.passed else "RETAKE_NOW",
                  reason_code=result.reason_code, duration_ms=result.metrics.get("duration_ms"),
                  fastcheck_duration_ms=round((time.perf_counter() - fastcheck_started_at) * 1000))
        if not result.passed:
            upload["status"] = "FAST_CHECK_FAILED"
            self.repo.add("uploads", upload)
            if not self.keep_failed_uploads:
                self.storage.delete_object(upload["object_key"])
            response = self._fast_response(False, result.reason_code, result.message_vi, result.metrics, None, result.severity, result.warnings)
            self._log("complete_response_returned", **context, action=response["action"], reason_code=response["reason_code"],
                      duration_ms=result.metrics.get("duration_ms"))
            return response, None
        line = self._required("script_lines", item.line_id)
        sample_id = new_id("sample")
        suffix = Path(upload["filename"]).suffix.lower() or ".wav"
        official_key = f"audio/{item.campaign_id}/{item.item_id}/{sample_id}{suffix}"
        self.storage.copy_object(upload["object_key"], official_key)
        self.storage.delete_object(upload["object_key"])
        self._log("audio_promoted_to_official", **context, official_object_key=official_key, sample_id=sample_id)
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
        self._log("audio_sample_created", **context, sample_id=sample_id, official_object_key=official_key)
        item.status = RecordingItemStatus.REVIEW_PENDING
        self.repo.add("items", item)
        upload["status"], upload["official_object_key"], upload["sample_id"] = "COMPLETED", official_key, sample_id
        self.repo.add("uploads", upload)
        self.queue.enqueue(sample_id)
        self._log("deepcheck_enqueued", **context, sample_id=sample_id, official_object_key=official_key)
        response = self._fast_response(True, result.reason_code, result.message_vi, result.metrics, sample_id, result.severity, result.warnings)
        self._log("complete_response_returned", **context, sample_id=sample_id, official_object_key=official_key,
                  action=response["action"], reason_code=response["reason_code"], duration_ms=result.metrics.get("duration_ms"),
                  total_complete_duration_ms=round((time.perf_counter() - complete_started_at) * 1000))
        return response, sample

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
    def run_pending_deep_checks(self, limit: int = 100, source: str = "manual_endpoint") -> dict[str, Any]:
        recovered = 0
        for sample in self.repo.list("samples"):
            if sample.status == AudioSampleStatus.CHECKING:
                recovered += int(self.queue.enqueue(sample.sample_id))
        processed, results = 0, []
        while processed < limit and (sample_id := self.queue.pop()):
            results.append(self.process_one_deep_check(sample_id, source=source))
            processed += 1
        return {"processed": processed, "recovered": recovered, "pending": self.queue.size(), "results": results}

    def process_one_deep_check(self, sample_id: str, source: str = "auto_worker") -> dict[str, Any]:
        started_at = time.perf_counter()
        with self._deep_check_lock:
            if sample_id in self._deep_check_in_progress:
                return {"sample_id": sample_id, "skipped": True, "reason_code": "ALREADY_PROCESSING"}
            self._deep_check_in_progress.add(sample_id)
        try:
            return self._process_one_deep_check(sample_id, source, started_at)
        finally:
            with self._deep_check_lock:
                self._deep_check_in_progress.discard(sample_id)

    def _process_one_deep_check(self, sample_id: str, source: str, started_at: float) -> dict[str, Any]:
        sample = self._required("samples", sample_id)
        if sample.status != AudioSampleStatus.CHECKING:
            return {"sample_id": sample_id, "status": sample.status, "skipped": True}
        item = self._required("items", sample.item_id)
        old_status = sample.status
        try:
            result = self.deep_check.analyze(sample, self.storage.get_object(sample.audio_path))
            sample.deep_check_status, sample.deep_check_reason_code = result.decision.value, result.reason_code
            sample.deep_check_reason_codes = result.reason_codes
            sample.deep_check_message_vi, sample.deep_checked_at = result.feedback_vi, now()
            sample.deep_check_technical_metrics = result.technical_metrics
            sample.deep_check_transcript_metrics = result.transcript_metrics
            sample.deep_check_prosody_metrics = result.prosody_metrics
            sample.deep_check_checks_available = result.checks_available
            sample.deep_check_score_components = result.score_components
            feedback_context = dict(result.feedback_context)
            feedback_context.setdefault("sample_id", sample.sample_id)
            feedback_context.setdefault("item_id", sample.item_id)
            feedback_context.setdefault("target_transcript", sample.transcript_snapshot)
            feedback_context.setdefault("target_emotion", sample.target_emotion_snapshot)
            feedback_context.setdefault("context_brief", self._required("script_lines", sample.line_id).context_brief)
            sample.deep_check_feedback_context = feedback_context
            sample.quality_score = result.quality_score
            if result.decision == DeepCheckDecision.PASS_TO_REVIEW:
                sample.status = AudioSampleStatus.REVIEW_PENDING
            elif result.decision == DeepCheckDecision.NEED_RETAKE_LATER:
                sample.status, item.status = AudioSampleStatus.NEED_RETAKE, RecordingItemStatus.NEED_RETAKE
            else:
                sample.status, item.status = AudioSampleStatus.REJECTED, RecordingItemStatus.OPEN
        except FileNotFoundError:
            sample.status, item.status = AudioSampleStatus.REJECTED, RecordingItemStatus.OPEN
            sample.deep_check_status, sample.deep_check_reason_code = DeepCheckDecision.REJECT, "AUDIO_FILE_MISSING"
            sample.deep_check_reason_codes = ["AUDIO_FILE_MISSING", "TEXT_CHECK_NOT_AVAILABLE", "PROSODY_NOT_CHECKED"]
            sample.deep_check_message_vi = "Không tìm thấy file âm thanh chính thức. Câu đã được mở lại để thu."
            sample.deep_checked_at = now()
        except Exception as exc:
            sample.deep_check_retry_count += 1
            sample.deep_check_status, sample.deep_check_reason_code = "RETRY_PENDING", "DEEP_CHECK_TEMPORARY_ERROR"
            sample.deep_check_reason_codes = ["DEEP_CHECK_TEMPORARY_ERROR"]
            sample.deep_check_message_vi = "DeepCheck tạm thời lỗi và sẽ tự thử lại."
            logger.exception(json.dumps({"event": "deepcheck_retry_scheduled", "sample_id": sample_id,
                "source": source, "retry_count": sample.deep_check_retry_count, "error_type": type(exc).__name__}))
        self.repo.add("samples", sample)
        self.repo.add("items", item)
        runtime_ms = round((time.perf_counter() - started_at) * 1000)
        self._log("deepcheck_finished", sample_id=sample_id, source=source, decision=sample.deep_check_status,
            reason_codes=sample.deep_check_reason_codes, technical_metrics=sample.deep_check_technical_metrics,
            runtime_ms=runtime_ms, retry_count=sample.deep_check_retry_count)
        if old_status != sample.status:
            self._log("sample_state_transition", sample_id=sample_id, old_status=old_status,
                new_status=sample.status, reason=sample.deep_check_reason_code)
        return {"sample_id": sample_id, "status": sample.status, "decision": sample.deep_check_status,
                "reason_code": sample.deep_check_reason_code, "reason_codes": sample.deep_check_reason_codes}

    def deep_check_status(self) -> dict[str, Any]:
        counts = Counter(x.status.value for x in self.repo.list("samples"))
        return {"queued": self.queue.size(), "checking": counts[AudioSampleStatus.CHECKING],
                "review_pending": counts[AudioSampleStatus.REVIEW_PENDING], "need_retake": counts[AudioSampleStatus.NEED_RETAKE]}

    def retry_deep_check(self, sample_id: str) -> dict[str, Any]:
        sample = self._required("samples", sample_id)
        if sample.deep_check_status not in {"ERROR", "RETRY_PENDING"}:
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
                "reason_codes": sample.deep_check_reason_codes, "message_vi": sample.deep_check_message_vi,
                "quality_score": sample.quality_score, "technical_metrics": sample.deep_check_technical_metrics,
                "transcript_metrics": sample.deep_check_transcript_metrics,
                "prosody_metrics": sample.deep_check_prosody_metrics,
                "checks_available": sample.deep_check_checks_available,
                "score_components": sample.deep_check_score_components,
                "feedback_context": sample.deep_check_feedback_context,
                "retry_count": sample.deep_check_retry_count}}

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
        card_path.write_text(f"# {campaign.name}\n\nDomain: {campaign.domain}\n\n## Intended use\nVietnamese prosody research.\n\n## Collection method\nCoach-led browser recordings with FastCheck, model-free technical DeepCheck, and Validator review.\n\n## Labels\nTranscript, intent, target emotion, accent, environment, and measured quality metadata.\n\n## Limitations\nASR, alignment, and prosody/emotion verification are not configured; target emotion is a requested label, not a detected result.\n\n## Consent\nConsent version mvp-v1.\n", encoding="utf-8")
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

    def storage_health(self) -> dict[str, Any]:
        info = self.storage.diagnostics()
        key = f"diagnostics/health/{uuid4().hex}.txt"
        can_put = can_get_put = can_get_get = False
        warnings = list(info.get("warnings", []))
        try:
            self.storage.put_object(key, b"voiceturk-storage-health", "text/plain")
            can_put = self.storage.object_exists(key) and self.storage.get_object_metadata(key).get("size_bytes", 0) > 0
            can_get_put = bool(self.storage.create_presigned_put_url(key, "text/plain", 60))
            can_get_get = bool(self.storage.create_presigned_get_url(key, 60))
        except Exception as exc:
            warnings.append(f"STORAGE_HEALTH_FAILED: {type(exc).__name__}: {exc}")
        finally:
            try:
                self.storage.delete_object(key)
            except Exception:
                pass
        return {**info, "bucket_exists": True if info["provider"] == "minio" else None,
                "can_put_object": can_put, "can_generate_presigned_put": can_get_put,
                "can_generate_presigned_get": can_get_get, "warnings": warnings}

    def debug_storage_upload_init(self, content_type: str = "text/plain") -> dict[str, Any]:
        probe_id = new_id("storage_probe")
        object_key = f"diagnostics/browser/{uuid4().hex}.txt"
        probe = {"probe_id": probe_id, "object_key": object_key, "content_type": content_type, "status": "INITIALIZED"}
        self.repo.add("storage_probes", probe)
        presigned = self.storage.create_presigned_put_url(object_key, content_type, self.presigned_expire_seconds)
        return {"probe_id": probe_id, "object_key": object_key,
                "upload_url": presigned or f"/debug/storage/uploads/{probe_id}/content",
                "expires_in": self.presigned_expire_seconds}

    def debug_storage_upload_put(self, probe_id: str, data: bytes, content_type: str) -> dict[str, Any]:
        probe = self._required("storage_probes", probe_id)
        self.storage.put_object(probe["object_key"], data, content_type)
        probe["status"] = "UPLOADED"
        self.repo.add("storage_probes", probe)
        return {"probe_id": probe_id, "status": probe["status"], "size_bytes": len(data)}

    def debug_storage_upload_verify(self, probe_id: str) -> dict[str, Any]:
        probe = self._required("storage_probes", probe_id)
        exists = self.storage.object_exists(probe["object_key"])
        metadata = self.storage.get_object_metadata(probe["object_key"]) if exists else None
        if exists:
            self.storage.delete_object(probe["object_key"])
        self.repo.delete("storage_probes", probe_id)
        return {"probe_id": probe_id, "object_key": probe["object_key"], "exists": exists,
                "metadata": metadata, "cleaned_up": exists}

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

    def _log(self, event: str, **fields: Any) -> None:
        logger.info(json.dumps({"event": event, **{key: value for key, value in fields.items() if value is not None}},
                               ensure_ascii=False, default=str))
