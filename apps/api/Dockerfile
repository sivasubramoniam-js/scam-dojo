FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source & knowledge base
COPY data /app/data
COPY app /app/app

# Create directory for SQLite store
RUN mkdir -p /app/.local

ENV PYTHONPATH=/app
ENV PORT=8080
ENV HOST=0.0.0.0
ENV KB_PATH=/app/data/knowledge.sqlite
ENV SQLITE_PATH=/app/.local/dojo.sqlite

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
