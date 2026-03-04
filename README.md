# Musubi Tuner UI

Web UI for managing WAN 2.2 LoRA training via musubi-tuner. Built for local use on a machine with an RTX 3090.

## Prerequisites

- Python 3.11+
- Node.js 18+
- NVIDIA GPU with `nvidia-smi` available
- A cloned copy of [musubi-tuner](https://github.com/kohya-ss/musubi-tuner)

## Quick Start

### Backend (port 8000)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -e .            # installs from pyproject.toml
uvicorn app.main:app --reload --port 8000
```

For development dependencies (ruff, pytest, httpx):

```bash
pip install -e ".[dev]"
```

### Frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — the Vite dev server proxies `/api` requests to the backend on port 8000.

## First-Time Setup

1. Go to **Settings** and configure:
   - **Musubi Tuner Path** — path to your cloned musubi-tuner repo
   - **ComfyUI Models Path** — directory containing DiT, VAE, and T5 models
   - **Default Dataset Directory** — where your training videos live
   - **Default Output Directory** — where trained LoRA weights are saved
2. Go to **Datasets** to browse/upload videos and edit captions
3. Go to **Config** to set training parameters (or load a preset)
4. Click **Create & Start Job** to launch training
5. Monitor progress on the **Dashboard** or **Jobs** page

## Project Structure

```
backend/
├── app/
│   ├── main.py            # FastAPI app, CORS, router registration
│   ├── config.py          # Pydantic Settings (env-based config)
│   ├── database.py        # SQLAlchemy engine + session
│   ├── models.py          # DB models: Job, Setting
│   ├── schemas.py         # Pydantic request/response schemas
│   ├── routers/           # API route handlers
│   │   ├── system.py      #   /api/system/gpu, /api/settings
│   │   ├── datasets.py    #   /api/datasets/videos
│   │   ├── configs.py     #   /api/configs/presets, generate-toml
│   │   └── jobs.py        #   /api/jobs CRUD, SSE logs, loss data
│   ├── services/          # Business logic
│   │   ├── gpu_monitor.py #   nvidia-smi polling
│   │   ├── job_runner.py  #   Bash script generation + subprocess
│   │   ├── log_streamer.py#   Async log tailing
│   │   ├── tb_reader.py   #   TensorBoard event parsing
│   │   └── progress.py    #   Training progress extraction
│   └── presets/           # JSON training config presets
└── pyproject.toml

frontend/
├── src/
│   ├── main.tsx           # Entry point
│   ├── App.tsx            # React Router setup
│   ├── api/               # API client (fetch + SWR)
│   ├── components/        # UI organized by feature
│   │   ├── dashboard/     #   GPU widget, active job card
│   │   ├── dataset/       #   Video cards, upload, caption editor
│   │   ├── config/        #   Dataset TOML & training arg forms
│   │   ├── jobs/          #   Job list, details, log viewer, loss chart
│   │   ├── settings/      #   App settings page
│   │   └── layout/        #   Sidebar + main layout
│   └── hooks/             # useSSE, useGpuStatus, useJobs
├── package.json
└── vite.config.ts
```

## API Overview

| Endpoint | Description |
|---|---|
| `GET /api/health` | Health check |
| `GET /api/system/gpu` | GPU stats (VRAM, utilization, temp) |
| `GET/PUT /api/settings` | App configuration (paths) |
| `GET /api/datasets/videos` | List videos in dataset directory |
| `POST /api/datasets/videos/upload` | Upload video files |
| `GET/PUT /api/datasets/videos/{name}/caption` | Read/edit captions |
| `GET /api/configs/presets` | List training presets |
| `POST /api/configs/generate-toml` | Generate dataset TOML config |
| `GET/POST /api/jobs` | List or create training jobs |
| `GET /api/jobs/{id}` | Job details |
| `GET /api/jobs/{id}/logs` | Stream logs (SSE) |
| `GET /api/jobs/{id}/loss` | TensorBoard loss curve data |
| `DELETE /api/jobs/{id}` | Cancel/delete a job |

## Architecture

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI + SQLAlchemy + SQLite
- **Job execution**: Generates a bash script (cache latents → cache text → train), runs as a detached subprocess with PID tracking
- **Real-time updates**: SSE for log streaming, SWR for automatic data refresh
- **GPU monitoring**: nvidia-smi polling
- **Loss curves**: TensorBoard event file reader (via Recharts)
