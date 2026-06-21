import math
import struct
import wave
from io import BytesIO

import pytest

from app.application.errors import RecordingFlowError
from app.domain.enums import AudioSampleStatus, RecordingItemStatus, RecordingSessionStatus

from test_quality_pipeline import make_service, wav_fixture


def setup_recording(service):
    seeded = service.seed_demo()
    started = service.start_session(seeded["campaign_id"], "user_001")
    return started, service.repo.get("sessions", started["session_id"]), service.repo.get("items", started["items"][0]["item_id"])


def initialize(service, session, item, attempt="attempt-1", audio=None):
    audio = wav_fixture() if audio is None else audio
    slot = service.init_upload({"session_id": session.session_id, "item_id": item.item_id,
        "filename": "recording.wav", "content_type": "audio/wav", "size_bytes": len(audio),
        "client_attempt_id": attempt})
    service.put_upload(slot["upload_id"], audio, "audio/wav")
    data = {"upload_id": slot["upload_id"], "session_id": session.session_id, "item_id": item.item_id,
        "object_key": slot["object_key"], "client_attempt_id": attempt, "client_metrics": {}}
    return slot, data


def complete(service, session, item, attempt="attempt-1", audio=None):
    _, data = initialize(service, session, item, attempt, audio)
    return service.complete_upload(data)


