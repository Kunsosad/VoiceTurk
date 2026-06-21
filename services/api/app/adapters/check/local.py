import math
import wave
from array import array
from io import BytesIO
from typing import Any

from app.domain.entities import AudioSample
from app.domain.enums import DeepCheckDecision
from app.ports.providers import DeepCheckPort, DeepCheckResult, FastCheckPort, FastCheckResult


MESSAGES = {
    "FILE_MISSING": "Không tìm thấy file âm thanh. Bạn thử ghi lại nhé.",
    "DECODE_FAILED": "File âm thanh có vẻ bị lỗi. Bạn ghi lại câu này giúp mình nhé.",
    "AUDIO_TOO_SHORT": "Audio hơi ngắn, bạn đọc lại câu này rõ hơn nhé.",
    "AUDIO_TOO_LONG": "Audio hơi dài. Bạn đọc đúng câu trên màn hình thôi nhé.",
    "VOLUME_TOO_LOW": "Âm thanh hơi nhỏ, bạn đọc lại to hơn một chút nhé.",
    "VOLUME_TOO_HIGH": "Âm thanh quá lớn. Bạn nói xa micro hơn một chút nhé.",
    "NO_SPEECH_DETECTED": "Mình chưa phát hiện giọng nói rõ ràng. Bạn đọc lại câu này nhé.",
    "TOO_MUCH_SILENCE": "Có quá nhiều khoảng im lặng. Bạn đọc lại liền mạch hơn nhé.",
    "CLIPPING_TOO_HIGH": "Âm thanh bị vỡ tiếng. Bạn nói nhỏ hơn hoặc để micro xa hơn một chút nhé.",
    "UNSUPPORTED_AUDIO_FORMAT": "Định dạng audio chưa hỗ trợ. Hãy thu lại bằng WAV PCM nhé.",
    "FILE_TOO_SMALL": "File âm thanh quá nhỏ để kiểm tra. Bạn thử ghi lại nhé.",
    "FAST_CHECK_PASSED": "Ổn rồi, mình chuyển sang câu tiếp theo nhé.",
}


class UnsupportedAudioFormatError(ValueError):
    pass


