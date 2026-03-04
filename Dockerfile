# Stage 1: Build frontend
FROM node:22-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Backend + serve frontend
FROM python:3.11-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg git && \
    rm -rf /var/lib/apt/lists/*

# Clone musubi-tuner and install its deps
RUN git clone https://github.com/kohya-ss/musubi-tuner.git /opt/musubi-tuner && \
    pip install --no-cache-dir -r /opt/musubi-tuner/requirements.txt

WORKDIR /app/backend
COPY backend/pyproject.toml ./
RUN pip install --no-cache-dir .

COPY backend/ ./

# Copy built frontend into static dir served by FastAPI
COPY --from=frontend-build /app/frontend/dist ./static

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
