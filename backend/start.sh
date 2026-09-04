#!/usr/bin/env bash
set -e

PORT="${PORT:-7860}"

echo "Starting Brain Tumor Detection FastAPI Server on port ${PORT}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}"
