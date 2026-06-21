from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.adapters.auth.security import AuthenticationError, AuthManager
from app.adapters.http.schemas import (AgoraTokenRequest, CampaignCreate, CampaignUpdate, DatasetBuildRequest,
    DatasetVerifyRequest, DebugStorageInitRequest, LoginRequest, RegisterRequest, RetakeStartRequest, ReviewRequest,
    ScriptLineInput, SessionStart, UploadCompleteRequest, UploadInitRequest)
from app.application.service import VoiceTurkService
from app.composition.container import get_service, get_settings
from app.core.config import Settings
from app.domain.entities import User
from app.domain.enums import CampaignStatus, UserRole

router = APIRouter()
bearer = HTTPBearer(auto_error=False)


def get_auth_manager(service: VoiceTurkService = Depends(get_service),
                     settings: Settings = Depends(get_settings)) -> AuthManager:
    return AuthManager(service.repo, settings.auth_secret_key, settings.access_token_expire_minutes)


def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
                 auth: AuthManager = Depends(get_auth_manager)) -> User:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail={"error_code": "UNAUTHENTICATED", "message": "Sign in required"})
    try:
        return auth.current_user(credentials.credentials)
    except AuthenticationError as exc:
        raise HTTPException(status_code=401, detail={"error_code": "UNAUTHENTICATED", "message": str(exc)}) from exc


def require_role(user: User, *roles: UserRole) -> None:
    if user.role not in roles and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail={"error_code": "FORBIDDEN", "message": "Your role cannot perform this action"})


def authorize_campaign(service: VoiceTurkService, user: User, campaign_id: str, write: bool = True) -> dict:
    campaign = service.campaign_detail(campaign_id)
    if user.role == UserRole.ADMIN or campaign["buyer_id"] == user.user_id:
        return campaign
    if not write and user.role == UserRole.CONTRIBUTOR and campaign["status"] == CampaignStatus.ACTIVE:
        return campaign
    raise HTTPException(status_code=403, detail={"error_code": "FORBIDDEN", "message": "Campaign access denied"})


def authorize_session(service: VoiceTurkService, user: User, session_id: str) -> dict:
    session = service.session_detail(session_id)
    if user.role == UserRole.ADMIN or session["contributor_id"] == user.user_id:
        return session
    raise HTTPException(status_code=403, detail={"error_code": "FORBIDDEN", "message": "Recording session access denied"})


def development_only(settings: Settings) -> None:
    if settings.app_env != "development":
        raise HTTPException(status_code=404, detail="Debug endpoint is only available in development")


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "voiceturk-api"}


@router.get("/ready")
def ready(service: VoiceTurkService = Depends(get_service)):
    try:
        service.repo.list("users")
        return {"status": "ready", "database": "ok"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail={"error_code": "NOT_READY", "message": type(exc).__name__}) from exc


@router.post("/auth/register", status_code=201)
def register(body: RegisterRequest, auth: AuthManager = Depends(get_auth_manager)):
    if body.role not in (UserRole.BUYER, UserRole.CONTRIBUTOR):
        raise HTTPException(status_code=422, detail={"error_code": "INVALID_ROLE", "message": "Register as BUYER or CONTRIBUTOR"})
    user = auth.register(body.email, body.password, body.name, body.role)
    return {"access_token": auth.issue_token(user), "token_type": "bearer", "user": user.to_dict()}


@router.post("/auth/login")
def login(body: LoginRequest, auth: AuthManager = Depends(get_auth_manager)):
    try:
        user, token = auth.authenticate(body.email, body.password)
        return {"access_token": token, "token_type": "bearer", "user": user.to_dict()}
    except AuthenticationError as exc:
        raise HTTPException(status_code=401, detail={"error_code": "INVALID_CREDENTIALS", "message": str(exc)}) from exc


@router.get("/auth/me")
def me(user: User = Depends(current_user)):
    return user.to_dict()


@router.post("/auth/logout", status_code=204)
def logout(_: User = Depends(current_user)):
    return Response(status_code=204)


@router.post("/demo/seed")
def seed_demo(service: VoiceTurkService = Depends(get_service), auth: AuthManager = Depends(get_auth_manager),
              settings: Settings = Depends(get_settings)):
    development_only(settings)
    auth.seed_demo_accounts()
    return service.seed_demo()


@router.post("/demo/seed-unified-user")
def seed_unified_user(service: VoiceTurkService = Depends(get_service), auth: AuthManager = Depends(get_auth_manager),
                      settings: Settings = Depends(get_settings)):
    development_only(settings)
    auth.seed_demo_accounts()
    return service.seed_demo()


