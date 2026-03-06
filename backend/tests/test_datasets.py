"""Tests for dataset management API endpoints."""

from pathlib import Path
from unittest.mock import patch

import pytest

from app.models import Setting


def _setup_dataset_dir(client, tmp_path):
    """Configure dataset dir setting and return the path."""
    client.put("/api/settings", json={"default_dataset_dir": str(tmp_path)})
    return tmp_path


def test_list_datasets_no_dir_configured(client):
    res = client.get("/api/datasets")
    assert res.status_code == 400


def test_list_datasets_empty(client, tmp_path):
    _setup_dataset_dir(client, tmp_path)
    res = client.get("/api/datasets")
    assert res.status_code == 200
    data = res.json()
    assert data["items"] == []
    assert data["total"] == 0


def test_create_dataset(client, tmp_path):
    _setup_dataset_dir(client, tmp_path)
    res = client.post("/api/datasets", json={"name": "my-dataset"})
    assert res.status_code == 201
    assert res.json()["name"] == "my-dataset"
    assert (tmp_path / "my-dataset").is_dir()


def test_create_dataset_duplicate(client, tmp_path):
    _setup_dataset_dir(client, tmp_path)
    client.post("/api/datasets", json={"name": "dup"})
    res = client.post("/api/datasets", json={"name": "dup"})
    assert res.status_code == 409


def test_delete_dataset(client, tmp_path):
    _setup_dataset_dir(client, tmp_path)
    client.post("/api/datasets", json={"name": "to-delete"})
    res = client.delete("/api/datasets/to-delete")
    assert res.status_code == 200
    assert res.json()["deleted"] == "to-delete"


def test_list_videos_empty(client, tmp_path):
    _setup_dataset_dir(client, tmp_path)
    client.post("/api/datasets", json={"name": "ds"})
    res = client.get("/api/datasets/ds/videos")
    assert res.status_code == 200
    data = res.json()
    assert data["items"] == []


def test_list_videos_with_files(client, tmp_path):
    _setup_dataset_dir(client, tmp_path)
    client.post("/api/datasets", json={"name": "ds"})
    ds_dir = tmp_path / "ds"
    (ds_dir / "clip1.mp4").write_bytes(b"\x00" * 100)
    (ds_dir / "clip1.txt").write_text("a person walking")
    (ds_dir / "clip2.mp4").write_bytes(b"\x00" * 200)

    res = client.get("/api/datasets/ds/videos")
    data = res.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2
    names = {v["name"] for v in data["items"]}
    assert names == {"clip1", "clip2"}

    clip1 = next(v for v in data["items"] if v["name"] == "clip1")
    assert clip1["has_caption"] is True
    assert clip1["caption"] == "a person walking"


def test_auto_discover(client, tmp_path):
    """Directories with videos should be auto-discovered."""
    _setup_dataset_dir(client, tmp_path)
    ds_dir = tmp_path / "auto-found"
    ds_dir.mkdir()
    (ds_dir / "vid.mp4").write_bytes(b"\x00")

    res = client.get("/api/datasets")
    data = res.json()
    names = [d["name"] for d in data["items"]]
    assert "auto-found" in names
