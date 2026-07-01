"""
Chapitrage thématique (point 5) via Ollama (LLM local).
Le LLM regroupe les segments horodatés en chapitres cohérents, génère un titre
court ET un mini-résumé par chapitre, en une seule passe. On travaille sur les IDs
de segments (plus fiable que de faire réinventer les timestamps au LLM), puis on
reconstruit les temps réels à partir des segments d'origine.
Conforme au schéma commun : [{title, start, end, summary}].
"""
import json
import re
import ollama

OLLAMA_MODEL = "llama3.2"

CHAPTERS_PROMPT = """Tu es un assistant qui structure des transcriptions de vidéos en chapitres thématiques.
Voici les segments horodatés de la vidéo, numérotés par leur identifiant :

{segments}

Regroupe ces segments en 3 à 8 chapitres thématiques cohérents.
Contraintes :
- Les chapitres sont consécutifs et couvrent tous les segments, dans l'ordre.
- Chaque segment appartient à un seul chapitre.
- Donne à chaque chapitre un titre court (3 à 6 mots) et un résumé d'une phrase.

Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après, au format :
{{
  "chapters": [
    {{"title": "Titre du chapitre", "summary": "Résumé en une phrase.", "startId": 0, "endId": 2}}
  ]
}}
"""


def _extract_json(raw_text: str) -> dict:
    """Extrait le premier objet JSON valide trouvé dans la réponse du LLM."""
    match = re.search(r"\{.*\}", raw_text, re.DOTALL)
    if not match:
        raise ValueError(f"Aucun JSON trouvé dans la réponse du LLM: {raw_text}")
    return json.loads(match.group(0))


def _format_segments(segments: list[dict]) -> str:
    """Prépare la liste numérotée envoyée au LLM."""
    return "\n".join(
        f"[{seg['id']}] ({seg['start']}s - {seg['end']}s) {seg['text']}" for seg in segments
    )


def _build_chapters(raw_chapters: list[dict], segments: list[dict]) -> list[dict]:
    """Reconstruit les temps réels à partir des IDs renvoyés par le LLM."""
    by_id = {seg["id"]: seg for seg in segments}
    min_id, max_id = min(by_id), max(by_id)

    chapters = []
    for ch in raw_chapters:
        try:
            start_id = int(ch["startId"])
            end_id = int(ch["endId"])
        except (KeyError, ValueError, TypeError):
            continue
        # Borne les IDs dans la plage réelle des segments (anti-hallucination).
        start_id = max(min_id, min(start_id, max_id))
        end_id = max(min_id, min(end_id, max_id))
        if end_id < start_id:
            start_id, end_id = end_id, start_id
        if start_id not in by_id or end_id not in by_id:
            continue
        chapters.append({
            "title": str(ch.get("title", "")).strip() or "Sans titre",
            "start": by_id[start_id]["start"],
            "end": by_id[end_id]["end"],
            "summary": str(ch.get("summary", "")).strip(),
        })
    return chapters


def generate_chapters(segments: list[dict]) -> list[dict]:
    """
    Découpe la transcription en chapitres thématiques titrés et résumés.

    Args:
        segments: segments horodatés issus de transcribe.py

    Returns:
        [{"title": "Introduction", "start": 0.0, "end": 58.0,
          "summary": "Contexte et objectifs."}, ...]
        Retourne une liste vide si aucun segment ; un chapitre unique en secours.
    """
    if not segments:
        return []

    prompt = CHAPTERS_PROMPT.format(segments=_format_segments(segments))
    response = ollama.generate(model=OLLAMA_MODEL, prompt=prompt)

    try:
        data = _extract_json(response["response"])
        chapters = _build_chapters(data.get("chapters", []), segments)
        if chapters:
            return chapters
    except (ValueError, json.JSONDecodeError):
        pass

    # Fallback : un seul chapitre couvrant toute la vidéo.
    return [{
        "title": "Vidéo complète",
        "start": segments[0]["start"],
        "end": segments[-1]["end"],
        "summary": "",
    }]
