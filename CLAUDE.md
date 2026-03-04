# Musubi Tuner UI

Web UI for [musubi-tuner](https://github.com/kohya-ss/musubi-tuner) WAN 2.2 LoRA training. FastAPI backend + React frontend.

## Project Structure

```
backend/
  app/
    main.py          # FastAPI app entry, CORS, lifespan, static mount
    config.py        # Pydantic Settings (env prefix MUSUBI_UI_)
    database.py      # SQLAlchemy + SQLite
    models.py        # Job, Setting ORM models
    schemas.py       # Pydantic request/response schemas
    routers/         # system, datasets, configs, jobs
    services/        # gpu_monitor, job_runner, log_streamer, tb_reader, progress
    presets/         # JSON training config presets (rtx3090_high_noise, rtx3090_low_noise)
  pyproject.toml

frontend/
  src/
    api/             # client.ts (fetch wrapper + SWR fetcher), types.ts
    hooks/           # useSSE, useJobs, useGpuStatus
    components/
      layout/        # Sidebar, MainLayout
      dashboard/     # DashboardPage, GpuWidget, ActiveJobCard
      dataset/       # DatasetPage, VideoCard, UploadDropzone, CaptionEditor
      config/        # ConfigPage, DatasetTomlForm, TrainingArgsForm
      jobs/          # JobsPage, JobDetailPage, LogViewer, LossChart
      settings/      # SettingsPage
  vite.config.ts     # Dev proxy /api → localhost:8000
```

## Dev Workflow

```bash
# Backend
cd backend && python3 -m venv venv && source venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm install && npm run dev   # port 5173
```

Frontend build: `npm run build` (outputs to `frontend/dist/`).

## Key Architecture Decisions

- **Job execution**: Backend generates a bash script that calls musubi-tuner's cache + train scripts, spawns it as a detached subprocess (`start_new_session=True`), monitors via background thread polling every 2s.
- **Real-time updates**: SSE for log streaming (`GET /api/jobs/{id}/logs`), SWR auto-refresh for job status (3s) and GPU stats (3s), TensorBoard event parsing for loss curves (10s).
- **Static serving**: In production (Docker), backend serves built frontend from `backend/static/` via FastAPI `StaticFiles` mount. The mount only activates if the directory exists, so it doesn't affect dev.
- **Database**: SQLite at `data/musubi_tuner.db`. Job configs are snapshotted as text (TOML/JSON) in the Job row.
- **Config**: Pydantic Settings with `MUSUBI_UI_` env prefix. Key vars: `DATABASE_URL`, `CORS_ORIGINS`.

## API Patterns

All API routes are under `/api` prefix. Routers: `system`, `datasets`, `configs`, `jobs`.

- Schemas use `Read`/`Create`/`Update`/`Detail` suffixes (e.g., `JobRead`, `JobCreate`, `JobDetail`)
- Errors raised as `HTTPException(status_code, detail)`
- Frontend uses `api.get/post/put/del()` wrapper in `api/client.ts`, consumed via SWR hooks

## Conventions

- **Backend**: snake_case files and functions, PascalCase models/schemas
- **Frontend**: PascalCase components organized by feature, camelCase hooks with `use` prefix
- **Styling**: Tailwind CSS v4 with custom theme tokens (`surface`, `surface-2`, `border`, `text`, `text-dim`, `accent`, etc.)
- **State**: SWR for server state, React `useState` for local UI state — no global state library

## Docker & Deployment

Multi-stage Dockerfile: Node builds frontend, Python 3.11-slim runs backend. Clones musubi-tuner into `/opt/musubi-tuner`. GitHub Actions pushes `davidjbarnes/musubi-tuner-ui` to Docker Hub on push to `main`.

## musubi-tuner Integration

Training runs three phases via generated bash script:
1. `wan_cache_latents.py` — cache video latents with VAE
2. `wan_cache_text_encoder_outputs.py` — cache T5 text encoder outputs
3. `accelerate launch wan_train_network.py` — LoRA training

Models: DiT (high_noise or low_noise 14B), VAE (Wan2.1_VAE.pth), T5 (umt5_xxl). Paths configured in Settings page, typically from a ComfyUI models directory.
