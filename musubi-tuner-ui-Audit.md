# Musubi Tuner UI — Codebase Audit

**Audit Date:** 2026-03-06T16:43:25Z
**Branch:** main
**Commit:** 4dd9915dd09824f3d33d664244166e8a1f63ce0a Merge pull request #13 from DavidJBarnes/stop-resume-jobs
**Auditor:** Claude Code (Automated)
**Purpose:** Zero-context reference for AI-assisted development
**Stack:** Python/FastAPI backend + React/TypeScript frontend
**Audit File:** musubi-tuner-ui-Audit.md
**Scorecard:** musubi-tuner-ui-Scorecard.md
**OpenAPI Spec:** musubi-tuner-ui-OpenAPI.yaml (generated separately)

> This audit is the source of truth for the Musubi Tuner UI codebase structure, models, services, components, and configuration.
> The OpenAPI spec (musubi-tuner-ui-OpenAPI.yaml) is the source of truth for all endpoints, Pydantic schemas, and API contracts.
> An AI reading this audit + the OpenAPI spec should be able to generate accurate code
> changes, new features, tests, and fixes without filesystem access.

---

## 1. Project Identity

```
Project Name: musubi-tuner-ui
Repository URL: https://github.com/DavidJBarnes/musubi-tuner-ui
Backend Language / Framework: Python / FastAPI
Python Version: 3.14.2
Package Manager: pip (pyproject.toml)
Frontend Language / Framework: TypeScript / React
Node Version: v22.22.0
Frontend Package Manager: npm
Current Branch: main
Latest Commit Hash: 4dd9915dd09824f3d33d664244166e8a1f63ce0a
Latest Commit Message: Merge pull request #13 from DavidJBarnes/stop-resume-jobs
Audit Timestamp: 2026-03-06T16:43:25Z
```

---

## 2. Directory Structure

```
./backend/
  app/
    __init__.py
    config.py            — Pydantic BaseSettings config
    database.py          — SQLAlchemy engine, session, Base
    main.py              — FastAPI app, lifespan, middleware, router mounting
    models.py            — SQLAlchemy models (Job, Dataset, Setting)
    schemas.py           — Pydantic request/response schemas
    presets/             — JSON training preset files
      rtx3090_high_noise.json
      rtx3090_low_noise.json
    routers/
      __init__.py
      configs.py         — Preset and TOML generation endpoints
      datasets.py        — Dataset CRUD, video management, thumbnails
      jobs.py            — Job lifecycle endpoints (create, stop, resume, logs, checkpoints)
      system.py          — GPU stats, settings CRUD
    services/
      __init__.py
      gpu_monitor.py     — nvidia-smi GPU stats
      job_runner.py      — Job execution, monitoring, queue management
      log_streamer.py    — Async log file tailing
      progress.py        — Log parsing for tqdm progress, phase detection
      tb_reader.py       — TensorBoard event file reading
  pyproject.toml
  data/                  — Runtime data dir (SQLite DB, logs) [gitignored]
./frontend/
  src/
    main.tsx             — React entry point
    App.tsx              — BrowserRouter + route definitions
    index.css            — Tailwind v4 theme (dark color scheme)
    api/
      client.ts          — fetch wrapper + SWR fetcher
      types.ts           — TypeScript interfaces mirroring backend schemas
    hooks/
      useGpuStatus.ts    — SWR hook for GPU polling
      useJobs.ts         — SWR hooks for job list and detail
      useSSE.ts          — EventSource hook for log streaming
    components/
      layout/
        MainLayout.tsx   — Sidebar + Outlet wrapper
        Sidebar.tsx      — NavLink sidebar
      dashboard/
        DashboardPage.tsx — Active/queued/recent jobs overview
        ActiveJobCard.tsx — Job summary card with progress bar
        GpuWidget.tsx     — VRAM/utilization/temp display
      jobs/
        JobsPage.tsx     — Job list (running/queued/history)
        NewJobPage.tsx   — Job creation form with dataset/training config
        JobDetail.tsx    — Job detail with progress, logs, checkpoints, loss chart
        LogViewer.tsx    — SSE-based log viewer
        LossChart.tsx    — Recharts loss curve with trend line
        ProgressBar.tsx  — Phase-aware progress bar with epoch ticks
        Checkpoints.tsx  — Checkpoint file list with download links
        AdoptJobForm.tsx — Form to adopt externally-started jobs
      config/
        DatasetTomlForm.tsx  — Dataset config form (collapsible)
        TrainingArgsForm.tsx — Training args form (sectioned)
      dataset/
        DatasetListPage.tsx  — Dataset grid with create/delete
        DatasetDetailPage.tsx — Video grid with caption editor
        VideoCard.tsx        — Thumbnail card with caption badge
        CaptionEditor.tsx    — Textarea caption editor with save
        UploadDropzone.tsx   — Drag-and-drop video uploader
      settings/
        SettingsPage.tsx     — Path configuration form
    utils/
      date.ts            — UTC→local date formatting helpers
  vite.config.ts
  tsconfig.json / tsconfig.app.json / tsconfig.node.json
  package.json
./Dockerfile             — Multi-stage build (node → python)
./CLAUDE.md
./README.md
```

