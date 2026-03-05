from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from .config import config
from .database import Base, engine
from .routers import configs, datasets, jobs, system


def _migrate_columns():
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _migrate_columns()
    # Reconcile stale PIDs on startup
    from .services.job_runner import reconcile_jobs
    reconcile_jobs()
    yield


app = FastAPI(title="Musubi Tuner UI", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system.router, prefix="/api")
app.include_router(datasets.router, prefix="/api")
app.include_router(configs.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Serve frontend static files in production (when built frontend is present)
_static_dir = Path(__file__).resolve().parent.parent / "static"
if _static_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(_static_dir), html=True), name="static")
