name: backend-scaffold
description: Use this skill when scaffolding the FastAPI backend, folder structure, dependency wiring, local persistence, or provider setup.
Backend Scaffold Skill
Goal

Create a backend that is simple enough for MVP but structured enough to preserve architecture.

Required Backend Structure

services/api/app/

main.py
core/
db/
domain/
application/
ports/
adapters/
jobs/
composition/
shared/
Domain

domain/ should contain:

entities
enums
policies
events if useful

Domain must not import:

FastAPI
SQLAlchemy
Agora
Solana
S3
OpenAI
Redis
Application

application/ should contain:

use_cases
application services

Application may call:

repository ports
storage port
check ports
proof port
queue port
realtime port if needed

Application must not call external SDK directly.

Adapters

adapters/ should contain:

http routers/schemas
persistence repositories
storage adapters
realtime adapters
check adapters
proof adapters
ai adapters
queue adapters
Composition

composition/ should wire provider by env:

OBJECT_STORAGE_PROVIDER
REALTIME_PROVIDER
PROOF_PROVIDER
FAST_CHECK_PROVIDER
DEEP_CHECK_PROVIDER
ASR_PROVIDER
LLM_FEEDBACK_PROVIDER
QUEUE_PROVIDER

Local First

Start with:

SQLite or in-memory persistence if faster
local storage
local hash proof
rule-based FastCheck
mock DeepCheck
background tasks
Scaffold Done Criteria

Backend scaffold is done when:

/health works
app starts locally
providers can be configured
no external SDK leaks into domain/application
