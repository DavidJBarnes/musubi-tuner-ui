# musubi-tuner-ui — Codebase Audit

**Audit Date:** 2026-03-06T17:26:12Z
**Branch:** codebase-audit
**Commit:** b392d65475e3259f78fd5898ec722afd08688132 Add codebase audit context documents
**Auditor:** Claude Code (Automated)
**Purpose:** Zero-context reference for AI-assisted development
**Stack:** Python/FastAPI backend + React/TypeScript frontend
**Audit File:** musubi-tuner-ui-Audit.md
**Scorecard:** musubi-tuner-ui-Scorecard.md
**OpenAPI Spec:** musubi-tuner-ui-OpenAPI.yaml (generated separately)

> This audit is the source of truth for the musubi-tuner-ui codebase structure, models, services, components, and configuration.
> The OpenAPI spec (musubi-tuner-ui-OpenAPI.yaml) is the source of truth for all endpoints, Pydantic schemas, and API contracts.
> An AI reading this audit + the OpenAPI spec should be able to generate accurate code
> changes, new features, tests, and fixes without filesystem access.

---

# PART A — BACKEND (Python / FastAPI)

---

### 1. Project Identity

```
Project Name: musubi-tuner-ui
Repository URL: (local development, Docker Hub: davidjbarnes/musubi-tuner-ui)
Backend Language / Framework: Python / FastAPI
Python Version: 3.14.2 (requires >=3.11)
Package Manager: pip (pyproject.toml)
Frontend Language / Framework: TypeScript / React
Node Version: v22.22.0
Frontend Package Manager: npm
Current Branch: codebase-audit
Latest Commit Hash: b392d65475e3259f78fd5898ec722afd08688132
Latest Commit Message: Add codebase audit context documents
Audit Timestamp: 2026-03-06T17:26:12Z
```

---

### 2. Directory Structure

```
./backend/
  app/
    __init__.py
    config.py
    database.py
    logging_config.py
    main.py
    models.py
    schemas.py
    routers/
      __init__.py
      configs.py
      datasets.py
      jobs.py
      system.py
    services/
      __init__.py
      gpu_monitor.py
      job_runner.py
      log_streamer.py
      progress.py
      tb_reader.py
    presets/
      rtx3090_high_noise.json
      rtx3090_low_noise.json
  tests/
    __init__.py
    conftest.py
    test_configs.py
    test_datasets.py
    test_health.py
    test_job_runner.py
    test_jobs.py
    test_progress.py
    test_system.py
  pyproject.toml

./frontend/
  src/
    main.tsx
    App.tsx
    index.css
    api/
      client.ts
      types.ts
    hooks/
      useGpuStatus.ts
      useJobs.ts
      useSSE.ts
    utils/
      date.ts
    components/
      layout/     MainLayout.tsx, Sidebar.tsx
      dashboard/  DashboardPage.tsx, ActiveJobCard.tsx, GpuWidget.tsx
      dataset/    DatasetListPage.tsx, DatasetDetailPage.tsx, CaptionEditor.tsx, UploadDropzone.tsx, VideoCard.tsx
      config/     DatasetTomlForm.tsx, TrainingArgsForm.tsx
      jobs/       JobsPage.tsx, JobDetail.tsx, NewJobPage.tsx, AdoptJobForm.tsx, LogViewer.tsx, LossChart.tsx, ProgressBar.tsx, Checkpoints.tsx
      settings/   SettingsPage.tsx
  package.json
  vite.config.ts
  tsconfig.json, tsconfig.app.json, tsconfig.node.json
  eslint.config.js

./Dockerfile
./CLAUDE.md
./README.md
./musubi-tuner-ui-OpenAPI.yaml
```

Monorepo with `backend/` (Python/FastAPI) and `frontend/` (React/TypeScript/Vite). Backend source root: `backend/app/`. Frontend source root: `frontend/src/`.

---

### 3. Build & Dependency Manifest

#### Backend (Python)