@router.post("/campaigns", status_code=201)
def create_campaign(body: CampaignCreate, service: VoiceTurkService = Depends(get_service),
                    user: User = Depends(current_user)):
    require_role(user, UserRole.BUYER)
    value = body.model_dump()
    value["buyer_id"] = user.user_id
    return service.create_campaign(value)


@router.get("/campaigns")
def list_campaigns(service: VoiceTurkService = Depends(get_service), user: User = Depends(current_user)):
    if user.role == UserRole.ADMIN:
        return service.list_campaigns()
    if user.role == UserRole.BUYER:
        return service.list_buyer_campaigns(user.user_id)
    return service.available_campaigns()


@router.get("/campaigns/available/discover")
def discover_campaigns(q: str = Query(default="", max_length=100), domain: str = "", emotion: str = "",
                       service: VoiceTurkService = Depends(get_service), user: User = Depends(current_user)):
    require_role(user, UserRole.CONTRIBUTOR)
    return service.available_campaigns(q, domain, emotion)


@router.get("/campaigns/{campaign_id}")
def campaign_detail(campaign_id: str, service: VoiceTurkService = Depends(get_service),
                    user: User = Depends(current_user)):
    authorize_campaign(service, user, campaign_id, write=False)
    return service.campaign_detail(campaign_id)


@router.patch("/campaigns/{campaign_id}")
def update_campaign(campaign_id: str, body: CampaignUpdate, service: VoiceTurkService = Depends(get_service),
                    user: User = Depends(current_user)):
    require_role(user, UserRole.BUYER)
    authorize_campaign(service, user, campaign_id)
    return service.update_campaign(campaign_id, body.model_dump(exclude_unset=True))


@router.post("/campaigns/{campaign_id}/archive")
def archive_campaign(campaign_id: str, service: VoiceTurkService = Depends(get_service),
                     user: User = Depends(current_user)):
    require_role(user, UserRole.BUYER)
    authorize_campaign(service, user, campaign_id)
    return service.archive_campaign(campaign_id)


@router.post("/campaigns/{campaign_id}/script-lines", status_code=201)
def add_script_line(campaign_id: str, body: ScriptLineInput, service: VoiceTurkService = Depends(get_service),
                    user: User = Depends(current_user)):
    require_role(user, UserRole.BUYER)
    authorize_campaign(service, user, campaign_id)
    return service.add_script_line(campaign_id, body.model_dump())


@router.patch("/campaigns/{campaign_id}/script-lines/{line_id}")
def update_script_line(campaign_id: str, line_id: str, body: ScriptLineInput,
                       service: VoiceTurkService = Depends(get_service), user: User = Depends(current_user)):
    require_role(user, UserRole.BUYER)
    authorize_campaign(service, user, campaign_id)
    return service.update_script_line(campaign_id, line_id, body.model_dump())


@router.delete("/campaigns/{campaign_id}/script-lines/{line_id}")
def delete_script_line(campaign_id: str, line_id: str, service: VoiceTurkService = Depends(get_service),
                       user: User = Depends(current_user)):
    require_role(user, UserRole.BUYER)
    authorize_campaign(service, user, campaign_id)
    return service.delete_script_line(campaign_id, line_id)


@router.post("/campaigns/{campaign_id}/generate-items")
def generate_items(campaign_id: str, service: VoiceTurkService = Depends(get_service),
                   user: User = Depends(current_user)):
    require_role(user, UserRole.BUYER)
    authorize_campaign(service, user, campaign_id)
    return service.generate_items(campaign_id)


@router.post("/campaigns/{campaign_id}/activate")
def activate_campaign(campaign_id: str, service: VoiceTurkService = Depends(get_service),
                      user: User = Depends(current_user)):
    require_role(user, UserRole.BUYER)
    authorize_campaign(service, user, campaign_id)
    return service.activate_campaign(campaign_id)


@router.get("/campaigns/{campaign_id}/coverage")
def campaign_coverage(campaign_id: str, service: VoiceTurkService = Depends(get_service),
                      user: User = Depends(current_user)):
    authorize_campaign(service, user, campaign_id)
    return service.coverage(campaign_id)


@router.post("/recording-sessions/start", status_code=201)
def start_session(body: SessionStart, service: VoiceTurkService = Depends(get_service),
                  user: User = Depends(current_user)):
    require_role(user, UserRole.CONTRIBUTOR, UserRole.BUYER)
    authorize_campaign(service, user, body.campaign_id, write=False)
    # contributor_id is always the authenticated user; never trust a client-supplied id
    return service.start_session(body.campaign_id, user.user_id)


@router.get("/recording-sessions/{session_id}/items")
def session_items(session_id: str, service: VoiceTurkService = Depends(get_service), user: User = Depends(current_user)):
    authorize_session(service, user, session_id)
    return service.session_items(session_id)


