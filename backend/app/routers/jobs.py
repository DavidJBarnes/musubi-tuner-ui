import asyncio
import json
import threading

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Job
from ..schemas import JobAdopt, JobCreate, JobDetail, JobRead, LossPoint
from ..services.job_runner import cancel_job, has_running_job, start_job, adopt_job
from ..services.log_streamer import tail_log
from ..services.tb_reader import read_loss_curve

router = APIRouter(prefix="/jobs")


@router.get("", response_model=list[JobRead])
def list_jobs(db: Session = Depends(get_db)):
    jobs = db.query(Job).order_by(Job.created_at.desc()).all()
    return jobs


@router.post("", response_model=JobRead)
def create_job(data: JobCreate, db: Session = Depends(get_db)):
    if has_running_job():
        raise HTTPException(409, "A job is already running. Only one concurrent job is allowed.")

    job = Job(
        name=data.name,
        job_type=data.job_type,
        dataset_config=data.dataset_config.model_dump_json(),
        training_args=data.training_args.model_dump_json(),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Start job in background thread
    threading.Thread(target=start_job, args=(job.id,), daemon=True).start()

    return job


@router.post("/adopt", response_model=JobRead)
def adopt_existing_job(data: JobAdopt, db: Session = Depends(get_db)):
    """Adopt an externally-started training job for monitoring."""
    job = adopt_job(data)
    return job


@router.get("/{job_id}", response_model=JobDetail)
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.delete("/{job_id}")
def delete_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")

    if job.status in ("caching_latents", "caching_text", "training"):
        cancel_job(job_id)
        # Refresh after cancel
        db.refresh(job)

    return {"cancelled": True, "status": job.status}


@router.get("/{job_id}/logs")
async def stream_logs(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    if not job.log_file:
        raise HTTPException(404, "No log file for this job")

    async def event_generator():
        async for line in tail_log(job.log_file):
            yield f"data: {json.dumps({'line': line})}\n\n"
            # Check if job is done
            db2 = next(get_db())
            j = db2.query(Job).filter(Job.id == job_id).first()
            db2.close()
            if j and j.status in ("completed", "failed", "cancelled"):
                yield f"data: {json.dumps({'done': True, 'status': j.status})}\n\n"
                return

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/{job_id}/loss", response_model=list[LossPoint])
def get_loss_curve(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    return read_loss_curve(job.tensorboard_dir or "")