| Dependency | Version | Purpose |
|---|---|---|
| fastapi | >=0.115 | Web framework |
| uvicorn[standard] | >=0.34 | ASGI server |
| sqlalchemy | >=2.0 | ORM (sync) |
| aiofiles | >=24.1 | Async file I/O (video upload) |
| python-multipart | >=0.0.18 | File upload parsing |
| tomli | >=2.0 | TOML parsing |
| tomli_w | >=1.0 | TOML writing |
| tensorboard | >=2.18 | Loss curve reading |
| pydantic-settings | >=2.7 | Settings from env vars |
| ruff (dev) | — | Linter/formatter |
| pytest (dev) | — | Testing |
| httpx (dev) | — | Test HTTP client |

```
Install: pip install -e ".[dev]"
Run Dev: uvicorn app.main:app --reload --port 8000
Test: pytest
Lint: ruff check .
Format: ruff format .
```

#### Frontend (React)

| Dependency | Version | Purpose |
|---|---|---|
| react | ^19.2.0 | UI library |
| react-dom | ^19.2.0 | DOM rendering |
| react-router-dom | ^7.13.1 | Routing |
| swr | ^2.4.1 | Data fetching (stale-while-revalidate) |
| recharts | ^3.7.0 | Loss curve charts |
| tailwindcss | ^4.2.1 | CSS framework |
| @tailwindcss/vite | ^4.2.1 | Tailwind Vite plugin |
| typescript | ~5.9.3 | Type checking |
| vite | ^7.3.1 | Build tool / dev server |

```
Install: npm install
Run Dev: npm run dev (port 5173)
Build: npm run build
Lint: npm run lint (eslint)
```

---

### 4. Configuration & Infrastructure Summary

**Backend:**
- `backend/app/config.py` — `AppConfig(BaseSettings)` with env prefix `MUSUBI_UI_`. Fields: `database_url` (default SQLite), `data_dir`, `log_dir`, `cors_origins`. Dirs created on import.
- No Alembic — uses `Base.metadata.create_all()` + pragmatic `_migrate_columns()` ALTER TABLE for new columns.
- `backend/app/logging_config.py` — Custom `JSONFormatter` logging to stdout. Quiets uvicorn.access and sqlalchemy.engine.
- No `.env` or `.env.example` files.

**Frontend:**
- `frontend/vite.config.ts` — Dev server on 0.0.0.0, host `3090.zero` allowed, proxy `/api` → `http://localhost:8000`.
- `frontend/tsconfig.app.json` — strict: true, ES2022 target, React JSX, bundler module resolution.

**Shared:**
- `Dockerfile` — Multi-stage: Node 22 builds frontend, Python 3.11-slim runs backend. Clones musubi-tuner into `/opt/musubi-tuner`. Non-root `appuser`. Exposes 8000.

**Connection map:**
```
Database: SQLite, local file at data/musubi_tuner.db
Cache: None
Message Broker: None
External APIs: nvidia-smi (subprocess), ffmpeg (subprocess), musubi-tuner scripts (subprocess)
Cloud Services: None
Frontend → Backend: /api proxy (http://localhost:8000 in dev)
```

**CI/CD:** GitHub Actions pushes Docker image to Docker Hub on push to `main`.

---

### 5. Startup & Runtime Behavior

**Backend:**
- Entry point: `backend/app/main.py` — `app = FastAPI(title="Musubi Tuner UI", version="0.1.0", lifespan=lifespan)`
- Lifespan: `setup_logging()` → `Base.metadata.create_all()` → `_migrate_columns()` → `reconcile_jobs()` (re-attach monitor threads for surviving processes)
- Middleware: CORSMiddleware (configurable origins, all methods/headers) → custom `log_requests` HTTP middleware (logs method, path, status, duration)
- Global exception handler: catches `Exception`, returns JSON `{"detail": "Internal server error"}` with status 500
- Health check: `GET /api/health` → `{"status": "ok"}`
- Static files: mounts `backend/static/` at `/` if directory exists (production Docker only)

