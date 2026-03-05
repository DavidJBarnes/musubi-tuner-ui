import os
import subprocess
from pathlib import Path

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Dataset, Setting
from ..schemas import DatasetCreate, DatasetInfo, VideoInfo

router = APIRouter(prefix="/datasets")

VIDEO_EXTS = {".mp4", ".webm", ".mkv", ".avi", ".mov"}


def _get_base_dir(db: Session) -> Path:
    s = db.query(Setting).filter(Setting.key == "default_dataset_dir").first()
    if not s or not s.value:
        raise HTTPException(400, "default_dataset_dir not configured")
    p = Path(os.path.expanduser(s.value))
    if not p.is_dir():
        raise HTTPException(400, f"Dataset base directory does not exist: {p}")
    return p


def _get_dataset_dir(db: Session, name: str) -> Path:
    base = _get_base_dir(db)
    d = base / name
    if not d.is_dir():
        raise HTTPException(404, f"Dataset folder not found: {name}")
    return d


def _count_videos(folder: Path) -> int:
    if not folder.is_dir():
        return 0
    return sum(1 for f in folder.iterdir() if f.suffix.lower() in VIDEO_EXTS and f.is_file())


def _auto_discover(db: Session, base: Path) -> None:
    """Register any on-disk subdirectories not already in DB."""
    existing = {d.name for d in db.query(Dataset).all()}
    for entry in base.iterdir():
        if entry.is_dir() and not entry.name.startswith(".") and entry.name not in existing:
            db.add(Dataset(name=entry.name))
    db.commit()


# --- Dataset CRUD ---

@router.get("", response_model=list[DatasetInfo])
def list_datasets(db: Session = Depends(get_db)):
    base = _get_base_dir(db)
    _auto_discover(db, base)
    datasets = db.query(Dataset).order_by(Dataset.name).all()
    result = []
    for ds in datasets:
        folder = base / ds.name
        result.append(DatasetInfo(
            id=ds.id,
            name=ds.name,
            video_count=_count_videos(folder),
            created_at=ds.created_at,
        ))
    return result


@router.post("", response_model=DatasetInfo)
def create_dataset(data: DatasetCreate, db: Session = Depends(get_db)):
    base = _get_base_dir(db)
    if db.query(Dataset).filter(Dataset.name == data.name).first():
        raise HTTPException(409, f"Dataset '{data.name}' already exists")
    folder = base / data.name
    folder.mkdir(parents=True, exist_ok=True)
    ds = Dataset(name=data.name)
    db.add(ds)
    db.commit()
    db.refresh(ds)
    return DatasetInfo(
        id=ds.id,
        name=ds.name,
        video_count=0,
        created_at=ds.created_at,
    )


@router.delete("/{name}")
def delete_dataset(name: str, db: Session = Depends(get_db)):
    ds = db.query(Dataset).filter(Dataset.name == name).first()
    if not ds:
        raise HTTPException(404, "Dataset not found")
    db.delete(ds)
    db.commit()
    return {"deleted": name}


# --- Videos within a dataset ---

@router.get("/{name}/videos", response_model=list[VideoInfo])
def list_videos(name: str, db: Session = Depends(get_db)):
    dataset_dir = _get_dataset_dir(db, name)
    videos = []
    for f in sorted(dataset_dir.iterdir()):
        if f.suffix.lower() in VIDEO_EXTS and f.is_file():
            stem = f.stem
            caption_file = f.with_suffix(".txt")
            has_caption = caption_file.exists()
            caption = caption_file.read_text().strip() if has_caption else ""
            videos.append(VideoInfo(
                name=stem,
                filename=f.name,
                caption=caption,
                has_caption=has_caption,
                size_bytes=f.stat().st_size,
            ))
    return videos


@router.get("/{name}/videos/{video}/thumb")
def get_thumbnail(name: str, video: str, db: Session = Depends(get_db)):
    dataset_dir = _get_dataset_dir(db, name)
    video_file = _find_video(dataset_dir, video)
    if not video_file:
        raise HTTPException(404, "Video not found")

    thumb_dir = dataset_dir / ".thumbs"
    thumb_dir.mkdir(exist_ok=True)
    thumb_path = thumb_dir / f"{video}.jpg"

    if not thumb_path.exists():
        try:
            subprocess.run(
                [
                    "ffmpeg", "-y", "-i", str(video_file),
                    "-vframes", "1", "-q:v", "5",
                    "-vf", "scale=320:-1",
                    str(thumb_path),
                ],
                capture_output=True,
                timeout=10,
            )
        except (FileNotFoundError, subprocess.TimeoutExpired):
            raise HTTPException(500, "ffmpeg not available for thumbnail generation")

    if thumb_path.exists():
        return FileResponse(thumb_path, media_type="image/jpeg")
    raise HTTPException(500, "Failed to generate thumbnail")


@router.get("/{name}/videos/{video}/caption")
def read_caption(name: str, video: str, db: Session = Depends(get_db)):
    dataset_dir = _get_dataset_dir(db, name)
    caption_file = _find_caption_path(dataset_dir, video)
    caption = caption_file.read_text().strip() if caption_file.exists() else ""
    return {"name": video, "caption": caption}


@router.put("/{name}/videos/{video}/caption")
def write_caption(name: str, video: str, body: dict, db: Session = Depends(get_db)):
    dataset_dir = _get_dataset_dir(db, name)
    caption = body.get("caption", "")
    video_file = _find_video(dataset_dir, video)
    if not video_file:
        raise HTTPException(404, "Video not found")
    caption_path = video_file.with_suffix(".txt")
    caption_path.write_text(caption)
    return {"name": video, "caption": caption}


@router.post("/{name}/videos/upload")
async def upload_videos(name: str, files: list[UploadFile], db: Session = Depends(get_db)):
    dataset_dir = _get_dataset_dir(db, name)
    uploaded = []
    for file in files:
        if file.filename:
            dest = dataset_dir / file.filename
            async with aiofiles.open(dest, "wb") as f:
                content = await file.read()
                await f.write(content)
            uploaded.append(file.filename)
    return {"uploaded": uploaded}


@router.delete("/{name}/videos/{video}")
def delete_video(name: str, video: str, db: Session = Depends(get_db)):
    dataset_dir = _get_dataset_dir(db, name)
    video_file = _find_video(dataset_dir, video)
    if not video_file:
        raise HTTPException(404, "Video not found")

    video_file.unlink()
    caption_path = video_file.with_suffix(".txt")
    if caption_path.exists():
        caption_path.unlink()
    thumb = dataset_dir / ".thumbs" / f"{video}.jpg"
    if thumb.exists():
        thumb.unlink()

    return {"deleted": video}


def _find_video(dataset_dir: Path, name: str) -> Path | None:
    for ext in VIDEO_EXTS:
        p = dataset_dir / f"{name}{ext}"
        if p.exists():
            return p
    return None


def _find_caption_path(dataset_dir: Path, name: str) -> Path:
    video = _find_video(dataset_dir, name)
    if video:
        return video.with_suffix(".txt")
    return dataset_dir / f"{name}.txt"
