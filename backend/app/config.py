"""Application configuration via environment variables."""

from pathlib import Path
from pydantic_settings import BaseSettings


class AppConfig(BaseSettings):
    database_url: str = "sqlite:///data/musubi_tuner.db"
    data_dir: Path = Path(__file__).resolve().parent.parent / "data"
    log_dir: Path = Path(__file__).resolve().parent.parent / "data" / "logs"
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = {"env_prefix": "MUSUBI_UI_"}


config = AppConfig()
config.data_dir.mkdir(parents=True, exist_ok=True)
config.log_dir.mkdir(parents=True, exist_ok=True)
