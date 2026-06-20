from fastapi import APIRouter, Depends, File, Form, Request, Response, UploadFile

from app.adapters.http.schemas import (AgoraTokenRequest, CampaignCreate, DatasetBuildRequest, DatasetVerifyRequest,
    RetakeStartRequest, ReviewRequest, SessionStart, UploadCompleteRequest, UploadInitRequest)
from app.application.service import VoiceTurkService
from app.composition.container import get_service

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "voiceturk-api"}


@router.post("/demo/seed")
def seed_demo(service: VoiceTurkService = Depends(get_service)):
    return service.seed_demo()


@router.post("/demo/seed-unified-user")
def seed_unified_user(service: VoiceTurkService = Depends(get_service)):
    return service.seed_demo()


@router.post("/campaigns", status_code=201)
def create_campaign(body: CampaignCreate, service: VoiceTurkService = Depends(get_service)):
    return service.create_campaign(body.model_dump())


@router.get("/campaigns")
def list_campaigns(service: VoiceTurkService = Depends(get_service)):
    return service.list_campaigns()


@router.get("/campaigns/{campaign_id}")
def campaign_detail(campaign_id: str, service: VoiceTurkService = Depends(get_service)):
    return service.campaign_detail(campaign_id)


@router.post("/campaigns/{campaign_id}/generate-items")
def generate_items(campaign_id: str, service: VoiceTurkService = Depends(get_service)):
    return service.generate_items(campaign_id)


@router.post("/campaigns/{campaign_id}/activate")
def activate_campaign(campaign_id: str, service: VoiceTurkService = Depends(get_service)):
    return service.activate_campaign(campaign_id)


@router.get("/campaigns/{campaign_id}/coverage")
def campaign_coverage(campaign_id: str, service: VoiceTurkService = Depends(get_service)):
    return service.coverage(campaign_id)


@router.post("/recording-sessions/start", status_code=201)
def start_session(body: SessionStart, service: VoiceTurkService = Depends(get_service)):
    return service.start_session(body.campaign_id, body.contributor_id)


@router.get("/recording-sessions/{session_id}/items")
def session_items(session_id: str, service: VoiceTurkService = Depends(get_service)):
    return service.session_items(session_id)


@router.get("/recording-sessions/{session_id}/next-action")
def next_action(session_id: str, service: VoiceTurkService = Depends(get_service)):
    return service.next_action(session_id)


@router.get("/recording-sessions/{session_id}/retakes")
def session_retakes(session_id: str, service: VoiceTurkService = Depends(get_service)):
    return service.session_retakes(session_id)


@router.get("/campaigns/{campaign_id}/retakes")
def campaign_retakes(campaign_id: str, service: VoiceTurkService = Depends(get_service)):
    return service.campaign_retakes(campaign_id)


@router.post("/recording-items/{item_id}/start-retake")
def start_retake(item_id: str, body: RetakeStartRequest, service: VoiceTurkService = Depends(get_service)):
    return service.start_retake(item_id, body.contributor_id)


@router.post("/recording-items/{item_id}/skip")
def skip_item(item_id: str, service: VoiceTurkService = Depends(get_service)):
    return service.skip_item(item_id)


@router.post("/recording-sessions/{session_id}/complete")
def complete_session(session_id: str, service: VoiceTurkService = Depends(get_service)):
    return service.complete_session(session_id)


@router.post("/recording-items/{item_id}/submit-audio")
def submit_audio(item_id: str, audio: UploadFile = File(),
                 session_id: str = Form(), contributor_id: str = Form(), duration_ms: int = Form(),
                 service: VoiceTurkService = Depends(get_service)):
    response, _ = service.submit_audio(item_id, session_id, contributor_id, duration_ms,
                                       audio.filename or "audio.wav", audio.content_type, audio.file)
    return response


@router.post("/audio/uploads/init")
def init_upload(body: UploadInitRequest, service: VoiceTurkService = Depends(get_service)):
    return service.init_upload(body.model_dump())


@router.put("/audio/uploads/{upload_id}/content")
async def put_upload(upload_id: str, request: Request, service: VoiceTurkService = Depends(get_service)):
    return service.put_upload(upload_id, await request.body(), request.headers.get("content-type"))


@router.post("/audio/uploads/complete")
def complete_upload(body: UploadCompleteRequest, service: VoiceTurkService = Depends(get_service)):
    response, _ = service.complete_upload(body.model_dump())
    return response


@router.get("/validation/review-queue")
def review_queue(service: VoiceTurkService = Depends(get_service)):
    return service.review_queue()


@router.get("/validation/audio-samples/{sample_id}")
def sample_detail(sample_id: str, service: VoiceTurkService = Depends(get_service)):
    return service.sample_detail(sample_id)


@router.get("/audio-samples/{sample_id}/checks")
def sample_checks(sample_id: str, service: VoiceTurkService = Depends(get_service)):
    return service.sample_checks(sample_id)


@router.get("/media/{sample_id}")
def sample_media(sample_id: str, service: VoiceTurkService = Depends(get_service)):
    content, content_type = service.sample_audio(sample_id)
    return Response(content=content, media_type=content_type)


@router.post("/validation/audio-samples/{sample_id}/review")
def review_sample(sample_id: str, body: ReviewRequest, service: VoiceTurkService = Depends(get_service)):
    return service.review_sample(sample_id, body.decision, body.validator_id, body.validator_notes)


@router.post("/deep-check/run-pending")
def run_pending_deep_checks(service: VoiceTurkService = Depends(get_service)):
    return service.run_pending_deep_checks()


@router.get("/deep-check/status")
def deep_check_status(service: VoiceTurkService = Depends(get_service)):
    return service.deep_check_status()


@router.post("/audio-samples/{sample_id}/deep-check/retry")
def retry_deep_check(sample_id: str, service: VoiceTurkService = Depends(get_service)):
    return service.retry_deep_check(sample_id)


@router.post("/realtime/agora/token")
def agora_token(body: AgoraTokenRequest, service: VoiceTurkService = Depends(get_service)):
    return service.issue_realtime_token(body.channel, body.uid, body.role)


@router.post("/datasets/build", status_code=201)
def build_dataset(body: DatasetBuildRequest, service: VoiceTurkService = Depends(get_service)):
    return service.build_dataset(body.campaign_id, body.version)


@router.get("/datasets/{dataset_version_id}")
def dataset_detail(dataset_version_id: str, service: VoiceTurkService = Depends(get_service)):
    return service.dataset_detail(dataset_version_id)


@router.post("/datasets/verify")
def verify_dataset(body: DatasetVerifyRequest, service: VoiceTurkService = Depends(get_service)):
    return service.verify_dataset(body.dataset_version_id, body.manifest_hash)
