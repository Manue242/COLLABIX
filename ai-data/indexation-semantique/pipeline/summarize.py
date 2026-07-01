"""
Génération de résumés via Ollama (LLM local).
Produit un résumé court + une liste de points clés (bullets), en JSON strict.
"""
import json
import re
import ollama

OLLAMA_MODEL = "llama3.2"

SUMMARY_PROMPT = """Tu es un assistant qui résume des transcriptions de vidéos professionnelles.
Voici la transcription complète d'une vidéo :

---
{transcript}
---

Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après, au format suivant :
{{
  "short": "Résumé en 1 à 2 phrases maximum",
  "detailed": "Résumé détaillé en un paragraphe (4 à 6 phrases)",
  "bullets": ["point clé 1", "point clé 2", "point clé 3"]
}}
"""


def _extract_json(raw_text: str) -> dict:
    """Extrait le premier objet JSON valide trouvé dans la réponse du LLM."""
    match = re.search(r"\{.*\}", raw_text, re.DOTALL)
    if not match:
        raise ValueError(f"Aucun JSON trouvé dans la réponse du LLM: {raw_text}")
    return json.loads(match.group(0))


def summarize(transcript_text: str) -> dict:
    """
    Génère un résumé court + détaillé + des bullet points à partir du texte
    complet de la transcription.

    Returns:
        {"short": "...", "detailed": "...", "bullets": ["...", "..."]}
    """
    prompt = SUMMARY_PROMPT.format(transcript=transcript_text)
    response = ollama.generate(model=OLLAMA_MODEL, prompt=prompt)

    try:
        data = _extract_json(response["response"])
        return {
            "short": data.get("short", "").strip(),
            "detailed": data.get("detailed", "").strip(),
            "bullets": data.get("bullets", []),
        }
    except (ValueError, json.JSONDecodeError):
        # Fallback robuste : si le LLM ne renvoie pas un JSON propre,
        # on évite de planter le pipeline pendant la démo.
        return {
            "short": response["response"].strip()[:200],
            "detailed": "",
            "bullets": [],
        }