Monorepo with `backend/` and `frontend/` at project root. Backend source root: `backend/app/`. Frontend source root: `frontend/src/`.

---

## 3. Build & Dependency Manifest

### Backend (Python)

| Dependency | Version | Purpose |
|---|---|---|
| fastapi | >=0.115 | Web framework |
| uvicorn[standard] | >=0.34 | ASGI server |
| sqlalchemy | >=2.0 | ORM |
| aiofiles | >=24.1 | Async file I/O (video upload) |
| python-multipart | >=0.0.18 | File upload parsing |
| tomli | >=2.0 | TOML reading |
| tomli_w | >=1.0 | TOML writing |
| tensorboard | >=2.18 | Loss curve reading |
| pydantic-settings | >=2.7 | Settings from env vars |

Dev: ruff, pytest, httpx

```
Install: pip install -e ".[dev]"
Run Dev: uvicorn app.main:app --reload
Test: pytest
Lint: ruff check .
Format: ruff format .
```

### Frontend (React)

| Dependency | Version | Purpose |
|---|---|---|
| react | ^19.2.0 | UI library |
| react-dom | ^19.2.0 | DOM rendering |
| react-router-dom | ^7.13.1 | Client-side routing |
| recharts | ^3.7.0 | Loss curve charts |
| swr | ^2.4.1 | Data fetching / caching |
| tailwindcss | ^4.2.1 | Utility-first CSS (v4) |
| @tailwindcss/vite | ^4.2.1 | Tailwind Vite plugin |
| typescript | ~5.9.3 | Type checking |

```
Install: npm install
Run Dev: npm run dev
Build: npm run build
Lint: npm run lint
```

---

## 4. Configuration & Infrastructure Summary

**Backend:**
- `backend/app/config.py` — `AppConfig(BaseSettings)` with `env_prefix="MUSUBI_UI_"`. Keys: `database_url` (default: `sqlite:///data/musubi_tuner.db`), `data_dir`, `log_dir`, `cors_origins`. Creates `data/` and `data/logs/` on import.
- No `.env` file; no `.env.example`. Config via env vars with `MUSUBI_UI_` prefix.
- No Alembic. Schema managed via `Base.metadata.create_all()` + manual `_migrate_columns()` for column additions.

**Frontend:**
- `frontend/vite.config.ts` — Dev server on `0.0.0.0`, allowed host `3090.zero`, proxy `/api` → `http://localhost:8000`.
- `frontend/tsconfig.app.json` — strict mode enabled, ES2022 target.
- No `.env` files. API base URL hardcoded as `/api` in `client.ts`.

**Connection map:**
```
Database: SQLite, file-based (backend/data/musubi_tuner.db)
Cache: None
Message Broker: None
External APIs: nvidia-smi (subprocess), ffmpeg (subprocess for thumbnails)
Cloud Services: None
Frontend → Backend: /api (Vite proxy to http://localhost:8000)
```

**CI/CD:** None detected.

---

## 5. Startup & Runtime Behavior