class RuleBasedFastCheckAdapter(FastCheckPort):
    def __init__(self, **thresholds: Any) -> None:
        self.t = {"min_duration_ms": 900, "max_duration_ms": 15000, "min_rms_dbfs": -45.0,
            "max_rms_dbfs": -8.0, "min_peak_dbfs": -35.0, "clipping_ratio_max": 0.02,
            "silence_ratio_max": 0.65, "speech_ratio_min": 0.30, "leading_silence_max_ms": 1200,
            "trailing_silence_max_ms": 1800, "min_file_size_bytes": 1000} | thresholds

    def check(self, data: bytes, filename: str, content_type: str | None,
              client_metrics: dict[str, Any] | None = None) -> FastCheckResult:
        if not data:
            return self._fail("FILE_MISSING")
        if len(data) < self.t["min_file_size_bytes"]:
            return self._fail("FILE_TOO_SMALL", {"file_size_bytes": len(data)})
        if not filename.lower().endswith(".wav") and content_type not in {"audio/wav", "audio/x-wav"}:
            return self._fail("UNSUPPORTED_AUDIO_FORMAT", {"file_size_bytes": len(data)})
        try:
            metrics = self._analyze_wav(data)
        except UnsupportedAudioFormatError:
            return self._fail("UNSUPPORTED_AUDIO_FORMAT", {"file_size_bytes": len(data)})
        except (wave.Error, EOFError, ValueError, IndexError):
            return self._fail("DECODE_FAILED", {"file_size_bytes": len(data)})
        metrics["file_size_bytes"] = len(data)
        metrics["container"] = "wav"
        hard_checks = [
            (metrics["duration_ms"] < self.t["min_duration_ms"], "AUDIO_TOO_SHORT"),
            (metrics["duration_ms"] > self.t["max_duration_ms"], "AUDIO_TOO_LONG"),
            (metrics["rms_dbfs"] < self.t["min_rms_dbfs"] or metrics["peak_dbfs"] < self.t["min_peak_dbfs"], "VOLUME_TOO_LOW"),
            (metrics["clipping_ratio"] > self.t["clipping_ratio_max"], "CLIPPING_TOO_HIGH"),
            (metrics["rms_dbfs"] > self.t["max_rms_dbfs"], "VOLUME_TOO_HIGH"),
            (metrics["silence_ratio"] > self.t["silence_ratio_max"], "TOO_MUCH_SILENCE"),
            (metrics["speech_ratio"] < self.t["speech_ratio_min"], "NO_SPEECH_DETECTED"),
        ]
        for failed, reason in hard_checks:
            if failed:
                metrics["fast_check_score"] = self._score(metrics)
                return self._fail(reason, metrics)
        warnings = []
        if metrics["leading_silence_ms"] > self.t["leading_silence_max_ms"]:
            warnings.append("LONG_LEADING_SILENCE")
        if metrics["trailing_silence_ms"] > self.t["trailing_silence_max_ms"]:
            warnings.append("LONG_TRAILING_SILENCE")
        if metrics["rms_dbfs"] < -35:
            warnings.append("SLIGHTLY_LOW_VOLUME")
        metrics["fast_check_score"] = self._score(metrics) - min(0.15, len(warnings) * 0.05)
        return FastCheckResult(True, "FAST_CHECK_PASSED", MESSAGES["FAST_CHECK_PASSED"],
                               "warning" if warnings else "passed", metrics, warnings)

    def _analyze_wav(self, data: bytes) -> dict[str, Any]:
        with wave.open(BytesIO(data), "rb") as audio:
            channels, width, rate, frames = audio.getnchannels(), audio.getsampwidth(), audio.getframerate(), audio.getnframes()
            if width != 2 or rate <= 0 or channels not in (1, 2):
                raise UnsupportedAudioFormatError("Only 16-bit mono/stereo PCM is supported")
            values = array("h", audio.readframes(frames))
        if not values:
            raise ValueError("No samples")
        mono = [int((values[i] + values[i + 1]) / 2) for i in range(0, len(values) - 1, 2)] if channels == 2 else list(values)
        peak = max(abs(value) for value in mono)
        rms = math.sqrt(sum(value * value for value in mono) / len(mono))
        db = lambda value: 20 * math.log10(max(value, 1) / 32768)
        frame_size = max(1, int(rate * 0.02))
        active = []
        silence_rms = []
        speech_rms = []
        threshold = 32768 * (10 ** (-45 / 20))
        for start in range(0, len(mono), frame_size):
            chunk = mono[start:start + frame_size]
            chunk_rms = math.sqrt(sum(value * value for value in chunk) / len(chunk))
            is_active = chunk_rms >= threshold
            active.append(is_active)
            (speech_rms if is_active else silence_rms).append(chunk_rms)
        first = next((i for i, value in enumerate(active) if value), len(active))
        last = next((i for i, value in enumerate(reversed(active)) if value), len(active))
        speech_ratio = sum(active) / len(active)
        speech_level = sum(speech_rms) / len(speech_rms) if speech_rms else 1
        noise_level = sum(silence_rms) / len(silence_rms) if silence_rms else 1
        return {"duration_ms": round(len(mono) / rate * 1000), "sample_rate": rate, "channels": channels,
            "rms_dbfs": round(db(rms), 2), "peak_dbfs": round(db(peak), 2),
            "clipping_ratio": round(sum(abs(value) >= 32439 for value in mono) / len(mono), 5),
            "silence_ratio": round(1 - speech_ratio, 4), "speech_ratio": round(speech_ratio, 4),
            "speech_duration_ms": round(len(mono) / rate * 1000 * speech_ratio),
            "leading_silence_ms": first * 20, "trailing_silence_ms": last * 20,
            "estimated_snr_db": round(20 * math.log10(max(speech_level, 1) / max(noise_level, 1)), 2)}

    def _score(self, metrics: dict[str, Any]) -> float:
        score = 1.0
        score -= max(0.0, metrics["silence_ratio"] - 0.15) * 0.35
        score -= min(0.35, metrics["clipping_ratio"] * 8)
        score -= max(0.0, -32 - metrics["rms_dbfs"]) * 0.008
        return round(max(0.0, min(1.0, score)), 3)

    def _fail(self, reason: str, metrics: dict[str, Any] | None = None) -> FastCheckResult:
        return FastCheckResult(False, reason, MESSAGES[reason], "hard_fail", metrics or {})


