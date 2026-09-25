# Imagen del backend para Render (contexto de build = backend/).
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# `emergentintegrations` y `litellm` vienen de un índice privado de Emergent y no
# se importan en el código, así que se omiten (igual que en docker-compose.base44.yml).
COPY requirements.txt .
RUN grep -vE '^(emergentintegrations|litellm)' requirements.txt > /tmp/req.txt \
    && pip install --no-cache-dir -r /tmp/req.txt \
    && rm /tmp/req.txt

# Incluye static/ (nab3d.glb ~58MB, dims.json, objects.json, viewer.html...).
COPY . .

# Render inyecta PORT; en local se usa 8001.
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8001}"]