**Backend:**
- Entry point: `backend/app/main.py` — `app = FastAPI(title="Musubi Tuner UI", lifespan=lifespan)`
- Lifespan: (1) `Base.metadata.create_all()` creates tables, (2) `_migrate_columns()` adds missing columns to existing tables (SQLite ALTER TABLE), (3) `reconcile_jobs()` marks stale PIDs as failed and re-attaches monitors to surviving processes.
- Middleware: CORSMiddleware (origins from config, all methods/headers)
- Routers mounted at `/api`: system (no prefix on router, but `/system/gpu` + `/settings`), datasets (`/datasets`), configs (`/configs`), jobs (`/jobs`)
- Health check: `GET /api/health` → `{"status": "ok"}`
- Static file serving: if `backend/static/` exists, mounts at `/` with `html=True` (production frontend)

**Frontend:**
- Entry point: `frontend/src/main.tsx` → `<StrictMode><App /></StrictMode>`
- Root: `<BrowserRouter>` → `<Routes>` → `<Route element={<MainLayout />}>` (sidebar + outlet)
- No auth, no token refresh, no initialization logic.

---

## 6. SQLAlchemy Model / Data Model Layer

```
=== Job (models.py) ===
Table: jobs
Primary Key: id: String(36), default=uuid4()

Fields:
  - name: String(255), NOT NULL
  - status: String(50), default="pending"
  - job_type: String(50), NOT NULL  # high_noise | low_noise | both
  - dataset_config: Text, NOT NULL  # TOML snapshot (JSON string)
  - training_args: Text, NOT NULL   # JSON snapshot
  - pid: Integer, nullable=True
  - log_file: String(500), nullable=True
  - progress_current: Integer, default=0
  - progress_total: Integer, default=0
  - current_phase: String(50), nullable=True
  - output_dir: String(500), nullable=True
  - tensorboard_dir: String(500), nullable=True
  - created_at: DateTime(timezone=True), default=_utcnow
  - started_at: DateTime(timezone=True), nullable=True
  - completed_at: DateTime(timezone=True), nullable=True
  - error_message: Text, nullable=True
  - queue_position: Integer, nullable=True
  - dataset_name: String(255), nullable=True

Relationships: None
Audit Fields: created_at, started_at, completed_at (no updated_at)
Mixins/Base: extends Base (DeclarativeBase)
Validators: None
Custom Methods: None

=== Dataset (models.py) ===
Table: datasets
Primary Key: id: String(36), default=uuid4()

Fields:
  - name: String(255), unique=True
  - created_at: DateTime(timezone=True), default=_utcnow

Relationships: None
Audit Fields: created_at only

=== Setting (models.py) ===
Table: settings
Primary Key: key: String(255)

Fields:
  - value: Text, NOT NULL

Relationships: None
Audit Fields: None
```

---

## 7. Enum Inventory

No formal enum classes. Status values are string literals used throughout:
- **Job statuses:** `pending`, `queued`, `caching_latents`, `caching_text`, `training`, `completed`, `failed`, `cancelled`, `stopped`
- **Job types:** `high_noise`, `low_noise`, `both`
- **Phase markers:** `caching_latents`, `caching_text`, `training`, `done`

---

## 8. Repository / DAO Layer

No dedicated repository layer. All database access is inline in routers and services using `db.query(Model).filter(...)` pattern.

**Session management:** Synchronous `SessionLocal()` via `get_db()` dependency (routers) or direct `SessionLocal()` creation (services/job_runner.py).

---

## 9. Service Layer — Full Function Signatures

