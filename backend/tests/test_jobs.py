"""Tests for job management API endpoints."""

from unittest.mock import patch

import pytest


VALID_JOB = {
    "name": "test-job",
    "job_type": "high_noise",
    "dataset_config": {
        "video_directory": "/tmp/videos",
        "cache_directory": "/tmp/cache",
        "resolution": [480, 832],
        "caption_extension": ".txt",
        "batch_size": 1,
        "enable_bucket": False,
        "target_frames": [61],
        "frame_extraction": "full",
        "num_repeats": 1,
    },
    "training_args": {
        "task": "i2v-A14B",
        "dit_path": "/tmp/dit.safetensors",
        "vae_path": "/tmp/vae.pth",
        "t5_path": "/tmp/t5.pth",
        "network_dim": 16,
        "network_alpha": 16,
        "loraplus_lr_ratio": 4,
        "timestep_sampling": "shift",
        "discrete_flow_shift": 5.0,
        "min_timestep": 900,
        "max_timestep": 1000,
        "preserve_distribution_shape": True,
        "optimizer_type": "adamw8bit",
        "learning_rate": 2e-4,
        "lr_scheduler": "cosine",
        "max_train_epochs": 10,
        "save_every_n_epochs": 1,
        "mixed_precision": "fp16",
        "fp8_base": True,
        "fp8_scaled": True,
        "gradient_checkpointing": True,
        "blocks_to_swap": 36,
        "output_dir": "/tmp/output",
        "output_name": "test",
        "logging_dir": "/tmp/logs",
        "seed": 42,
    },
}


@patch("app.routers.jobs.has_running_job", return_value=False)
@patch("app.routers.jobs.start_job")
def test_create_job(mock_start, mock_running, client):
    res = client.post("/api/jobs", json=VALID_JOB)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "test-job"
    assert data["status"] == "pending"
    assert data["job_type"] == "high_noise"


@patch("app.routers.jobs.has_running_job", return_value=True)
def test_create_job_queued(mock_running, client):
    res = client.post("/api/jobs", json=VALID_JOB)
    assert res.status_code == 201
    assert res.json()["status"] == "queued"
    assert res.json()["queue_position"] == 1


def test_list_jobs_empty(client):
    res = client.get("/api/jobs")
    assert res.status_code == 200
    data = res.json()
    assert data["items"] == []
    assert data["total"] == 0


@patch("app.routers.jobs.has_running_job", return_value=False)
@patch("app.routers.jobs.start_job")
def test_list_jobs_with_data(mock_start, mock_running, client):
    client.post("/api/jobs", json=VALID_JOB)
    res = client.get("/api/jobs")
    data = res.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1


@patch("app.routers.jobs.has_running_job", return_value=False)
@patch("app.routers.jobs.start_job")
def test_list_jobs_pagination(mock_start, mock_running, client):
    for i in range(3):
        job = {**VALID_JOB, "name": f"job-{i}"}
        client.post("/api/jobs", json=job)
    res = client.get("/api/jobs?skip=0&limit=2")
    data = res.json()
    assert data["total"] == 3
    assert len(data["items"]) == 2
    assert data["skip"] == 0
    assert data["limit"] == 2


@patch("app.routers.jobs.has_running_job", return_value=False)
@patch("app.routers.jobs.start_job")
def test_get_job(mock_start, mock_running, client):
    create = client.post("/api/jobs", json=VALID_JOB)
    job_id = create.json()["id"]
    res = client.get(f"/api/jobs/{job_id}")
    assert res.status_code == 200
    assert res.json()["id"] == job_id
    # JobDetail should have extra fields
    assert "dataset_config" in res.json()
    assert "training_args" in res.json()


def test_get_job_not_found(client):
    res = client.get("/api/jobs/nonexistent")
    assert res.status_code == 404


@patch("app.routers.jobs.has_running_job", return_value=False)
@patch("app.routers.jobs.start_job")
@patch("app.routers.jobs.cancel_job")
def test_delete_job(mock_cancel, mock_start, mock_running, client):
    create = client.post("/api/jobs", json=VALID_JOB)
    job_id = create.json()["id"]
    res = client.delete(f"/api/jobs/{job_id}")
    assert res.status_code == 200
    assert res.json()["cancelled"] is True


def test_delete_job_not_found(client):
    res = client.delete("/api/jobs/nonexistent")
    assert res.status_code == 404


@patch("app.routers.jobs.has_running_job", return_value=False)
@patch("app.routers.jobs.start_job")
def test_retry_job_wrong_status(mock_start, mock_running, client):
    create = client.post("/api/jobs", json=VALID_JOB)
    job_id = create.json()["id"]
    res = client.post(f"/api/jobs/{job_id}/retry")
    assert res.status_code == 400


def test_stop_job_not_found(client):
    res = client.post("/api/jobs/nonexistent/stop")
    assert res.status_code == 404


def test_resume_job_not_found(client):
    res = client.post("/api/jobs/nonexistent/resume")
    assert res.status_code == 404


@patch("app.routers.jobs.adopt_job")
def test_adopt_job(mock_adopt, client):
    from app.models import Job
    from datetime import datetime, timezone
    import uuid

    mock_job = Job(
        id=str(uuid.uuid4()),
        name="adopted",
        job_type="high_noise",
        status="training",
        dataset_config="{}",
        training_args="{}",
        log_file="/tmp/log.txt",
        tensorboard_dir="/tmp/tb",
        progress_current=0,
        progress_total=0,
        created_at=datetime.now(timezone.utc),
        started_at=datetime.now(timezone.utc),
    )
    mock_adopt.return_value = mock_job

    res = client.post("/api/jobs/adopt", json={
        "name": "adopted",
        "log_file": "/tmp/log.txt",
        "tensorboard_dir": "/tmp/tb",
    })
    assert res.status_code == 201
    assert res.json()["name"] == "adopted"