**Frontend:**
- Entry point: `frontend/src/main.tsx` → `<StrictMode><App /></StrictMode>`
- Root component: `<BrowserRouter><Routes><Route element={<MainLayout />}>...`
- No initialization logic beyond React rendering. SWR handles data fetching on component mount.

---

### 6. SQLAlchemy Model / Data Model Layer

```
=== Job (models.py) ===
Table: jobs
Primary Key: id: String(36), default=uuid4()

Fields:
  - name: String(255), NOT NULL
  - status: String(50), default="pending"
  - job_type: String(50), NOT NULL  # high_noise | low_noise | both
  - dataset_config: Text, NOT NULL  # TOML snapshot as JSON string
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
Audit Fields: created_at present, NO updated_at
Mixins/Base: extends Base (DeclarativeBase)
Validators: None
Custom Methods: None

=== Dataset (models.py) ===
Table: datasets
Primary Key: id: String(36), default=uuid4()

Fields:
  - name: String(255), unique=True, NOT NULL
  - created_at: DateTime(timezone=True), default=_utcnow

Relationships: None
Audit Fields: created_at present, NO updated_at
Mixins/Base: extends Base
Validators: None
Custom Methods: None

=== Setting (models.py) ===
Table: settings
Primary Key: key: String(255)

Fields:
  - value: Text, NOT NULL

Relationships: None
Audit Fields: None
Mixins/Base: extends Base
Validators: None
Custom Methods: None
```

---

### 7. Enum Inventory

No formal enum classes defined. Job statuses are string literals used throughout:
- `"pending"`, `"queued"`, `"caching_latents"`, `"caching_text"`, `"training"`, `"completed"`, `"failed"`, `"cancelled"`, `"stopped"`

Job types are also string literals: `"high_noise"`, `"low_noise"`, `"both"`

---

### 8. Repository / DAO Layer

No dedicated repository/DAO/CRUD layer. Database queries are inline in routers and services using `db.query(Model).filter(...)` pattern. Session management via `Depends(get_db)` in routers, `SessionLocal()` with manual close in services.

---

### 9. Service Layer — Full Function Signatures

```
=== services/job_runner.py ===
Dependencies: config, SessionLocal, Job, Setting, DatasetConfigForm, TrainingArgsForm, parse_progress_from_log

Public Functions:
  - def generate_run_script(job: Job, dataset_cfg: DatasetConfigForm, training_args: TrainingArgsForm, musubi_path: str, comfyui_models_path: str, skip_to_phase: str | None = None, resume_from: str | None = None, network_weights: str | None = None) -> str
    Purpose: Generate bash training script with cache + train phases.

  - def generate_dataset_toml(cfg: DatasetConfigForm) -> str
    Purpose: Generate TOML content from dataset config form.

  - def start_job(job_id: str, skip_to_phase: str | None = None, resume_from: str | None = None, network_weights: str | None = None) -> None
    Purpose: Start training job as detached subprocess, write script/TOML, spawn monitor thread.
    Calls: generate_run_script(), generate_dataset_toml(), _monitor_job()

  - def cancel_job(job_id: str) -> bool
    Purpose: Send SIGTERM to process group, set status=cancelled, advance queue.

  - def stop_job(job_id: str) -> bool
    Purpose: Send SIGTERM, set status=stopped, advance queue.

  - def resume_job(job_id: str) -> bool
    Purpose: Find latest state dir or checkpoint, restart with --resume flag.

  - def reconcile_jobs() -> None
    Purpose: On startup, check PIDs of in-progress jobs. Re-attach monitors for alive processes, mark stale as failed.

  - def adopt_job(data: JobAdopt) -> Job
    Purpose: Create a Job record for externally-started training, start log-monitoring thread.

  - def has_running_job() -> bool
    Purpose: Check if any job has active status (max 1 concurrent GPU job).

  - def _assign_queue_position(db: Session) -> int
    Purpose: Return max(queue_position) + 1.

  - def _rename_checkpoints(job_id: str, cleanup_state: bool = False) -> None
    Purpose: Rename checkpoint files from {name}-{epoch:06d} to {name}-e{epoch:03d}-s{step}.

Private Functions:
  - _get_setting(db, key) -> str
  - _monitor_job(job_id, pid) -> None
  - _is_training_process(pid) -> bool
  - _log_has_done_phase(log_file) -> bool
  - _extract_error_from_log(log_file) -> str | None
  - _infer_exit_from_log(log_file) -> int
  - _monitor_adopted_job(job_id) -> None
  - _advance_queue() -> None

=== services/gpu_monitor.py ===
Dependencies: subprocess

Public Functions:
  - def get_gpu_stats() -> GpuStats
    Purpose: Query nvidia-smi for GPU name, VRAM, utilization, temperature.

=== services/log_streamer.py ===
Dependencies: asyncio, os, re

Public Functions:
  - async def tail_log(log_path: str, poll_interval: float = 0.5) -> AsyncGenerator[str, None]
    Purpose: Async tail -f equivalent. Starts near end of file to avoid flooding.

=== services/progress.py ===
Dependencies: re, os

Public Functions:
  - def parse_progress_from_log(log_path: str | None) -> dict
    Purpose: Parse tqdm output, phase markers, epoch, speed, avr_loss from log tail (last 32KB).

=== services/tb_reader.py ===
Dependencies: tensorboard EventAccumulator

Public Functions:
  - def read_loss_curve(tensorboard_dir: str) -> list[LossPoint]
    Purpose: Read loss scalars from TensorBoard event files.
```