```
=== services/job_runner.py ===
Dependencies: config, SessionLocal, Job, Setting, DatasetConfigForm, TrainingArgsForm, parse_progress_from_log

Public Functions:
  - generate_run_script(job, dataset_cfg, training_args, musubi_path, comfyui_models_path, skip_to_phase=None, resume_from=None, network_weights=None) -> str
    Purpose: Generate bash script for full training pipeline (caching + training)

  - generate_dataset_toml(cfg: DatasetConfigForm) -> str
    Purpose: Generate TOML content from dataset config form

  - start_job(job_id: str, skip_to_phase=None, resume_from=None, network_weights=None) -> None
    Purpose: Start training job in detached subprocess with monitoring thread
    Calls: _get_setting, generate_dataset_toml, generate_run_script, subprocess.Popen, _monitor_job

  - cancel_job(job_id: str) -> bool
    Purpose: Kill running/queued job process group via SIGTERM
    Calls: os.killpg, _advance_queue

  - stop_job(job_id: str) -> bool
    Purpose: Stop running job (sets status to "stopped", can be resumed)
    Calls: os.killpg, _advance_queue

  - resume_job(job_id: str) -> bool
    Purpose: Resume stopped/failed job from last state dir or checkpoint
    Calls: start_job (with resume_from or network_weights), _assign_queue_position

  - reconcile_jobs() -> None
    Purpose: On startup, mark stale PIDs as failed, re-attach monitors to surviving processes
    Calls: _is_training_process, _monitor_job, _monitor_adopted_job, _advance_queue

  - adopt_job(data: JobAdopt) -> Job
    Purpose: Create job record for externally-started training, start monitoring
    Calls: _monitor_adopted_job

  - has_running_job() -> bool
    Purpose: Check if any job is in active status (max 1 concurrent)

Private Functions:
  - _get_setting(db, key) -> str
  - _is_training_process(pid) -> bool
  - _monitor_job(job_id, pid) -> None
  - _monitor_adopted_job(job_id) -> None
  - _log_has_done_phase(log_file) -> bool
  - _extract_error_from_log(log_file) -> str | None
  - _infer_exit_from_log(log_file) -> int
  - _rename_checkpoints(job_id, cleanup_state=False) -> None
  - _assign_queue_position(db) -> int
  - _advance_queue() -> None

=== services/gpu_monitor.py ===
Public Functions:
  - get_gpu_stats() -> GpuStats
    Purpose: Query nvidia-smi for GPU name, VRAM, utilization, temperature

=== services/log_streamer.py ===
Public Functions:
  - async tail_log(log_path: str, poll_interval: float = 0.5) -> AsyncGenerator[str, None]
    Purpose: Async generator that yields new lines from log file (tail -f style)

=== services/progress.py ===
Public Functions:
  - parse_progress_from_log(log_path: str) -> dict
    Purpose: Parse tqdm progress, phase markers, speed, epoch, avr_loss from log tail (last 32KB)

=== services/tb_reader.py ===
Public Functions:
  - read_loss_curve(tensorboard_dir: str) -> list[LossPoint]
    Purpose: Read loss scalars from TensorBoard event files via EventAccumulator
```

---

## 10. Router / API Layer — Method Signatures Only

```
=== routers/system.py ===
Prefix: /api (no router prefix)
Tags: None
Dependencies: None

Endpoints:
  - gpu_stats() → get_gpu_stats()                    [GET /system/gpu]
  - read_settings() → inline db query                 [GET /settings]
  - update_settings() → inline db upsert              [PUT /settings]

=== routers/datasets.py ===
Prefix: /api/datasets
Tags: None
Dependencies: get_db

Endpoints:
  - list_datasets() → inline (_auto_discover + query)  [GET /datasets]
  - create_dataset() → inline                           [POST /datasets]
  - delete_dataset() → inline                           [DELETE /datasets/{name}]
  - list_videos() → inline                              [GET /datasets/{name}/videos]
  - get_thumbnail() → ffmpeg subprocess                 [GET /datasets/{name}/videos/{video}/thumb]
  - read_caption() → inline file read                   [GET /datasets/{name}/videos/{video}/caption]
  - write_caption() → inline file write                 [PUT /datasets/{name}/videos/{video}/caption]
  - upload_videos() → aiofiles write                    [POST /datasets/{name}/videos/upload]
  - delete_video() → inline file unlink                 [DELETE /datasets/{name}/videos/{video}]

=== routers/configs.py ===
Prefix: /api/configs
Tags: None
Dependencies: None

Endpoints:
  - list_presets() → read JSON files from presets/      [GET /configs/presets]
  - get_preset() → read single JSON preset              [GET /configs/presets/{filename}]
  - generate_toml() → job_runner.generate_dataset_toml  [POST /configs/generate-toml]
  - validate_config() → inline path validation          [POST /configs/validate]

=== routers/jobs.py ===
Prefix: /api/jobs
Tags: None
Dependencies: get_db

Endpoints:
  - list_jobs() → inline query                          [GET /jobs]
  - create_job() → job_runner.start_job                 [POST /jobs]
  - adopt_existing_job() → job_runner.adopt_job         [POST /jobs/adopt]
  - get_job() → inline query                            [GET /jobs/{job_id}]
  - delete_job() → job_runner.cancel_job                [DELETE /jobs/{job_id}]
  - retry_job() → job_runner.start_job                  [POST /jobs/{job_id}/retry]
  - stop_job_endpoint() → job_runner.stop_job           [POST /jobs/{job_id}/stop]
  - resume_job_endpoint() → job_runner.resume_job       [POST /jobs/{job_id}/resume]
  - stream_logs() → SSE via log_streamer.tail_log       [GET /jobs/{job_id}/logs]
  - get_job_stats() → progress.parse_progress_from_log  [GET /jobs/{job_id}/stats]
  - rename_checkpoints() → job_runner._rename_checkpoints [POST /jobs/{job_id}/rename-checkpoints]
  - get_checkpoints() → inline glob                     [GET /jobs/{job_id}/checkpoints]
  - download_checkpoint() → FileResponse                [GET /jobs/{job_id}/checkpoints/{filename}]
  - get_loss_curve() → tb_reader.read_loss_curve        [GET /jobs/{job_id}/loss]
```

