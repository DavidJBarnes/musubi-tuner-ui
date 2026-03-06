"""Training configuration and preset API endpoints."""

import json
import os
from pathlib import Path

from fastapi import APIRouter, HTTPException

from ..schemas import DatasetConfigForm, PresetInfo, TomlGenerateRequest, TrainingArgsForm
from ..services.job_runner import generate_dataset_toml

router = APIRouter(prefix="/configs", tags=["configs"])

PRESETS_DIR = Path(__file__).resolve().parent.parent / "presets"


@router.get("/presets", response_model=list[PresetInfo])
def list_presets() -> list[PresetInfo]:
    """List available training presets."""
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
def get_preset(filename: str) -> dict:
    """Get a specific preset by filename."""
    preset_path = PRESETS_DIR / filename
    if not preset_path.exists() or not preset_path.suffix == ".json":
        raise HTTPException(404, "Preset not found")
    return json.loads(preset_path.read_text())


@router.post("/generate-toml")
def generate_toml(req: TomlGenerateRequest) -> dict:
    """Generate dataset TOML from form data."""
    toml_content = generate_dataset_toml(req.dataset_config)
    return {"toml": toml_content}


@router.post("/validate")
def validate_config(req: TomlGenerateRequest) -> dict:
    """Validate that model and data paths exist on disk."""
    errors = []
    cfg = req.dataset_config
    args = req.training_args

    video_dir = os.path.expanduser(cfg.video_directory)
    dit_path = os.path.expanduser(args.dit_path) if args.dit_path else ""
    vae_path = os.path.expanduser(args.vae_path) if args.vae_path else ""
    t5_path = os.path.expanduser(args.t5_path) if args.t5_path else ""
    output_dir = os.path.expanduser(args.output_dir) if args.output_dir else ""

    if not os.path.isdir(video_dir):
        errors.append(f"Video directory not found: {cfg.video_directory}")
    if dit_path and not os.path.isfile(dit_path):
        errors.append(f"DiT model not found: {args.dit_path}")
    if vae_path and not os.path.isfile(vae_path):
        errors.append(f"VAE model not found: {args.vae_path}")
    if t5_path and not os.path.isfile(t5_path):
        errors.append(f"T5 model not found: {args.t5_path}")
    if output_dir and not os.path.isdir(os.path.dirname(output_dir)):
        errors.append(f"Output directory parent not found: {args.output_dir}")

    return {"valid": len(errors) == 0, "errors": errors}