---

### 10. Router / API Layer — Method Signatures Only

```
=== routers/system.py ===
Prefix: /api (mounted at /api)
Tags: ["system"]
Dependencies: None (router-level)

Endpoints:
  - gpu_stats() → get_gpu_stats()              GET /api/system/gpu
  - read_settings() → db.query(Setting)         GET /api/settings
  - update_settings() → db upsert Setting       PUT /api/settings

=== routers/configs.py ===
Prefix: /api/configs
Tags: ["configs"]
Dependencies: None

Endpoints:
  - list_presets() → reads JSON from presets/    GET /api/configs/presets
  - get_preset() → reads single preset JSON      GET /api/configs/presets/{filename}
  - generate_toml() → generate_dataset_toml()    POST /api/configs/generate-toml
  - validate_config() → checks file paths exist  POST /api/configs/validate

=== routers/datasets.py ===
Prefix: /api/datasets
Tags: ["datasets"]
Dependencies: Depends(get_db)

Endpoints:
  - list_datasets() → auto_discover + paginate   GET /api/datasets
  - create_dataset() → mkdir + db insert          POST /api/datasets
  - delete_dataset() → db delete (no file rm)     DELETE /api/datasets/{name}
  - list_videos() → scan directory                GET /api/datasets/{name}/videos
  - get_thumbnail() → ffmpeg thumbnail            GET /api/datasets/{name}/videos/{video}/thumb
  - read_caption() → read .txt file               GET /api/datasets/{name}/videos/{video}/caption
  - write_caption() → write .txt file             PUT /api/datasets/{name}/videos/{video}/caption
  - upload_videos() → aiofiles write              POST /api/datasets/{name}/videos/upload
  - delete_video() → unlink file + caption        DELETE /api/datasets/{name}/videos/{video}

=== routers/jobs.py ===
Prefix: /api/jobs
Tags: ["jobs"]
Dependencies: Depends(get_db)

Endpoints:
  - list_jobs() → paginated query                 GET /api/jobs
  - create_job() → insert + start_job()           POST /api/jobs
  - adopt_existing_job() → adopt_job()            POST /api/jobs/adopt
  - get_job() → single query                      GET /api/jobs/{job_id}
  - delete_job() → cancel_job() + return status   DELETE /api/jobs/{job_id}
  - retry_job() → reset + start_job()             POST /api/jobs/{job_id}/retry
  - stop_job_endpoint() → stop_job()              POST /api/jobs/{job_id}/stop
  - resume_job_endpoint() → resume_job()          POST /api/jobs/{job_id}/resume
  - stream_logs() → SSE via tail_log()            GET /api/jobs/{job_id}/logs
  - get_job_stats() → parse_progress_from_log()   GET /api/jobs/{job_id}/stats
  - rename_checkpoints() → _rename_checkpoints()  POST /api/jobs/{job_id}/rename-checkpoints
  - get_checkpoints() → glob output_dir           GET /api/jobs/{job_id}/checkpoints
  - download_checkpoint() → FileResponse          GET /api/jobs/{job_id}/checkpoints/{filename}
  - get_loss_curve() → read_loss_curve()          GET /api/jobs/{job_id}/loss
```