---

## 11. Security Configuration

```
Authentication: None
Token type: None
Password hashing: None
CORS: origins from config (default ["http://localhost:5173"]), all methods, all headers, credentials=True

Public endpoints (all — no auth):
  - All endpoints are public

Rate limiting: None
```

---

## 12. Custom Security Components

None. No authentication or authorization.

---

## 13. Exception Handling & Error Responses

No global exception handler. Endpoints raise `HTTPException` directly with status codes:
- 400: Bad request (unconfigured settings, invalid status for action)
- 404: Resource not found (job, dataset, video, preset, checkpoint)
- 409: Conflict (duplicate dataset name)
- 500: ffmpeg errors (thumbnail generation)

Standard FastAPI error format: `{"detail": "message"}`

---

## 14. Pydantic Schemas / Mappers

```
=== schemas.py ===
SettingsRead(BaseModel): 4 string fields with defaults
SettingsUpdate(BaseModel): 4 optional string fields

GpuStats(BaseModel): name, vram_used_mb, vram_total_mb, utilization_pct, temperature_c, available

DatasetInfo(BaseModel): id, name, video_count, created_at — from_attributes=True
DatasetCreate(BaseModel): name (with regex validator: alphanumeric/hyphens/underscores)
VideoInfo(BaseModel): name, filename, caption, has_caption, size_bytes, frame_count

DatasetConfigForm(BaseModel): video_directory, cache_directory, resolution, caption_extension, batch_size, enable_bucket, target_frames, frame_extraction, num_repeats
TrainingArgsForm(BaseModel): 28 fields covering model paths, LoRA, timesteps, optimizer, memory, output
PresetInfo(BaseModel): name, filename, description
TomlGenerateRequest(BaseModel): dataset_config + training_args

JobCreate(BaseModel): name, job_type, dataset_config, training_args, dataset_name
JobAdopt(BaseModel): name, job_type, log_file, tensorboard_dir, output_dir
JobRead(BaseModel): 13 fields — from_attributes=True
JobDetail(JobRead): extends with dataset_config, training_args, tensorboard_dir, log_file
LossPoint(BaseModel): step, value

Mapping approach: Pydantic from_attributes (ORM mode)
Custom validators: DatasetCreate.validate_name (regex)
```

---

## 15. Utility Modules & Shared Components

**Backend:**
```
=== services/progress.py ===
Regex patterns (module-level compiled):
  - TQDM_RE: Match tqdm progress "45%|...|9/20"
  - TQDM_NO_TOTAL_RE: Match tqdm without total "5it [..."
  - SPEED_RE: Match "78.62s/it" or "2076.39it/s"
  - AVR_LOSS_RE: Match "avr_loss=0.0812"
  - PHASE_RE: Match "### PHASE: name ###"
  - EPOCH_RE: Match "epoch 1/10"
```

**Frontend shared:**
```
=== utils/date.ts ===
Functions:
  - utcToLocal(iso: string) -> Date  (appends Z if missing for UTC parsing)
  - formatDateTime(iso: string) -> string
  - formatDate(iso: string) -> string
Used by: JobsPage, JobDetail

=== api/client.ts ===
Functions:
  - request<T>(path, opts) — generic fetch wrapper, throws on non-ok
  - api.get/put/post/del — method shortcuts
  - fetcher<T>(path) — SWR-compatible fetcher
Used by: All components/hooks
```

