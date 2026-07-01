# TASKS — COLLABIX

---

## Backend — Statut complet

### Auth

- [x] `POST /auth/register` ✅
- [x] `POST /auth/login` ✅
- [x] `GET /auth/me` ✅
- [x] `POST /auth/password` ✅

### Docker / Infrastructure

- [x] `docker-compose up --build` ✅ — lance db + backend + frontend + IA en un seul commande
- [x] Healthcheck backend ✅ — frontend attend que l'API soit prête avant de démarrer
- [x] Proxy Vite configuré pour Docker ✅ — `VITE_BACKEND_URL=http://backend:8000` (fallback `localhost:8000` en local)
- [x] Routes proxiées backend ✅ — `/api`, `/auth`, `/videos`, `/hls`, `/ws`
- [x] Routes proxiées IA ✅ — `/process`, `/search` → `ai-api:8080` via `VITE_AI_URL`
- [x] CORS ouvert ✅ — `allow_origins=["*"]` (sécurité gérée par l'équipe cyber)
- [x] Services IA intégrés ✅ — `ollama`, `ollama-init`, `ai-api` dans le docker-compose racine

### AI — Pipeline d'indexation sémantique (pôle 3)

- [x] Extraction audio mono 16 kHz (FFmpeg) ✅ — `pipeline/audio.py`
- [x] Transcription + timestamps + détection de langue (Whisper) ✅ — `pipeline/transcribe.py`
- [x] Traduction multilingue segment par segment (Ollama/llama3.2) ✅ — `pipeline/translate.py`
- [x] Résumé court + détaillé + bullets (Ollama) ✅ — `pipeline/summarize.py`
- [x] Chapitres thématiques titrés (Ollama) ✅ — `pipeline/chapters.py`
- [x] Mots-clés + topics (KeyBERT) ✅ — `pipeline/keywords.py`
- [x] JSON commun assemblé ✅ — `main.py` (`POST /process`)
- [x] Indexation vectorielle (ChromaDB + sentence-transformers) ✅ — `pipeline/vectorstore.py`
- [x] Recherche sémantique en langage naturel ✅ — `POST /search`
- [x] Dockerfile + docker-compose standalone ✅ — déploiement staging autonome

### CI / GitHub Actions

- [x] Workflow `.github/workflows/backend-ci.yml` ✅ — déclenché sur push/PR vers `develop` (dossier `backend/`)

### Tests — 56 passent

- [x] `tests/test_health.py` ✅ (1 test)
- [x] `tests/test_auth.py` ✅ (10 tests — register, login, me, change password)
- [x] `tests/test_annotations.py` ✅ (16 tests — CRUD, export, import, roundtrip, username, PATCH)
- [x] `tests/test_videos.py` ✅ (13 tests — upload, formats invalides, taille, liste, DELETE)
- [x] `tests/test_sessions.py` ✅ (7 tests — room vide, users injectés, tri)
- [x] `tests/test_hls.py` ✅ (9 tests — auth, clé manquante, bytes, rate limit, isolation users)

### Annotations

- [x] `POST /api/annotations` ✅
- [x] `GET /api/annotations?video_id=` ✅ — triée par timestamp, inclut `username`
- [x] `DELETE /api/annotations/{id}` ✅
- [x] `PATCH /api/annotations/{id}` ✅ — modifier contenu et/ou couleur (champs optionnels)
- [x] `GET /api/annotations/export?video_id=` ✅ — export JSON versionné
- [x] `POST /api/annotations/import` ✅ — réimport JSON

### Vidéos

- [x] `POST /api/videos/upload` ✅ — mp4, webm, ogg, quicktime — max 500MB
- [x] `GET /api/videos/` ✅ — liste des fichiers uploadés
- [x] `GET /videos/{filename}` ✅ — stream via StaticFiles
- [x] `DELETE /api/videos/{filename}` ✅ — suppression du serveur

### WebSocket

- [x] `WS /ws/{video_id}?user_id=` ✅ — broadcast temps réel par room
- [x] Messages typés avec Pydantic ✅ — validation `cursor`, `annotation_added`, `annotation_deleted`
- [x] Tracking des users connectés par room ✅ — nettoyage à la déconnexion

### Sessions

- [x] `GET /api/sessions/{video_id}/users` ✅ — liste triée des users connectés sur une vidéo

### HLS — Intégration cyber (Olivier + Nina)

- [x] Scripts PowerShell `generate-key.ps1` + `generate-hls.ps1` ✅ (Olivier)
- [x] Dossiers `media/hls/`, `media/secrets/`, `media/source/` gitignorés ✅
- [x] `GET /hls/{fichier}` ✅ — segments `.ts` et playlist `.m3u8` servis via StaticFiles
- [x] `GET /api/video/key` ✅ (Nina) — clé AES-128 protégée par JWT + rate limit 10 req/min

---

## Structure backend actuelle

```
backend/
├── main.py
├── database.py
├── dependencies.py          # get_current_user (JWT)
├── routers/
│   ├── health.py
│   ├── auth.py              # register, login, me, password
│   ├── annotations.py       # CRUD + export/import + PATCH
│   ├── videos.py            # upload, liste, DELETE, 500MB validation
│   ├── ws.py                # WebSocket + typage Pydantic + room_users
│   ├── sessions.py          # GET /api/sessions/{video_id}/users
│   └── hls.py               # GET /api/video/key (JWT + rate limit)
├── models/
│   ├── user.py
│   └── annotation.py
├── schemas/
│   ├── auth.py
│   ├── annotation.py        # Create, Update, Response, Export
│   └── ws.py                # CursorMessage, AnnotationAddedMessage, AnnotationDeletedMessage
├── services/
│   ├── auth.py
│   └── annotation.py        # CRUD + list_with_username + update
├── scripts/
│   ├── generate-key.ps1     # génère la clé AES-128 (16 octets)
│   └── generate-hls.ps1     # découpe + chiffre la vidéo en HLS via FFmpeg
├── media/                   # gitignorés — générés localement
│   ├── source/              # vidéo MP4 source
│   ├── hls/                 # playlist.m3u8 + segments .ts
│   └── secrets/             # video.key + key_info.txt
└── tests/
    ├── conftest.py
    ├── test_health.py
    ├── test_auth.py
    ├── test_annotations.py
    ├── test_videos.py
    ├── test_sessions.py
    └── test_hls.py
```

---

## Endpoints — Référence complète

| Méthode | Route | Auth | Description |
|---------|-------|:----:|-------------|
| `POST` | `/auth/register` | — | Créer un compte |
| `POST` | `/auth/login` | — | Connexion → JWT |
| `GET` | `/auth/me` | ✅ | Profil utilisateur connecté |
| `POST` | `/auth/password` | ✅ | Changer le mot de passe |
| `GET` | `/api/health` | — | Santé de l'API |
| `POST` | `/api/videos/upload` | — | Upload vidéo (max 500MB) |
| `GET` | `/api/videos/` | — | Liste des vidéos |
| `GET` | `/videos/{filename}` | — | Stream vidéo |
| `DELETE` | `/api/videos/{filename}` | — | Supprimer une vidéo |
| `POST` | `/api/annotations` | — | Créer une annotation |
| `GET` | `/api/annotations?video_id=` | — | Lister (triées, avec username) |
| `PATCH` | `/api/annotations/{id}` | — | Modifier contenu/couleur |
| `DELETE` | `/api/annotations/{id}` | — | Supprimer une annotation |
| `GET` | `/api/annotations/export?video_id=` | — | Export JSON |
| `POST` | `/api/annotations/import` | — | Import JSON |
| `GET` | `/api/sessions/{video_id}/users` | — | Users connectés sur une vidéo |
| `WS` | `/ws/{video_id}?user_id=` | — | Session collaborative |
| `GET` | `/hls/{fichier}` | — | Segments HLS chiffrés + playlist |
| `GET` | `/api/video/key` | ✅ | Clé AES-128 (rate limit 10/min) |

---

## Frontend — Statut complet ✅

### Auth

- [x] `POST /auth/register` → création de compte ✅ (`Register.jsx` → `AuthContext.register`)
- [x] `POST /auth/login` → JWT + `/auth/me` pour le profil ✅ (`AuthContext.login`)
- [x] Logout ✅ — efface le token et redirige vers `/login`
- [x] `ProtectedRoute` ✅ — redirige si pas de token
- [x] `authFetch` ✅ — header `Authorization` automatique sur toutes les requêtes

### Player vidéo

- [x] Player `<video>` natif ✅ (`VideoPlayer.jsx`)
- [x] Contrôles play/pause, seek, volume ✅
- [x] Timecode courant exposé aux annotations ✅
- [x] Fallback backend ✅ — si `id` n'est pas dans `mockVideos`, construit `{ src: /videos/{id} }` automatiquement

### Annotations

- [x] Chargement depuis `GET /api/annotations?video_id=` au montage ✅
- [x] Créer au timecode courant → `POST /api/annotations` ✅
- [x] Supprimer → `DELETE /api/annotations/{id}` ✅
- [x] Afficher en liste triée par timestamp ✅ (`CommentThread.jsx`)
- [x] Export JSON ✅ (`exportAnnotations.js` — format versionné aligné avec `/api/annotations/export`)

### Upload vidéo

- [x] Interface d'upload ✅ (`UploadVideo.jsx`)
- [x] `POST /api/videos/upload` — FormData ✅
- [x] Redirection vers `/app/player/{filename}` après upload ✅

### Outils de dessin (overlay canvas)

- [x] Canvas positionné par-dessus le player ✅ (`AnnotationCanvas.jsx`)
- [x] Outil trait libre ✅
- [x] Outil formes (rectangle, cercle) ✅
- [x] Outil flèche ✅
- [x] Outil texte ✅
- [x] Sélecteur de couleur ✅ (`ColorPicker.jsx`)
- [x] Suppression d'un dessin ✅
- [x] Sauvegarde dessin → `POST /api/annotations` (`type: "drawing"`) ✅

### Collaboration temps réel (WebSocket)

- [x] Connexion WS → `/ws/{video_id}?user_id={userId}` ✅ (`useWebSocket.js`)
- [x] Envoi curseur en temps réel ✅ (`type: "cursor"`)
- [x] Synchronisation annotations entre users ✅ — `annotation_added` / `annotation_deleted` alignés avec le backend
- [x] Curseurs des autres users affichés ✅

### Page IA (`/ai`)

- [x] Onglet "Traiter une vidéo" → `POST /process` (FormData + params) ✅
- [x] Affichage résumé, chapitres, mots-clés, transcription ✅
- [x] Sélecteur langue cible + modèle Whisper + skip options ✅
- [x] Onglet "Recherche sémantique" → `POST /search` ✅
- [x] Route `/ai` protégée dans `App.jsx` ✅

### Structure des fichiers frontend

```
frontend/src/
├── App.jsx                      # Routing — 7 routes protégées
├── auth.js                      # authFetch, login, getToken, logout
├── context/
│   ├── AuthContext.jsx           # register, login, logout, user state
│   └── ThemeContext.jsx
├── routes/
│   └── ProtectedRoute.jsx
├── components/
│   ├── Header.jsx
│   ├── VideoPlayer.jsx
│   ├── AnnotationCanvas.jsx      # canvas overlay — dessin, formes, texte
│   ├── CommentThread.jsx         # liste annotations + timecodes
│   ├── ColorPicker.jsx
│   ├── VideoCard.jsx / VideoRow.jsx
│   └── Skeleton.jsx
├── pages/
│   ├── Login.jsx / Register.jsx / ForgotPassword.jsx / Verify2FA.jsx
│   ├── Home.jsx / Catalogue.jsx
│   ├── PlayerPage.jsx            # player + WS + annotations + canvas
│   ├── UploadVideo.jsx           # upload → POST /api/videos/upload
│   └── AIPage.jsx                # traitement + recherche sémantique IA
├── hooks/
│   ├── useWebSocket.js           # WS auto-reconnect, send(message)
│   └── useFakeLoading.js
├── data/
│   └── mockVideos.js
└── utils/
    └── exportAnnotations.js      # format versionné aligné avec backend