---

### 11. Security Configuration

```
Authentication: None — no auth, no login
Token type: N/A
Password hashing: N/A
CORS: allow_origins from config (default ["http://localhost:5173"]), all methods, all headers, credentials=True
Rate limiting: None
```

All endpoints are public. This is a single-user local tool.

```
Public endpoints (all):
  - Every endpoint — no auth required
```

---

### 12. Custom Security Components

None. No authentication or authorization layer.

---

### 13. Exception Handling & Error Responses

```
=== main.py ===
Registration: @app.exception_handler(Exception)

Exception Mappings:
  - HTTPException → pass-through (FastAPI default)
  - Exception → 500 {"detail": "Internal server error"}

Standard error format:
  {"detail": "error message string"}

Custom exception classes: None — uses FastAPI HTTPException directly
```

Routers raise `HTTPException(status_code, detail_string)` for 400/404/409 errors.

---

### 14. Pydantic Schemas / Mappers

```
=== schemas.py ===
PaginatedResponse(BaseModel, Generic[T]): items, total, skip, limit

SettingsRead(BaseModel): musubi_tuner_path, comfyui_models_path, default_output_dir, default_dataset_dir
SettingsUpdate(BaseModel): all Optional versions of above

GpuStats(BaseModel): name, vram_used_mb, vram_total_mb, utilization_pct, temperature_c, available

DatasetInfo(BaseModel): id, name, video_count, created_at — from_attributes=True
DatasetCreate(BaseModel): name — @field_validator: alphanumeric/hyphens/underscores only

VideoInfo(BaseModel): name, filename, caption, has_caption, size_bytes, frame_count

DatasetConfigForm(BaseModel): video_directory, cache_directory, resolution, caption_extension, batch_size, enable_bucket, target_frames, frame_extraction, num_repeats
TrainingArgsForm(BaseModel): 28 fields covering model paths, LoRA, timesteps, optimizer, memory, output

PresetInfo(BaseModel): name, filename, description
TomlGenerateRequest(BaseModel): dataset_config, training_args

JobCreate(BaseModel): name, job_type, dataset_config(Form), training_args(Form), dataset_name
JobAdopt(BaseModel): name, job_type, log_file, tensorboard_dir, output_dir
JobRead(BaseModel): 14 fields — from_attributes=True
JobDetail(JobRead): adds dataset_config, training_args, tensorboard_dir, log_file
LossPoint(BaseModel): step, value

Mapping approach: from_attributes=True (Pydantic v2)
Custom validators: DatasetCreate.validate_name (regex)
```

---

### 15. Utility Modules & Shared Components

**Backend:**
```
=== services/progress.py ===
Functions:
  - parse_progress_from_log(log_path: str | None) -> dict
    Regex patterns: TQDM_RE, TQDM_NO_TOTAL_RE, SPEED_RE, AVR_LOSS_RE, PHASE_RE, EPOCH_RE
    Returns: {current, total, phase, speed, epoch, total_epochs, avr_loss}
Used by: job_runner._monitor_job(), job_runner._monitor_adopted_job(), routers/jobs.get_job_stats()

=== services/log_streamer.py ===
Functions:
  - tail_log(log_path, poll_interval) -> AsyncGenerator[str, None]
Used by: routers/jobs.stream_logs()
```

