from functools import lru_cache

from pathlib import Path

from app.adapters.check.local import HeuristicDeepCheckAdapter, RuleBasedFastCheckAdapter
from app.adapters.persistence.sqlite import SQLiteRepository
from app.adapters.proof.local_hash import LocalHashProofAdapter
from app.adapters.queue.in_process import InProcessJobQueueAdapter
from app.adapters.realtime.agora import AgoraRealtimeTokenAdapter
from app.adapters.storage.local import LocalStorageAdapter
from app.adapters.storage.minio import MinioStorageAdapter
from app.application.service import VoiceTurkService
from app.core.config import Settings


@lru_cache
def get_settings() -> Settings:
    return Settings()


@lru_cache
def get_service() -> VoiceTurkService:
    settings = get_settings()
    if settings.fast_check_provider != "rule_based" or settings.proof_provider != "local_hash":
        raise RuntimeError("Supported providers: FAST_CHECK_PROVIDER=rule_based and PROOF_PROVIDER=local_hash")
    if settings.database_url.startswith(("sqlite:///", "sqlite+aiosqlite:///")):
        database_value = settings.database_url.split("///", 1)[1]
    else:
        raise RuntimeError("DATABASE_URL must use sqlite:/// or sqlite+aiosqlite:/// for the MVP")
    database_path = Path(database_value)
    if not database_path.is_absolute():
        database_path = Path(__file__).resolve().parents[2] / database_path
    repository = SQLiteRepository(database_path)
    if settings.object_storage_provider == "local":
        storage = LocalStorageAdapter(settings.local_storage_dir)
    elif settings.object_storage_provider == "minio":
        storage = MinioStorageAdapter(settings.s3_endpoint_url, settings.s3_bucket_name, settings.s3_access_key_id,
            settings.s3_secret_access_key, settings.s3_region, settings.s3_secure, settings.s3_public_base_url,
            settings.app_env)
    else:
        raise RuntimeError("OBJECT_STORAGE_PROVIDER must be local or minio")
    fast_check = RuleBasedFastCheckAdapter(min_duration_ms=settings.fast_check_min_duration_ms,
        max_duration_ms=settings.fast_check_max_duration_ms, min_rms_dbfs=settings.fast_check_min_rms_dbfs,
        max_rms_dbfs=settings.fast_check_max_rms_dbfs, min_peak_dbfs=settings.fast_check_min_peak_dbfs,
        clipping_ratio_max=settings.fast_check_clipping_ratio_max, silence_ratio_max=settings.fast_check_silence_ratio_max,
        speech_ratio_min=settings.fast_check_speech_ratio_min,
        leading_silence_max_ms=settings.fast_check_leading_silence_max_ms,
        trailing_silence_max_ms=settings.fast_check_trailing_silence_max_ms,
        min_file_size_bytes=settings.fast_check_min_file_size_bytes)
    realtime = AgoraRealtimeTokenAdapter(settings.agora_app_id, settings.agora_app_certificate) if settings.realtime_provider == "agora" else AgoraRealtimeTokenAdapter("", "")
    return VoiceTurkService(repository, storage, fast_check, HeuristicDeepCheckAdapter(), LocalHashProofAdapter(),
        InProcessJobQueueAdapter(), realtime,
        settings.local_export_dir, settings.keep_failed_uploads, settings.s3_presigned_expire_seconds,
        settings.fast_check_timeout_seconds)
