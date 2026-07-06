FROM python:3.10-slim

# Create a non-root user for security (required by Hugging Face)
RUN useradd -m -u 1000 user
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy the rest of the backend files
COPY --chown=user:user . .

# Set up permissions for Hugging Face environment
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Hugging Face Spaces runs on port 7860 by default
EXPOSE 7860

# Run FastAPI on port 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
