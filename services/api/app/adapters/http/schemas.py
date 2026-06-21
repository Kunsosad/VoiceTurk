from typing import Any, Literal

from pydantic import BaseModel, Field

from app.domain.enums import UserRole, ValidatorDecision


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=10, max_length=128)


class RegisterRequest(LoginRequest):
    name: str = Field(min_length=2, max_length=100)
    role: UserRole


class ScriptLineInput(BaseModel):
    transcript: str = Field(min_length=1)
    intent: str = Field(min_length=1)
    context_brief: str = ""


class CampaignCreate(BaseModel):
    buyer_id: str | None = None
    name: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=2000)
    domain: str = Field(min_length=2, max_length=100)
    intents: list[str] = []
    target_emotions: list[str] = Field(min_length=1)
    target_sample_count: int = Field(default=0, ge=0, le=100000)
    recording_instructions: str = Field(default="", max_length=2000)
    script_lines: list[ScriptLineInput] = []
    accent_targets: list[str] = []
    environment_targets: list[str] = []
    quality_rules: dict[str, Any] = {}


class CampaignUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    domain: str | None = Field(default=None, min_length=2, max_length=100)
    intents: list[str] | None = None
    target_emotions: list[str] | None = Field(default=None, min_length=1)
    target_sample_count: int | None = Field(default=None, ge=0, le=100000)
    recording_instructions: str | None = Field(default=None, max_length=2000)
    accent_targets: list[str] | None = None
    environment_targets: list[str] | None = None
    quality_rules: dict[str, Any] | None = None


class SessionStart(BaseModel):
    campaign_id: str


class ReviewRequest(BaseModel):
    decision: ValidatorDecision
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


class CoachSpeakRequest(BaseModel):
    kind: Literal["instruction", "feedback"] = "instruction"
    message: str = Field(min_length=1, max_length=1000)
    feedback_context: dict[str, Any] | None = None


class RetakeStartRequest(BaseModel):
    contributor_id: str = "user_001"


class DebugStorageInitRequest(BaseModel):
    content_type: str = "text/plain"
