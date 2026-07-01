# Image de l'API FastAPI (pipeline d'indexation vidéo)
FROM python:3.11-slim

# Dépendances système : ffmpeg (extraction audio) + libgomp1 (onnxruntime/chromadb)
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Torch en version CPU d'abord (wheel plus léger que la version CUDA par défaut),
# réutilisé ensuite par openai-whisper.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
