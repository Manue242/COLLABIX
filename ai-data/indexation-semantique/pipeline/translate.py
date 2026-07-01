"""
Traduction multilingue (point 3) via Ollama (LLM local).
La langue source est détectée automatiquement en amont par Whisper
(transcript.language). On traduit ici segment par segment vers une langue cible,
en conservant les timestamps, puis on nettoie les préambules parasites du LLM.
"""
import re
import ollama

OLLAMA_MODEL = "llama3.2"  # adapter selon le modèle installé localement (ex: "mistral")

# Le LLM ne comprend pas les codes ISO ("en") comme des langues : on les convertit
# en nom complet ("anglais") pour une traduction fiable.
_LANG_NAMES = {
    "en": "anglais", "fr": "français", "es": "espagnol", "de": "allemand",
    "it": "italien", "pt": "portugais", "nl": "néerlandais", "ru": "russe",
    "zh": "chinois", "ja": "japonais", "ko": "coréen", "ar": "arabe",
    "pl": "polonais", "tr": "turc", "sv": "suédois", "hi": "hindi",
}


def _lang_name(target_lang: str) -> str:
    """Renvoie le nom complet de la langue (ex: 'en' -> 'anglais')."""
    return _LANG_NAMES.get(target_lang.strip().lower(), target_lang)

# Préambules parasites fréquemment ajoutés par les LLM avant la vraie traduction.
_PREAMBLE_PATTERNS = [
    r"^\s*voici\s+la\s+traduction\s*[:\-]?\s*",
    r"^\s*voici\s+le\s+texte\s+traduit\s*[:\-]?\s*",
    r"^\s*here\s+is\s+the\s+translation\s*[:\-]?\s*",
    r"^\s*here'?s\s+the\s+translation\s*[:\-]?\s*",
    r"^\s*translation\s*[:\-]\s*",
    r"^\s*traduction\s*[:\-]\s*",
    r"^\s*sure[,!]?\s+here\s+.*?[:\-]\s*",
]


def _clean_translation(text: str) -> str:
    """Retire les préambules parasites et les guillemets englobants."""
    cleaned = text.strip()
    for pattern in _PREAMBLE_PATTERNS:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip()
    if len(cleaned) >= 2 and cleaned[0] in "\"'«" and cleaned[-1] in "\"'»":
        cleaned = cleaned[1:-1].strip()
    return cleaned


def _translate_one(text: str, target_lang: str) -> str:
    """Traduit un segment court via Ollama, puis nettoie la sortie."""
    target_name = _lang_name(target_lang)
    prompt = (
        f"Tu es un traducteur professionnel. Traduis intégralement en {target_name} "
        "le texte ci-dessous, même s'il est très court. Ne résume pas, n'ajoute rien, "
        "aucun commentaire ni préambule, aucune explication : réponds UNIQUEMENT "
        f"avec la traduction en {target_name}.\n\n"
        f"Texte : {text}"
    )
    response = ollama.generate(model=OLLAMA_MODEL, prompt=prompt)
    return _clean_translation(response["response"])


def translate_segments(segments: list[dict], target_lang: str = "en") -> dict:
    """
    Traduit chaque segment vers la langue cible en conservant les timestamps.
    Conforme au schéma commun : { targetLanguage, text, segments }.

    Args:
        segments: segments horodatés [{id, start, end, text, ...}]
        target_lang: langue cible (ex: "en")

    Returns:
        {
            "targetLanguage": "en",
            "text": "texte complet traduit",
            "segments": [{"id": 0, "start": 0.0, "end": 4.2, "text": "..."}]
        }
    """
    translated_segments = []
    full_text_parts = []
    for seg in segments:
        translated_text = _translate_one(seg["text"], target_lang)
        translated_segments.append({
            "id": seg["id"],
            "start": seg["start"],
            "end": seg["end"],
            "text": translated_text,
        })
        full_text_parts.append(translated_text)

    return {
        "targetLanguage": target_lang,
        "text": " ".join(full_text_parts),
        "segments": translated_segments,
    }