---

### 16. Database Schema (Live)

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
    error_message TEXT,
    queue_position INTEGER,
    dataset_name VARCHAR(255)
);

CREATE TABLE settings (
    "key" VARCHAR(255) NOT NULL PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE datasets (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL
);
```

No schema drift from SQLAlchemy models. `queue_position` and `dataset_name` are added via `_migrate_columns()` ALTER TABLE if missing.

---

### 17. MESSAGE BROKER DETECTION

No message broker detected. Background processing uses Python `threading.Thread` with daemon=True.

---

### 18. CACHE DETECTION

No Redis or caching layer detected. All data served fresh from DB or filesystem.

---

### 19. ENVIRONMENT VARIABLE INVENTORY

```
Variable              | Used In          | Default                    | Required in Prod
----------------------|------------------|----------------------------|------------------
MUSUBI_UI_DATABASE_URL | config.py       | sqlite:///data/musubi_tuner.db | NO
MUSUBI_UI_DATA_DIR    | config.py        | backend/data/              | NO
MUSUBI_UI_LOG_DIR     | config.py        | backend/data/logs/         | NO
MUSUBI_UI_CORS_ORIGINS | config.py       | ["http://localhost:5173"]   | YES (if cross-origin)
```

No `.env` or `.env.example` file exists. All config has sane defaults for local development.

---

### 20. SERVICE DEPENDENCY MAP

Standalone service — no inter-service dependencies.

```
External tools (subprocess):
  - nvidia-smi: GPU stats (services/gpu_monitor.py)
  - ffmpeg: Video thumbnail generation (routers/datasets.py)
  - musubi-tuner Python scripts: Training pipeline (services/job_runner.py)

Frontend → Backend: /api proxy via Vite dev server (http://localhost:8000)
```

---

### 21. Known Technical Debt & Issues (Backend)

```
Issue | Location | Severity | Notes
------|----------|----------|------
No updated_at on Job/Dataset models | models.py | Low | Only created_at tracked
No formal enum for job status | models.py, throughout | Low | String literals scattered across codebase
No repository/DAO layer | routers/, services/ | Low | Queries inline — acceptable for project size
Inline db.query() in services bypasses DI | services/job_runner.py | Low | Uses SessionLocal() directly instead of Depends
`pass # Pending jobs without PID are fine` | services/job_runner.py:553 | Info | Intentional — not incomplete code
Job configs stored as JSON strings in Text columns | models.py | Low | Prevents relational queries on config values
```

No TODO/FIXME/placeholder/stub patterns found in backend.

---

# PART B — FRONTEND (React / TypeScript)

---

### 22. React Component Tree & Routing

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

Auth guard: None (no auth)
Layout nesting: MainLayout wraps all routes (sidebar + content area)
```

---

### 23. State Management & Data Fetching

```
State Management: None (no global state library)
Data Fetching: SWR (stale-while-revalidate)
Form Management: Native controlled components (useState)

API Client Setup:
  - Base URL: /api (relative, proxied by Vite in dev)
  - Auth header: None
  - Error handling: Per-request (api wrapper throws on non-ok, catches .detail from JSON)

SWR Keys:
  - "/jobs" → GET /api/jobs (refreshInterval: 5000)
  - "/jobs/{id}" → GET /api/jobs/{id} (refreshInterval: 3000)
  - "/jobs/{id}/stats" → GET /api/jobs/{id}/stats (refreshInterval: 5000)
  - "/jobs/{id}/loss" → GET /api/jobs/{id}/loss (refreshInterval: 10000)
  - "/jobs/{id}/checkpoints" → GET /api/jobs/{id}/checkpoints (refreshInterval: 30000)
  - "/system/gpu" → GET /api/system/gpu (refreshInterval: 3000)
  - "/settings" → GET /api/settings
  - "/datasets" → GET /api/datasets
  - "/datasets/{name}/videos" → GET /api/datasets/{name}/videos

SSE Streaming:
  - /api/jobs/{id}/logs → EventSource, parses {line} and {done} messages
```

---

### 24. API Integration Layer

```
=== api/client.ts ===
Base path: /api
Auth required: NO

Functions (generic wrapper):
  - api.get<T>(path) → GET
  - api.put<T>(path, body) → PUT
  - api.post<T>(path, body) → POST
  - api.del<T>(path) → DELETE
  - fetcher<T>(path) → SWR-compatible GET wrapper

Error handling: throws Error with body.detail or "HTTP {status}"
```

---

### 25. Frontend Component Inventory

```
Feature: Layout
  MainLayout
    ├── Sidebar (NavLink navigation: Dashboard, Jobs, Datasets, Settings)
    └── <Outlet /> (routed content)

Feature: Dashboard
  DashboardPage
    ├── GpuWidget (VRAM bar, utilization, temp)
    ├── ActiveJobCard[] (active/recent jobs with progress bar)
    └── Queued job links

Feature: Datasets
  DatasetListPage
    ├── Create dataset input + button
    └── DatasetInfo cards (name, video count, date, delete)
  DatasetDetailPage
    ├── UploadDropzone (drag-and-drop video upload)
    ├── VideoCard[] (thumbnail grid with caption status badge)
    └── CaptionEditor (thumbnail, textarea, save)

Feature: Jobs
  JobsPage
    ├── Running section (JobRow[])
    ├── Queue section (with remove button)
    └── History section (JobRow[])
  NewJobPage
    ├── Job name/type/dataset selector
    ├── DatasetTomlForm (collapsible, resolution/frames/batch)
    ├── TrainingArgsForm (sections: Model, LoRA, Timesteps, Optimizer, Memory, Output)
    ├── Validate + Preview TOML buttons
    └── Create/Queue button
  JobDetailPage
    ├── ProgressBar (phase, epoch, speed, ETA, loss, epoch tick marks)
    ├── LogViewer (SSE streaming, auto-scroll)
    ├── Checkpoints (download links, size, date)
    ├── LossChart (recharts LineChart with trend line)
    └── Job metadata (timestamps, duration, output dir)
  AdoptJobForm (adopt externally-started job)

Feature: Settings
  SettingsPage
    └── Form: musubi_tuner_path, comfyui_models_path, default_dataset_dir, default_output_dir

Shared/Common Components:
  - No shared component library — components are feature-scoped
  - Tailwind CSS utility classes with custom theme tokens
```

---

### 26. Frontend Type Definitions

```
=== api/types.ts ===
PaginatedResponse<T> — matches backend PaginatedResponse
GpuStats — matches backend GpuStats
Settings — matches backend SettingsRead
VideoInfo — matches backend VideoInfo
DatasetInfo — matches backend DatasetInfo
PresetInfo — matches backend PresetInfo
DatasetConfig — matches backend DatasetConfigForm
TrainingArgs — matches backend TrainingArgsForm
Job — matches backend JobRead
JobDetail extends Job — matches backend JobDetail
LossPoint — matches backend LossPoint
JobStats — matches backend /jobs/{id}/stats response (not a schema, inline dict)

Type generation: None — manually maintained
```

---

### 27. Known Technical Debt & Issues (Frontend)

```
Issue | Location | Severity | Notes
------|----------|----------|------
No frontend tests | frontend/src/ | High | Zero test files (.test.ts/.test.tsx)
No error boundaries | components/ | Medium | Unhandled React errors crash entire app
alert() used for error display | DatasetListPage.tsx:22 | Low | Should use toast/notification
any type usage | AdoptJobForm.tsx:30 | Low | catch (err: any)
No loading skeletons | components/ | Low | Only "Loading..." text
```

No TODO/FIXME/placeholder/stub patterns found in frontend. The `placeholder` grep hits are all HTML input placeholder attributes.

---
