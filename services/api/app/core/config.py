from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

API_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    app_env: str = "development"
    api_base_url: str = "http://localhost:8000"
    next_public_api_base_url: str = "http://localhost:8000"
    object_storage_provider: str = "local"
    realtime_provider: str = "browser_tts"
    proof_provider: str = "local_hash"
    fast_check_provider: str = "rule_based"
    deep_check_provider: str = "mock"
    asr_provider: str = "mock"
    llm_feedback_provider: str = "template"
    local_storage_dir: Path = Path("storage")
    local_export_dir: Path = Path("exports")
    database_url: str = "sqlite:///./voiceturk.db"
    queue_provider: str = "in_process"
    deep_check_worker_enabled: bool = True
    deep_check_poll_interval_seconds: float = 3.0
    deep_check_batch_size: int = 10
    keep_failed_uploads: bool = False
    s3_endpoint_url: str = ""
    s3_bucket_name: str = "voiceturk-dev"
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_region: str = "us-east-1"
    s3_public_base_url: str = ""
    s3_secure: bool = False
    s3_presigned_expire_seconds: int = 900
    agora_app_id: str = ""
    agora_app_certificate: str = ""
    agora_region: str = "global"
    agora_feature_rtc: bool = False
    agora_feature_rtm: bool = False
    agora_feature_convoai: bool = False
    agora_agent_uid: str = "123456"
    # pilot_starting_point: research-guided bounds requiring calibration on VoiceTurk pilot audio.
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
    fast_check_timeout_seconds: float = 15.0
    auth_secret_key: str = "development-only-change-me"
    access_token_expire_minutes: int = 480
    refresh_token_expire_days: int = 7
    password_hash_scheme: str = "bcrypt"
    cookie_secure: bool = False
    cookie_samesite: str = "lax"
    cors_allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    max_audio_size_bytes: int = 25 * 1024 * 1024
    openai_api_key: str = ""
    whisper_provider: str = "disabled"
    redis_url: str = ""
    sentry_dsn: str = ""

    model_config = SettingsConfigDict(env_file=(REPO_ROOT / ".env", API_ROOT / ".env"), extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.cors_allowed_origins.split(",") if origin.strip()]

    @model_validator(mode="after")
    def validate_environment(self) -> "Settings":
        self.app_env = self.app_env.lower()
        if self.app_env not in {"development", "test", "staging", "production"}:
            raise ValueError("APP_ENV must be development, test, staging, or production")
        if self.password_hash_scheme != "bcrypt":
            raise ValueError("PASSWORD_HASH_SCHEME must be bcrypt")
        if self.realtime_provider not in {"browser_tts", "agora", "agora_convoai"}:
            raise ValueError("REALTIME_PROVIDER must be browser_tts, agora, or agora_convoai")
        if self.cookie_samesite not in {"lax", "strict", "none"}:
            raise ValueError("COOKIE_SAMESITE must be lax, strict, or none")
        if self.object_storage_provider == "minio" and not self.s3_public_base_url:
            raise ValueError("S3_PUBLIC_BASE_URL is required when OBJECT_STORAGE_PROVIDER=minio")
        if self.deep_check_poll_interval_seconds <= 0 or self.deep_check_batch_size <= 0:
            raise ValueError("DeepCheck worker poll interval and batch size must be positive")
        if self.s3_region == "auto" and self.object_storage_provider == "minio":
            self.s3_region = "us-east-1"
        if self.app_env in {"staging", "production"}:
            if len(self.auth_secret_key) < 32 or self.auth_secret_key == "development-only-change-me":
                raise ValueError("AUTH_SECRET_KEY must be at least 32 characters outside development")
            if not self.cors_origins or any("localhost" in value or "127.0.0.1" in value or value == "*" for value in self.cors_origins):
                raise ValueError("CORS_ALLOWED_ORIGINS must contain explicit non-local origins outside development")
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE must be true outside development")
        return self
