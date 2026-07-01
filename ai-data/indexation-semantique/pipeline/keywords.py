"""
Mots-clés (point 6) avec KeyBERT (NLP classique, pas de LLM) + dérivation des topics.
Filtre les mots vides (stopwords) français et anglais pour des mots-clés pertinents.
"""
from keybert import KeyBERT

# Stopwords français courants qui polluent sinon les mots-clés extraits.
_FRENCH_STOPWORDS = [
    "au", "aux", "avec", "ce", "ces", "cet", "cette", "dans", "de", "des", "du",
    "elle", "elles", "en", "et", "eux", "il", "ils", "je", "j", "la", "le", "les",
    "leur", "leurs", "lui", "ma", "mais", "me", "même", "mes", "moi", "mon", "ne",
    "nos", "notre", "nous", "on", "ou", "où", "par", "pas", "pour", "qu", "que",
    "qui", "quoi", "sa", "se", "ses", "son", "sur", "ta", "te", "tes", "toi", "ton",
    "tu", "un", "une", "vos", "votre", "vous", "c", "d", "l", "m", "n", "s", "t", "y",
    "été", "être", "avoir", "avait", "avais", "avant", "après", "alors", "aussi",
    "car", "comme", "comment", "donc", "est", "sont", "suis", "es", "sommes", "êtes",
    "a", "as", "ai", "ont", "avons", "avez", "fait", "faire", "cela", "ça", "ceci",
    "deux", "trois", "très", "plus", "moins", "bien", "tout", "tous", "toute",
    "toutes", "quel", "quelle", "quels", "quelles", "si", "non", "oui",
    "ici", "là", "dont", "entre", "peu", "beaucoup", "chez", "sans", "sous", "vers",
]

# Combiné avec des stopwords anglais courants (vidéos EN ou mélange de langues).
_STOPWORDS = _FRENCH_STOPWORDS + ["the", "and", "of", "to", "in", "is", "for", "on",
                                  "with", "as", "at", "by", "an", "be", "this", "that"]

_kw_model = None


def get_model():
    global _kw_model
    if _kw_model is None:
        _kw_model = KeyBERT()
    return _kw_model


def extract_keywords(text: str, top_n: int = 8) -> list[dict]:
    """
    Extrait les mots-clés les plus pertinents d'un texte.

    Returns:
        [{"term": "sécurité", "score": 0.82}, ...]
    """
    if not text or not text.strip():
        return []
    model = get_model()
    results = model.extract_keywords(
        text,
        keyphrase_ngram_range=(1, 2),
        stop_words=_STOPWORDS,   # filtre les mots vides FR + EN
        top_n=top_n,
    )
    return [{"term": term, "score": round(score, 2)} for term, score in results]


def derive_topics(keywords: list[dict], top_n: int = 5) -> list[str]:
    """
    Dérive une liste de thèmes (topics) à partir des mots-clés extraits.
    On privilégie les termes mono-mot ; si les mots-clés sont surtout des
    bigrammes, on retombe sur les mots significatifs qui les composent.
    Conforme au schéma commun : ["sécurité", "infrastructure"].
    """
    topics = []
    seen = set()

    def _add(word: str):
        key = word.lower()
        if key and key not in seen and key not in _STOPWORDS:
            seen.add(key)
            topics.append(word)

    # 1) Termes mono-mot en priorité.
    for kw in keywords:
        term = kw["term"].strip()
        if " " not in term:
            _add(term)
        if len(topics) >= top_n:
            return topics

    # 2) Fallback : mots significatifs issus des bigrammes.
    for kw in keywords:
        for word in kw["term"].split():
            _add(word)
            if len(topics) >= top_n:
                return topics

    return topics
