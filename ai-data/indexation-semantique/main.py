"""
API FastAPI — Pipeline d'indexation vidéo (points 1 à 7)
Hackathon 42c x ESTIAM 2026

Endpoint principal: POST /process
Prend une vidéo en entrée, exécute toute la chaîne et renvoie le JSON commun :
video, transcript, translation, summary, chapters, keywords, topics.
"""
import os
import shutil
import tempfile
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from pipeline.audio import extract_audio
from pipeline.transcribe import transcribe
from pipeline.translate import translate_segments
from pipeline.summarize import summarize
from pipeline.chapters import generate_chapters
from pipeline.keywords import extract_keywords, derive_topics
from pipeline.vectorstore import index_segments, search as vector_search

app = FastAPI(
    title="Pipeline d'indexation vidéo",
    version="3.0.0",
    description="Extraction audio, transcription, traduction, résumé, chapitres, mots-clés.",
)

# CORS : indispensable pour qu'un front (React, etc.) puisse appeler l'API depuis
# le navigateur. En dev on autorise tout ; EN PRODUCTION, restreindre allow_origins
# aux domaines réels du front (ex: ["https://mon-front.exemple.com"]).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SearchRequest(BaseModel):
    query: str = Field(..., description="Requête en langage naturel")
    top_k: int = Field(default=5, description="Nombre de résultats à retourner")
    video_id: str | None = Field(default=None, description="Limiter la recherche à une vidéo (optionnel)")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/search")
def search(req: SearchRequest):
    """
    Recherche vectorielle sémantique dans le corpus des vidéos déjà traitées.
    Renvoie les passages les plus proches avec leur vidéo et leurs timestamps.
    """
    return {
        "query": req.query,
        "results": vector_search(req.query, top_k=req.top_k, video_id=req.video_id),
    }


@app.post("/process")
async def process_video(
    file: UploadFile = File(...),
    target_lang: str = Query(default="en", description="Langue cible de traduction"),
    model_size: str = Query(default="base", description="Taille du modèle Whisper (tiny/base/small/...)"),
    skip_translation: bool = Query(default=False),
    skip_summary: bool = Query(default=False),
    skip_chapters: bool = Query(default=False),
):
    """
    Chaîne complète :
    1. Extraction audio (ffmpeg → mono 16 kHz)
    2. Transcription + détection de langue (Whisper)
    3. Traduction multilingue (Ollama) — optionnelle
    4. Résumé court + détaillé (Ollama) — optionnel
    5. Chapitres thématiques (Ollama) — optionnels
    6. Mots-clés (KeyBERT) + topics
    7. Assemblage du JSON commun
    """
    # Sauvegarde temporaire de la vidéo uploadée.
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        video_path = tmp.name

    video_id = uuid.uuid4().hex[:8]
    audio_path = None
    try:
        # 1. Extraction audio (ffmpeg)
        audio_path = extract_audio(video_path)

        # 2. Transcription (Whisper)
        transcript = transcribe(audio_path, model_size=model_size)

        # Indexation vectorielle des segments (corpus multi-vidéos, pour /search)
        index_segments(video_id, file.filename, transcript["segments"])

        # 3. Traduction (optionnelle)
        translation = None
        if not skip_translation:
            translation = translate_segments(transcript["segments"], target_lang=target_lang)

        # 4. Résumé (optionnel)
        summary = None
        if not skip_summary:
            summary = summarize(transcript["text"])

        # 5. Chapitres (optionnels)
        chapters = None
        if not skip_chapters:
            chapters = generate_chapters(transcript["segments"])

        # 6. Mots-clés + topics
        keywords = extract_keywords(transcript["text"])
        topics = derive_topics(keywords)

        # 7. Assemblage du JSON commun
        return {
            "video": {
                "id": video_id,
                "filename": file.filename,
                "durationSec": transcript["durationSec"],
                "language": transcript["language"],
                "processedAt": datetime.now(timezone.utc).isoformat(),
            },
            "transcript": {
                "language": transcript["language"],
                "text": transcript["text"],
                "segments": transcript["segments"],
            },
            "translation": translation,
            "summary": summary,
            "chapters": chapters,
            "keywords": keywords,
            "topics": topics,
        }

    finally:
        # Nettoyage des fichiers temporaires (vidéo + audio extrait).
        for path in (video_path, audio_path):
            if path and os.path.exists(path):
                os.remove(path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
