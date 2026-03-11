"""Job management API endpoints."""

import asyncio
import json
import logging
import os
import threading
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Job, Sample
from ..schemas import JobAdopt, JobCreate, JobDetail, JobRead, LossPoint, PaginatedResponse, SampleRead
from ..services.job_runner import cancel_job, stop_job, resume_job, has_running_job, start_job, adopt_job, _assign_queue_position, _rename_checkpoints
from ..services.progress import parse_progress_from_log
from ..services.log_streamer import tail_log
from ..services.tb_reader import read_loss_curve

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=PaginatedResponse[JobRead])
def list_jobs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all jobs with pagination."""
    total = db.query(Job).count()
    jobs = db.query(Job).order_by(Job.created_at.desc()).offset(skip).limit(limit).all()
    return PaginatedResponse(items=jobs, total=total, skip=skip, limit=limit)


@router.post("", response_model=JobRead, status_code=201)
def create_job(data: JobCreate, db: Session = Depends(get_db)):
    """Create a new training job."""
    running = has_running_job()

    job = Job(
        name=data.name,
        job_type=data.job_type,
        dataset_config=data.dataset_config.model_dump_json(),
        training_args=data.training_args.model_dump_json(),
        training_args_low=data.training_args_low.model_dump_json() if data.training_args_low else None,
        sample_config=data.sample_config.model_dump_json() if data.sample_config else None,
        dataset_name=data.dataset_name,
    )

    if data.job_type == "interleaved":
        job.interleaved_total_cycles = data.training_args.max_train_epochs
        job.interleaved_cycle = 0
        job.interleaved_phase = "pending"

    if running:
        job.status = "queued"
        job.queue_position = _assign_queue_position(db)
    else:
        job.status = "pending"

    db.add(job)
    db.commit()
    db.refresh(job)

    if not running:
        threading.Thread(target=start_job, args=(job.id,), daemon=True).start()

    logger.info("Created job %s (%s)", job.name, job.status)
    return job


@router.post("/adopt", response_model=JobRead, status_code=201)
def adopt_existing_job(data: JobAdopt, db: Session = Depends(get_db)):
    """Adopt an externally-started training job for monitoring."""
    job = adopt_job(data)
    logger.info("Adopted external job %s", job.name)
    return job


@router.get("/{job_id}", response_model=JobDetail)
def get_job(job_id: str, db: Session = Depends(get_db)):
    """Get detailed information about a specific job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.delete("/{job_id}")
def delete_job(job_id: str, db: Session = Depends(get_db)) -> dict:
    """Cancel and delete a job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")

    if job.status in ("caching_latents", "caching_text", "training", "queued"):
        cancel_job(job_id)
        db.refresh(job)

    return {"cancelled": True, "status": job.status}


@router.post("/{job_id}/retry", response_model=JobRead)
def retry_job(job_id: str, db: Session = Depends(get_db)):
    """Retry a failed or cancelled job by re-generating the script and re-running."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status not in ("failed", "cancelled"):
        raise HTTPException(400, f"Cannot retry a job with status '{job.status}'")

    running = has_running_job()

    # Determine which phase to skip to on retry
    skip_to_phase = job.current_phase if job.current_phase in ("caching_text", "training") else None

    # Reset job state
    job.error_message = None
    job.completed_at = None
    job.started_at = None
    job.pid = None
    job.progress_current = 0
    job.progress_total = 0
    job.current_phase = None

    if running:
        job.status = "queued"
        job.queue_position = _assign_queue_position(db)
    else:
        job.status = "pending"

    db.commit()

    if not running:
        threading.Thread(target=start_job, args=(job.id, skip_to_phase), daemon=True).start()

    db.refresh(job)
    return job


@router.post("/{job_id}/stop")
def stop_job_endpoint(job_id: str, db: Session = Depends(get_db)) -> dict:
    """Stop a running job (can be resumed later)."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status not in ("caching_latents", "caching_text", "training"):
        raise HTTPException(400, f"Cannot stop a job with status '{job.status}'")
    stop_job(job_id)
    db.refresh(job)
    return {"stopped": True, "status": job.status}


@router.post("/{job_id}/resume", response_model=JobRead)
def resume_job_endpoint(job_id: str, db: Session = Depends(get_db)):
    """Resume a stopped or failed job from its last checkpoint."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status not in ("stopped", "failed"):
        raise HTTPException(400, f"Cannot resume a job with status '{job.status}'")
    resume_job(job_id)
    db.refresh(job)
    return job


