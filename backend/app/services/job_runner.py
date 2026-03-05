import json
import os
import signal
import stat
import subprocess
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from ..config import config
from ..database import SessionLocal
from ..models import Job, Setting
from ..schemas import DatasetConfigForm, TrainingArgsForm
from .progress import parse_progress_from_log


def _get_setting(db: Session, key: str) -> str:
    s = db.query(Setting).filter(Setting.key == key).first()
    return s.value if s else ""


def generate_run_script(
    job: Job,
    dataset_cfg: DatasetConfigForm,
    training_args: TrainingArgsForm,
    musubi_path: str,
    comfyui_models_path: str,
    skip_to_phase: str | None = None,
) -> str:
    """Generate a bash script that runs the full training pipeline.

    If skip_to_phase is set, skip all phases before it (e.g. "training"
    skips caching_latents and caching_text).
    """
    PHASE_ORDER = ["caching_latents", "caching_text", "training"]
    skip_until = PHASE_ORDER.index(skip_to_phase) if skip_to_phase in PHASE_ORDER else 0

    vae = os.path.expanduser(training_args.vae_path)
    t5 = os.path.expanduser(training_args.t5_path)
    dit = os.path.expanduser(training_args.dit_path)
    dataset_toml = Path(job.log_file).parent / f"{job.id}_dataset.toml" if job.log_file else "dataset.toml"

    lines = [
        "#!/bin/bash",
        "set -e",
        "export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True",
        f"cd {musubi_path}",
        "",
        "# Activate venv if it exists",
        'if [ -f "venv/bin/activate" ]; then source venv/bin/activate; fi',
        "",
    ]

    if skip_until <= 0:
        lines.extend([
            'echo "### PHASE: caching_latents ###"',
            f"python src/musubi_tuner/wan_cache_latents.py \\",
            f"    --dataset_config {dataset_toml} \\",
            f"    --vae {vae} \\",
            f"    --i2v \\",
            f"    --vae_cache_cpu \\",
            f"    --batch_size {dataset_cfg.batch_size}",
            "",
        ])

    if skip_until <= 1:
        lines.extend([
            'echo "### PHASE: caching_text ###"',
            f"python src/musubi_tuner/wan_cache_text_encoder_outputs.py \\",
            f"    --dataset_config {dataset_toml} \\",
            f"    --t5 {t5} \\",
            f"    --batch_size 4",
            "",
        ])

    lines.extend([
        'echo "### PHASE: training ###"',
        f"accelerate launch --num_cpu_threads_per_process 1 --mixed_precision {training_args.mixed_precision} \\",
        f"    src/musubi_tuner/wan_train_network.py \\",
        f"    --task {training_args.task} \\",
        f"    --dit {dit} \\",
        f"    --vae {vae} \\",
        f"    --t5 {t5} \\",
        f"    --dataset_config {dataset_toml} \\",
        f"    --network_module networks.lora_wan \\",
        f"    --network_dim {training_args.network_dim} \\",
        f"    --network_alpha {training_args.network_alpha} \\",
        f'    --network_args "loraplus_lr_ratio={training_args.loraplus_lr_ratio}" \\',
        f"    --timestep_sampling {training_args.timestep_sampling} \\",
        f"    --discrete_flow_shift {training_args.discrete_flow_shift} \\",
        f"    --min_timestep {training_args.min_timestep} \\",
        f"    --max_timestep {training_args.max_timestep} \\",
    ])

    if training_args.preserve_distribution_shape:
        lines.append("    --preserve_distribution_shape \\")

    lines.extend([
        f"    --optimizer_type {training_args.optimizer_type} \\",
        f"    --learning_rate {training_args.learning_rate} \\",
        f"    --lr_scheduler {training_args.lr_scheduler} \\",
        f"    --max_train_epochs {training_args.max_train_epochs} \\",
        f"    --save_every_n_epochs {training_args.save_every_n_epochs} \\",
        f"    --sdpa \\",
        f"    --mixed_precision {training_args.mixed_precision} \\",
    ])

    if training_args.fp8_base:
        lines.append("    --fp8_base \\")
    if training_args.fp8_scaled:
        lines.append("    --fp8_scaled \\")
    if training_args.gradient_checkpointing:
        lines.append("    --gradient_checkpointing \\")

    lines.extend([
        f"    --blocks_to_swap {training_args.blocks_to_swap} \\",
        f"    --max_data_loader_n_workers 2 \\",
        f"    --persistent_data_loader_workers \\",
        f"    --seed {training_args.seed} \\",
        f"    --output_dir {os.path.expanduser(training_args.output_dir)} \\",
        f"    --output_name {training_args.output_name or job.name} \\",
        f"    --force_v2_1_time_embedding \\",
        f"    --log_with tensorboard \\",
        f"    --logging_dir {os.path.expanduser(training_args.logging_dir)}",
        "",
        'echo "### PHASE: done ###"',
    ])

    return "\n".join(lines)


