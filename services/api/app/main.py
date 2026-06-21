import logging
import json
import time
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.adapters.http.router import router
from app.application.errors import RecordingFlowError
from app.composition.container import get_service, get_settings
from app.jobs.deep_check_worker import DeepCheckWorker

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    worker = None
    if settings.deep_check_worker_enabled:
        worker = DeepCheckWorker(get_service(), settings.deep_check_poll_interval_seconds,
                                 settings.deep_check_batch_size)
        worker.start()
    app.state.deep_check_worker = worker
    try:
        yield
    finally:
        if worker:
            worker.stop()


app = FastAPI(title="VoiceTurk API", version="0.2.0", docs_url="/docs" if settings.app_env != "production" else None,
              redoc_url=None, lifespan=lifespan)
pipeline_logger = logging.getLogger("voiceturk.pipeline")
request_logger = logging.getLogger("voiceturk.request")
pipeline_logger.setLevel(logging.INFO)
if not pipeline_logger.handlers:
    pipeline_handler = logging.StreamHandler()
    pipeline_handler.setFormatter(logging.Formatter("%(message)s"))
    pipeline_logger.addHandler(pipeline_handler)
pipeline_logger.propagate = False
if not request_logger.handlers:
    request_logger.addHandler(pipeline_handler)
request_logger.setLevel(logging.INFO)
request_logger.propagate = False
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(router)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get("x-request-id", "")[:100] or uuid4().hex
    request.state.request_id = request_id
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        request_logger.exception(json.dumps({"event": "request_failed", "request_id": request_id,
            "method": request.method, "path": request.url.path}))
        raise
    response.headers["x-request-id"] = request_id
    request_logger.info(json.dumps({"event": "request_completed", "request_id": request_id,
        "method": request.method, "path": request.url.path, "status_code": response.status_code,
        "duration_ms": round((time.perf_counter() - started) * 1000)}, separators=(",", ":")))
    return response


@app.exception_handler(KeyError)
async def not_found(_: Request, exc: KeyError):
    return JSONResponse(status_code=404, content={"error_code": "NOT_FOUND", "message": str(exc).strip("'")})


@app.exception_handler(ValueError)
async def invalid_state(_: Request, exc: ValueError):
    return JSONResponse(status_code=409, content={"error_code": "INVALID_STATE", "message": str(exc)})


@app.exception_handler(RecordingFlowError)
async def recording_flow_error(request: Request, exc: RecordingFlowError):
    payload = dict(exc.payload)
    payload["request_id"] = getattr(request.state, "request_id", None)
    request_logger.info(json.dumps({"event": "recording_flow_error", "request_id": payload["request_id"],
        "error_code": payload["code"], "http_status": exc.status_code,
        "session_id": payload.get("session_id"), "item_id": payload.get("item_id"),
        "session_status": payload.get("debug", {}).get("session_status"),
        "item_status": payload.get("debug", {}).get("item_status"),
        "expected_status": payload.get("debug", {}).get("expected_status"),
        "action": payload["action"]}, separators=(",", ":")))
    return JSONResponse(status_code=exc.status_code, content=payload)


@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    if isinstance(exc.detail, dict):
        content = exc.detail
    else:
        content = {"error_code": "HTTP_ERROR", "message": str(exc.detail)}
    return JSONResponse(status_code=exc.status_code, content=content, headers=exc.headers)
