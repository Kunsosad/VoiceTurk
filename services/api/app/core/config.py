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

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

