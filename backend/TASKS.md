# TASKS — COLLABIX

---

## Backend — Statut complet

### Auth

- [x] `POST /auth/register` ✅
- [x] `POST /auth/login` ✅
- [x] `GET /auth/me` ✅
- [x] `POST /auth/password` ✅

### Docker / Infrastructure

- [x] `docker-compose up --build` ✅ — lance db + backend + frontend + IA + HLS en une seule commande
- [x] Healthcheck backend ✅ — frontend attend que l'API soit prête avant de démarrer
- [x] Proxy Vite configuré pour Docker ✅ — `VITE_BACKEND_URL=http://backend:8000` (fallback `localhost:8000` en local)
- [x] Routes proxiées backend ✅ — `/api`, `/auth`, `/videos`, `/hls`, `/ws`
- [x] Routes proxiées IA ✅ — `/process`, `/search` → `ai-api:8080` via `VITE_AI_URL`
- [x] CORS ouvert ✅ — `allow_origins=["*"]` (sécurité gérée par l'équipe cyber)
- [x] Services IA intégrés ✅ — `ollama`, `ollama-init`, `ai-api` dans le docker-compose racine
- [x] Service `hls-init` ✅ — génère la clé AES-128 + le flux HLS chiffré automatiquement (image `jrottenberg/ffmpeg`, tolère l'absence de vidéo source), plus besoin de FFmpeg sur l'hôte
- [x] Vérifié en conditions réelles ✅ — `db`, `backend`, `frontend`, `ollama` testés live via `docker compose up`, `hls-init` testé avec génération réelle d'un flux chiffré

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

### Tests — 60 passent (vérifié en direct via `docker compose run --rm tests`, Postgres réel)

- [x] `tests/test_health.py` ✅ (1 test)
- [x] `tests/test_auth.py` ✅ (10 tests — register, login, me, change password)
- [x] `tests/test_annotations.py` ✅ (16 tests — CRUD, export, import, roundtrip, username, PATCH)
- [x] `tests/test_videos.py` ✅ (13 tests — upload, formats invalides, taille, liste, DELETE)
- [x] `tests/test_sessions.py` ✅ (7 tests — room vide, users injectés, tri)
- [x] `tests/test_hls.py` ✅ (13 tests — key-token, refus token de session, expiration, clé manquante, bytes, rate limit, isolation users)

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

### HLS — Intégration cyber (Olivier + Nina) — Zero-Trust

- [x] Scripts PowerShell `generate-key.ps1` + `generate-hls.ps1` ✅ (Olivier) — `generate-key.ps1` génère aussi `key_info.txt` (manquant avant, `generate-hls.ps1` ne pouvait pas tourner sans)
- [x] Service Docker `hls-init` ✅ — équivalent conteneurisé des scripts PowerShell, génère clé + `key_info.txt` + flux HLS automatiquement, tolère l'absence de vidéo source
- [x] Dossiers `media/hls/`, `media/secrets/`, `media/source/` gitignorés ✅
- [x] `GET /hls/{fichier}` ✅ — segments `.ts` et playlist `.m3u8` servis via StaticFiles (publics — chiffrés, inutiles sans la clé)
- [x] `GET /api/video/key-token` ✅ — émet un token de courte durée (60s, `scope=hls-key`) contre un token de session valide
- [x] `GET /api/video/key` ✅ (Nina, durci) — exige désormais le token de clé (`get_key_token_user`), pas le token de session normal ; rate limit 10 req/min ; refus par défaut (401/403)
- [x] Preuve live testée ✅ — sans token → 403, token de session seul → 401, token de clé → 200
- [x] Modèle de menace documenté ✅ — [`docs/threat-model.md`](../docs/threat-model.md)

---

## Structure backend actuelle

```
backend/
├── main.py
├── database.py
├── dependencies.py          # get_current_user (JWT session) + get_key_token_user (JWT scope=hls-key)
├── routers/
│   ├── health.py
│   ├── auth.py              # register, login, me, password
│   ├── annotations.py       # CRUD + export/import + PATCH
│   ├── videos.py            # upload, liste, DELETE, 500MB validation
│   ├── ws.py                # WebSocket + typage Pydantic + room_users
│   ├── sessions.py          # GET /api/sessions/{video_id}/users
│   └── hls.py               # GET /api/video/key-token + GET /api/video/key (rate limit)
├── models/
│   ├── user.py
│   └── annotation.py
├── schemas/
│   ├── auth.py
│   ├── annotation.py        # Create, Update, Response, Export
│   └── ws.py                # CursorMessage, AnnotationAddedMessage, AnnotationDeletedMessage
├── services/
│   ├── auth.py               # create_token (session, 24h) + create_key_token (hls-key, 60s)
│   └── annotation.py        # CRUD + list_with_username + update
├── scripts/
│   ├── generate-key.ps1     # génère la clé AES-128 (16 octets) + key_info.txt
│   ├── generate-hls.ps1     # découpe + chiffre la vidéo en HLS via FFmpeg (Windows, manuel)
│   └── hls-init.sh          # équivalent conteneurisé — exécuté par le service docker-compose hls-init
├── media/                   # gitignorés — générés localement ou par hls-init
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
    └── test_hls.py           # inclut désormais la couverture du flux key-token
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
| `GET` | `/api/video/key-token` | ✅ session | Émet un token de clé de 60s (`scope=hls-key`) |
| `GET` | `/api/video/key` | ✅ token de clé | Clé AES-128 (rate limit 10/min) — refuse un token de session normal |

---

## Frontend — Statut complet ✅

### Auth

- [x] `POST /auth/register` → création de compte ✅ (`Register.jsx` → `AuthContext.register`)
- [x] `POST /auth/login` → JWT + `/auth/me` pour le profil ✅ (`AuthContext.login`)
- [x] Logout ✅ — efface le token et redirige vers `/login`
- [x] `ProtectedRoute` ✅ — redirige si pas de token
- [x] `authFetch` ✅ — header `Authorization` automatique sur toutes les requêtes

### Player vidéo — composant réutilisable `AnnotatedReviewPlayer.jsx`

- [x] Player `<video>` natif + `hls.js` pour le flux chiffré ✅ — repli automatique en MP4 si le HLS n'est pas disponible
- [x] Contrôles play/pause, seek, volume, plein écran ✅
- [x] Timecode courant exposé aux annotations ✅
- [x] Fallback backend ✅ — si `id` n'est pas dans `mockVideos`, `PlayerPage.jsx` construit `{ src: /videos/{id}, hlsSrc: /hls/playlist.m3u8 }` automatiquement
- [x] Extrait en composant autonome ✅ — props `videoSrc`, `hlsSrc`, `user`, `sessionId`, `title`, `category`, `onBack` ; aucune dépendance à react-router ni à un contexte d'auth précis (`PlayerPage.jsx` n'est plus qu'un wrapper de routage)

### Annotations & commentaires — timeline unifiée

- [x] Chargement depuis `GET /api/annotations?video_id=` au montage ✅ (corrige un bug où les données chargées de façon async n'apparaissaient jamais dans le fil, `CommentThread` étant maintenant un composant contrôlé)
- [x] Créer au timecode courant → `POST /api/annotations` ✅ — `user_id` attaché, username résolu et affiché
- [x] Supprimer → `DELETE /api/annotations/{id}` ✅
- [x] Timeline fusionnée triée par position vidéo ✅ (`CommentThread.jsx`) — annotations dessinées/texte et commentaires dans la même liste, chacun avec badge horodaté cliquable
- [x] Durée d'affichage configurable par annotation ✅ — sélecteur toolbar (2 à 15s), au lieu d'une constante globale fixe
- [x] Export JSON ✅ (`exportAnnotations.js` — format versionné aligné avec `/api/annotations/export`, `user_id` correctement propagé)

### Upload vidéo

- [x] Interface d'upload ✅ (`UploadVideo.jsx`)
- [x] `POST /api/videos/upload` — FormData ✅
- [x] Redirection vers `/app/player/{filename}` après upload ✅
- [x] Déclenche `POST /process` en arrière-plan ✅ — la vidéo devient indexée/cherchable sans repasser par `/ai`
- [x] Visible dans Home/Catalogue après upload ✅ (`utils/uploadedVideos.js`) — avant, une vidéo uploadée devenait inaccessible après la redirection initiale
- [x] Bouton « Uploader une vidéo » visible pour tout utilisateur connecté ✅ — l'ancien gate `user.role === 'admin'` ne pouvait jamais s'activer (le modèle `User` backend n'a pas de champ `role`)

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
- [x] Curseurs collaboratifs ✅ — position normalisée envoyée en continu (`type: "cursor"`), overlay coloré par utilisateur, expire après 3s d'inactivité
- [x] Synchronisation annotations entre users ✅ — `annotation_added` / `annotation_deleted` alignés avec le backend
- [x] Commentaires diffusés en direct ✅ — réutilise le même message `annotation_added` que les annotations (avant, seuls les dessins étaient synchronisés en temps réel)

### Page IA (`/ai`)

- [x] Onglet "Traiter une vidéo" → `POST /process` (FormData + params) ✅
- [x] Affichage résumé, chapitres, mots-clés, transcription ✅
- [x] Sélecteur langue cible + modèle Whisper + skip options ✅
- [x] Onglet "Recherche sémantique" → `POST /search` ✅
- [x] Route `/ai` protégée dans `App.jsx` ✅

### Structure des fichiers frontend

```
frontend/src/
├── App.jsx                      # Routing — routes publiques (auth) + protégées (app)
├── auth.js                      # helpers login/authFetch — non utilisés actuellement (AuthContext gère l'auth lui-même)
├── context/
│   ├── AuthContext.jsx           # register, login, logout, user state
│   └── ThemeContext.jsx
├── routes/
│   └── ProtectedRoute.jsx
├── components/
│   ├── AnnotatedReviewPlayer.jsx  # composant réutilisable — player + canvas + timeline + curseurs + HLS
│   ├── Header.jsx
│   ├── VideoPlayer.jsx            # wrapper <video> natif — non branché actuellement (le player utilise sa propre balise dans AnnotatedReviewPlayer)
│   ├── AnnotationCanvas.jsx      # canvas overlay — dessin, formes, texte, durée par annotation
│   ├── CommentThread.jsx         # timeline fusionnée annotations + commentaires, triée par position vidéo
│   ├── ColorPicker.jsx
│   ├── VideoCard.jsx / VideoRow.jsx
│   └── Skeleton.jsx
├── pages/
│   ├── Login.jsx / Register.jsx / ForgotPassword.jsx / Verify2FA.jsx
│   ├── Home.jsx / Catalogue.jsx  # mockVideos + vidéos uploadées (utils/uploadedVideos.js)
│   ├── PlayerPage.jsx            # résout videoSrc/hlsSrc depuis l'URL, délègue à AnnotatedReviewPlayer
│   ├── UploadVideo.jsx           # upload → POST /api/videos/upload, déclenche POST /process en arrière-plan
│   └── AIPage.jsx                # traitement + recherche sémantique IA
├── hooks/
│   ├── useWebSocket.js           # WS auto-reconnect, send(message)
│   └── useFakeLoading.js
├── data/
│   └── mockVideos.js
└── utils/
    ├── exportAnnotations.js      # format versionné aligné avec backend
    └── uploadedVideos.js         # GET /api/videos/ → format compatible VideoCard/VideoRow