class TechnicalDeepCheckAdapter(DeepCheckPort):
    """Model-free DeepCheck: measured DSP evidence only, with unavailable checks explicit."""

    def __init__(self) -> None:
        self.analyzer = RuleBasedFastCheckAdapter()

    @staticmethod
    def _feedback_context(sample: AudioSample, decision: DeepCheckDecision, reasons: list[str],
                          metrics: dict[str, Any], transcript: dict[str, Any]) -> dict[str, Any]:
        return {
            "sample_id": sample.sample_id,
            "item_id": sample.item_id,
            "decision": decision.value,
            "reason_codes": reasons,
            "target_transcript": sample.transcript_snapshot,
            "asr_transcript": transcript.get("transcript"),
            "missing_words": transcript.get("missing_words", []),
            "extra_words": transcript.get("extra_words", []),
            "target_emotion": sample.target_emotion_snapshot,
            "metrics": {key: metrics.get(key) for key in
                ("wer", "silence_ratio", "speech_ratio", "rms_dbfs", "clipping_ratio")
                if metrics.get(key) is not None},
            "coach_constraints": {
                "language": "vi",
                "max_sentences": 2,
                "must_not_change_decision": True,
                "must_not_add_new_reason": True,
                "must_quote_target_transcript_if_text_error": True,
            },
        }

    def _result(self, sample: AudioSample, decision: DeepCheckDecision, quality: float,
                reasons: list[str], technical: dict[str, Any], transcript: dict[str, Any],
                prosody: dict[str, Any], checks: dict[str, bool], components: dict[str, float | None],
                feedback: str) -> DeepCheckResult:
        context_metrics = {**technical, "wer": transcript.get("wer")}
        return DeepCheckResult(decision, quality, reasons, technical, transcript, prosody, checks,
            components, feedback, self._feedback_context(sample, decision, reasons, context_metrics, transcript))

    def analyze(self, sample: AudioSample, data: bytes) -> DeepCheckResult:
        unavailable = ["ASR_NOT_CONFIGURED", "TEXT_CHECK_NOT_AVAILABLE", "PROSODY_NOT_CHECKED"]
        checks = {"technical": True, "asr": False, "alignment": False, "prosody": False}
        transcript = {"transcript": None, "wer": None, "status": "not_available"}
        prosody = {"status": "not_checked", "target_emotion": sample.target_emotion_snapshot}
        try:
            metrics = self.analyzer._analyze_wav(data)
        except (wave.Error, EOFError, ValueError, IndexError):
            return self._result(sample, DeepCheckDecision.REJECT, 0.0,
                ["AUDIO_DECODE_FAILED", *unavailable], {}, transcript, prosody, checks,
                {"technical_score": 0.0, "speech_activity_score": None, "noise_score": None,
                 "transcript_score": None, "alignment_score": None, "prosody_score": None},
                "File âm thanh chính thức bị lỗi và không thể kiểm tra. Câu đã được mở lại.")

        # pilot_starting_point: conservative technical bounds; calibrate with validator-labelled audio.
        technical_score = self.analyzer._score(metrics)
        speech_score = round(max(0.0, min(1.0, metrics["speech_ratio"] / 0.65)), 3)
        snr_score = round(max(0.0, min(1.0, metrics["estimated_snr_db"] / 20.0)), 3)
        quality = round(0.55 * technical_score + 0.30 * speech_score + 0.15 * snr_score, 3)
        components = {"technical_score": technical_score, "speech_activity_score": speech_score,
            "noise_score": snr_score, "transcript_score": None, "alignment_score": None,
            "prosody_score": None}
        if metrics["duration_ms"] < 500 or metrics["clipping_ratio"] > 0.10:
            reasons = (["TOO_SHORT"] if metrics["duration_ms"] < 500 else ["CLIPPING_DETECTED"])
            return self._result(sample, DeepCheckDecision.REJECT, quality, [*reasons, *unavailable], metrics,
                transcript, prosody, checks, components,
                "Bản thu có lỗi kỹ thuật nghiêm trọng và câu đã được mở lại.")
        if (metrics["silence_ratio"] > 0.65 or metrics["rms_dbfs"] < -42.0 or
                metrics["clipping_ratio"] > 0.02):
            reasons = []
            if metrics["silence_ratio"] > 0.65: reasons.append("TOO_MUCH_SILENCE")
            if metrics["rms_dbfs"] < -42.0: reasons.append("LOW_CONFIDENCE_AUDIO")
            if metrics["clipping_ratio"] > 0.02: reasons.append("CLIPPING_DETECTED")
            return self._result(sample, DeepCheckDecision.NEED_RETAKE_LATER, quality,
                [*reasons, *unavailable], metrics, transcript, prosody, checks, components,
                "Bản thu cần thu lại vì tín hiệu kỹ thuật chưa ổn định.")
        return self._result(sample, DeepCheckDecision.PASS_TO_REVIEW, quality,
            ["TECHNICAL_OK", *unavailable, "READY_FOR_VALIDATOR"], metrics, transcript, prosody,
            checks, components,
            "Kiểm tra kỹ thuật đã hoàn tất. Bản thu đang chờ Validator đánh giá.")


# Backward-compatible import name for local callers; behavior is no longer emotion-based heuristic.
HeuristicDeepCheckAdapter = TechnicalDeepCheckAdapter