---

## 16. Database Schema (Live)

```sql
CREATE TABLE jobs (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  job_type VARCHAR(50) NOT NULL,
  dataset_config TEXT NOT NULL,
  training_args TEXT NOT NULL,
  pid INTEGER,
  log_file VARCHAR(500),
  progress_current INTEGER NOT NULL,
  progress_total INTEGER NOT NULL,
  current_phase VARCHAR(50),
  output_dir VARCHAR(500),
  tensorboard_dir VARCHAR(500),
  created_at DATETIME NOT NULL,
  started_at DATETIME,
  completed_at DATETIME,
  error_message TEXT
);

CREATE TABLE settings (
  "key" VARCHAR(255) NOT NULL PRIMARY KEY,
  value TEXT NOT NULL
);
```

**Schema drift from models:**
- `queue_position` column: defined in model but missing from live schema (added via `_migrate_columns()` ALTER TABLE on startup)
- `dataset_name` column: same — added via migration on startup
- `datasets` table: defined in model but missing from live schema (created by `create_all()` on startup)
- Live schema lacks timezone info on datetime columns (SQLite limitation)

---

## 17. Message Broker Configuration

No message broker detected.

---

## 18. Cache Layer

No Redis or caching layer detected. SWR provides client-side caching with configurable `refreshInterval`.

---

## 19. Environment Variable Inventory

```
Variable             | Used In          | Default                        | Required in Prod
---------------------|------------------|--------------------------------|------------------
MUSUBI_UI_DATABASE_URL | config.py      | sqlite:///data/musubi_tuner.db  | NO
MUSUBI_UI_DATA_DIR   | config.py        | <backend>/data                 | NO
MUSUBI_UI_LOG_DIR    | config.py        | <backend>/data/logs            | NO
MUSUBI_UI_CORS_ORIGINS | config.py      | ["http://localhost:5173"]       | YES (if deployed)
```

No `.env` or `.env.example` files.

---

## 20. Service Dependency Map

Standalone service — no inter-service dependencies.

External tool dependencies:
- `nvidia-smi` — GPU monitoring (gracefully degrades if missing)
- `ffmpeg` — Video thumbnail generation (500 error if missing)

---

## 21. Known Technical Debt & Issues (Backend)

```
Issue | Location | Severity | Notes
------|----------|----------|------
No TODO/FIXME/placeholder patterns | — | PASS | Clean
Schema drift between model and live DB | models.py vs live DB | Low | _migrate_columns handles it at startup but is fragile
Synchronous DB in async context | routers/jobs.py stream_logs | Medium | Creates new sync session inside async generator
No auth on any endpoint | all routers | Medium | Acceptable for local-only tool but risky if exposed
Job statuses as string literals | throughout | Low | No enum validation, typo-prone
_rename_checkpoints called from router | routers/jobs.py:235 | Low | Private function imported in router
```

---

# PART B — FRONTEND (React / TypeScript)

---

## 22. React Component Tree & Routing

```
Route Structure:
  / → MainLayout (Sidebar + Outlet)
    / → DashboardPage
    /datasets → DatasetListPage
    /datasets/:name → DatasetDetailPage
    /jobs → JobsPage
    /jobs/new → NewJobPage
    /jobs/:id → JobDetailPage
    /settings → SettingsPage

Auth guard: None (all routes public)
Layout nesting: MainLayout wraps all routes (fixed sidebar + scrollable main area)
```

---

## 23. State Management & Data Fetching

```
State Management: None (component-local useState only)
Data Fetching: SWR (stale-while-revalidate)
Form Management: Native controlled components (useState)

Global State Stores: None

API Client Setup:
  - Base URL: "/api" (hardcoded, proxied by Vite in dev)
  - Auth header: None
  - Error handling: Per-request (throws Error with detail message)

SWR Keys:
  - "/jobs" → GET /api/jobs (5s refresh)
  - "/jobs/{id}" → GET /api/jobs/{id} (3s refresh)
  - "/jobs/{id}/stats" → GET /api/jobs/{id}/stats (5s refresh)
  - "/jobs/{id}/loss" → GET /api/jobs/{id}/loss (10s refresh)
  - "/jobs/{id}/checkpoints" → GET /api/jobs/{id}/checkpoints (30s refresh)
  - "/system/gpu" → GET /api/system/gpu (3s refresh)
  - "/settings" → GET /api/settings
  - "/datasets" → GET /api/datasets
  - "/datasets/{name}/videos" → GET /api/datasets/{name}/videos
  - "/configs/presets" — not currently used in UI (presets not loaded in NewJobPage)
```

