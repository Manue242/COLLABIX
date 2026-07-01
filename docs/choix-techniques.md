# Choix techniques — COLLABIX

## Backend

### FastAPI
- Framework Python moderne, performant et async natif
- Génération automatique de la doc Swagger (`/docs`)
- Support WebSocket intégré — indispensable pour la collaboration temps réel
- Typage via Pydantic : validation automatique des entrées/sorties

### PostgreSQL
- Base de données relationnelle robuste
- Stockage des annotations avec horodatage précis (timestamp vidéo en secondes)
- Image officielle Docker `postgres:16-alpine` — légère et stable

### SQLAlchemy (async)
- ORM avec support async (`asyncpg`) — performances optimales avec FastAPI
- Création automatique des tables au démarrage via `metadata.create_all`
- Pas de migrations Alembic pour le hackathon — ajout possible en post-hackathon

### asyncpg
- Driver PostgreSQL le plus rapide pour Python async
- SSL désactivé (`ssl=false`) pour l'environnement Docker local

### Pydantic v2
- Validation des données entrantes et sortantes
- Sérialisation automatique des réponses JSON
- `model_config = {"from_attributes": True}` pour la conversion ORM → schema

### WebSocket (natif FastAPI)
- Gestion des sessions collaboratives par `video_id` (room pattern)
- Broadcast des événements (curseurs, annotations live) à tous les pairs connectés
- Simple et sans dépendance externe — suffisant pour le hackathon

---

## Frontend

> _À compléter par le dev frontend_

<!--
  Justifier ici :
  - Choix du player vidéo (react-player, video.js, natif...)
  - Choix de la librairie de dessin (fabric.js, konva, canvas natif...)
  - Gestion de l'état global
  - Librairie UI si utilisée
-->

---

## AI / Data

> _À compléter par le dev IA_

<!--
  Justifier ici :
  - Modèles choisis et pourquoi
  - Framework ML (PyTorch, TensorFlow, HuggingFace...)
  - Comment l'IA s'intègre dans le flux de révision vidéo
-->
