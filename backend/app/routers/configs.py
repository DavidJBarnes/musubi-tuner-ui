import json
import os
from pathlib import Path

from fastapi import APIRouter, HTTPException

from ..schemas import DatasetConfigForm, PresetInfo, TomlGenerateRequest, TrainingArgsForm
from ..services.job_runner import generate_dataset_toml

router = APIRouter(prefix="/configs")

PRESETS_DIR = Path(__file__).resolve().parent.parent / "presets"


@router.get("/presets", response_model=list[PresetInfo])
def list_presets():
    presets = []
    if PRESETS_DIR.is_dir():
        for f in sorted(PRESETS_DIR.glob("*.json")):
            try:
                data = json.loads(f.read_text())
                presets.append(PresetInfo(
                    name=data.get("name", f.stem),
                    filename=f.name,
                    description=data.get("description", ""),
                ))
            except (json.JSONDecodeError, KeyError):
                continue
    return presets


@router.get("/presets/{filename}")
def get_preset(filename: str):
    preset_path = PRESETS_DIR / filename
    if not preset_path.exists() or not preset_path.suffix == ".json":
        raise HTTPException(404, "Preset not found")
    return json.loads(preset_path.read_text())


@router.post("/generate-toml")
def generate_toml(req: TomlGenerateRequest):
    toml_content = generate_dataset_toml(req.dataset_config)
    return {"toml": toml_content}


@router.post("/validate")
def validate_config(req: TomlGenerateRequest):
    errors = []
    cfg = req.dataset_config
    args = req.training_args

    if not os.path.isdir(cfg.video_directory):
        errors.append(f"Video directory not found: {cfg.video_directory}")
    if args.dit_path and not os.path.isfile(args.dit_path):
        errors.append(f"DiT model not found: {args.dit_path}")
    if args.vae_path and not os.path.isfile(args.vae_path):
        errors.append(f"VAE model not found: {args.vae_path}")
    if args.t5_path and not os.path.isfile(args.t5_path):
        errors.append(f"T5 model not found: {args.t5_path}")
    if args.output_dir and not os.path.isdir(os.path.dirname(args.output_dir)):
        errors.append(f"Output directory parent not found: {args.output_dir}")

    return {"valid": len(errors) == 0, "errors": errors}