@router.get("/recording-sessions/{session_id}/next-action")
def next_action(session_id: str, service: VoiceTurkService = Depends(get_service), user: User = Depends(current_user)):
    authorize_session(service, user, session_id)
    return service.next_action(session_id)


@router.get("/recording-sessions/{session_id}/retakes")
def session_retakes(session_id: str, service: VoiceTurkService = Depends(get_service), user: User = Depends(current_user)):
    authorize_session(service, user, session_id)
    return service.session_retakes(session_id)


@router.get("/campaigns/{campaign_id}/retakes")
def campaign_retakes(campaign_id: str, service: VoiceTurkService = Depends(get_service), user: User = Depends(current_user)):
    authorize_campaign(service, user, campaign_id, write=False)
    return service.campaign_retakes(campaign_id)


@router.post("/recording-items/{item_id}/start-retake")
def start_retake(item_id: str, body: RetakeStartRequest, service: VoiceTurkService = Depends(get_service),
                 user: User = Depends(current_user)):
    require_role(user, UserRole.CONTRIBUTOR, UserRole.BUYER)
    return service.start_retake(item_id, user.user_id)


@router.post("/recording-items/{item_id}/skip")
def skip_item(item_id: str, service: VoiceTurkService = Depends(get_service), user: User = Depends(current_user)):
    item = service._required("items", item_id)
    if user.role != UserRole.ADMIN and item.assigned_to != user.user_id:
        raise HTTPException(status_code=403, detail={"error_code": "FORBIDDEN", "message": "Item access denied"})
    return service.skip_item(item_id)


@router.post("/recording-sessions/{session_id}/complete")
def complete_session(session_id: str, service: VoiceTurkService = Depends(get_service), user: User = Depends(current_user)):
    authorize_session(service, user, session_id)
    return service.complete_session(session_id)


@router.post("/recording-items/{item_id}/submit-audio")
def submit_audio(item_id: str, audio: UploadFile = File(),
                 session_id: str = Form(), contributor_id: str = Form(), duration_ms: int = Form(),
                 service: VoiceTurkService = Depends(get_service), user: User = Depends(current_user)):
    authorize_session(service, user, session_id)
    response, _ = service.submit_audio(item_id, session_id, user.user_id, duration_ms,
                                       audio.filename or "audio.wav", audio.content_type, audio.file)
    return response


@router.post("/audio/uploads/init")
def init_upload(body: UploadInitRequest, service: VoiceTurkService = Depends(get_service),
                settings: Settings = Depends(get_settings), user: User = Depends(current_user)):
    authorize_session(service, user, body.session_id)
    if body.size_bytes > settings.max_audio_size_bytes:
        raise HTTPException(status_code=413, detail={"error_code": "AUDIO_TOO_LARGE", "message": "Audio exceeds configured size limit"})
    return service.init_upload(body.model_dump())


@router.put("/audio/uploads/{upload_id}/content")
async def put_upload(upload_id: str, request: Request, service: VoiceTurkService = Depends(get_service),
                     settings: Settings = Depends(get_settings), user: User = Depends(current_user)):
    upload = service._required("uploads", upload_id)
    authorize_session(service, user, upload["session_id"])
    content_length = int(request.headers.get("content-length", "0") or 0)
    if content_length > settings.max_audio_size_bytes:
        raise HTTPException(status_code=413, detail={"error_code": "AUDIO_TOO_LARGE", "message": "Audio exceeds configured size limit"})
    data = await request.body()
    if len(data) > settings.max_audio_size_bytes:
        raise HTTPException(status_code=413, detail={"error_code": "AUDIO_TOO_LARGE", "message": "Audio exceeds configured size limit"})
    return service.put_upload(upload_id, data, request.headers.get("content-type"))


@router.post("/audio/uploads/complete")
def complete_upload(body: UploadCompleteRequest, service: VoiceTurkService = Depends(get_service),
                    user: User = Depends(current_user)):
    authorize_session(service, user, body.session_id)
    response, _ = service.complete_upload(body.model_dump())
    return response


@router.get("/validation/review-queue")
def review_queue(service: VoiceTurkService = Depends(get_service), user: User = Depends(current_user)):
    require_role(user, UserRole.BUYER)
    values = service.review_queue()
    return values if user.role == UserRole.ADMIN else [value for value in values
        if service.campaign_detail(value["campaign_id"])["buyer_id"] == user.user_id]


@router.get("/validation/audio-samples/{sample_id}")
def sample_detail(sample_id: str, service: VoiceTurkService = Depends(get_service), user: User = Depends(current_user)):
    sample = service.sample_detail(sample_id)
    authorize_campaign(service, user, sample["campaign_id"])
    return service.sample_detail(sample_id)


