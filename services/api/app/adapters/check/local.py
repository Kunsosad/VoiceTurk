from pathlib import Path

from app.domain.entities import AudioSample
from app.domain.enums import AudioSampleStatus
from app.ports.providers import DeepCheckPort, FastCheckPort, FastCheckResult


class RuleBasedFastCheckAdapter(FastCheckPort):
    def check(self, path: Path, duration_ms: int, content_type: str | None) -> FastCheckResult:
        if not path.exists() or path.stat().st_size == 0:
            return FastCheckResult(False, "AUDIO_EMPTY", "Không tìm thấy audio, bạn thử ghi lại nhé.")
        if duration_ms < 500:
            return FastCheckResult(False, "AUDIO_TOO_SHORT", "Audio hơi ngắn, bạn đọc lại câu này rõ hơn nhé.")
        if path.stat().st_size < 64:
            return FastCheckResult(False, "AUDIO_FILE_TOO_SMALL", "Tệp audio chưa hợp lệ, bạn thử ghi lại nhé.")
        if content_type and not (content_type.startswith("audio/") or content_type == "application/octet-stream"):
            return FastCheckResult(False, "AUDIO_TYPE_UNSUPPORTED", "Định dạng audio chưa được hỗ trợ.")
        return FastCheckResult(True, "FAST_CHECK_PASSED", "Ổn rồi, mình chuyển sang câu tiếp theo nhé.")


class MockDeepCheckAdapter(DeepCheckPort):
    def enrich(self, sample: AudioSample) -> None:
        sample.loudness_db = -18.0
        sample.speech_rate_wps = 2.4
        sample.silence_ratio = 0.08
        sample.pitch_summary = "mock-balanced"
        sample.quality_score = 0.88
        sample.deep_check_status = "PASSED"
        sample.status = AudioSampleStatus.REVIEW_PENDING