---

## 24. API Integration Layer

```
=== api/client.ts ===
Base path: /api
Auth required: NO

Functions:
  - api.get<T>(path) → GET
  - api.put<T>(path, body) → PUT
  - api.post<T>(path, body) → POST
  - api.del<T>(path) → DELETE
  - fetcher<T>(path) → SWR-compatible GET wrapper
```

All API calls are made inline in components using `api.*` or via SWR with `fetcher`. No separate service files per resource.

---

## 25. Frontend Component Inventory

```
Feature: Layout
  MainLayout
    ├── Sidebar (NavLink navigation: Dashboard, Jobs, Datasets, Settings)
    └── Outlet (page content)

Feature: Dashboard
  DashboardPage
    ├── GpuWidget (VRAM bar, utilization, temp)
    ├── ActiveJobCard[] (active jobs with progress)
    ├── Queued jobs section (links)
    └── Recent jobs section (ActiveJobCard[])

Feature: Job Management
  JobsPage
    ├── New Job button → /jobs/new
    ├── Running section (JobRow[])
    ├── Queue section (removable entries)
    └── History section (JobRow[])
  NewJobPage
    ├── Job name/type/dataset selector
    ├── DatasetTomlForm (collapsible dataset config)
    ├── TrainingArgsForm (sectioned training args)
    ├── TOML preview
    └── Validation errors
  JobDetailPage
    ├── ProgressBar (phase, epoch, speed, ETA, loss, epoch ticks)
    ├── LogViewer (SSE-based, auto-scroll)
    ├── Checkpoints (file list with download)
    ├── LossChart (recharts line chart with trend)
    ├── Error display
    └── Metadata (dates, duration, output dir)
  AdoptJobForm (standalone form for adopting external jobs)

Feature: Dataset Management
  DatasetListPage
    ├── Create dataset input
    └── Dataset cards grid (name, video count, date, delete)
  DatasetDetailPage
    ├── UploadDropzone (drag-and-drop)
    ├── VideoCard[] grid (thumbnail, filename, size, caption badge)
    └── CaptionEditor (thumbnail preview, textarea, save)

Feature: Settings
  SettingsPage
    └── Path config form (musubi_tuner_path, comfyui_models_path, default_dataset_dir, default_output_dir)

Feature: Config Forms
  DatasetTomlForm (video_dir, cache_dir, resolution, frames, batch, bucket, repeats)
  TrainingArgsForm (model paths, LoRA, timesteps, optimizer, memory, output — 5 sections)
```

---

## 26. Frontend Type Definitions

```
=== api/types.ts ===
GpuStats — matches backend GpuStats schema
Settings — matches backend SettingsRead schema
VideoInfo — matches backend VideoInfo schema
DatasetInfo — matches backend DatasetInfo schema
PresetInfo — matches backend PresetInfo schema
DatasetConfig — matches backend DatasetConfigForm schema
TrainingArgs — matches backend TrainingArgsForm schema
Job — matches backend JobRead schema
JobDetail extends Job — matches backend JobDetail schema
LossPoint — matches backend LossPoint schema
JobStats — matches GET /jobs/{id}/stats response (not a named backend schema)

Type generation: Manual — manually maintained
```

---

## 27. Known Technical Debt & Issues (Frontend)

```
Issue | Location | Severity | Notes
------|----------|----------|------
No TODO/FIXME/placeholder patterns | — | PASS | Clean
Presets not loaded in NewJobPage | NewJobPage.tsx | Low | PresetInfo type exists but UI doesn't offer preset selection
AdoptJobForm not reachable from UI | AdoptJobForm.tsx | Low | Component exists but no route/button links to it
err: any type annotation | AdoptJobForm.tsx:30 | Low | Should use unknown
No error boundaries | App.tsx | Medium | Uncaught errors crash entire app
Unbounded SSE line accumulation | useSSE.ts | Medium | Lines array grows without limit during long jobs
```