@router.get("/audio-samples/{sample_id}/checks")
def sample_checks(sample_id: str, service: VoiceTurkService = Depends(get_service), user: User = Depends(current_user)):
    sample = service.sample_detail(sample_id)
    authorize_campaign(service, user, sample["campaign_id"])
    return service.sample_checks(sample_id)


@router.get("/media/{sample_id}")
def sample_media(sample_id: str, service: VoiceTurkService = Depends(get_service), user: User = Depends(current_user)):
    sample = service.sample_detail(sample_id)
    authorize_campaign(service, user, sample["campaign_id"])
    content, content_type = service.sample_audio(sample_id)
    return Response(content=content, media_type=content_type)


@router.post("/validation/audio-samples/{sample_id}/review")
def review_sample(sample_id: str, body: ReviewRequest, service: VoiceTurkService = Depends(get_service),
                  user: User = Depends(current_user)):
    require_role(user, UserRole.BUYER)
    sample = service.sample_detail(sample_id)
    authorize_campaign(service, user, sample["campaign_id"])
    # validator_id is always the authenticated user; never trust a client-supplied id
    return service.review_sample(sample_id, body.decision, user.user_id, body.validator_notes)


@router.post("/deep-check/run-pending")
def run_pending_deep_checks(service: VoiceTurkService = Depends(get_service), user: User = Depends(current_user)):
    require_role(user, UserRole.ADMIN, UserRole.BUYER)
    return service.run_pending_deep_checks()


@router.get("/deep-check/status")
def deep_check_status(service: VoiceTurkService = Depends(get_service), user: User = Depends(current_user)):
    require_role(user, UserRole.ADMIN, UserRole.BUYER)
    return service.deep_check_status()


@router.post("/audio-samples/{sample_id}/deep-check/retry")
def retry_deep_check(sample_id: str, service: VoiceTurkService = Depends(get_service), user: User = Depends(current_user)):
    require_role(user, UserRole.ADMIN)
    return service.retry_deep_check(sample_id)


@router.post("/realtime/agora/token")
def agora_token(body: AgoraTokenRequest, service: VoiceTurkService = Depends(get_service),
                user: User = Depends(current_user)):
    return service.issue_realtime_token(body.channel, user.user_id, body.role)


@router.get("/debug/storage/health")
def storage_health(service: VoiceTurkService = Depends(get_service), settings: Settings = Depends(get_settings),
                   user: User = Depends(current_user)):
    development_only(settings)
    return service.storage_health()


@router.post("/debug/storage/uploads/init")
def debug_storage_init(body: DebugStorageInitRequest, service: VoiceTurkService = Depends(get_service),
                       settings: Settings = Depends(get_settings), user: User = Depends(current_user)):
    development_only(settings)
    return service.debug_storage_upload_init(body.content_type)


@router.put("/debug/storage/uploads/{probe_id}/content")
async def debug_storage_put(probe_id: str, request: Request, service: VoiceTurkService = Depends(get_service),
                            settings: Settings = Depends(get_settings), user: User = Depends(current_user)):
    development_only(settings)
    return service.debug_storage_upload_put(probe_id, await request.body(), request.headers.get("content-type", "text/plain"))


@router.post("/debug/storage/uploads/{probe_id}/verify")
def debug_storage_verify(probe_id: str, service: VoiceTurkService = Depends(get_service),
                         settings: Settings = Depends(get_settings), user: User = Depends(current_user)):
    development_only(settings)
    return service.debug_storage_upload_verify(probe_id)


@router.post("/datasets/build", status_code=201)
def build_dataset(body: DatasetBuildRequest, service: VoiceTurkService = Depends(get_service),
                  user: User = Depends(current_user)):
    require_role(user, UserRole.BUYER)
    authorize_campaign(service, user, body.campaign_id)
    return service.build_dataset(body.campaign_id, body.version)


@router.get("/datasets/{dataset_version_id}")
def dataset_detail(dataset_version_id: str, service: VoiceTurkService = Depends(get_service),
                   user: User = Depends(current_user)):
    dataset = service.dataset_detail(dataset_version_id)
    authorize_campaign(service, user, dataset["campaign_id"])
    return dataset


@router.post("/datasets/verify")
def verify_dataset(body: DatasetVerifyRequest, service: VoiceTurkService = Depends(get_service),
                   user: User = Depends(current_user)):
    dataset = service.dataset_detail(body.dataset_version_id)
    authorize_campaign(service, user, dataset["campaign_id"])
    return service.verify_dataset(body.dataset_version_id, body.manifest_hash)
