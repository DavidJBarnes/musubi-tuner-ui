from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Setting
from ..schemas import GpuStats, SettingsRead, SettingsUpdate
from ..services.gpu_monitor import get_gpu_stats

router = APIRouter()

SETTING_KEYS = ["musubi_tuner_path", "comfyui_models_path", "default_output_dir", "default_dataset_dir"]


@router.get("/system/gpu", response_model=GpuStats)
def gpu_stats():
    return get_gpu_stats()


@router.get("/settings", response_model=SettingsRead)
def read_settings(db: Session = Depends(get_db)):
    settings = {s.key: s.value for s in db.query(Setting).all()}
    return SettingsRead(**{k: settings.get(k, "") for k in SETTING_KEYS})


@router.put("/settings", response_model=SettingsRead)
def update_settings(data: SettingsUpdate, db: Session = Depends(get_db)):
    for key in SETTING_KEYS:
        val = getattr(data, key, None)
        if val is not None:
            existing = db.query(Setting).filter(Setting.key == key).first()
            if existing:
                existing.value = val
            else:
                db.add(Setting(key=key, value=val))
    db.commit()
    return read_settings(db)
