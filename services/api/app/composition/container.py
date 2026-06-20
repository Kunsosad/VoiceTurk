from functools import lru_cache

from app.adapters.check.local import MockDeepCheckAdapter, RuleBasedFastCheckAdapter
from app.adapters.persistence.memory import MemoryRepository
from app.adapters.proof.local_hash import LocalHashProofAdapter
from app.adapters.storage.local import LocalStorageAdapter
from app.application.service import VoiceTurkService
from app.core.config import Settings


@lru_cache
def get_settings() -> Settings:
    return Settings()


@lru_cache
def get_service() -> VoiceTurkService:
    settings = get_settings()
    if settings.object_storage_provider != "local" or settings.fast_check_provider != "rule_based":
        raise RuntimeError("MVP currently supports local storage and rule-based FastCheck providers")
    if settings.deep_check_provider != "mock" or settings.proof_provider != "local_hash":
        raise RuntimeError("MVP currently supports mock DeepCheck and local-hash proof providers")
    return VoiceTurkService(MemoryRepository(), LocalStorageAdapter(settings.local_storage_dir),
                            RuleBasedFastCheckAdapter(), MockDeepCheckAdapter(), LocalHashProofAdapter(),
                            settings.local_export_dir)

