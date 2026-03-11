"""FastAPI application entry point and middleware configuration."""

import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from .config import config
from .database import Base, engine
from .logging_config import setup_logging
from .routers import configs, datasets, jobs, system

logger = logging.getLogger(__name__)


def _migrate_columns() -> None:
    """Add new columns to existing tables if missing (pragmatic SQLite migration)."""
    insp = inspect(engine)

    # Jobs table migrations
    if insp.has_table("jobs"):
        cols = {c["name"] for c in insp.get_columns("jobs")}
        with engine.begin() as conn:
            if "queue_position" not in cols:
                conn.execute(text("ALTER TABLE jobs ADD COLUMN queue_position INTEGER"))
            if "dataset_name" not in cols:
                conn.execute(text("ALTER TABLE jobs ADD COLUMN dataset_name VARCHAR(255)"))
            if "interleaved_cycle" not in cols:
                conn.execute(text("ALTER TABLE jobs ADD COLUMN interleaved_cycle INTEGER"))
            if "interleaved_phase" not in cols:
                conn.execute(text("ALTER TABLE jobs ADD COLUMN interleaved_phase VARCHAR(50)"))
            if "interleaved_total_cycles" not in cols:
                conn.execute(text("ALTER TABLE jobs ADD COLUMN interleaved_total_cycles INTEGER"))
            if "training_args_low" not in cols:
                conn.execute(text("ALTER TABLE jobs ADD COLUMN training_args_low TEXT"))
            if "sample_config" not in cols:
                conn.execute(text("ALTER TABLE jobs ADD COLUMN sample_config TEXT"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("Starting application")
    Base.metadata.create_all(bind=engine)
    _migrate_columns()
    # Reconcile stale PIDs on startup
    from .services.job_runner import reconcile_jobs
    reconcile_jobs()
    yield
    logger.info("Shutting down application")


app = FastAPI(
    title="Musubi Tuner UI",
    description="Web UI for musubi-tuner WAN 2.2 LoRA training",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log each request with method, path, status, and duration."""
    start = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start) * 1000
    logger.info(
        "%s %s -> %d (%.0fms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Return JSON for unhandled exceptions instead of HTML 500."""
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


app.include_router(system.router, prefix="/api")
app.include_router(datasets.router, prefix="/api")
app.include_router(configs.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


# Serve frontend static files in production (when built frontend is present)
_static_dir = Path(__file__).resolve().parent.parent / "static"
if _static_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(_static_dir), html=True), name="static")