def generate_dataset_toml(cfg: DatasetConfigForm) -> str:
    """Generate TOML content from the dataset config form."""
    import tomli_w

    data = {
        "general": {
            "resolution": cfg.resolution,
            "caption_extension": cfg.caption_extension,
            "batch_size": cfg.batch_size,
            "enable_bucket": cfg.enable_bucket,
            "bucket_no_upscale": True,
        },
        "datasets": [
            {
                "video_directory": os.path.expanduser(cfg.video_directory),
                "cache_directory": os.path.expanduser(cfg.cache_directory),
                "target_frames": cfg.target_frames,
                "frame_extraction": cfg.frame_extraction,
                "num_repeats": cfg.num_repeats,
            }
        ],
    }
    return tomli_w.dumps(data)


def start_job(job_id: str, skip_to_phase: str | None = None) -> None:
    """Start a training job in a detached subprocess."""
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return

        musubi_path = _get_setting(db, "musubi_tuner_path")
        comfyui_models_path = _get_setting(db, "comfyui_models_path")

        if not musubi_path:
            job.status = "failed"
            job.error_message = "musubi_tuner_path not configured in settings"
            db.commit()
            return

        dataset_cfg = DatasetConfigForm.model_validate_json(job.dataset_config)
        training_args = TrainingArgsForm.model_validate_json(job.training_args)

        # Set up log file
        log_file = str(config.log_dir / f"{job.id}.log")
        job.log_file = log_file

        # Write dataset TOML
        toml_path = config.log_dir / f"{job.id}_dataset.toml"
        toml_content = generate_dataset_toml(dataset_cfg)
        toml_path.write_text(toml_content)

        # Generate and write run script
        script_content = generate_run_script(job, dataset_cfg, training_args, musubi_path, comfyui_models_path, skip_to_phase=skip_to_phase)
        script_path = config.log_dir / f"{job.id}_run.sh"
        script_path.write_text(script_content)
        script_path.chmod(script_path.stat().st_mode | stat.S_IEXEC)

        # Spawn detached process
        with open(log_file, "w") as log_fd:
            proc = subprocess.Popen(
                ["bash", str(script_path)],
                stdout=log_fd,
                stderr=subprocess.STDOUT,
                start_new_session=True,
                env={**os.environ, "PYTHONUNBUFFERED": "1"},
            )

        job.pid = proc.pid
        job.status = skip_to_phase or "caching_latents"
        job.started_at = datetime.now(timezone.utc)
        job.tensorboard_dir = os.path.expanduser(training_args.logging_dir)
        job.output_dir = os.path.expanduser(training_args.output_dir)
        db.commit()

        # Start background monitor thread
        threading.Thread(target=_monitor_job, args=(job_id, proc.pid), daemon=True).start()

    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)
        db.commit()
    finally:
        db.close()


def _is_training_process(pid: int) -> bool:
    """Check if a PID is still a training-related process (not a reused PID)."""
    try:
        cmdline = Path(f"/proc/{pid}/cmdline").read_bytes().decode("utf-8", errors="replace")
        return "musubi" in cmdline or "wan_" in cmdline or "accelerate" in cmdline
    except OSError:
        return False


def _monitor_job(job_id: str, pid: int) -> None:
    """Background thread that monitors a running job for progress and completion."""
    while True:
        time.sleep(2)
        db = SessionLocal()
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            if not job or job.status in ("completed", "failed", "cancelled"):
                return

            # Check if process is still alive AND is our training process
            process_alive = False
            try:
                os.kill(pid, 0)
                process_alive = _is_training_process(pid)
            except OSError:
                process_alive = False

            if not process_alive:
                # Process ended — check exit status
                try:
                    _, status = os.waitpid(pid, os.WNOHANG)
                    exit_code = os.WEXITSTATUS(status) if os.WIFEXITED(status) else -1
                except ChildProcessError:
                    exit_code = _infer_exit_from_log(job.log_file)

                if exit_code == 0 or _log_has_done_phase(job.log_file):
                    job.status = "completed"
                else:
                    job.status = "failed"
                    job.error_message = _extract_error_from_log(job.log_file) or f"Process exited with code {exit_code}"
                job.completed_at = datetime.now(timezone.utc)
                job.pid = None
                db.commit()
                _advance_queue()
                return

            # Update progress from log
            progress = parse_progress_from_log(job.log_file)
            if progress["phase"]:
                job.current_phase = progress["phase"]
                if progress["phase"] == "done":
                    job.status = "completed"
                    job.completed_at = datetime.now(timezone.utc)
                elif progress["phase"] in ("caching_latents", "caching_text", "training"):
                    job.status = progress["phase"]
            job.progress_current = progress["current"]
            job.progress_total = progress["total"]
            db.commit()
        finally:
            db.close()


def _log_has_done_phase(log_file: str | None) -> bool:
    if not log_file or not os.path.exists(log_file):
        return False
    try:
        with open(log_file, "r") as f:
            return "### PHASE: done ###" in f.read()
    except OSError:
        return False


