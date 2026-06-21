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
from app.application.errors import RecordingFlowError
from app.ports.providers import (CoachVoicePort, CoachVoiceResult, DeepCheckPort, FastCheckPort, JobQueuePort, ObjectStoragePort,
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
                 coach_voice: CoachVoicePort | None = None, realtime_provider: str | None = None,
                 allow_coach_fallback: bool = False) -> None:
        self.repo, self.storage, self.fast_check = repository, storage, fast_check
        self.deep_check, self.proof, self.queue, self.realtime = deep_check, proof, queue, realtime
        self.export_root, self.keep_failed_uploads = export_root, keep_failed_uploads
        self.presigned_expire_seconds, self.fast_check_timeout_seconds = presigned_expire_seconds, fast_check_timeout_seconds
        self.coach_voice = coach_voice
        self.realtime_provider = realtime_provider or ("agora" if realtime.configured() else "browser_tts")
        self.allow_coach_fallback = allow_coach_fallback
        self._deep_check_lock = RLock()
        self._deep_check_in_progress: set[str] = set()
        self._upload_lock = RLock()

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
        for item in self._campaign("items", campaign_id):
            if item.status == RecordingItemStatus.OPEN:
                item.status, item.assigned_to, item.assigned_at = RecordingItemStatus.ASSIGNED, contributor_id, now()
                self.repo.add("items", item)
                items.append(self._item_dto(item))
                break
        import zlib
        contributor_rtc_uid = str(100000 + (zlib.crc32(session.session_id.encode("utf-8")) % 1000000))
        realtime = {"provider": "browser_tts", "agora_channel": None, "agora_token": None,
            "agora_app_id": None, "uid": contributor_id, "coach_provider": "browser_tts",
            "contributor_rtc_uid": contributor_rtc_uid, "convoai_available": False,
            "agent_join_status": "not_applicable", "agent_rtc_uid": None,
            "agent_session_id": None, "agent_join_error_code": None,
            "agent_join_message": None, "expected_agent_uid": None,
            "allow_coach_fallback": self.allow_coach_fallback}
        if self.realtime_provider == "agora":
            channel = f"vt_session_{session.session_id}"
            token = None
            coach_result = None
            agent_rtc_uid = (self.coach_voice.agent_rtc_uid(session.session_id, contributor_rtc_uid)
                             if self.coach_voice else None)
            if self.realtime.configured():
                token = self.realtime.issue_token(channel, contributor_rtc_uid, "publisher")
            if self.realtime.configured() and self.coach_voice and self.coach_voice.configured() and agent_rtc_uid:
                try:
                    if agent_rtc_uid == contributor_rtc_uid:
                        raise RuntimeError("Agent RTC UID must differ from contributor RTC UID")
                    agent_token = self.realtime.issue_token(channel, agent_rtc_uid, "publisher")
                    coach_result = self.coach_voice.join_agent(session.session_id, channel,
                                                               agent_rtc_uid, agent_token["token"], contributor_rtc_uid)
                except Exception as exc:
                    logger.warning(json.dumps({"event": "agora.agent.join.failed",
                        "session_id": session.session_id, "channel": channel,
                        "agent_rtc_uid": agent_rtc_uid,
                        "error_code": "AGORA_AGENT_START_FAILED",
                        "error_message": f"{type(exc).__name__}: {str(exc)[:240]}"}))
                    coach_result = CoachVoiceResult(False, "agora_agent", "failed",
                        "Agora Agent Studio could not start.", agent_rtc_uid,
                        error_code="AGORA_AGENT_START_FAILED")
            elif self.coach_voice:
                coach_result = self.coach_voice.join_agent(session.session_id, channel,
                                                            agent_rtc_uid or "", "", contributor_rtc_uid)
            if coach_result and coach_result.available:
                session.agora_session_id = coach_result.agent_session_id
                self.repo.add("sessions", session)
            coach_provider = ("agora_agent" if coach_result and coach_result.available else
                "browser_tts_fallback" if self.allow_coach_fallback else "agora_agent_failed")
            realtime = {"provider": "agora", "agora_channel": channel,
                        "agora_token": token["token"] if token else None,
                        "agora_app_id": token["app_id"] if token else None,
                        "uid": contributor_id, "expires_at": token["expires_at"] if token else None,
                        "contributor_rtc_uid": contributor_rtc_uid,
                        "coach_provider": coach_provider,
                        "convoai_available": bool(coach_result and coach_result.available),
                        "agent_join_status": coach_result.status if coach_result else "config_missing",
                        "agent_rtc_uid": coach_result.agent_rtc_uid if coach_result else agent_rtc_uid,
                        "expected_agent_uid": coach_result.agent_rtc_uid if coach_result else agent_rtc_uid,
                        "agent_session_id": coach_result.agent_session_id if coach_result else None,
                        "agent_join_error_code": coach_result.error_code if coach_result else "MISSING_AGORA_AGENT_CONFIG",
                        "agent_join_message": coach_result.message if coach_result else "Agora Agent Studio config is missing.",
                        "allow_coach_fallback": self.allow_coach_fallback}
        return {"session_id": session.session_id, "campaign_id": campaign_id, "contributor_id": contributor_id,
                "status": session.status, "realtime": realtime,
                "agora_channel": realtime["agora_channel"],
                "contributor_rtc_uid": realtime["contributor_rtc_uid"],
                "agora_token": realtime["agora_token"],
                "coach_provider": realtime["coach_provider"],
                "agent_join_status": realtime["agent_join_status"],
                "agent_rtc_uid": realtime["agent_rtc_uid"],
                "expected_agent_uid": realtime["expected_agent_uid"], "items": items}

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
            code = {"START_ITEM": "ITEM_READY", "RETAKE_ITEM": "RETAKE_ITEM_READY",
                "WAIT_DEEPCHECK": "DEEP_CHECK_PENDING", "WAITING_FOR_RECORDING": "SYNC_SESSION",
                "SESSION_COMPLETE": "SESSION_COMPLETED", "ERROR": "INVALID_RECORDING_STATE"}.get(action, action)
            value = {"action": action, "code": code, "item": self._item_dto(item) if item else None,
                "next_item": self._item_dto(item) if item else None, "coach_message_vi": message,
                "message_vi": message, "session_id": session_id, "item_id": item.item_id if item else None,
                "sample_id": None, "retry_same_item": action == "RETAKE_ITEM",
                "retake_count": self._retake_count(session.campaign_id),
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
        for item in self._campaign("items", session.campaign_id):
            if item.assigned_to == session.contributor_id and item.status == RecordingItemStatus.ASSIGNED:
                item.status, item.assigned_to, item.assigned_at = RecordingItemStatus.OPEN, None, None
                self.repo.add("items", item)
        session.status, session.ended_at = RecordingSessionStatus.COMPLETED, now()
        self.repo.add("sessions", session)
        return {"session_id": session_id, "status": session.status}

    def _recording_upload_entities(self, session_id: str | None, item_id: str | None,
                                   request_id: str | None = None) -> tuple[RecordingSession, RecordingItem]:
        session = self.repo.get("sessions", session_id) if session_id else None
        if not session:
            raise RecordingFlowError(404, "SESSION_NOT_FOUND", "Recording session not found",
                "Không tìm thấy phiên thu âm. Hệ thống sẽ đồng bộ lại.", session_id=session_id,
                item_id=item_id, request_id=request_id)
        item = self.repo.get("items", item_id) if item_id else None
        if not item:
            raise RecordingFlowError(404, "ITEM_NOT_FOUND", "Recording item not found",
                "Không tìm thấy câu thu âm. Hệ thống sẽ đồng bộ lại.", session_id=session_id,
                item_id=item_id, debug={"session_status": session.status}, request_id=request_id)
        return session, item

    def _validate_recording_upload_state(self, session: RecordingSession, item: RecordingItem,
                                         request_id: str | None = None) -> None:
        debug = {"session_status": session.status, "item_status": item.status}
        if session.status != RecordingSessionStatus.ACTIVE:
            if session.status == RecordingSessionStatus.STARTED:
                code, message = "SESSION_NOT_READY_FOR_UPLOAD", "Phiên thu chưa sẵn sàng. Hệ thống sẽ đồng bộ lại."
            elif session.status == RecordingSessionStatus.COMPLETED:
                code, message = "SESSION_ALREADY_COMPLETED", "Phiên thu đã hoàn thành. Hệ thống sẽ đồng bộ lại."
            else:
                code, message = "SESSION_NOT_ACTIVE", "Phiên thu không còn hoạt động. Hệ thống sẽ đồng bộ lại."
            debug["expected_session_status"] = RecordingSessionStatus.ACTIVE
            debug["expected_status"] = RecordingSessionStatus.ACTIVE
            raise RecordingFlowError(409, code, "Recording session is not ready for upload", message,
                session_id=session.session_id, item_id=item.item_id, debug=debug, request_id=request_id)
        if item.campaign_id != session.campaign_id or item.assigned_to != session.contributor_id:
            debug["expected_contributor_id"] = session.contributor_id
            raise RecordingFlowError(409, "ITEM_NOT_ASSIGNED_TO_SESSION",
                "Recording item is not assigned to this session",
                "Câu thu âm không thuộc phiên hiện tại. Hệ thống sẽ đồng bộ lại.",
                session_id=session.session_id, item_id=item.item_id, debug=debug, request_id=request_id)
        if item.status != RecordingItemStatus.ASSIGNED:
            existing = next((sample for sample in reversed(self.repo.list("samples"))
                             if sample.item_id == item.item_id), None)
            code = "ITEM_ALREADY_SUBMITTED" if item.status in {
                RecordingItemStatus.REVIEW_PENDING, RecordingItemStatus.ACCEPTED} else "ITEM_NOT_READY_FOR_UPLOAD"
            message = ("Câu này đã được gửi trước đó. Hệ thống sẽ đồng bộ lại." if code == "ITEM_ALREADY_SUBMITTED" else
                       "Câu hiện tại chưa sẵn sàng để upload. Hệ thống sẽ đồng bộ lại phiên thu.")
            debug["expected_item_status"] = RecordingItemStatus.ASSIGNED
            debug["expected_status"] = RecordingItemStatus.ASSIGNED
            raise RecordingFlowError(409, code, "Session or item is not ready for upload", message,
                session_id=session.session_id, item_id=item.item_id,
                sample_id=existing.sample_id if existing else None, debug=debug, request_id=request_id)

    # Temporary upload -> FastCheck -> official sample
    def init_upload(self, data: dict[str, Any]) -> dict[str, Any]:
        session, item = self._recording_upload_entities(data.get("session_id"), data.get("item_id"), data.get("request_id"))
        self._validate_recording_upload_state(session, item, data.get("request_id"))
        self._log("upload_init_received", request_id=data.get("request_id"), session_id=session.session_id,
            item_id=item.item_id, contributor_id=session.contributor_id, session_status=session.status,
            item_status=item.status)
        if data.get("content_type") not in ("audio/wav", "audio/x-wav", "audio/wave"):
            raise ValueError("Only PCM WAV audio is supported")
        suffix = Path(data.get("filename") or "recording.wav").suffix.lower() or ".wav"
        if suffix != ".wav":
            raise ValueError("Audio filename must use the .wav extension")
        attempt_id = data.get("client_attempt_id")
        if attempt_id:
            existing = next((value for value in self.repo.list("uploads") if
                value.get("session_id") == session.session_id and value.get("item_id") == item.item_id and
                value.get("client_attempt_id") == attempt_id), None)
            if existing:
                presigned = self.storage.create_presigned_put_url(existing["object_key"], existing["content_type"],
                                                                  self.presigned_expire_seconds)
                return {"action": "CONTINUE_UPLOAD", "code": "UPLOAD_ALREADY_INITIALIZED",
                    "message_vi": "Lượt upload đã được khởi tạo.", "upload_id": existing["upload_id"],
                    "object_key": existing["object_key"],
                    "upload_url": presigned or f"/audio/uploads/{existing['upload_id']}/content",
                    "upload_method": "PUT", "expires_in": self.presigned_expire_seconds}
        upload_id = new_id("upload")
        object_key = f"tmp/audio/{session.session_id}/{item.item_id}/{uuid4().hex}{suffix}"
        upload = {"upload_id": upload_id, "session_id": session.session_id, "item_id": item.item_id,
            "object_key": object_key, "filename": data.get("filename") or f"recording{suffix}",
            "content_type": data.get("content_type") or "audio/wav", "size_bytes": data.get("size_bytes", 0),
            "status": "INITIALIZED", "client_attempt_id": attempt_id, "created_at": now()}
        self.repo.add("uploads", upload)
        presigned = self.storage.create_presigned_put_url(object_key, upload["content_type"], self.presigned_expire_seconds)
        self._log("presigned_url_created", request_id=data.get("request_id"), session_id=session.session_id,
            item_id=item.item_id, contributor_id=session.contributor_id, session_status=session.status,
            item_status=item.status, upload_id=upload_id, object_key=object_key)
        return {"action": "CONTINUE_UPLOAD", "code": "UPLOAD_INITIALIZED",
            "message_vi": "Sẵn sàng nhận file thu âm.", "upload_id": upload_id, "object_key": object_key,
            "upload_url": presigned or f"/audio/uploads/{upload_id}/content", "upload_method": "PUT",
            "expires_in": self.presigned_expire_seconds}

    def put_upload(self, upload_id: str, data: bytes, content_type: str | None = None) -> dict[str, Any]:
        upload = self.repo.get("uploads", upload_id)
        if not upload:
            raise RecordingFlowError(404, "UPLOAD_NOT_FOUND", "Upload not found",
                "Không tìm thấy lượt upload. Bạn hãy khởi tạo lại.")
        if upload.get("status") == "COMPLETED":
            return {"action": "CONTINUE_NEXT", "code": "UPLOAD_ALREADY_COMPLETED",
                "message_vi": "Lượt upload đã hoàn tất.", "upload_id": upload_id,
                "status": upload["status"], "sample_id": upload.get("sample_id")}
        if upload.get("status") == "PROCESSING":
            raise RecordingFlowError(409, "UPLOAD_STILL_PROCESSING", "Upload is still processing",
                "Lượt upload đang được xử lý. Bạn vui lòng chờ trong giây lát.",
                session_id=upload.get("session_id"), item_id=upload.get("item_id"))
        try:
            self.storage.put_object(upload["object_key"], data, content_type or upload["content_type"])
        except Exception as exc:
            raise RecordingFlowError(503, "STORAGE_UNAVAILABLE", "Object storage write failed",
                "Kho lưu trữ đang tạm thời gián đoạn. Bạn hãy thử lại sau.", action="ERROR",
                session_id=upload.get("session_id"), item_id=upload.get("item_id"),
                debug={"error_type": type(exc).__name__}) from exc
        upload["status"], upload["size_bytes"] = "UPLOADED", len(data)
        self.repo.add("uploads", upload)
        return {"action": "CONTINUE_UPLOAD", "code": "UPLOAD_RECEIVED",
            "message_vi": "Đã nhận file thu âm.", "upload_id": upload_id,
            "status": upload["status"], "size_bytes": len(data)}

    def complete_upload(self, data: dict[str, Any]) -> tuple[dict[str, Any], AudioSample | None]:
        complete_started_at = time.perf_counter()
        upload = self.repo.get("uploads", data.get("upload_id"))
        if not upload:
            raise RecordingFlowError(404, "UPLOAD_NOT_FOUND", "Upload not found",
                "Không tìm thấy lượt upload. Bạn hãy đồng bộ và thử lại.", session_id=data.get("session_id"),
                item_id=data.get("item_id"), request_id=data.get("request_id"))
        context = {"request_id": data.get("request_id"), "session_id": data.get("session_id"),
            "item_id": data.get("item_id"), "client_attempt_id": data.get("client_attempt_id") or
            upload.get("client_attempt_id") or upload["upload_id"], "upload_id": data.get("upload_id"),
            "object_key": data.get("object_key")}
        if upload["session_id"] != data["session_id"] or upload["item_id"] != data["item_id"] or upload["object_key"] != data["object_key"]:
            raise RecordingFlowError(409, "INVALID_STATE_TRANSITION", "Upload completion does not match initialized upload",
                "Thông tin upload không khớp với lượt đã khởi tạo. Hệ thống sẽ đồng bộ lại.",
                session_id=data.get("session_id"), item_id=data.get("item_id"), debug={"upload_id": upload["upload_id"]})
        with self._upload_lock:
            if upload.get("completion_response"):
                response = upload["completion_response"]
                sample = self.repo.get("samples", upload.get("sample_id")) if upload.get("sample_id") else None
                self._log("upload_complete_idempotent", **context, action=response["action"], sample_id=response.get("sample_id"))
                return response, sample
            if upload.get("status") == "PROCESSING":
                raise RecordingFlowError(409, "UPLOAD_STILL_PROCESSING", "Upload is still processing",
                    "Lượt upload đang được xử lý. Bạn vui lòng chờ trong giây lát.", session_id=data.get("session_id"),
                    item_id=data.get("item_id"), debug={"upload_status": "PROCESSING"})
            session, item = self._recording_upload_entities(upload["session_id"], upload["item_id"], data.get("request_id"))
            self._validate_recording_upload_state(session, item, data.get("request_id"))
            self._log("upload_complete_received", **context, contributor_id=session.contributor_id,
                session_status_before=session.status, item_status_before=item.status)
            upload["status"] = "PROCESSING"
            upload["client_attempt_id"] = context["client_attempt_id"]
            self.repo.add("uploads", upload)
        try:
            exists = self.storage.object_exists(upload["object_key"])
            audio = self.storage.get_object(upload["object_key"]) if exists else None
        except Exception as exc:
            upload["status"] = "UPLOADED"
            self.repo.add("uploads", upload)
            raise RecordingFlowError(503, "STORAGE_UNAVAILABLE", "Object storage is unavailable",
                "Kho lưu trữ đang tạm thời gián đoạn. Bạn hãy thử lại sau.", action="ERROR",
                session_id=session.session_id, item_id=item.item_id,
                debug={"session_status": session.status, "item_status": item.status,
                       "error_type": type(exc).__name__}) from exc
        if not exists or audio is None:
            response = self._fast_response(False, "UPLOAD_OBJECT_NOT_FOUND",
                "Không tìm thấy file audio vừa upload. Bạn thử gửi lại câu này nhé.", {}, None,
                session=session, item=item, code="UPLOAD_NOT_FOUND")
            upload["status"], upload["completion_response"] = "FAST_CHECK_FAILED", response
            self.repo.add("uploads", upload)
            return response, None
        self._log("fastcheck_started", **context)
        fastcheck_started_at = time.perf_counter()
        executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="fastcheck")
        future = executor.submit(self.fast_check.check, audio, upload["filename"], upload["content_type"], data.get("client_metrics"))
        try:
            result = future.result(timeout=self.fast_check_timeout_seconds)
        except FutureTimeoutError:
            future.cancel()
            upload["status"] = "FAST_CHECK_TIMEOUT"
            if not self.keep_failed_uploads:
                self.storage.delete_object(upload["object_key"])
            response = self._fast_response(False, "FAST_CHECK_TIMEOUT",
                "Kiểm tra audio hơi lâu. Bạn thử gửi lại câu này nhé.", {}, None,
                session=session, item=item, code="FAST_CHECK_FAILED")
            upload["completion_response"] = response
            self.repo.add("uploads", upload)
            return response, None
        except Exception as exc:
            upload["status"] = "UPLOADED"
            self.repo.add("uploads", upload)
            raise RecordingFlowError(503, "FAST_CHECK_UNAVAILABLE", "FastCheck provider failed",
                "Kiểm tra audio đang tạm thời gián đoạn. Bạn hãy thử lại sau.", action="ERROR",
                session_id=session.session_id, item_id=item.item_id,
                debug={"session_status": session.status, "item_status": item.status,
                       "error_type": type(exc).__name__}) from exc
        finally:
            executor.shutdown(wait=False, cancel_futures=True)
        fastcheck_ms = round((time.perf_counter() - fastcheck_started_at) * 1000)
        self._log("fastcheck_finished", **context, decision="pass" if result.passed else "hard_fail",
            reason_code=result.reason_code, warnings=result.warnings, fastcheck_duration_ms=fastcheck_ms,
            duration_ms=result.metrics.get("duration_ms"), blob_size=len(audio),
            rms_active_dbfs=result.metrics.get("rms_active_dbfs"), active_speech_ratio=result.metrics.get("speech_ratio"),
            clipped_ratio=result.metrics.get("clipping_ratio"))
        if not result.passed:
            upload["status"] = "FAST_CHECK_FAILED"
            if not self.keep_failed_uploads:
                self.storage.delete_object(upload["object_key"])
            response = self._fast_response(False, result.reason_code, result.message_vi, result.metrics, None,
                result.severity, result.warnings, session=session, item=item, code="FAST_CHECK_FAILED")
            upload["completion_response"] = response
            self.repo.add("uploads", upload)
            return response, None
        with self._upload_lock:
            session, item = self._recording_upload_entities(upload["session_id"], upload["item_id"], data.get("request_id"))
            self._validate_recording_upload_state(session, item, data.get("request_id"))
            line = self._required("script_lines", item.line_id)
            sample_id = new_id("sample")
            suffix = Path(upload["filename"]).suffix.lower() or ".wav"
            official_key = f"audio/{item.campaign_id}/{item.item_id}/{sample_id}{suffix}"
            try:
                self.storage.copy_object(upload["object_key"], official_key)
                self.storage.delete_object(upload["object_key"])
            except Exception as exc:
                upload["status"] = "UPLOADED"
                self.repo.add("uploads", upload)
                raise RecordingFlowError(503, "STORAGE_UNAVAILABLE", "Audio promotion failed",
                    "Kho lưu trữ đang tạm thời gián đoạn. Bản thu chưa được ghi nhận, bạn hãy thử lại sau.",
                    action="ERROR", session_id=session.session_id, item_id=item.item_id,
                    debug={"session_status": session.status, "item_status": item.status,
                           "error_type": type(exc).__name__}) from exc
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
            self._log("audio_sample_created", **context, sample_id=sample_id,
                official_object_key=official_key, sample_status=sample.status)
            previous_item_status = item.status
            item.status = RecordingItemStatus.REVIEW_PENDING
            self.repo.add("items", item)
            next_item = self._assign_next_recording_item(session, item.item_id)
            if next_item is None:
                session.status, session.ended_at = RecordingSessionStatus.COMPLETED, now()
                self.repo.add("sessions", session)
            upload["status"], upload["official_object_key"], upload["sample_id"] = "COMPLETED", official_key, sample_id
            response = self._fast_response(True, result.reason_code, result.message_vi, result.metrics, sample_id,
                result.severity, result.warnings, session=session, item=item, next_item=next_item,
                previous_item_status=previous_item_status)
            upload["completion_response"] = response
            self.repo.add("uploads", upload)
        try:
            queued = self.queue.enqueue(sample_id)
            self._log("deepcheck_enqueued", **context, sample_id=sample_id,
                official_object_key=official_key, queued=queued)
        except Exception as exc:
            # CHECKING is durable; the worker recovery scan can enqueue it later.
            self._log("deepcheck_enqueue_deferred", **context, sample_id=sample_id,
                error_type=type(exc).__name__)
        self._log("recording_state_transition", **context, item_status_before=previous_item_status,
            item_status_after=item.status, sample_id=sample_id, sample_status=sample.status,
            next_item_id=next_item.item_id if next_item else None,
            next_item_status=next_item.status if next_item else None, action=response["action"])
        self._log("complete_response_returned", **context, sample_id=sample_id, action=response["action"],
            code=response["code"], total_complete_duration_ms=round((time.perf_counter() - complete_started_at) * 1000))
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

    def _assign_next_recording_item(self, session: RecordingSession,
                                    completed_item_id: str) -> RecordingItem | None:
        items = self._campaign("items", session.campaign_id)
        assigned = next((value for value in items if value.item_id != completed_item_id and
            value.status == RecordingItemStatus.ASSIGNED and value.assigned_to == session.contributor_id), None)
        if assigned:
            return assigned
        candidate = next((value for value in items if value.status == RecordingItemStatus.OPEN), None)
        if candidate is None:
            candidate = next((value for value in items if value.status == RecordingItemStatus.NEED_RETAKE), None)
        if candidate:
            candidate.status, candidate.assigned_to, candidate.assigned_at = (
                RecordingItemStatus.ASSIGNED, session.contributor_id, now())
            self.repo.add("items", candidate)
        return candidate

    def _fast_response(self, passed: bool, reason: str, message: str, metrics: dict[str, Any], sample_id: str | None,
                       severity: str = "hard_fail", warnings: list[str] | None = None,
                       session: RecordingSession | None = None, item: RecordingItem | None = None,
                       next_item: RecordingItem | None = None, code: str | None = None,
                       previous_item_status: RecordingItemStatus | None = None) -> dict[str, Any]:
        action = "CONTINUE_NEXT" if passed else "RETAKE_NOW"
        response_code = code or ("FAST_CHECK_PASSED" if passed else "FAST_CHECK_FAILED")
        if passed and next_item is None:
            action, response_code = "SESSION_COMPLETED", "NO_MORE_ITEMS"
            message = "Bạn đã hoàn thành phiên thu âm này."
        debug = {"session_status": session.status if session else None,
            "item_status": item.status if item else None, "reason_code": reason,
            "previous_item_status": previous_item_status,
            "next_item_status": next_item.status if next_item else None}
        return {"action": action, "code": response_code, "reason_code": reason,
            "severity": severity, "retry_same_item": not passed, "message_vi": message,
            "session_id": session.session_id if session else None, "item_id": item.item_id if item else None,
            "sample_id": sample_id, "next_item": self._item_dto(next_item) if next_item else None,
            "next_item_available": next_item is not None, "metrics": metrics, "warnings": warnings or [],
            "debug": debug}

    def _log(self, event: str, **fields: Any) -> None:
        logger.info(json.dumps({"event": event, **{key: value for key, value in fields.items() if value is not None}},
                               ensure_ascii=False, default=str))
