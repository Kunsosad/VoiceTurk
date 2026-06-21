import logging
from pathlib import Path

import httpx

from app.adapters.check.local import RuleBasedFastCheckAdapter, TechnicalDeepCheckAdapter
from app.adapters.persistence.memory import MemoryRepository
from app.adapters.proof.local_hash import LocalHashProofAdapter
from app.adapters.queue.in_process import InProcessJobQueueAdapter
from app.adapters.realtime.agora import AgoraRealtimeTokenAdapter
from app.adapters.realtime.convoai import AgoraAgentStudioAdapter
from app.adapters.storage.local import LocalStorageAdapter
from app.application.service import VoiceTurkService
from app.core.config import Settings


def make_agora_service(tmp_path: Path, requester, *, agent_name: str = "published-agent",
                       pipeline_id: str = "pipeline-123",
                       allow_coach_fallback: bool = False) -> VoiceTurkService:
    realtime = AgoraRealtimeTokenAdapter("a" * 32, "b" * 32)
    coach = AgoraAgentStudioAdapter("a" * 32, "customer-id", "customer-secret",
        agent_name, pipeline_id, 900000, ["*"], timeout_seconds=1, requester=requester)
    return VoiceTurkService(MemoryRepository(), LocalStorageAdapter(tmp_path / "storage"),
        RuleBasedFastCheckAdapter(), TechnicalDeepCheckAdapter(), LocalHashProofAdapter(),
        InProcessJobQueueAdapter(), realtime, tmp_path / "exports", coach_voice=coach,
        realtime_provider="agora", allow_coach_fallback=allow_coach_fallback)


def test_start_session_joins_published_agent_with_matching_channel_and_uid(tmp_path: Path):
    captured = {}

    def requester(url, **kwargs):
        captured.update({"url": url, **kwargs})
        return httpx.Response(200, json={"agent_id": "runtime-agent-1", "status": 1})

    service = make_agora_service(tmp_path, requester)
    token_calls = []
    issue_token = service.realtime.issue_token
    service.realtime.issue_token = lambda channel, uid, role, expires_seconds=3600: (
        token_calls.append((channel, uid, role)),
        issue_token(channel, uid, role, expires_seconds),
    )[1]
    seeded = service.seed_demo()
    started = service.start_session(seeded["campaign_id"], "user_001")
    realtime = started["realtime"]
    payload = captured["json"]

    assert captured["url"].endswith(f"/projects/{'a' * 32}/join")
    assert isinstance(captured["auth"], httpx.BasicAuth)
    assert payload["name"].startswith("published-agent-") and payload["name"] != "published-agent"
    assert payload["pipeline_id"] == "pipeline-123"
    assert payload["properties"]["channel"] == realtime["agora_channel"]
    assert payload["properties"]["agent_rtc_uid"] == realtime["agent_rtc_uid"]
    assert payload["properties"]["agent_rtc_uid"] != realtime["contributor_rtc_uid"]
    assert payload["properties"]["remote_rtc_uids"] == [realtime["contributor_rtc_uid"]]
    assert payload["properties"]["token"]
    assert token_calls == [
        (realtime["agora_channel"], realtime["contributor_rtc_uid"], "publisher"),
        (realtime["agora_channel"], realtime["agent_rtc_uid"], "publisher"),
    ]
    assert realtime["coach_provider"] == "agora_agent"
    assert realtime["agent_join_status"] == "joined"
    assert realtime["agent_session_id"] == "runtime-agent-1"
    assert service.repo.get("sessions", started["session_id"]).agora_session_id == "runtime-agent-1"


def test_agent_join_failure_keeps_recording_session_and_fails_loudly_in_strict_mode(tmp_path: Path):
    def requester(*_args, **_kwargs):
        return httpx.Response(503, json={"detail": "service unavailable", "reason": "upstream"})

    service = make_agora_service(tmp_path, requester)
    seeded = service.seed_demo()
    started = service.start_session(seeded["campaign_id"], "user_001")

    assert started["status"] == "ACTIVE"
    assert started["realtime"]["provider"] == "agora"
    assert started["realtime"]["coach_provider"] == "agora_agent_failed"
    assert started["realtime"]["agent_join_status"] == "failed"
    assert started["realtime"]["agent_join_error_code"] == "upstream"


def test_missing_agent_name_or_pipeline_never_claims_connected(tmp_path: Path):
    def should_not_run(*_args, **_kwargs):
        raise AssertionError("join request must not run with incomplete configuration")

    for agent_name, pipeline_id in (("", "pipeline-123"), ("published-agent", "")):
        service = make_agora_service(tmp_path / (agent_name or "missing-name"), should_not_run,
                                     agent_name=agent_name, pipeline_id=pipeline_id)
        seeded = service.seed_demo()
        realtime = service.start_session(seeded["campaign_id"], "user_001")["realtime"]
        assert realtime["coach_provider"] == "agora_agent_failed"
        assert realtime["agent_join_status"] == "config_missing"
        assert realtime["agent_join_error_code"] == "MISSING_AGORA_AGENT_CONFIG"
        assert "AGORA_AGENT_" in realtime["agent_join_message"]


def test_agent_join_failure_uses_browser_tts_only_when_explicitly_allowed(tmp_path: Path):
    def requester(*_args, **_kwargs):
        return httpx.Response(500, json={"code": "START_FAILED", "message": "cannot start"})

    service = make_agora_service(tmp_path, requester, allow_coach_fallback=True)
    seeded = service.seed_demo()
    realtime = service.start_session(seeded["campaign_id"], "user_001")["realtime"]
    assert realtime["coach_provider"] == "browser_tts_fallback"
    assert realtime["allow_coach_fallback"] is True


def test_agent_logs_do_not_expose_credentials_or_rtc_token(tmp_path: Path, caplog):
    def requester(*_args, **_kwargs):
        return httpx.Response(401, json={"code": "UNAUTHORIZED", "message": "bad credentials"})

    service = make_agora_service(tmp_path, requester)
    seeded = service.seed_demo()
    with caplog.at_level(logging.INFO, logger="voiceturk.realtime"):
        service.start_session(seeded["campaign_id"], "user_001")
    logs = "\n".join(caplog.messages)
    assert "agora.agent.join.request" in logs
    assert "agora.agent.join.response" in logs
    assert "agora.agent.join.failed" in logs
    assert "customer-secret" not in logs
    assert "007eJ" not in logs
    assert '"token"' not in logs


def test_browser_tts_is_used_only_when_provider_is_explicit(tmp_path: Path):
    def should_not_run(*_args, **_kwargs):
        raise AssertionError("Agora join must not run in browser_tts mode")

    service = make_agora_service(tmp_path, should_not_run)
    service.realtime_provider = "browser_tts"
    seeded = service.seed_demo()
    realtime = service.start_session(seeded["campaign_id"], "user_001")["realtime"]
    assert realtime["provider"] == "browser_tts"
    assert realtime["coach_provider"] == "browser_tts"
    assert realtime["agent_join_status"] == "not_applicable"


def test_settings_report_all_missing_strict_agora_values():
    settings = Settings(realtime_provider="agora", agora_app_id="", agora_app_certificate="",
        agora_customer_id="", agora_customer_secret="", agora_agent_name="",
        agora_agent_pipeline_id="", _env_file=None)
    assert settings.missing_agora_agent_config == ["AGORA_APP_ID", "AGORA_APP_CERTIFICATE",
        "AGORA_CUSTOMER_ID", "AGORA_CUSTOMER_SECRET", "AGORA_AGENT_NAME",
        "AGORA_AGENT_PIPELINE_ID"]
