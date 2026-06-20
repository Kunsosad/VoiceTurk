from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    object_storage_provider: str = "local"
    realtime_provider: str = "browser_tts"
    proof_provider: str = "local_hash"
    fast_check_provider: str = "rule_based"
    deep_check_provider: str = "mock"
    local_storage_dir: Path = Path("storage")
    local_export_dir: Path = Path("exports")
    database_url: str = "sqlite:///./voiceturk.db"
    queue_provider: str = "in_process"
    keep_failed_uploads: bool = False
    s3_endpoint_url: str = ""
    s3_bucket_name: str = "voiceturk"
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_region: str = "us-east-1"
    s3_public_base_url: str = ""
    s3_secure: bool = False
    agora_app_id: str = ""
    agora_app_certificate: str = ""
    fast_check_min_duration_ms: int = 900
    fast_check_max_duration_ms: int = 15000
    fast_check_min_rms_dbfs: float = -45.0
    fast_check_max_rms_dbfs: float = -8.0
    fast_check_min_peak_dbfs: float = -35.0
    fast_check_clipping_ratio_max: float = 0.02
    fast_check_silence_ratio_max: float = 0.65
    fast_check_speech_ratio_min: float = 0.30
    fast_check_leading_silence_max_ms: int = 1200
    fast_check_trailing_silence_max_ms: int = 1800
    fast_check_min_file_size_bytes: int = 1000

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
