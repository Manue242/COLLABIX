# Pipeline d'Indexation Vidéo

Hackathon 42c × ESTIAM 2026

Pipeline vidéo complet : extraction audio (ffmpeg), transcription (Whisper),
traduction multilingue, résumé, chapitres thématiques, mots-clés, topics et
**recherche vectorielle** (indexation sémantique).
Sortie au **format JSON commun**. 100% local, aucune clé API requise.

## Fonctionnalités (points 1 à 7 + recherche vectorielle)

| # | Étape | Techno | Module |
|---|-------|--------|--------|
| 1 | Extraction audio (mono 16 kHz) | ffmpeg | `pipeline/audio.py` |
| 2 | Transcription + timestamps + langue | Whisper | `pipeline/transcribe.py` |
| 3 | Traduction multilingue (langue cible) | Ollama | `pipeline/translate.py` |
| 4 | Résumé court + détaillé + bullets | Ollama | `pipeline/summarize.py` |
| 5 | Chapitres thématiques titrés + résumés | Ollama | `pipeline/chapters.py` |
| 6 | Mots-clés + topics | KeyBERT | `pipeline/keywords.py` |
| 7 | Assemblage du JSON commun | FastAPI | `main.py` |
| 8 | Recherche vectorielle (indexation sémantique) | ChromaDB + sentence-transformers | `pipeline/vectorstore.py` |

## Prérequis

1. **Python 3.10+**
2. **ffmpeg** (extraction audio) — https://ffmpeg.org
3. **Ollama** installé et lancé en local : https://ollama.com
   ```bash
   ollama pull llama3.2
   ```

## Installation

```bash
python -m venv venv
source venv/Scripts/activate   # Git Bash / Windows
# (Linux/macOS : source venv/bin/activate)
pip install -r requirements.txt
```

## Lancer l'API

```bash
uvicorn main:app --reload --port 8080
```

- API : http://localhost:8080
- Documentation interactive (Swagger) : http://localhost:8080/docs

> Le port 8000 est parfois réservé par Windows ; on utilise 8080.

## Utilisation

```bash
curl -X POST "http://localhost:8080/process?target_lang=en" \
  -F "file=@ma_video.mp4"
```

### Paramètres

| Paramètre | Défaut | Description |
|-----------|--------|-------------|
| `target_lang` | `en` | Langue cible de traduction |
| `model_size` | `base` | Modèle Whisper (`tiny`/`base`/`small`/...) |
| `skip_translation` | `false` | Désactive la traduction |
| `skip_summary` | `false` | Désactive le résumé |
| `skip_chapters` | `false` | Désactive le chapitrage |

### Format de sortie (JSON commun)

```jsonc
{
  "video": {
    "id": "a1b2c3d4",
    "filename": "reunion-securite.mp4",
    "durationSec": 642.3,
    "language": "fr",
    "processedAt": "2026-06-30T12:00:00Z"
  },
  "transcript": {
    "language": "fr",
    "text": "Texte intégral...",
    "segments": [
      { "id": 0, "start": 0.0, "end": 4.2, "text": "Bonjour à tous...", "confidence": 0.94 }
    ]
  },
  "translation": {
    "targetLanguage": "en",
    "text": "Full translated text...",
    "segments": [
      { "id": 0, "start": 0.0, "end": 4.2, "text": "Hello everyone..." }
    ]
  },
  "summary": {
    "short": "Réunion sur la politique de sécurité interne.",
    "detailed": "Résumé détaillé en un paragraphe.",
    "bullets": ["Politique de mots de passe renforcée", "Chiffrement des flux vidéo"]
  },
  "chapters": [
    { "title": "Introduction", "start": 0.0, "end": 58.0, "summary": "Contexte et objectifs." }
  ],
  "keywords": [
    { "term": "sécurité", "score": 0.82 },
    { "term": "chiffrement", "score": 0.71 }
  ],
  "topics": ["sécurité", "chiffrement"]
}
```

> `summary.detailed` est un champ en plus (sur-ensemble) ; tous les champs requis
> par le schéma de base sont présents.

## Structure du projet

```
.
├── main.py                  # API FastAPI — assemblage du JSON commun
├── requirements.txt
├── Dockerfile               # image de l'API (ffmpeg + deps)
├── docker-compose.yml       # API + Ollama (déploiement staging)
└── pipeline/
    ├── audio.py             # ffmpeg : extraction audio (mono 16 kHz)
    ├── transcribe.py        # Whisper : transcription + timestamps + langue
    ├── translate.py         # Ollama : traduction segment par segment
    ├── summarize.py         # Ollama : résumé court + détaillé + bullets
    ├── chapters.py          # Ollama : chapitres thématiques titrés + résumés
    ├── keywords.py          # KeyBERT : mots-clés + topics
    └── vectorstore.py       # ChromaDB : indexation + recherche sémantique
```