@router.get("/{job_id}/logs")
async def stream_logs(job_id: str, db: Session = Depends(get_db)):
    """Stream job logs via Server-Sent Events."""
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
            if j and j.status in ("completed", "failed", "cancelled", "stopped"):
                yield f"data: {json.dumps({'done': True, 'status': j.status})}\n\n"
                return

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/{job_id}/stats")
def get_job_stats(job_id: str, db: Session = Depends(get_db)) -> dict:
    """Get live training stats parsed from log file."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    progress = parse_progress_from_log(job.log_file)

    # Try to get save_every_n_epochs and video count from config
    save_every = 1
    video_count = 0
    try:
        import json
        args = json.loads(job.training_args)
        save_every = args.get("save_every_n_epochs", 1)
    except (json.JSONDecodeError, TypeError):
        pass

    # When total is unknown (caching phases), count videos in dataset dir
    total = progress.get("total", 0)
    if total == 0 and job.status in ("caching_latents", "caching_text"):
        try:
            import tomli
            toml_path = Path(job.log_file).parent / f"{job.id}_dataset.toml"
            if toml_path.exists():
                cfg = tomli.loads(toml_path.read_text())
                video_dir = cfg.get("datasets", [{}])[0].get("video_directory", "")
                if video_dir:
                    from .datasets import VIDEO_EXTS
                    total = sum(1 for f in Path(video_dir).iterdir() if f.suffix.lower() in VIDEO_EXTS)
        except Exception:
            pass

    result = {
        "speed": progress.get("speed"),
        "epoch": progress.get("epoch", 0),
        "total_epochs": progress.get("total_epochs", 0),
        "current": progress.get("current", 0),
        "total": total,
        "save_every_n_epochs": save_every,
        "avr_loss": progress.get("avr_loss"),
    }

    if job.job_type == "interleaved":
        result["interleaved_cycle"] = job.interleaved_cycle
        result["interleaved_phase"] = job.interleaved_phase
        result["interleaved_total_cycles"] = job.interleaved_total_cycles

    return result


@router.post("/{job_id}/rename-checkpoints")
def rename_checkpoints(job_id: str, db: Session = Depends(get_db)) -> dict:
    """Rename checkpoint files to include epoch and step numbers."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    _rename_checkpoints(job_id)
    return {"ok": True}


@router.get("/{job_id}/checkpoints")
def get_checkpoints(job_id: str, db: Session = Depends(get_db)) -> list[dict]:
    """List saved checkpoint files for a job."""
    import glob as g
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    if not job.output_dir:
        return []

    # Eagerly rename any new checkpoints to friendly format
    _rename_checkpoints(job_id)

    # Get output_name prefix to filter checkpoints belonging to this job
    output_name = None
    try:
        args = json.loads(job.training_args)
        output_name = args.get("output_name") or job.name
    except (json.JSONDecodeError, TypeError):
        output_name = job.name

    files = []
    for pattern in ["*.safetensors", "*.pt", "*.pth"]:
        files.extend(g.glob(os.path.join(job.output_dir, pattern)))

    # Filter to only this job's checkpoints
    if output_name:
        files = [f for f in files if os.path.basename(f).startswith(output_name)]

    files.sort(key=lambda f: os.path.getmtime(f))

    return [
        {
            "filename": os.path.basename(f),
            "path": f,
            "size_bytes": os.path.getsize(f),
            "modified": os.path.getmtime(f),
        }
        for f in files
    ]


@router.get("/{job_id}/checkpoints/{filename}")
def download_checkpoint(job_id: str, filename: str, db: Session = Depends(get_db)):
    """Download a checkpoint file."""
    from fastapi.responses import FileResponse
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job or not job.output_dir:
        raise HTTPException(404, "Job not found")

    # Prevent path traversal
    safe_name = os.path.basename(filename)
    filepath = os.path.join(job.output_dir, safe_name)
    if not os.path.isfile(filepath):
        raise HTTPException(404, "Checkpoint not found")

    return FileResponse(filepath, filename=safe_name, media_type="application/octet-stream")


@router.get("/{job_id}/loss", response_model=list[LossPoint])
def get_loss_curve(job_id: str, db: Session = Depends(get_db)):
    """Get loss curve data from TensorBoard logs."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    return read_loss_curve(job.tensorboard_dir or "")


@router.get("/{job_id}/samples", response_model=list[SampleRead])
def list_samples(job_id: str, db: Session = Depends(get_db)):
    """List all samples generated for a job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    samples = db.query(Sample).filter(Sample.job_id == job_id).order_by(Sample.cycle.asc()).all()
    return samples


@router.get("/{job_id}/samples/{sample_id}/video")
def stream_sample_video(job_id: str, sample_id: str, db: Session = Depends(get_db)):
    """Stream a sample video file."""
    from fastapi.responses import FileResponse
    sample = db.query(Sample).filter(Sample.id == sample_id, Sample.job_id == job_id).first()
    if not sample:
        raise HTTPException(404, "Sample not found")
    if not os.path.isfile(sample.video_path):
        raise HTTPException(404, "Video file not found")
    return FileResponse(sample.video_path, media_type="video/mp4")
