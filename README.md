# COLLABIX

Application de streaming collaborative, sécurisée et enrichie avec des fonctionnalités IA.

---

## Structure du projet

```
website/
├── backend/        # API FastAPI (Python)
├── frontend/       # App React + Vite
├── ai-data/        # Scripts & modèles IA
├── docs/           # Architecture & choix techniques
├── docker-compose.yml
└── .env.example
```

---

## Prérequis

- [Docker](https://www.docker.com/) + Docker Compose — **suffisant pour faire tourner l'app complète**
- Python 3.12+ et Node.js 22+ uniquement pour le développement local sans Docker

---

## Démarrage rapide (Docker)

Copier le fichier d'environnement :

```bash
cp .env.example .env
```

Lancer tous les services :

```bash
docker-compose up --build
```

| Service         | URL                        |
|-----------------|----------------------------|
| Frontend        | http://localhost:5173      |
| Backend         | http://localhost:8000      |
| API Docs        | http://localhost:8000/docs |
| Pipeline IA     | http://localhost:8080      |
| IA — Page `/ai` | http://localhost:5173/ai   |

---

## Backend — FastAPI

### Setup local

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
```

### Lancer le serveur

```bash
uvicorn main:app --reload
```

API disponible sur `http://localhost:8000`  
Documentation Swagger sur `http://localhost:8000/docs`

### Variables d'environnement

Copier `.env.example` en `.env` à la racine et remplir les valeurs.

### Stack

- **FastAPI** — framework API
- **Uvicorn** — serveur ASGI
- **Pydantic** — validation des données
- **SQLAlchemy (async)** — ORM
- **PostgreSQL** — base de données
- **asyncpg** — driver PostgreSQL async

### Endpoints

**Auth**

| Méthode | Route | Auth requise | Description |
|---------|-------|:---:|-------------|
| `POST` | `/auth/register` | — | Créer un compte |
| `POST` | `/auth/login` | — | Connexion → retourne JWT |
| `GET` | `/auth/me` | ✅ | Profil de l'utilisateur connecté |
| `POST` | `/auth/password` | ✅ | Changer le mot de passe |

**Vidéos**

| Méthode | Route | Auth requise | Description |
|---------|-------|:---:|-------------|
| `GET` | `/api/health` | — | Santé de l'API |
| `POST` | `/api/videos/upload` | — | Upload vidéo (mp4, webm, ogg) — max 500MB |
| `GET` | `/api/videos/` | — | Liste des vidéos disponibles |
| `GET` | `/videos/{filename}` | — | Stream d'une vidéo |
| `DELETE` | `/api/videos/{filename}` | — | Supprimer une vidéo du serveur |

**Annotations**

| Méthode | Route | Auth requise | Description |
|---------|-------|:---:|-------------|
| `POST` | `/api/annotations` | — | Créer une annotation |
| `GET` | `/api/annotations?video_id=` | — | Lister (triées par timestamp, avec username) |
| `PATCH` | `/api/annotations/{id}` | — | Modifier le contenu et/ou la couleur |
| `DELETE` | `/api/annotations/{id}` | — | Supprimer une annotation |
| `GET` | `/api/annotations/export?video_id=` | — | Exporter en JSON versionné |
| `POST` | `/api/annotations/import` | — | Réimporter un fichier JSON |

**Collaboration**

| Méthode | Route | Auth requise | Description |
|---------|-------|:---:|-------------|
| `WS` | `/ws/{video_id}?user_id=` | — | Session collaborative temps réel |
| `GET` | `/api/sessions/{video_id}/users` | — | Users connectés sur une vidéo |

**HLS — Vidéo chiffrée AES-128 (Zero-Trust)**

| Méthode | Route | Auth requise | Description |
|---------|-------|:---:|-------------|
| `GET` | `/hls/{fichier}` | — | Segments `.ts` + playlist `.m3u8` (chiffrés, publics — inutiles sans la clé) |
| `GET` | `/api/video/key-token` | ✅ session | Émet un token de clé de courte durée (60s, `scope=hls-key`) |
| `GET` | `/api/video/key` | ✅ token de clé | Clé AES-128 — refuse un token de session normal, rate limit 10 req/min |

> Les routes marquées ✅ nécessitent le header `Authorization: Bearer <token>`. `/api/video/key` exige spécifiquement un token émis par `/api/video/key-token` — un token de session seul est refusé (401). Détails : [`docs/threat-model.md`](docs/threat-model.md).

### Format messages WebSocket

```json
{ "type": "cursor",             "x": 0.42, "y": 0.18, "user_id": "..." }
{ "type": "annotation_added",   "annotation": { ... } }
{ "type": "annotation_deleted", "id": "uuid" }
```

> Messages invalides → le serveur retourne `{"type": "error", "detail": "Invalid WebSocket message format"}`

### Format réponse annotation (`GET /api/annotations?video_id=`)

```json
[
  {
    "id": "uuid",
    "video_id": "mon-film",
    "type": "comment",
    "content": "Ce plan dure trop longtemps",
    "timestamp": 42.5,
    "color": "#ff0000",
    "user_id": "uuid-user",
    "username": "alice",
    "created_at": "2026-07-01T10:00:00Z"
  }
]
```

### Format d'export JSON (`GET /api/annotations/export?video_id=`)

```json
{
  "version": "1.0",
  "video_id": "mon-film",
  "exported_at": "2026-07-01T10:00:00Z",
  "annotations": [
    {
      "id": "uuid",
      "type": "comment",
      "content": "Ce plan dure trop longtemps",
      "timestamp": 42.5,
      "color": "#ff0000",
      "user_id": "uuid-user"
    }
  ]
}
```

### Tests

**60 tests** — lancer via Docker (recommandé) :

```bash
docker-compose --profile test run --rm tests
```

| Fichier | Couverture |
|---------|-----------|
| `test_health.py` | Santé de l'API (1) |
| `test_auth.py` | Register, login, me, change password (10) |
| `test_annotations.py` | CRUD, export, import, username, PATCH (16) |
| `test_videos.py` | Upload, formats invalides, taille max, liste, DELETE (13) |
| `test_sessions.py` | Room vide, users injectés, tri alphabétique (7) |
| `test_hls.py` | Key-token, refus token de session, expiration, rate limit, isolation users (13) |

La DB `collabix_test` est créée automatiquement au premier `docker-compose up --build`. Les tables sont recréées et nettoyées à chaque run.

Vérifié en conditions réelles (Postgres via Docker) : `docker compose run --rm tests` → **60/60 passent**.

### HLS — Vidéo chiffrée AES-128 (Zero-Trust)

**Automatique via Docker (recommandé)** — le service `hls-init` (dans `docker-compose.yml`) génère la clé AES-128 et le flux HLS chiffré tout seul au démarrage :

```bash
docker-compose up --build
```

- Si `backend/media/source/demo-video.mp4` existe, le flux HLS complet est généré (clé, `key_info.txt`, playlist + segments chiffrés).
- Sinon, `hls-init` génère uniquement la clé et se termine proprement (le player retombe sur le MP4 en lecture directe) — **FFmpeg sur l'hôte n'est plus nécessaire**, tout tourne dans le conteneur `jrottenberg/ffmpeg`.

Le player (`AnnotatedReviewPlayer.jsx`) charge `hls.js`, récupère un token de clé de courte durée via `GET /api/video/key-token`, puis l'attache (via `xhrSetup`) à la requête de clé `/api/video/key` — repli silencieux sur le MP4 si le flux HLS n'est pas disponible.

**Génération manuelle (Windows, sans Docker)** — toujours possible si besoin :

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\backend\scripts\generate-key.ps1   # génère aussi key_info.txt
# Placer la vidéo source dans backend/media/source/demo-video.mp4
.\backend\scripts\generate-hls.ps1
```

Les fichiers générés (`playlist.m3u8`, segments `.ts`, `video.key`, `key_info.txt`) sont gitignorés et restent locaux.

> Doc technique : [`docs/cyber1-hls-encryption.md`](docs/cyber1-hls-encryption.md) — Modèle de menace : [`docs/threat-model.md`](docs/threat-model.md)

### Dev local (sans Docker)

Mettre à jour le `.env` avec `@localhost` à la place de `@db` :

```env
DATABASE_URL=postgresql+asyncpg://collabix:collabix@localhost:5432/collabix?ssl=false
```

---

## Frontend — React + Vite

Via Docker (recommandé) : inclus dans `docker-compose up --build`, accessible sur `http://localhost:5173`.

Dev local sans Docker :

```bash
cd frontend
npm install
npm run dev
```

### Stack

- **React 18** + **Vite 5** — UI et bundler
- **react-router-dom v6** — routing SPA
- **Canvas API natif** — outil de dessin overlay sur le player
- **hls.js** — lecture du flux HLS chiffré, avec `xhrSetup` pour le token de clé
- **WebSocket natif** — collaboration temps réel (hook `useWebSocket`) : annotations, commentaires et curseurs
- **JWT** stocké en `localStorage` — auth persistante

### Pages

| Route | Composant | Description |
|-------|-----------|-------------|
| `/login` | `Login.jsx` | Connexion → JWT |
| `/register` | `Register.jsx` | Création de compte → auto-login |
| `/app` | `Home.jsx` | Catalogue des vidéos (mock + uploadées) |
| `/catalogue` | `Catalogue.jsx` | Navigation par catégorie, inclut « Vos vidéos » |
| `/app/player/:id` | `PlayerPage.jsx` | Résout la source vidéo depuis l'URL, délègue à `AnnotatedReviewPlayer` |
| `/upload` | `UploadVideo.jsx` | Upload + déclenche l'indexation IA en arrière-plan |
| `/ai` | `AIPage.jsx` | Pipeline IA — traitement vidéo + recherche sémantique |

### Composants

| Fichier | Rôle |
|---------|------|
| `AnnotatedReviewPlayer.jsx` | **Composant réutilisable** — tout le lecteur de revue (player, dessin, timeline commentaires/annotations, curseurs collaboratifs, HLS). Props : `videoSrc`, `hlsSrc`, `user`, `sessionId`, `title`, `category`, `onBack` — aucune dépendance à react-router ni à un contexte d'auth précis |
| `Header.jsx` | Navigation, thème, déconnexion |
| `AnnotationCanvas.jsx` | Overlay canvas — dessin libre, formes, texte, couleurs, durée d'affichage par annotation |
| `CommentThread.jsx` | Timeline fusionnée commentaires + annotations, triée par position vidéo, saut au clic |
| `VideoCard.jsx` / `VideoRow.jsx` | Affichage catalogue |
| `ColorPicker.jsx` | Sélecteur couleur pour les annotations |

### Utilitaires

| Fichier | Rôle |
|---------|------|
| `utils/exportAnnotations.js` | Export/import JSON aligné sur le format backend |
| `utils/uploadedVideos.js` | Récupère `GET /api/videos/` et formate pour Home/Catalogue |

### Proxy Vite

| Préfixe | Cible |
|---------|-------|
| `/api`, `/auth`, `/videos`, `/hls`, `/ws` | Backend FastAPI (`http://localhost:8000` en local, `http://backend:8000` dans Docker) |
| `/process`, `/search` | Pipeline IA (`http://localhost:8080` en local, `http://ai-api:8080` dans Docker) |

### Variables d'environnement

| Variable | Défaut local | Description |
|----------|-------------|-------------|
| `VITE_BACKEND_URL` | `http://localhost:8000` | URL du backend (injectée par Docker) |
| `VITE_AI_URL` | `http://localhost:8080` | URL du pipeline IA (injectée par Docker) |

### Auth

- `AuthContext.jsx` — register, login, logout, état utilisateur global
- `ProtectedRoute.jsx` — redirige vers `/login` si le token est absent
- `auth.js` — `authFetch(path, options)` ajoute `Authorization: Bearer <token>` automatiquement

---

## AI / Data — Pipeline d'indexation sémantique

Pipeline complet de traitement vidéo : transcription, traduction, résumé, chapitrage, mots-clés et **recherche vectorielle sémantique**. 100% local, aucune clé API requise.

Via Docker (recommandé) : inclus dans `docker-compose up --build`, accessible sur `http://localhost:8080`.

> Premier démarrage long : `ollama-init` télécharge `llama3.2` (~2 GB) et `ai-api` télécharge Whisper + embeddings (~500 MB) au premier `/process`. Modèles mis en cache dans des volumes Docker.

### Fonctionnalités

| # | Étape | Techno |
|---|-------|--------|
| 1 | Extraction audio mono 16 kHz | FFmpeg |
| 2 | Transcription + timestamps + détection de langue | Whisper |
| 3 | Traduction multilingue segment par segment | Ollama (llama3.2) |
| 4 | Résumé court + détaillé + bullets | Ollama |
| 5 | Chapitres thématiques titrés | Ollama |
| 6 | Mots-clés + topics | KeyBERT |
| 7 | JSON commun assemblé | FastAPI |
| 8 | Indexation vectorielle + recherche sémantique | ChromaDB + sentence-transformers |

### Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/health` | Santé de l'API IA |
| `POST` | `/process` | Pipeline complet → JSON (transcript, résumé, chapitres…) |
| `POST` | `/search` | Recherche sémantique sur toutes les vidéos traitées |

Le front appelle `/process` et `/search` directement — le proxy Vite redirige vers `ai-api:8080`.

> Depuis `UploadVideo.jsx`, chaque upload déclenche automatiquement un `POST /process` en arrière-plan (`model_size=tiny`, `skip_translation=true` pour aller vite) — la vidéo devient cherchable via `/search` sans repasser par la page `/ai`.

### Paramètres de `/process`

| Paramètre | Défaut | Description |
|-----------|--------|-------------|
| `target_lang` | `en` | Langue cible de traduction |
| `model_size` | `base` | Modèle Whisper (`tiny` / `base` / `small`) |
| `skip_translation` | `false` | Désactive la traduction |
| `skip_summary` | `false` | Désactive le résumé |
| `skip_chapters` | `false` | Désactive le chapitrage |

> Pour la démo : `?model_size=tiny&skip_translation=true` accélère significativement le traitement.

### Dev local (sans Docker)

```bash
cd ai-data/indexation-semantique
python -m venv .venv
source .venv/bin/activate   # Mac/Linux
# .venv\Scripts\activate    # Windows
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
uvicorn main:app --reload --port 8080
```

Prérequis : **FFmpeg** + **Ollama** installé et lancé (`ollama pull llama3.2`).

> Doc complète : [`ai-data/indexation-semantique/README.md`](ai-data/indexation-semantique/README.md)

---

## Conventions Git

### Branches

Chaque pôle travaille sur son propre préfixe :

| Pôle | Format | Exemple |
|------|--------|---------|
| Dev (backend / frontend) | `dev/<feature>` | `dev/annotations-api` |
| Data / IA | `data/<feature>` | `data/video-analysis` |

### Créer une branche

```bash
# Dev
git checkout -b dev/ma-feature

# Data
git checkout -b data/ma-feature
```

### Règles

- On ne pousse **jamais directement sur `main`**
- Chaque feature = une branche + une PR
- Nommer la branche en **anglais**, en **kebab-case**

---

## Docs

- [`docs/architecture.md`](docs/architecture.md) — Architecture globale
- [`docs/choix-techniques.md`](docs/choix-techniques.md) — Choix techniques justifiés
- [`docs/demo.md`](docs/demo.md) — Scénario de démo
- [`docs/threat-model.md`](docs/threat-model.md) — Modèle de menace Zero-Trust (HLS)
- [`docs/cyber1-hls-encryption.md`](docs/cyber1-hls-encryption.md) — Détail technique HLS/AES-128
