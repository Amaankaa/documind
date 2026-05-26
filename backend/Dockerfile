FROM python:3.11-slim

WORKDIR /app

# System deps for PyMuPDF, psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev libmupdf-dev && \
    rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install --no-cache-dir uv && uv pip install --system -e .

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
