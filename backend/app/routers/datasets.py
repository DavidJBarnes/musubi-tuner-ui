import os
import subprocess
from pathlib import Path

import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Setting
from ..schemas import VideoInfo

router = APIRouter(prefix="/datasets")


def _get_dataset_dir(db: Session) -> Path:
    s = db.query(Setting).filter(Setting.key == "default_dataset_dir").first()
    if not s or not s.value:
        raise HTTPException(400, "default_dataset_dir not configured")
    p = Path(s.value)
    if not p.is_dir():
        raise HTTPException(400, f"Dataset directory does not exist: {p}")
    return p


VIDEO_EXTS = {".mp4", ".webm", ".mkv", ".avi", ".mov"}


@router.get("/videos", response_model=list[VideoInfo])
def list_videos(db: Session = Depends(get_db)):
    dataset_dir = _get_dataset_dir(db)
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


@router.get("/videos/{name}/thumb")
def get_thumbnail(name: str, db: Session = Depends(get_db)):
    dataset_dir = _get_dataset_dir(db)
    # Find the video file
    video_file = _find_video(dataset_dir, name)
    if not video_file:
        raise HTTPException(404, "Video not found")

    thumb_dir = dataset_dir / ".thumbs"
    thumb_dir.mkdir(exist_ok=True)
    thumb_path = thumb_dir / f"{name}.jpg"

    if not thumb_path.exists():
        # Extract first frame with ffmpeg
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


@router.get("/videos/{name}/caption")
def read_caption(name: str, db: Session = Depends(get_db)):
    dataset_dir = _get_dataset_dir(db)
    caption_file = _find_caption_path(dataset_dir, name)
    caption = caption_file.read_text().strip() if caption_file.exists() else ""
    return {"name": name, "caption": caption}


@router.put("/videos/{name}/caption")
def write_caption(name: str, body: dict, db: Session = Depends(get_db)):
    dataset_dir = _get_dataset_dir(db)
    caption = body.get("caption", "")
    # Write caption next to video file
    video_file = _find_video(dataset_dir, name)
    if not video_file:
        raise HTTPException(404, "Video not found")
    caption_path = video_file.with_suffix(".txt")
    caption_path.write_text(caption)
    return {"name": name, "caption": caption}


@router.post("/videos/upload")
async def upload_videos(files: list[UploadFile], db: Session = Depends(get_db)):
    dataset_dir = _get_dataset_dir(db)
    uploaded = []
    for file in files:
        if file.filename:
            dest = dataset_dir / file.filename
            async with aiofiles.open(dest, "wb") as f:
                content = await file.read()
                await f.write(content)
            uploaded.append(file.filename)
    return {"uploaded": uploaded}


@router.delete("/videos/{name}")
def delete_video(name: str, db: Session = Depends(get_db)):
    dataset_dir = _get_dataset_dir(db)
    video_file = _find_video(dataset_dir, name)
    if not video_file:
        raise HTTPException(404, "Video not found")

    video_file.unlink()
    caption_path = video_file.with_suffix(".txt")
    if caption_path.exists():
        caption_path.unlink()
    # Remove thumbnail if exists
    thumb = dataset_dir / ".thumbs" / f"{name}.jpg"
    if thumb.exists():
        thumb.unlink()

    return {"deleted": name}


def _find_video(dataset_dir: Path, name: str) -> Path | None:
    for ext in VIDEO_EXTS:
        p = dataset_dir / f"{name}{ext}"
        if p.exists():
            return p
    return None


def _find_caption_path(dataset_dir: Path, name: str) -> Path:
    # Caption lives next to the video
    video = _find_video(dataset_dir, name)
    if video:
        return video.with_suffix(".txt")
    return dataset_dir / f"{name}.txt"
