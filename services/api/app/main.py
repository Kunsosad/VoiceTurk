import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.adapters.http.router import router

app = FastAPI(title="VoiceTurk API", version="0.1.0")
logging.getLogger("voiceturk.pipeline").setLevel(logging.INFO)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(router)


@app.exception_handler(KeyError)
async def not_found(_: Request, exc: KeyError):
    return JSONResponse(status_code=404, content={"error_code": "NOT_FOUND", "message": str(exc).strip("'")})


@app.exception_handler(ValueError)
async def invalid_state(_: Request, exc: ValueError):
    return JSONResponse(status_code=409, content={"error_code": "INVALID_STATE", "message": str(exc)})
