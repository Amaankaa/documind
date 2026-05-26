# Silver repository image — Python backend + pytest (tasks target backend/)
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    git \
    libmupdf-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv==0.11.11

COPY backend/pyproject.toml backend/uv.lock /app/backend/
WORKDIR /app/backend
RUN uv sync --frozen --extra dev

WORKDIR /app
COPY . .

WORKDIR /app/backend
ENV PYTHONPATH=/app/backend
CMD ["uv", "run", "pytest", "tests/", "-q"]
