import json
import logging
import zlib
from typing import Any, Callable

import httpx

from app.ports.providers import CoachVoicePort, CoachVoiceResult


logger = logging.getLogger("voiceturk.realtime")


class AgoraAgentStudioAdapter(CoachVoicePort):
    """Starts a published Agent Studio pipeline in a VoiceTurk RTC channel."""

    def __init__(self, app_id: str, customer_id: str, customer_secret: str, agent_name: str,
                 pipeline_id: str, agent_rtc_uid_base: int = 900000,
                 remote_rtc_uids: list[str] | None = None, region: str = "",
                 timeout_seconds: float = 10.0,
                 app_certificate_configured: bool = True,
                 requester: Callable[..., httpx.Response] | None = None) -> None:
        self.app_id = app_id
        self.customer_id = customer_id
        self.customer_secret = customer_secret
        self.agent_name = agent_name
        self.pipeline_id = pipeline_id
        self.agent_rtc_uid_base = agent_rtc_uid_base
        self.remote_rtc_uids = remote_rtc_uids or ["*"]
        self.region = region
        self.timeout_seconds = timeout_seconds
        self.app_certificate_configured = app_certificate_configured
        self._requester = requester or httpx.post

    def configured(self) -> bool:
        return bool(self.app_id and self.app_certificate_configured and self.customer_id and self.customer_secret and
                    self.agent_name and self.pipeline_id)

    def missing_config(self) -> list[str]:
        values = {
            "AGORA_APP_ID": self.app_id,
            "AGORA_APP_CERTIFICATE": "configured" if self.app_certificate_configured else "",
            "AGORA_CUSTOMER_ID": self.customer_id,
            "AGORA_CUSTOMER_SECRET": self.customer_secret,
            "AGORA_AGENT_NAME": self.agent_name,
            "AGORA_AGENT_PIPELINE_ID": self.pipeline_id,
        }
        return [name for name, value in values.items() if not value]

    def agent_rtc_uid(self, session_id: str, contributor_rtc_uid: str) -> str:
        # Agora Agent Studio /join requires agent_rtc_uid in signed 32-bit range:
        # 0 <= uid <= 2147483647
        max_agora_uid = 2_147_483_647

        base = int(self.agent_rtc_uid_base or 900000)
        if base < 1 or base >= max_agora_uid:
            base = 900000

        # Keep the generated uid in a small safe range.
        # Same UID can be reused across different channels, so huge hash space is unnecessary.
        span = min(1_000_000, max_agora_uid - base)
        offset = zlib.crc32(session_id.encode("utf-8")) % span
        uid = base + offset

        try:
            contributor_uid = int(contributor_rtc_uid)
        except (TypeError, ValueError):
            contributor_uid = None

        if uid == contributor_uid:
            uid = base + ((offset + 1) % span)

        return str(uid)

    def join_agent(self, session_id: str, channel: str, agent_rtc_uid: str,
                   token: str, contributor_rtc_uid: str | None = None) -> CoachVoiceResult:
        if not self.configured():
            missing = self.missing_config()
            message = f"Agora Agent Studio config is missing: {', '.join(missing)}"
            self._log("agora.agent.join.failed", session_id=session_id, channel=channel,
                      agent_rtc_uid=agent_rtc_uid or None,
                      error_code="MISSING_AGORA_AGENT_CONFIG", error_message=message)
            return CoachVoiceResult(False, "agora_agent", "config_missing", message,
                agent_rtc_uid or None, error_code="MISSING_AGORA_AGENT_CONFIG",
                response_summary={"missing": missing})
        remote_rtc_uids = [str(contributor_rtc_uid)] if contributor_rtc_uid else self.remote_rtc_uids
        properties: dict[str, Any] = {"channel": channel, "agent_rtc_uid": agent_rtc_uid,
            "remote_rtc_uids": remote_rtc_uids, "token": token}
        runtime_name = self._runtime_name(session_id)
        payload = {"name": runtime_name, "pipeline_id": self.pipeline_id,
                   "properties": properties}
        url = f"https://api.agora.io/api/conversational-ai-agent/v2/projects/{self.app_id}/join"
        self._log("agora.agent.join.request", session_id=session_id, channel=channel,
                  contributor_rtc_uid=contributor_rtc_uid, agent_rtc_uid=agent_rtc_uid,
                  remote_rtc_uids=remote_rtc_uids, pipeline_id=self.pipeline_id,
                  agent_name=runtime_name)
        try:
            response = self._requester(url, json=payload,
                auth=httpx.BasicAuth(self.customer_id, self.customer_secret),
                timeout=self.timeout_seconds, headers={"Content-Type": "application/json"})
            body = self._response_json(response)
            body_summary = self._sanitize_body(body)
            self._log("agora.agent.join.response", session_id=session_id,
                      http_status=response.status_code, body_summary=body_summary)
            if 200 <= response.status_code < 300:
                response_id = self._response_id(body)
                self._log("agora.agent.join.success", session_id=session_id, channel=channel,
                          contributor_rtc_uid=contributor_rtc_uid, agent_rtc_uid=agent_rtc_uid,
                          remote_rtc_uids=remote_rtc_uids, agent_id=response_id)
                return CoachVoiceResult(True, "agora_agent", "joined",
                    "Agora Agent Studio join request accepted.", agent_rtc_uid, response_id,
                    http_status=response.status_code, response_summary=body_summary)
            error_code = str(body.get("error_code") or body.get("code") or body.get("reason") or
                             f"HTTP_{response.status_code}")
            message = str(body.get("message") or body.get("detail") or body.get("error") or
                          "Agora Agent Studio join failed.")
            self._log("agora.agent.join.failed", session_id=session_id, channel=channel,
                contributor_rtc_uid=contributor_rtc_uid, agent_rtc_uid=agent_rtc_uid,
                remote_rtc_uids=remote_rtc_uids, http_status=response.status_code,
                error_code=error_code, error_message=message[:300])
            return CoachVoiceResult(False, "agora_agent", "failed", message[:300], agent_rtc_uid,
                error_code=error_code, http_status=response.status_code,
                response_summary=body_summary)
        except Exception as exc:
            error_code = "AGORA_AGENT_JOIN_TIMEOUT" if isinstance(exc, httpx.TimeoutException) \
                else "AGORA_AGENT_JOIN_REQUEST_FAILED"
            self._log("agora.agent.join.failed", session_id=session_id, channel=channel,
                contributor_rtc_uid=contributor_rtc_uid, agent_rtc_uid=agent_rtc_uid,
                remote_rtc_uids=remote_rtc_uids, error_code=error_code,
                error_message=f"{type(exc).__name__}: {str(exc)[:240]}")
            return CoachVoiceResult(False, "agora_agent", "failed",
                "Agora Agent Studio could not join the RTC channel.", agent_rtc_uid,
                error_code=error_code)

    @staticmethod
    def _response_json(response: httpx.Response) -> dict[str, Any]:
        try:
            value = response.json()
            return value if isinstance(value, dict) else {}
        except (json.JSONDecodeError, ValueError):
            return {}

    @staticmethod
    def _response_id(body: dict[str, Any]) -> str | None:
        nested = body.get("data") if isinstance(body.get("data"), dict) else {}
        value = (body.get("agent_id") or body.get("agent_session_id") or body.get("id") or
                 nested.get("agent_id") or nested.get("agent_session_id") or nested.get("id"))
        return str(value) if value is not None else None

    def _runtime_name(self, session_id: str) -> str:
        suffix = session_id.rsplit("_", 1)[-1][-12:]
        return f"{self.agent_name[:48]}-{suffix}"

    @classmethod
    def _sanitize_body(cls, value: Any) -> Any:
        if isinstance(value, dict):
            return {str(key): cls._sanitize_body(item) for key, item in value.items()
                    if not any(marker in str(key).lower()
                               for marker in ("token", "authorization", "secret", "password"))}
        if isinstance(value, list):
            return [cls._sanitize_body(item) for item in value[:20]]
        if isinstance(value, str):
            return value[:500]
        return value

    @staticmethod
    def _log(event: str, **fields: Any) -> None:
        logger.info(json.dumps({"event": event, **{key: value for key, value in fields.items()
            if value is not None}}, ensure_ascii=False))


class AgoraConvoAIUnavailableAdapter(CoachVoicePort):
    def configured(self) -> bool:
        return False

    def agent_rtc_uid(self, session_id: str, contributor_rtc_uid: str) -> str:
        del session_id
        return "900001" if str(contributor_rtc_uid) == "900000" else "900000"

    def join_agent(self, session_id: str, channel: str, agent_rtc_uid: str,
                   token: str, contributor_rtc_uid: str | None = None) -> CoachVoiceResult:
        del session_id, channel, token
        return CoachVoiceResult(False, "agora_agent", "config_missing",
            "Agora Agent Studio config is missing.", agent_rtc_uid or None,
            error_code="MISSING_AGORA_AGENT_CONFIG")
