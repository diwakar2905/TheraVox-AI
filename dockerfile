# ─── Stage 1: Build the React frontend ───
FROM node:20-slim AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --ignore-scripts
COPY frontend/ ./
RUN npm run build          # outputs to ../static via vite config

# ─── Stage 2: Python runtime ───
FROM python:3.11-slim

# System deps for OpenCV, audio, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 \
    ffmpeg libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps (CPU-only torch to save ~1.5 GB)
COPY requirements-deploy.txt ./
RUN pip install --no-cache-dir \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    -r requirements-deploy.txt

# Copy backend code
COPY main.py alembic.ini ./
COPY app/ ./app/
COPY alembic/ ./alembic/

# Copy pre-built frontend static files from stage 1
COPY --from=frontend-build /app/static/ ./static/

# Also copy any existing static assets (index.html, img, etc.)
COPY static/index.html static/app.js static/styles.css ./static/
COPY static/img/ ./static/img/

# Create runtime directories
RUN mkdir -p logs screenshots

# Render sets PORT env var; default 8000
ENV PORT=8000
ENV HOST=0.0.0.0
ENV ENVIRONMENT=production

EXPOSE ${PORT}

CMD ["sh", "-c", "python -m alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1 --timeout-keep-alive 120"]
