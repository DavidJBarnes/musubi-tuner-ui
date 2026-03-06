"""Tests for system and settings API endpoints."""

from unittest.mock import patch

from app.schemas import GpuStats


def test_read_settings_empty(client):
    res = client.get("/api/settings")
    assert res.status_code == 200
    data = res.json()
    assert data["musubi_tuner_path"] == ""
    assert data["default_dataset_dir"] == ""


def test_update_settings(client):
    res = client.put("/api/settings", json={
        "musubi_tuner_path": "/opt/musubi",
        "comfyui_models_path": "/opt/models",
    })
    assert res.status_code == 200
    assert res.json()["musubi_tuner_path"] == "/opt/musubi"

    # Verify persistence
    res2 = client.get("/api/settings")
    assert res2.json()["musubi_tuner_path"] == "/opt/musubi"


def test_update_settings_partial(client):
    client.put("/api/settings", json={"musubi_tuner_path": "/opt/musubi"})
    client.put("/api/settings", json={"default_output_dir": "/tmp/out"})
    res = client.get("/api/settings")
    assert res.json()["musubi_tuner_path"] == "/opt/musubi"
    assert res.json()["default_output_dir"] == "/tmp/out"


@patch("app.services.gpu_monitor.subprocess.run")
def test_gpu_stats_unavailable(mock_run, client):
    mock_run.side_effect = FileNotFoundError()
    res = client.get("/api/system/gpu")
    assert res.status_code == 200
    assert res.json()["available"] is False
