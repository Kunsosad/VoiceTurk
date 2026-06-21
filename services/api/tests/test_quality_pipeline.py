import math
import struct
import time
import wave
from io import BytesIO
from pathlib import Path

import pytest

from app.adapters.check.local import RuleBasedFastCheckAdapter, TechnicalDeepCheckAdapter
from app.adapters.check.text import compute_wer
from app.adapters.persistence.memory import MemoryRepository
from app.adapters.proof.local_hash import LocalHashProofAdapter
from app.adapters.queue.in_process import InProcessJobQueueAdapter
from app.adapters.realtime.agora import AgoraRealtimeTokenAdapter
from app.adapters.realtime.convoai import AgoraConvoAIUnavailableAdapter
from app.adapters.storage.local import LocalStorageAdapter
from app.application.service import VoiceTurkService
from app.core.config import Settings
from app.domain.enums import AudioSampleStatus, RecordingItemStatus
from app.jobs.deep_check_worker import DeepCheckWorker
from app.ports.providers import CoachVoiceResult


def wav_fixture(duration_ms: int = 1300, amplitude: float = 0.25, sample_rate: int = 16000,
                leading_silence_ms: int = 0) -> bytes:
    output = BytesIO()
    with wave.open(output, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(sample_rate)
        frames = int(sample_rate * duration_ms / 1000)
        silent_frames = int(sample_rate * leading_silence_ms / 1000)
        values = (0 if i < silent_frames else int(amplitude * 32767 * math.sin(2 * math.pi * 220 * i / sample_rate))
                  for i in range(frames))
        audio.writeframes(b"".join(struct.pack("<h", value) for value in values))
    return output.getvalue()


def make_service(tmp_path: Path, deep_check=None) -> VoiceTurkService:
    return VoiceTurkService(MemoryRepository(), LocalStorageAdapter(tmp_path / "storage"),
        RuleBasedFastCheckAdapter(), deep_check or TechnicalDeepCheckAdapter(), LocalHashProofAdapter(),
        InProcessJobQueueAdapter(), AgoraRealtimeTokenAdapter("", ""), tmp_path / "exports")


def create_checking_sample(service: VoiceTurkService):
    seeded = service.seed_demo()
    session = service.start_session(seeded["campaign_id"], "user_001")
    item = session["items"][0]
    audio = wav_fixture()
    slot = service.init_upload({"session_id": session["session_id"], "item_id": item["item_id"],
        "filename": "recording.wav", "content_type": "audio/wav", "size_bytes": len(audio)})
    service.put_upload(slot["upload_id"], audio, "audio/wav")
    result, sample = service.complete_upload({"upload_id": slot["upload_id"], "session_id": session["session_id"],
        "item_id": item["item_id"], "object_key": slot["object_key"], "client_metrics": {}})
    assert result["action"] == "CONTINUE_NEXT" and sample.status == AudioSampleStatus.CHECKING
    return sample


@pytest.mark.parametrize(("audio", "filename", "content_type", "reason"), [
    (b"", "recording.wav", "audio/wav", "FILE_MISSING"),
    (b"not a wav" * 200, "recording.wav", "audio/wav", "DECODE_FAILED"),
    (wav_fixture(400), "recording.wav", "audio/wav", "AUDIO_TOO_SHORT"),
    (wav_fixture(amplitude=0.001), "recording.wav", "audio/wav", "VOLUME_TOO_LOW"),
    (wav_fixture(amplitude=1.0), "recording.wav", "audio/wav", "CLIPPING_TOO_HIGH"),
    (wav_fixture(), "recording.webm", "audio/webm", "UNSUPPORTED_AUDIO_FORMAT"),
], ids=["empty", "corrupt", "too-short", "low-volume", "clipped", "unsupported-format"])
def test_fastcheck_hard_gates(audio, filename, content_type, reason):
    result = RuleBasedFastCheckAdapter().check(audio, filename, content_type)
    assert not result.passed and result.reason_code == reason


def test_fastcheck_valid_wav_has_measured_metrics():
    result = RuleBasedFastCheckAdapter().check(wav_fixture(), "recording.wav", "audio/wav")
    assert result.passed
    assert result.metrics["sample_rate"] == 16000
    assert 0 <= result.metrics["clipping_ratio"] <= 1
    assert 0 <= result.metrics["speech_ratio"] <= 1


def test_deepcheck_worker_recovers_checking_sample_after_queue_loss(tmp_path: Path):
    service = make_service(tmp_path)
    sample = create_checking_sample(service)
    service.queue = InProcessJobQueueAdapter()  # simulate process restart losing the in-memory queue
    worker = DeepCheckWorker(service, poll_interval_seconds=0.01, batch_size=10)
    worker.start()
    deadline = time.monotonic() + 1
    while service.repo.get("samples", sample.sample_id).status == AudioSampleStatus.CHECKING and time.monotonic() < deadline:
        time.sleep(0.01)
    worker.stop()
    restored = service.repo.get("samples", sample.sample_id)
    assert restored.status == AudioSampleStatus.REVIEW_PENDING
    assert "ASR_NOT_CONFIGURED" in restored.deep_check_reason_codes
    assert "PROSODY_NOT_CHECKED" in restored.deep_check_reason_codes
    assert restored.deep_check_transcript_metrics["wer"] is None


def test_deepcheck_is_idempotent_when_sample_is_no_longer_checking(tmp_path: Path):
    service = make_service(tmp_path)
    sample = create_checking_sample(service)
    first = service.process_one_deep_check(sample.sample_id)
    second = service.process_one_deep_check(sample.sample_id)
    assert first["status"] == AudioSampleStatus.REVIEW_PENDING
    assert second["skipped"] is True


def test_missing_official_audio_is_nonrecoverable_and_reopens_item(tmp_path: Path):
    service = make_service(tmp_path)
    sample = create_checking_sample(service)
    service.storage.delete_object(sample.audio_path)
    result = service.process_one_deep_check(sample.sample_id)
    restored = service.repo.get("samples", sample.sample_id)
    item = service.repo.get("items", sample.item_id)
    assert result["reason_code"] == "AUDIO_FILE_MISSING"
    assert restored.status == AudioSampleStatus.REJECTED
    assert item.status == RecordingItemStatus.OPEN


def test_deepcheck_borderline_technical_audio_needs_retake(tmp_path: Path):
    service = make_service(tmp_path)
    sample = create_checking_sample(service)
    service.storage.put_object(sample.audio_path, wav_fixture(amplitude=0.004), "audio/wav")
    service.process_one_deep_check(sample.sample_id)
    restored = service.repo.get("samples", sample.sample_id)
    assert restored.status == AudioSampleStatus.NEED_RETAKE
    assert "LOW_CONFIDENCE_AUDIO" in restored.deep_check_reason_codes
    context = restored.deep_check_feedback_context
    assert context["sample_id"] == sample.sample_id
    assert context["decision"] == "NEED_RETAKE_LATER"
    assert context["target_transcript"] == sample.transcript_snapshot
    assert context["coach_constraints"]["must_not_change_decision"] is True
    assert not ({"AGORA_APP_CERTIFICATE", "OPENAI_API_KEY"} & set(context))


def test_agora_convoai_boundary_reports_unavailable_without_fake_success():
    adapter = AgoraConvoAIUnavailableAdapter()
    assert adapter.configured() is False
    result = adapter.speak_feedback("session_1", {"decision": "NEED_RETAKE_LATER"})
    assert result.available is False
    assert result.status == "fallback"


def test_agora_convoai_provider_is_accepted_after_verified_baseline():
    assert Settings(realtime_provider="agora_convoai").realtime_provider == "agora_convoai"


class MockConvoAICoach:
    def __init__(self, start_available: bool = True):
        self.start_available = start_available
        self.calls = []

    def configured(self): return True
    def start_coach_session(self, session_id, channel, uid, context):
        self.calls.append(("start", session_id, channel, uid, context))
        return CoachVoiceResult(self.start_available, "agora_convoai",
            "starting" if self.start_available else "fallback", coach_session_id="agent_test" if self.start_available else None,
            agent_uid="123456" if self.start_available else None)
    def get_coach_status(self, session_id, coach_session_id=None):
        self.calls.append(("status", session_id, coach_session_id))
        return CoachVoiceResult(True, "agora_convoai", "ready", coach_session_id=coach_session_id, agent_uid="123456")
    def speak_instruction(self, session_id, context, coach_session_id=None):
        self.calls.append(("instruction", session_id, context, coach_session_id))
        return CoachVoiceResult(True, "agora_convoai", "spoken", coach_session_id=coach_session_id)
    def speak_feedback(self, session_id, context, coach_session_id=None):
        self.calls.append(("feedback", session_id, context, coach_session_id))
        return CoachVoiceResult(True, "agora_convoai", "spoken", coach_session_id=coach_session_id)
    def stop_coach_session(self, session_id, coach_session_id=None):
        self.calls.append(("stop", session_id, coach_session_id))
        return CoachVoiceResult(True, "agora_convoai", "stopped", coach_session_id=coach_session_id)


def make_convoai_service(tmp_path: Path, coach) -> VoiceTurkService:
    return VoiceTurkService(MemoryRepository(), LocalStorageAdapter(tmp_path / "storage"),
        RuleBasedFastCheckAdapter(), TechnicalDeepCheckAdapter(), LocalHashProofAdapter(),
        InProcessJobQueueAdapter(), AgoraRealtimeTokenAdapter("a" * 32, "b" * 32), tmp_path / "exports",
        coach_voice=coach)


def test_convoai_session_start_speak_status_stop_without_qc_mutation(tmp_path: Path):
    coach = MockConvoAICoach()
    service = make_convoai_service(tmp_path, coach)
    seeded = service.seed_demo()
    response = service.start_session(seeded["campaign_id"], "user_001")
    assert response["realtime"]["provider"] == "agora_convoai"
    assert response["realtime"]["coach_status"] == "starting"
    assert response["realtime"]["coach_session_id"] == "agent_test"
    assert service.coach_status(response["session_id"])["status"] == "ready"
    feedback = {"decision": "NEED_RETAKE_LATER", "reason_codes": ["TOO_MUCH_SILENCE"]}
    spoken = service.speak_coach(response["session_id"], "feedback", "Thu lại liền mạch hơn nhé.", feedback)
    assert spoken["status"] == "spoken"
    assert next(call for call in coach.calls if call[0] == "feedback")[2]["decision"] == "NEED_RETAKE_LATER"
    assert not service.repo.list("samples")
    service.complete_session(response["session_id"])
    assert any(call[0] == "stop" for call in coach.calls)


def test_convoai_start_failure_returns_rtc_browser_tts_fallback(tmp_path: Path):
    service = make_convoai_service(tmp_path, MockConvoAICoach(start_available=False))
    seeded = service.seed_demo()
    response = service.start_session(seeded["campaign_id"], "user_001")
    assert response["realtime"]["provider"] == "agora_convoai"
    assert response["realtime"]["coach_status"] == "fallback"
    assert response["realtime"]["coach_provider"] == "browser_tts_fallback"
    assert response["realtime"]["agora_token"]


def test_agora_rtc_token_is_issued_when_backend_provider_is_configured(tmp_path: Path):
    realtime = AgoraRealtimeTokenAdapter("a" * 32, "b" * 32)
    service = VoiceTurkService(MemoryRepository(), LocalStorageAdapter(tmp_path / "storage"),
        RuleBasedFastCheckAdapter(), TechnicalDeepCheckAdapter(), LocalHashProofAdapter(),
        InProcessJobQueueAdapter(), realtime, tmp_path / "exports", coach_voice=AgoraConvoAIUnavailableAdapter())
    seeded = service.seed_demo()
    session = service.start_session(seeded["campaign_id"], "user_001")
    assert session["realtime"]["provider"] == "agora"
    assert session["realtime"]["agora_token"]
    assert session["realtime"]["coach_provider"] == "browser_tts_fallback"
    assert session["realtime"]["convoai_available"] is False


def test_temporary_deepcheck_error_remains_recoverable(tmp_path: Path):
    class UnavailableDeepCheck:
        def analyze(self, *_args):
            raise TimeoutError("temporary storage/provider timeout")

    service = make_service(tmp_path, UnavailableDeepCheck())
    sample = create_checking_sample(service)
    service.process_one_deep_check(sample.sample_id)
    restored = service.repo.get("samples", sample.sample_id)
    assert restored.status == AudioSampleStatus.CHECKING
    assert restored.deep_check_status == "RETRY_PENDING"
    assert restored.deep_check_retry_count == 1


def test_compute_wer_and_vietnamese_normalization():
    assert compute_wer("Tôi chưa nhận được hàng.", "tôi chưa nhận được hàng") == 0
    assert compute_wer("tôi cần hàng", "tôi muốn hàng") == pytest.approx(1 / 3)
    assert compute_wer("tôi cần đơn hàng", "tôi đơn hàng") == pytest.approx(1 / 4)
    assert compute_wer("tôi cần hàng", "tôi rất cần hàng") == pytest.approx(1 / 3)
