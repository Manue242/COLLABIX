# TASKS — COLLABIX

---

## Backend — Statut complet

### Auth

- [x] `POST /auth/register` ✅
- [x] `POST /auth/login` ✅
- [x] `GET /auth/me` ✅
- [x] `POST /auth/password` ✅

### CI / GitHub Actions

- [x] Workflow `.github/workflows/backend-ci.yml` ✅ — déclenché sur push/PR vers `develop` (dossier `backend/`)

### Tests — 47 passent

- [x] `tests/test_health.py` ✅ (1 test)
- [x] `tests/test_auth.py` ✅ (10 tests — register, login, me, change password)
- [x] `tests/test_annotations.py` ✅ (16 tests — CRUD, export, import, roundtrip, username, PATCH)
- [x] `tests/test_videos.py` ✅ (13 tests — upload, formats invalides, taille, liste, DELETE)
- [x] `tests/test_sessions.py` ✅ (7 tests — room vide, users injectés, tri)

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
│   └── sessions.py          # GET /api/sessions/{video_id}/users
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
└── tests/
    ├── conftest.py
    ├── test_health.py
    ├── test_auth.py
    ├── test_annotations.py
    ├── test_videos.py
    └── test_sessions.py
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

---

## Frontend — Tâches restantes

### Composant principal (contrainte non-négociable)

- [ ] Créer `<VideoReviewer />` — composant réutilisable avec props :
  - `videoSrc` — URL de la vidéo (`/videos/{filename}`)
  - `userId` — identifiant de l'utilisateur
  - `sessionId` — identifiant de la session (= `video_id` côté API)

### Player vidéo

- [ ] Intégrer un player vidéo (react-player, video.js ou `<video>` natif)
- [ ] Contrôles : play/pause, seek, volume
- [ ] Exposer le timecode courant pour les annotations

### Annotations

- [ ] Afficher les annotations dans une liste triée par timestamp
- [ ] Clic sur une annotation → saut au timecode correspondant
- [ ] Créer une annotation au timecode courant (`POST /api/annotations`)
- [ ] Modifier une annotation (`PATCH /api/annotations/{id}`)
- [ ] Supprimer une annotation (`DELETE /api/annotations/{id}`)
- [ ] Afficher un marqueur sur la timeline pour chaque annotation

### Upload vidéo

- [ ] Interface d'upload (`POST /api/videos/upload`)
- [ ] Liste des vidéos disponibles (`GET /api/videos/`)
- [ ] Supprimer une vidéo (`DELETE /api/videos/{filename}`)

### Export / Import JSON

- [ ] Bouton export → appelle `GET /api/annotations/export?video_id=` → télécharge le fichier
- [ ] Bouton import → upload JSON → envoie à `POST /api/annotations/import`

### Outils de dessin (overlay canvas sur la vidéo)

- [ ] Canvas positionné par-dessus le player
- [ ] Outil flèche
- [ ] Outil formes (rectangle, cercle)
- [ ] Outil trait libre
- [ ] Outil texte
- [ ] Sélecteur de couleur
- [ ] Suppression d'un dessin
- [ ] Sauvegarder le dessin en JSON (`POST /api/annotations` avec `type: "drawing"`)

### Collaboration temps réel (WebSocket)

- [ ] Connexion WebSocket à `/ws/{sessionId}?user_id={userId}` au montage du composant
- [ ] Envoyer la position du curseur en temps réel
- [ ] Afficher les curseurs des autres utilisateurs sur le player
- [ ] Synchroniser les nouvelles annotations entre users sans refresh
- [ ] Afficher la liste des users connectés (`GET /api/sessions/{sessionId}/users`)

### Format messages WebSocket

```json
{ "type": "cursor",             "x": 0.42, "y": 0.18, "user_id": "..." }
{ "type": "annotation_added",   "annotation": { ... } }
{ "type": "annotation_deleted", "id": "uuid" }
```
