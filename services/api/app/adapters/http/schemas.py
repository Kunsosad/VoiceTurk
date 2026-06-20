from typing import Any

from pydantic import BaseModel, Field

from app.domain.enums import ValidatorDecision


class ScriptLineInput(BaseModel):
    transcript: str = Field(min_length=1)
    intent: str = Field(min_length=1)
    context_brief: str = ""


class CampaignCreate(BaseModel):
    buyer_id: str
    name: str
    domain: str
    target_emotions: list[str] = Field(min_length=1)
    script_lines: list[ScriptLineInput] = Field(min_length=1)
    accent_targets: list[str] = []
    environment_targets: list[str] = []
    quality_rules: dict[str, Any] = {}


class SessionStart(BaseModel):
    campaign_id: str
    contributor_id: str


class ReviewRequest(BaseModel):
    decision: ValidatorDecision
    validator_id: str = "validator_001"
    validator_notes: str | None = None


class DatasetBuildRequest(BaseModel):
    campaign_id: str
    version: str = "1.0"


class DatasetVerifyRequest(BaseModel):
    dataset_version_id: str
    manifest_hash: str


class UploadInitRequest(BaseModel):
    session_id: str
    item_id: str
    filename: str
    content_type: str
    size_bytes: int = Field(ge=0)


class UploadCompleteRequest(BaseModel):
    upload_id: str
    session_id: str
    item_id: str
    object_key: str
    client_metrics: dict[str, Any] = {}


class AgoraTokenRequest(BaseModel):
    channel: str
    uid: str
    role: str = "publisher"


class RetakeStartRequest(BaseModel):
    contributor_id: str = "user_001"


class DebugStorageInitRequest(BaseModel):
    content_type: str = "text/plain"