## Recherche vectorielle (indexation sémantique)

Chaque vidéo traitée par `/process` voit ses segments **indexés automatiquement**
dans une base ChromaDB persistante (`chroma_db/`). On peut ensuite interroger tout
le corpus en langage naturel :

```bash
curl -X POST "http://localhost:8080/search" \
  -H "Content-Type: application/json" \
  -d '{ "query": "chiffrement des données", "top_k": 5 }'
```

Réponse — les passages les plus proches, avec vidéo et timestamps :

```jsonc
{
  "query": "chiffrement des données",
  "results": [
    { "videoId": "a1b2c3d4", "filename": "reunion.mp4",
      "segmentId": 1, "start": 4.0, "end": 8.0,
      "text": "Le chiffrement des flux vidéo est essentiel.", "score": 0.78 }
  ]
}
```

| Champ requête | Type | Défaut | Description |
|---------------|------|--------|-------------|
| `query` | string | *(requis)* | Requête en langage naturel |
| `top_k` | int | `5` | Nombre de résultats |
| `video_id` | string? | `null` | Limiter à une vidéo (optionnel) |

> Modèle d'embedding : `paraphrase-multilingual-MiniLM-L12-v2` (bonne pertinence FR,
> téléchargé une fois ~420 Mo). Modifiable dans `pipeline/vectorstore.py`.

## Consommation de l'API par un front (React)

L'API est pensée pour être appelée depuis un front. Le **CORS est activé** côté
serveur, donc un front React peut appeler l'API directement depuis le navigateur.

### Base URL

- **Staging (à utiliser par le front)** : `https://bath-broom-glamorous.ngrok-free.dev`
- Dev local : `http://localhost:8080`

```js
const API_URL =
  import.meta.env.VITE_API_URL || "https://bath-broom-glamorous.ngrok-free.dev";
```

> **⚠️ URL ngrok gratuite** : si l'API est exposée via un domaine `*.ngrok-free.dev`,
> chaque requête DOIT inclure le header `ngrok-skip-browser-warning: true`, sinon
> ngrok renvoie une page HTML d'avertissement au lieu du JSON. (Inutile en local ou
> sur un vrai domaine.)

### Endpoints

| Méthode | Route | Corps | Réponse |
|---------|-------|-------|---------|
| `GET` | `/health` | — | `{ "status": "ok" }` |
| `POST` | `/process` | `multipart/form-data` (champ `file`) + query `target_lang`, `model_size`, `skip_*` | JSON commun complet |
| `POST` | `/search` | `application/json` `{ query, top_k, video_id? }` | `{ query, results[] }` |

### Exemple — envoyer une vidéo (`POST /process`)

```jsx
async function processVideo(file, targetLang = "en") {
  const formData = new FormData();
  formData.append("file", file); // <input type="file"> -> file

  const res = await fetch(`${API_URL}/process?target_lang=${targetLang}`, {
    method: "POST",
    headers: { "ngrok-skip-browser-warning": "true" }, // requis si URL ngrok gratuite
    body: formData, // NE PAS fixer Content-Type : le navigateur le gère
  });
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  return res.json(); // { video, transcript, translation, summary, chapters, keywords, topics }
}
```

> ⚠️ `/process` est **long** (transcription + appels LLM = plusieurs minutes).
> Prévoir côté front : un **loader**, et un timeout **généreux** (voir `AbortController`
> avec une durée élevée, ou pas de timeout). Ne pas relancer la requête en boucle.

### Exemple — recherche sémantique (`POST /search`)

```jsx
async function search(query, topK = 5) {
  const res = await fetch(`${API_URL}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true", // requis si URL ngrok gratuite
    },
    body: JSON.stringify({ query, top_k: topK }),
  });
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  return res.json(); // { query, results: [{ videoId, filename, start, end, text, score }] }
}
```

### Bon à savoir pour le front

- Les champs `translation`, `summary`, `chapters` valent `null` si les `skip_*`
  correspondants sont activés — prévoir des gardes (`data.translation?.text`).
- `search` ne renvoie des résultats que pour les vidéos **déjà traitées** via `/process`.
- Les `segments` (transcript/translation) portent `start`/`end` en secondes :
  pratique pour synchroniser une lecture vidéo ou faire des liens « aller à 1:23 ».
- Schéma complet de la réponse : voir la section **Format de sortie** ci-dessus.


- Tester sur des vidéos courtes (< 2 min) pour calibrer les temps.
- Pour une meilleure qualité de traduction, essayer `ollama pull mistral` puis
  changer `OLLAMA_MODEL` dans les modules concernés.
