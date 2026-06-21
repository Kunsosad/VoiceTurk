"""Start a real published Agora Agent Studio agent in a disposable RTC channel."""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.adapters.realtime.agora import AgoraRealtimeTokenAdapter  # noqa: E402
from app.adapters.realtime.convoai import AgoraAgentStudioAdapter  # noqa: E402
from app.core.config import Settings  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--print-client-token", action="store_true",
                        help="Print the contributor RTC token for the browser probe.")
    args = parser.parse_args()
    settings = Settings()
    missing = settings.missing_agora_agent_config
    if missing:
        print(json.dumps({"status": "CONFIG_MISSING", "missing": missing}, indent=2))
        return 2

    timestamp = int(time.time() * 1000)
    session_id = f"probe_{timestamp}"
    channel = f"vt_probe_{timestamp}"
    contributor_uid = "100001"
    tokens = AgoraRealtimeTokenAdapter(settings.agora_app_id, settings.agora_app_certificate)
    agent = AgoraAgentStudioAdapter(settings.agora_app_id, settings.agora_customer_id,
        settings.agora_customer_secret, settings.agora_agent_name, settings.agora_agent_pipeline_id,
        settings.agora_agent_rtc_uid_base, settings.agora_agent_remote_uids,
        settings.agora_agent_region, settings.agora_agent_join_timeout_seconds,
        app_certificate_configured=bool(settings.agora_app_certificate))
    agent_uid = agent.agent_rtc_uid(session_id, contributor_uid)
    contributor_token = tokens.issue_token(channel, contributor_uid, "publisher")
    agent_token = tokens.issue_token(channel, agent_uid, "publisher")
    result = agent.join_agent(session_id, channel, agent_uid, agent_token["token"])

    output = {
        "status": "JOIN_ACCEPTED" if result.available else "JOIN_FAILED",
        "app_id": settings.agora_app_id,
        "channel": channel,
        "contributor_uid": contributor_uid,
        "contributor_token": contributor_token["token"] if args.print_client_token else "<redacted; use --print-client-token>",
        "agent_uid": agent_uid,
        "expected_agent_uid": agent_uid,
        "http_status": result.http_status,
        "agent_id": result.agent_session_id,
        "error_code": result.error_code,
        "message": result.message,
        "response_body_sanitized": result.response_summary,
        "next_steps": [
            "Run the web dev server: npm --prefix apps/web run dev",
            "Open http://localhost:5173/agora-agent-probe.html",
            "Enter app_id, channel, contributor_uid, contributor_token, and expected_agent_uid.",
            "Join, allow microphone access, speak, and confirm AGENT_JOINED then AGENT_AUDIO_SUBSCRIBED.",
        ],
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0 if result.available else 1


if __name__ == "__main__":
    raise SystemExit(main())
