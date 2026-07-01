# Fonctionnalités — Pipeline d'indexation sémantique

## Vue d'ensemble

| # | Fonctionnalité | Statut | Module | Techno |
|---|---------------|:------:|--------|--------|
| 1 | Extraction audio | ✅ | `pipeline/audio.py` | FFmpeg |
| 2 | Transcription + timestamps + langue | ✅ | `pipeline/transcribe.py` | Whisper |
| 3 | Traduction multilingue | ✅ | `pipeline/translate.py` | Ollama (llama3.2) |
| 4 | Résumé (court + détaillé + bullets) | ✅ | `pipeline/summarize.py` | Ollama |
| 5 | Chapitres thématiques titrés | ✅ | `pipeline/chapters.py` | Ollama |
| 6 | Mots-clés + topics | ✅ | `pipeline/keywords.py` | KeyBERT |
| 7 | Assemblage JSON commun | ✅ | `main.py` | FastAPI |
| 8 | Indexation vectorielle + recherche | ✅ | `pipeline/vectorstore.py` | ChromaDB + sentence-transformers |

---

## Détail par fonctionnalité

### 1. Extraction audio — `pipeline/audio.py`

Convertit n'importe quelle vidéo en fichier audio mono 16 kHz via FFmpeg.

- Entrée : fichier vidéo (mp4, webm, mov…)
- Sortie : fichier `.wav` temporaire (supprimé après traitement)
- Format cible : mono, 16 kHz — optimisé pour Whisper

---

### 2. Transcription — `pipeline/transcribe.py`

Transcrit l'audio et produit des segments horodatés.

- Modèle : Whisper (`tiny` / `base` / `small` — configurable via `model_size`)
- Détecte automatiquement la langue de la vidéo
- Produit des segments avec `start`, `end`, `text`, `confidence`

**Sortie :**
```json
{
  "language": "fr",
  "text": "Texte intégral de la transcription...",
  "durationSec": 142.5,
  "segments": [
    { "id": 0, "start": 0.0, "end": 4.2, "text": "Bonjour à tous.", "confidence": 0.94 }
  ]
}
```

---

### 3. Traduction — `pipeline/translate.py`

Traduit chaque segment dans la langue cible.

- LLM : Ollama (llama3.2) — local, pas de clé API
- Traduit segment par segment pour conserver les timestamps
- Désactivable via `skip_translation=true`

**Sortie :**
```json
{
  "targetLanguage": "en",
  "text": "Full translated text...",
  "segments": [
    { "id": 0, "start": 0.0, "end": 4.2, "text": "Hello everyone." }
  ]
}
```

---

### 4. Résumé — `pipeline/summarize.py`

Génère 3 niveaux de résumé à partir de la transcription complète.

- LLM : Ollama (llama3.2)
- Désactivable via `skip_summary=true`

**Sortie :**
```json
{
  "short": "Une phrase résumant la vidéo.",
  "detailed": "Un paragraphe détaillé.",
  "bullets": ["Point clé 1", "Point clé 2", "Point clé 3"]
}
```

---

### 5. Chapitres — `pipeline/chapters.py`

Découpe la vidéo en chapitres thématiques avec titre et résumé.

- LLM : Ollama (llama3.2)
- Utilise les segments horodatés pour borner chaque chapitre
- Désactivable via `skip_chapters=true`

**Sortie :**
```json
[
  { "title": "Introduction", "start": 0.0, "end": 58.0, "summary": "Contexte et objectifs." },
  { "title": "Démonstration", "start": 58.0, "end": 142.5, "summary": "Mise en pratique." }
]
```

---

### 6. Mots-clés + topics — `pipeline/keywords.py`

Extrait les termes les plus significatifs de la transcription.

- Librairie : KeyBERT (embedding + similarité cosinus)
- Modèle : `paraphrase-multilingual-MiniLM-L12-v2` — multilingue, FR/EN natif
- `topics` = mots-clés filtrés à score élevé (liste plate pour tagging)

**Sortie :**
```json
{
  "keywords": [
    { "term": "chiffrement", "score": 0.82 },
    { "term": "sécurité", "score": 0.71 }
  ],
  "topics": ["chiffrement", "sécurité"]
}
```

---

### 7. JSON commun — `main.py`

Assemble toutes les étapes en un seul objet JSON renvoyé par `POST /process`.

**Structure complète :**
```json
{
  "video":       { "id", "filename", "durationSec", "language", "processedAt" },
  "transcript":  { "language", "text", "segments" },
  "translation": { "targetLanguage", "text", "segments" },
  "summary":     { "short", "detailed", "bullets" },
  "chapters":    [ { "title", "start", "end", "summary" } ],
  "keywords":    [ { "term", "score" } ],
  "topics":      [ "string" ]
}
```

> `translation`, `summary`, `chapters` valent `null` si les `skip_*` correspondants sont activés.

---

### 8. Recherche vectorielle — `pipeline/vectorstore.py`

Index sémantique de tous les segments traités, interrogeable en langage naturel.

- Base vectorielle : ChromaDB (persistée dans `chroma_db/` via volume Docker)
- Modèle d'embedding : `paraphrase-multilingual-MiniLM-L12-v2` (~420 MB, téléchargé une fois)
- Chaque segment de transcript est vectorisé et indexé à la fin de `/process`
- Endpoint : `POST /search` — retourne les `top_k` passages les plus proches

**Requête :**
```json
{ "query": "chiffrement des données", "top_k": 5, "video_id": null }
```

**Réponse :**
```json
{
  "query": "chiffrement des données",
  "results": [
    {
      "videoId": "a1b2c3d4",
      "filename": "reunion.mp4",
      "segmentId": 1,
      "start": 4.0,
      "end": 8.0,
      "text": "Le chiffrement des flux vidéo est essentiel.",
      "score": 0.78
    }
  ]
}
```

---

## Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/health` | Santé de l'API |
| `POST` | `/process` | Pipeline complet (audio → JSON commun + indexation) |
| `POST` | `/search` | Recherche sémantique sur le corpus indexé |

---

## Intégration dans le projet

L'`ai-api` est inclus dans le `docker-compose.yml` racine :

```
docker-compose up --build
```

Le frontend accède aux endpoints via le proxy Vite :
- `POST /process` → `http://ai-api:8080/process`
- `POST /search`  → `http://ai-api:8080/search`

Staging exposé via ngrok : voir `README.md` pour l'URL courante et les exemples React.
