# Backend — Tâches restantes

## Annotations

- [ ] `PATCH /api/annotations/{id}` — modifier une annotation (contenu, couleur)
  - Fichiers : `routers/annotations.py`, `services/annotation.py`, `schemas/annotation.py`
  - Ajouter schema `AnnotationUpdate` (champs optionnels)

- [ ] Validation taille fichier upload vidéo (ex: max 500MB)
  - Fichier : `routers/videos.py`

- [ ] `DELETE /api/videos/{filename}` — supprimer une vidéo du serveur
  - Fichier : `routers/videos.py`

---

## WebSocket

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

---

## Sessions / Users

- [ ] `GET /api/sessions/{video_id}/users` — retourner les users connectés sur une vidéo
  - Nouveau fichier : `routers/sessions.py`
  - S'appuie sur l'état en mémoire du WS (dict `rooms`)

---

## Rappel structure

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

## Endpoints existants (ne pas retoucher)

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
