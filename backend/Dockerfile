FROM python:3.10-slim

# Create a non-root user for security (required by Hugging Face)
RUN useradd -m -u 1000 user
WORKDIR /app

# Install system dependencies (including OpenCV visual deps)
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU first (highly cached)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Copy and install other Python dependencies
COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy the rest of the backend files
COPY --chown=user:user . .

# Grant execute permission to start.sh
RUN chmod +x start.sh

# Set up permissions for Hugging Face environment
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Hugging Face Spaces runs on port 7860 by default
EXPOSE 7860

# Run both model server and FastAPI gateway via start.sh
CMD ["./start.sh"]
