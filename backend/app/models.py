"""SQLAlchemy ORM models for jobs, datasets, and settings."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def _utcnow():
    return datetime.now(timezone.utc)


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), default="pending")
    job_type: Mapped[str] = mapped_column(String(50))  # high_noise | low_noise | both
    dataset_config: Mapped[str] = mapped_column(Text)  # TOML snapshot
    training_args: Mapped[str] = mapped_column(Text)  # JSON snapshot
    pid: Mapped[int | None] = mapped_column(Integer, nullable=True)
    log_file: Mapped[str | None] = mapped_column(String(500), nullable=True)
    progress_current: Mapped[int] = mapped_column(Integer, default=0)
    progress_total: Mapped[int] = mapped_column(Integer, default=0)
    current_phase: Mapped[str | None] = mapped_column(String(50), nullable=True)
    output_dir: Mapped[str | None] = mapped_column(String(500), nullable=True)
    tensorboard_dir: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    queue_position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dataset_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Interleaved training fields
    interleaved_cycle: Mapped[int | None] = mapped_column(Integer, nullable=True)
    interleaved_phase: Mapped[str | None] = mapped_column(String(50), nullable=True)
    interleaved_total_cycles: Mapped[int | None] = mapped_column(Integer, nullable=True)
    training_args_low: Mapped[str | None] = mapped_column(Text, nullable=True)
    sample_config: Mapped[str | None] = mapped_column(Text, nullable=True)


class Sample(Base):
    __tablename__ = "samples"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id: Mapped[str] = mapped_column(String(36), index=True)
    cycle: Mapped[int] = mapped_column(Integer)
    video_path: Mapped[str] = mapped_column(String(500))
    high_checkpoint: Mapped[str] = mapped_column(String(500))
    low_checkpoint: Mapped[str] = mapped_column(String(500))
    prompt: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default="generating")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    duration_seconds: Mapped[float | None] = mapped_column(nullable=True)


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    value: Mapped[str] = mapped_column(Text)