def wav_with_active_ratio(active_ratio: float, duration_ms: int = 1300) -> bytes:
    sample_rate = 16000
    output = BytesIO()
    with wave.open(output, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(sample_rate)
        frames = int(sample_rate * duration_ms / 1000)
        active_start = int(frames * (1 - active_ratio))
        values = (0 if index < active_start else
                  int(0.25 * 32767 * math.sin(2 * math.pi * 220 * index / sample_rate))
                  for index in range(frames))
        audio.writeframes(b"".join(struct.pack("<h", value) for value in values))
    return output.getvalue()


def assert_flow_error(call, status, code):
    with pytest.raises(RecordingFlowError) as caught:
        call()
    assert caught.value.status_code == status
    assert caught.value.payload["code"] == code
    assert caught.value.payload["action"] == "SYNC_SESSION"
    assert caught.value.payload["message_vi"]


def test_missing_session_and_item_have_specific_contracts(tmp_path):
    service = make_service(tmp_path)
    assert_flow_error(lambda: service.init_upload({"session_id": "missing", "item_id": "missing"}),
                      404, "SESSION_NOT_FOUND")
    started, session, _ = setup_recording(service)
    assert_flow_error(lambda: service.init_upload({"session_id": started["session_id"], "item_id": "missing"}),
                      404, "ITEM_NOT_FOUND")


@pytest.mark.parametrize(("status", "code"), [
    (RecordingSessionStatus.STARTED, "SESSION_NOT_READY_FOR_UPLOAD"),
    (RecordingSessionStatus.COMPLETED, "SESSION_ALREADY_COMPLETED"),
    (RecordingSessionStatus.ABANDONED, "SESSION_NOT_ACTIVE"),
    (RecordingSessionStatus.EXPIRED, "SESSION_NOT_ACTIVE"),
])
def test_session_readiness_contract(tmp_path, status, code):
    service = make_service(tmp_path)
    _, session, item = setup_recording(service)
    session.status = status
    assert_flow_error(lambda: service.init_upload({"session_id": session.session_id, "item_id": item.item_id}),
                      409, code)


@pytest.mark.parametrize(("status", "code"), [
    (RecordingItemStatus.OPEN, "ITEM_NOT_READY_FOR_UPLOAD"),
    (RecordingItemStatus.NEED_RETAKE, "ITEM_NOT_READY_FOR_UPLOAD"),
    (RecordingItemStatus.DISABLED, "ITEM_NOT_READY_FOR_UPLOAD"),
    (RecordingItemStatus.REVIEW_PENDING, "ITEM_ALREADY_SUBMITTED"),
    (RecordingItemStatus.ACCEPTED, "ITEM_ALREADY_SUBMITTED"),
])
def test_item_readiness_contract(tmp_path, status, code):
    service = make_service(tmp_path)
    _, session, item = setup_recording(service)
    item.status = status
    assert_flow_error(lambda: service.init_upload({"session_id": session.session_id, "item_id": item.item_id}),
                      409, code)


@pytest.mark.parametrize("audio", [b"not wav" * 200, wav_fixture(400), wav_fixture(amplitude=0),
    wav_fixture(amplitude=0.001), wav_fixture(amplitude=1.0)],
    ids=["decode-fail", "too-short", "no-speech", "too-quiet", "clipped"])
def test_fastcheck_hard_fail_keeps_item_and_creates_no_sample(tmp_path, audio):
    service = make_service(tmp_path)
    _, session, item = setup_recording(service)
    response, sample = complete(service, session, item, audio=audio)
    assert response["action"] == "RETAKE_NOW"
    assert response["code"] == "FAST_CHECK_FAILED"
    assert response["retry_same_item"] is True
    assert sample is None
    assert item.status == RecordingItemStatus.ASSIGNED
    assert service.repo.list("samples") == []


@pytest.mark.parametrize(("audio", "warning"), [
    (wav_fixture(amplitude=0.006), "SLIGHTLY_LOW_VOLUME"),
    (wav_with_active_ratio(0.20), "BORDERLINE_SPEECH_ACTIVITY"),
], ids=["low-volume-warning", "speech-ratio-warning"])
def test_borderline_audio_passes_with_warning(tmp_path, audio, warning):
    service = make_service(tmp_path)
    _, session, item = setup_recording(service)
    response, sample = complete(service, session, item, audio=audio)
    assert response["action"] == "CONTINUE_NEXT"
    assert warning in response["warnings"]
    assert sample.status == AudioSampleStatus.CHECKING


def test_pass_atomically_creates_sample_and_assigns_full_next_item(tmp_path):
    service = make_service(tmp_path)
    _, session, item = setup_recording(service)
    assert sum(value.status == RecordingItemStatus.ASSIGNED for value in service.repo.list("items")) == 1
    response, sample = complete(service, session, item)
    assert response["action"] == "CONTINUE_NEXT"
    assert response["code"] == "FAST_CHECK_PASSED"
    assert response["sample_id"] == sample.sample_id
    assert sample.status == AudioSampleStatus.CHECKING
    assert item.status == RecordingItemStatus.REVIEW_PENDING
    assert response["next_item"]["status"] == RecordingItemStatus.ASSIGNED
    assert response["next_item"]["transcript"]
    assert service.queue.size() == 1


def test_deepcheck_enqueue_failure_does_not_block_upload_response(tmp_path):
    class UnavailableQueue:
        def enqueue(self, _sample_id):
            raise TimeoutError("queue unavailable")

    service = make_service(tmp_path)
    service.queue = UnavailableQueue()
    _, session, item = setup_recording(service)
    response, sample = complete(service, session, item)
    assert response["action"] == "CONTINUE_NEXT"
    assert sample.status == AudioSampleStatus.CHECKING


def test_pass_without_remaining_item_completes_session(tmp_path):
    service = make_service(tmp_path)
    _, session, item = setup_recording(service)
    for other in service.repo.list("items"):
        if other.item_id != item.item_id:
            other.status = RecordingItemStatus.DISABLED
    response, sample = complete(service, session, item)
    assert sample.status == AudioSampleStatus.CHECKING
    assert response["action"] == "SESSION_COMPLETED"
    assert response["code"] == "NO_MORE_ITEMS"
    assert response["next_item"] is None
    assert session.status == RecordingSessionStatus.COMPLETED


def test_complete_is_idempotent_after_success(tmp_path):
    service = make_service(tmp_path)
    _, session, item = setup_recording(service)
    _, data = initialize(service, session, item)
    first, first_sample = service.complete_upload(data)
    second, second_sample = service.complete_upload(data)
    assert second == first
    assert second_sample.sample_id == first_sample.sample_id
    assert len(service.repo.list("samples")) == 1


def test_processing_attempt_does_not_create_duplicate(tmp_path):
    service = make_service(tmp_path)
    _, session, item = setup_recording(service)
    slot, data = initialize(service, session, item)
    service.repo.get("uploads", slot["upload_id"])["status"] = "PROCESSING"
    assert_flow_error(lambda: service.complete_upload(data), 409, "UPLOAD_STILL_PROCESSING")
    assert service.repo.list("samples") == []


def test_new_attempt_after_submission_is_rejected_without_duplicate(tmp_path):
    service = make_service(tmp_path)
    _, session, item = setup_recording(service)
    _, second_data = initialize(service, session, item, "attempt-2")
    first, sample = complete(service, session, item, "attempt-1")
    assert first["sample_id"] == sample.sample_id
    assert_flow_error(lambda: service.complete_upload(second_data), 409, "ITEM_ALREADY_SUBMITTED")
    assert len(service.repo.list("samples")) == 1


def test_new_attempt_after_fastcheck_failure_is_allowed(tmp_path):
    service = make_service(tmp_path)
    _, session, item = setup_recording(service)
    failed, _ = complete(service, session, item, "attempt-1", wav_fixture(400))
    passed, sample = complete(service, session, item, "attempt-2", wav_fixture())
    assert failed["action"] == "RETAKE_NOW"
    assert passed["action"] == "CONTINUE_NEXT"
    assert sample.status == AudioSampleStatus.CHECKING
    assert len(service.repo.list("samples")) == 1
