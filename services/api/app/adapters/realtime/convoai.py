import json
import logging
from threading import RLock
from typing import Any

from agora_agent import Agent, Agora, Area
from agora_agent.agentkit import DeepgramSTT, MiniMaxTTS, OpenAI

from app.ports.providers import CoachVoicePort, CoachVoiceResult

logger = logging.getLogger("voiceturk.realtime")

VOICE_COACH_PROMPT = """You are VoiceTurk's Vietnamese recording coach.
Your job is to guide the contributor to read the provided sentence naturally.
You must not decide whether a sample is accepted, rejected, or needs retake.
Backend quality pipeline is the source of truth.
Only speak the current instruction or feedback provided by VoiceTurk.
Do not invent new failure reasons.
Keep Vietnamese feedback short, friendly, and under 2 sentences."""


class AgoraConvoAIAdapter(CoachVoicePort):
    """Official agora-agents lifecycle adapter derived from the verified quickstart."""

    def __init__(self, app_id: str, app_certificate: str, agent_uid: str = "123456") -> None:
        self.app_id = app_id
        self.app_certificate = app_certificate
        self.agent_uid = agent_uid
        self._lock = RLock()
        self._session_agents: dict[str, str] = {}
        self._sessions: dict[str, Any] = {}
        self._client = Agora(area=Area.US, app_id=app_id, app_certificate=app_certificate) \
            if self.configured() else None

    def configured(self) -> bool:
        return bool(self.app_id and self.app_certificate)

    def start_coach_session(self, recording_session_id: str, channel_name: str, contributor_uid: str,
                            task_context: dict[str, Any]) -> CoachVoiceResult:
        if not self._client:
            return self._fallback("MISSING_AGORA_CREDENTIALS")
        safe_context = {key: task_context.get(key) for key in
                        ("transcript", "target_emotion", "context_brief", "instruction")}
        instruction = str(safe_context.get("instruction") or "Hãy đọc câu trên màn hình.")
        instructions = f"{VOICE_COACH_PROMPT}\n\nCurrent task context:\n{json.dumps(safe_context, ensure_ascii=False)}"
        try:
            agent = (Agent(client=self._client, instructions=instructions, greeting=instruction,
                failure_message="Coach tạm thời chưa thể nói. Hãy đọc câu trên màn hình.", max_history=15,
                advanced_features={"enable_rtm": True},
                parameters={"audio_scenario": "chorus", "data_channel": "rtm",
                            "enable_error_message": True, "enable_metrics": True})
                .with_stt(DeepgramSTT(model="nova-3", language="vi"))
                .with_llm(OpenAI(model="gpt-4o-mini", greeting_message=instruction,
                    failure_message="Coach tạm thời chưa thể nói.", max_history=15,
                    params={"max_tokens": 256, "temperature": 0.3, "top_p": 0.9}))
                .with_tts(MiniMaxTTS(model="speech_2_6_turbo", voice_id="English_captivating_female1")))
            session = agent.create_session(channel=channel_name, agent_uid=self.agent_uid,
                remote_uids=[contributor_uid], name=f"vt_{recording_session_id[-12:]}", idle_timeout=120,
                enable_string_uid=True, expires_in=3600, debug=False)
            agent_id = session.start()
            if not agent_id:
                return self._fallback("AGENT_START_EMPTY_ID")
            with self._lock:
                self._session_agents[recording_session_id] = agent_id
                self._sessions[recording_session_id] = session
            return CoachVoiceResult(True, "agora_convoai", "starting", coach_session_id=agent_id,
                                    agent_uid=self.agent_uid)
        except Exception as exc:
            self._log_failure("coach_start_failed", recording_session_id, exc)
            return self._fallback("AGENT_START_FAILED")

    def get_coach_status(self, recording_session_id: str,
                         coach_session_id: str | None = None) -> CoachVoiceResult:
        agent_id = self._agent_id(recording_session_id, coach_session_id)
        if not self._client or not agent_id:
            return self._fallback("AGENT_SESSION_NOT_FOUND")
        session = self._session_for(recording_session_id)
        if not session:
            return self._fallback("AGENT_SESSION_NOT_IN_PROCESS", agent_id)
        try:
            info = session.get_info()
            platform_status = str(getattr(info, "status", "") or "").upper()
            status = {"RUNNING": "ready", "STARTING": "starting", "STOPPING": "stopping",
                      "STOPPED": "stopped", "FAILED": "error"}.get(platform_status, "starting")
            return CoachVoiceResult(status in {"ready", "starting"}, "agora_convoai", status,
                                    coach_session_id=agent_id, agent_uid=self.agent_uid)
        except Exception as exc:
            self._log_failure("coach_status_failed", recording_session_id, exc)
            return self._fallback("AGENT_STATUS_FAILED", agent_id)

    def speak_instruction(self, recording_session_id: str, instruction_context: dict[str, Any],
                          coach_session_id: str | None = None) -> CoachVoiceResult:
        return self._speak(recording_session_id, instruction_context.get("instruction"), coach_session_id)

    def speak_feedback(self, recording_session_id: str, feedback_context: dict[str, Any],
                       coach_session_id: str | None = None) -> CoachVoiceResult:
        return self._speak(recording_session_id, feedback_context.get("message_vi"), coach_session_id)

    def stop_coach_session(self, recording_session_id: str,
                           coach_session_id: str | None = None) -> CoachVoiceResult:
        agent_id = self._agent_id(recording_session_id, coach_session_id)
        if not self._client or not agent_id:
            return CoachVoiceResult(False, "agora_convoai", "stopped", coach_session_id=agent_id,
                                    agent_uid=self.agent_uid)
        try:
            session = self._session_for(recording_session_id)
            if session:
                session.stop()
            else:
                self._client.stop_agent(agent_id)
            with self._lock:
                self._session_agents.pop(recording_session_id, None)
                self._sessions.pop(recording_session_id, None)
            return CoachVoiceResult(True, "agora_convoai", "stopped", coach_session_id=agent_id,
                                    agent_uid=self.agent_uid)
        except Exception as exc:
            self._log_failure("coach_stop_failed", recording_session_id, exc)
            return self._fallback("AGENT_STOP_FAILED", agent_id)

    def _speak(self, recording_session_id: str, text: Any,
               coach_session_id: str | None) -> CoachVoiceResult:
        agent_id = self._agent_id(recording_session_id, coach_session_id)
        if not self._client or not agent_id or not isinstance(text, str) or not text.strip():
            return self._fallback("AGENT_SPEAK_CONTEXT_INVALID", agent_id)
        session = self._session_for(recording_session_id)
        if not session:
            return self._fallback("AGENT_SESSION_NOT_IN_PROCESS", agent_id)
        try:
            session.say(text.strip(), priority="INTERRUPT", interruptable=False)
            return CoachVoiceResult(True, "agora_convoai", "spoken", coach_session_id=agent_id,
                                    agent_uid=self.agent_uid)
        except Exception as exc:
            self._log_failure("coach_speak_failed", recording_session_id, exc)
            return self._fallback("AGENT_SPEAK_FAILED", agent_id)

    def _agent_id(self, recording_session_id: str, supplied: str | None) -> str | None:
        if supplied:
            return supplied
        with self._lock:
            return self._session_agents.get(recording_session_id)

    def _session_for(self, recording_session_id: str) -> Any | None:
        with self._lock:
            return self._sessions.get(recording_session_id)

    @staticmethod
    def _fallback(message: str, agent_id: str | None = None) -> CoachVoiceResult:
        return CoachVoiceResult(False, "agora_convoai", "fallback", message, agent_id)

    @staticmethod
    def _log_failure(event: str, recording_session_id: str, exc: Exception) -> None:
        logger.warning(json.dumps({"event": event, "recording_session_id": recording_session_id,
                                  "error_type": type(exc).__name__}))


class AgoraConvoAIUnavailableAdapter(AgoraConvoAIAdapter):
    def __init__(self) -> None:
        super().__init__("", "")
