# --- STAGE 1: Build Frontend ---
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- STAGE 2: Build Backend & Final Image ---
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies (including git for pandas-ta dev branch)
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip for better dependency resolution
RUN pip install --upgrade pip

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Copy the built frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose the API port
EXPOSE 8001

# Command to run the FastAPI application (serving both API and Frontend)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]