def _extract_error_from_log(log_file: str | None) -> str | None:
    """Extract a meaningful error message from the last lines of a log file."""
    if not log_file or not os.path.exists(log_file):
        return None
    try:
        with open(log_file, "rb") as f:
            f.seek(0, 2)
            size = f.tell()
            f.seek(max(0, size - 4096))
            tail = f.read().decode("utf-8", errors="replace")
        # Look for common error patterns
        for line in reversed(tail.splitlines()):
            line = line.strip()
            if not line:
                continue
            for pattern in ("Error:", "OutOfMemoryError:", "RuntimeError:", "ValueError:", "FileNotFoundError:"):
                if pattern in line:
                    return line[:300]
        return None
    except OSError:
        return None


def _infer_exit_from_log(log_file: str | None) -> int:
    return 0 if _log_has_done_phase(log_file) else 1


def cancel_job(job_id: str) -> bool:
    """Cancel a running or queued job."""
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return False

        was_running = job.status in ("caching_latents", "caching_text", "training")

        if job.pid:
            try:
                os.killpg(os.getpgid(job.pid), signal.SIGTERM)
            except (OSError, ProcessLookupError):
                pass

        job.status = "cancelled"
        job.completed_at = datetime.now(timezone.utc)
        job.pid = None
        job.queue_position = None
        db.commit()

        if was_running:
            _advance_queue()
        return True
    finally:
        db.close()


def reconcile_jobs() -> None:
    """On startup, mark any jobs with stale PIDs as failed."""
    db = SessionLocal()
    try:
        running_jobs = db.query(Job).filter(
            Job.status.in_(["caching_latents", "caching_text", "training", "pending"])
        ).all()

        has_active = False
        for job in running_jobs:
            if job.pid:
                if _is_training_process(job.pid):
                    # Process still alive — resume monitoring
                    has_active = True
                    threading.Thread(target=_monitor_job, args=(job.id, job.pid), daemon=True).start()
                else:
                    job.status = "failed"
                    job.error_message = _extract_error_from_log(job.log_file) or "Process lost (backend restarted)"
                    job.completed_at = datetime.now(timezone.utc)
                    job.pid = None
            else:
                if job.status == "pending":
                    pass  # Pending jobs without PID are fine
                elif job.dataset_config == "{}":
                    # Adopted job (no PID) — resume monitoring
                    has_active = True
                    threading.Thread(target=_monitor_adopted_job, args=(job.id,), daemon=True).start()
                else:
                    job.status = "failed"
                    job.error_message = "No PID recorded (backend restarted)"
                    job.completed_at = datetime.now(timezone.utc)
        db.commit()

        # If no running job, try to advance the queue
        if not has_active:
            _advance_queue()
    finally:
        db.close()


def adopt_job(data) -> "Job":
    """Adopt an externally-started job for monitoring (logs, loss, progress)."""
    from ..schemas import JobAdopt

    db = SessionLocal()
    try:
        job = Job(
            name=data.name,
            job_type=data.job_type,
            status="training",
            dataset_config="{}",
            training_args="{}",
            log_file=data.log_file.strip(),
            tensorboard_dir=data.tensorboard_dir.strip(),
            output_dir=data.output_dir.strip() or None,
            current_phase="training",
            started_at=datetime.now(timezone.utc),
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        # Start monitoring thread (no PID — just polls log for progress)
        threading.Thread(target=_monitor_adopted_job, args=(job.id,), daemon=True).start()

        return job
    finally:
        db.close()


def _monitor_adopted_job(job_id: str) -> None:
    """Monitor an adopted job by polling the log file for progress updates."""
    while True:
        time.sleep(5)
        db = SessionLocal()
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            if not job or job.status in ("completed", "failed", "cancelled"):
                return

            progress = parse_progress_from_log(job.log_file)
            if progress["current"] > 0:
                job.progress_current = progress["current"]
                job.progress_total = progress["total"]
            if progress["phase"]:
                job.current_phase = progress["phase"]
                if progress["phase"] == "done":
                    job.status = "completed"
                    job.completed_at = datetime.now(timezone.utc)
            db.commit()
        finally:
            db.close()


def has_running_job() -> bool:
    """Check if there's already a job running (max 1 concurrent)."""
    db = SessionLocal()
    try:
        return db.query(Job).filter(
            Job.status.in_(["caching_latents", "caching_text", "training"])
        ).count() > 0
    finally:
        db.close()


def _assign_queue_position(db: Session) -> int:
    """Return the next queue position (max + 1)."""
    from sqlalchemy import func
    max_pos = db.query(func.max(Job.queue_position)).scalar()
    return (max_pos or 0) + 1


def _advance_queue() -> None:
    """Find the lowest queue_position job with status 'queued' and start it."""
    db = SessionLocal()
    try:
        next_job = (
            db.query(Job)
            .filter(Job.status == "queued")
            .order_by(Job.queue_position.asc())
            .first()
        )
        if not next_job:
            return

        next_job.queue_position = None
        db.commit()

        threading.Thread(target=start_job, args=(next_job.id,), daemon=True).start()
    finally:
        db.close()
