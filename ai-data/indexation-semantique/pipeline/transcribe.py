"""
Transcription (point 2) avec Whisper.
Transcrit l'audio en texte avec horodatage par segment et détection automatique
de la langue source. La taille du modèle est configurable (compromis vitesse/précision).
"""
import whisper

# Charger le modèle une seule fois (réutilisé entre les appels).
# "base" est un bon compromis vitesse/précision pour un hackathon.
# Options: tiny, base, small, medium, large
_model = None
_model_size = None


def get_model(model_size: str = "base"):
    global _model, _model_size
    if _model is None or _model_size != model_size:
        _model = whisper.load_model(model_size)
        _model_size = model_size
    return _model


def transcribe(audio_path: str, model_size: str = "base") -> dict:
    """
    Transcrit un fichier audio (ou vidéo) avec Whisper.

    Returns:
        {
            "language": "fr",
            "text": "texte complet",
            "durationSec": 642.3,
            "segments": [
                {"id": 0, "start": 0.0, "end": 4.2, "text": "...", "confidence": 0.94}
            ]
        }
    """
    model = get_model(model_size)
    result = model.transcribe(audio_path, verbose=False)

    segments = []
    for seg in result["segments"]:
        # Whisper renvoie "avg_logprob" (log-probabilité) ; on le convertit en une
        # pseudo-confiance entre 0 et 1, plus lisible pour le JSON final.
        confidence = round(min(1.0, max(0.0, 1 + seg.get("avg_logprob", 0))), 2)
        segments.append({
            "id": seg["id"],
            "start": round(seg["start"], 2),
            "end": round(seg["end"], 2),
            "text": seg["text"].strip(),
            "confidence": confidence,
        })

    duration = round(segments[-1]["end"], 2) if segments else 0.0

    return {
        "language": result.get("language", "unknown"),
        "text": result["text"].strip(),
        "durationSec": duration,
        "segments": segments,
    }
