# TASKS — COLLABIX

---

## Backend — Tâches restantes

### Auth

- [x] `POST /auth/register` ✅
- [x] `POST /auth/login` ✅
- [x] `GET /auth/me` ✅
- [x] `POST /auth/password` ✅

### Tests

- [x] `tests/test_health.py` ✅
- [x] `tests/test_auth.py` ✅ (register, login, me, change password)
- [x] `tests/test_annotations.py` ✅ (CRUD, export, import, roundtrip)
- [ ] `tests/test_videos.py` — upload + liste vidéos

### Annotations

- [ ] `PATCH /api/annotations/{id}` — modifier une annotation (contenu, couleur)
  - Fichiers : `routers/annotations.py`, `services/annotation.py`, `schemas/annotation.py`
  - Ajouter schema `AnnotationUpdate` (champs optionnels)

- [ ] Validation taille fichier upload vidéo (ex: max 500MB)
  - Fichier : `routers/videos.py`

- [ ] `DELETE /api/videos/{filename}` — supprimer une vidéo du serveur
  - Fichier : `routers/videos.py`

### WebSocket

- [ ] Typer les messages WebSocket avec Pydantic avant broadcast
  - Fichier : `routers/ws.py`
  - Types à gérer :
    ```json
    { "type": "cursor",             "x": 0.42, "y": 0.18, "user_id": "..." }
    { "type": "annotation_added",   "annotation": { ... } }
    { "type": "annotation_deleted", "id": "uuid" }
    ```

- [ ] Gérer la liste des users connectés par room
  - Fichier : `routers/ws.py`
  - Nouveau endpoint : `GET /api/sessions/{video_id}/users`

### Sessions / Users

- [ ] `GET /api/sessions/{video_id}/users` — retourner les users connectés sur une vidéo
  - Nouveau fichier : `routers/sessions.py`
  - S'appuie sur l'état en mémoire du WS (dict `rooms`)

### Rappel structure backend

```
backend/
├── main.py
├── database.py
├── routers/
│   ├── health.py
│   ├── annotations.py   ← PATCH à ajouter
│   ├── videos.py        ← DELETE + validation taille à ajouter
│   ├── ws.py            ← typage messages + users connectés
│   └── sessions.py      ← à créer
├── models/
│   └── annotation.py
├── schemas/
│   └── annotation.py    ← AnnotationUpdate à ajouter
└── services/
    └── annotation.py    ← logique update à ajouter
```

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
- [ ] Supprimer une annotation (`DELETE /api/annotations/{id}`)
- [ ] Afficher un marqueur sur la timeline pour chaque annotation

### Upload vidéo

- [ ] Interface d'upload (`POST /api/videos/upload`)
- [ ] Liste des vidéos disponibles (`GET /api/videos/`)

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

- [ ] Connexion WebSocket à `/ws/{sessionId}` au montage du composant
- [ ] Envoyer la position du curseur en temps réel
- [ ] Afficher les curseurs des autres utilisateurs sur le player
- [ ] Synchroniser les nouvelles annotations entre users sans refresh

### Format messages WebSocket à envoyer

```json
{ "type": "cursor",             "x": 0.42, "y": 0.18, "user_id": "..." }
{ "type": "annotation_added",   "annotation": { ... } }
{ "type": "annotation_deleted", "id": "uuid" }
```

---

### Endpoints existants (ne pas retoucher)

| Méthode | Route | Statut |
|---------|-------|--------|
| `GET` | `/api/health` | ✅ |
| `POST` | `/api/videos/upload` | ✅ |
| `GET` | `/api/videos/` | ✅ |
| `GET` | `/videos/{filename}` | ✅ |
| `POST` | `/api/annotations` | ✅ |
| `GET` | `/api/annotations?video_id=` | ✅ |
| `DELETE` | `/api/annotations/{id}` | ✅ |
| `GET` | `/api/annotations/export?video_id=` | ✅ |
| `POST` | `/api/annotations/import` | ✅ |
| `WS` | `/ws/{video_id}` | ✅ |

