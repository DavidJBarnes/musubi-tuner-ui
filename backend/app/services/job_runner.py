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
) -> str:
    """Generate a bash script that runs the full training pipeline."""
    vae = training_args.vae_path
    t5 = training_args.t5_path
    dit = training_args.dit_path
    dataset_toml = Path(job.log_file).parent / f"{job.id}_dataset.toml" if job.log_file else "dataset.toml"

    lines = [
        "#!/bin/bash",
        "set -e",
        f"cd {musubi_path}",
        "",
        "# Activate venv if it exists",
        'if [ -f "venv/bin/activate" ]; then source venv/bin/activate; fi',
        "",
        'echo "### PHASE: caching_latents ###"',
        f"python src/musubi_tuner/wan_cache_latents.py \\",
        f"    --dataset_config {dataset_toml} \\",
        f"    --vae {vae} \\",
        f"    --i2v \\",
        f"    --vae_cache_cpu \\",
        f"    --batch_size {dataset_cfg.batch_size}",
        "",
        'echo "### PHASE: caching_text ###"',
        f"python src/musubi_tuner/wan_cache_text_encoder_outputs.py \\",
        f"    --dataset_config {dataset_toml} \\",
        f"    --t5 {t5} \\",
        f"    --batch_size 4",
        "",
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
    ]

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
        f"    --output_dir {training_args.output_dir} \\",
        f"    --output_name {training_args.output_name} \\",
        f"    --log_with tensorboard \\",
        f"    --logging_dir {training_args.logging_dir}",
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
                "video_directory": cfg.video_directory,
                "cache_directory": cfg.cache_directory,
                "target_frames": cfg.target_frames,
                "frame_extraction": cfg.frame_extraction,
                "num_repeats": cfg.num_repeats,
            }
        ],
    }
    return tomli_w.dumps(data)


def start_job(job_id: str) -> None:
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
        job.dataset_config = toml_content  # Snapshot the actual TOML

        # Generate and write run script
        script_content = generate_run_script(job, dataset_cfg, training_args, musubi_path, comfyui_models_path)
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
        job.status = "caching_latents"
        job.started_at = datetime.now(timezone.utc)
        job.tensorboard_dir = training_args.logging_dir
        job.output_dir = training_args.output_dir
        db.commit()

        # Start background monitor thread
        threading.Thread(target=_monitor_job, args=(job_id, proc.pid), daemon=True).start()

    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)
        db.commit()
    finally:
        db.close()


def _monitor_job(job_id: str, pid: int) -> None:
    """Background thread that monitors a running job for progress and completion."""
    while True:
        time.sleep(2)
        db = SessionLocal()
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            if not job or job.status in ("completed", "failed", "cancelled"):
                return

            # Check if process is still alive
            try:
                os.kill(pid, 0)
            except OSError:
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
                    job.error_message = f"Process exited with code {exit_code}"
                job.completed_at = datetime.now(timezone.utc)
                job.pid = None
                db.commit()
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


def _infer_exit_from_log(log_file: str | None) -> int:
    return 0 if _log_has_done_phase(log_file) else 1


def cancel_job(job_id: str) -> bool:
    """Cancel a running job by sending SIGTERM to its process group."""
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job or not job.pid:
            return False

        try:
            os.killpg(os.getpgid(job.pid), signal.SIGTERM)
        except (OSError, ProcessLookupError):
            pass

        job.status = "cancelled"
        job.completed_at = datetime.now(timezone.utc)
        job.pid = None
        db.commit()
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

        for job in running_jobs:
            if job.pid:
                try:
                    os.kill(job.pid, 0)
                    # Process still alive — resume monitoring
                    threading.Thread(target=_monitor_job, args=(job.id, job.pid), daemon=True).start()
                except OSError:
                    job.status = "failed"
                    job.error_message = "Process lost (backend restarted)"
                    job.completed_at = datetime.now(timezone.utc)
                    job.pid = None
            else:
                if job.status == "pending":
                    pass  # Pending jobs without PID are fine
                elif job.dataset_config == "{}":
                    # Adopted job (no PID) — resume monitoring
                    threading.Thread(target=_monitor_adopted_job, args=(job.id,), daemon=True).start()
                else:
                    job.status = "failed"
                    job.error_message = "No PID recorded (backend restarted)"
                    job.completed_at = datetime.now(timezone.utc)
        db.commit()
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
            log_file=data.log_file,
            tensorboard_dir=data.tensorboard_dir,
            output_dir=data.output_dir or None,
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
