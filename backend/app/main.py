from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import config
from .database import Base, engine
from .routers import configs, datasets, jobs, system


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
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
