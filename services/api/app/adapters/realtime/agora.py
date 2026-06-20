from datetime import UTC, datetime, timedelta
from typing import Any

from agora_token_builder import RtcTokenBuilder

from app.ports.providers import RealtimeTokenPort


class AgoraRealtimeTokenAdapter(RealtimeTokenPort):
    def __init__(self, app_id: str, app_certificate: str) -> None:
        self.app_id = app_id
        self.app_certificate = app_certificate

    def configured(self) -> bool:
        return bool(self.app_id and self.app_certificate)

    def issue_token(self, channel: str, uid: str, role: str, expires_seconds: int = 3600) -> dict[str, Any]:
        if not self.configured():
            raise ValueError("Agora is not configured; set AGORA_APP_ID and AGORA_APP_CERTIFICATE")
        expires_at = datetime.now(UTC) + timedelta(seconds=expires_seconds)
        privilege_expiry = int(expires_at.timestamp())
        agora_role = 1 if role == "publisher" else 2
        token = RtcTokenBuilder.buildTokenWithAccount(self.app_id, self.app_certificate, channel, uid,
                                                       agora_role, privilege_expiry)
        return {"app_id": self.app_id, "channel": channel, "token": token, "uid": uid,
                "expires_at": expires_at.isoformat(), "provider": "agora"}
