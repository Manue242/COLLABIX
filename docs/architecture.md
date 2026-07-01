# Architecture — COLLABIX

## Vue globale

```
┌─────────────────┐        HTTP / WS        ┌──────────────────────┐
│                 │ ──────────────────────► │                      │
│    Frontend     │                         │   Backend (FastAPI)  │
│  React + Vite   │ ◄────────────────────── │   :8000              │
│  :5173          │    JSON / WS events     │                      │
└─────────────────┘                         └──────────┬───────────┘
                                                       │
                                          ┌────────────▼───────────┐
                                          │   PostgreSQL           │
                                          │   :5432                │
                                          └────────────────────────┘

                                          ┌────────────────────────┐
                                          │   AI / Data            │
                                          │   (scripts, modèles)   │
                                          └────────────────────────┘
```

## Services

| Service    | Technologie        | Port | Rôle |
|------------|--------------------|------|------|
| Frontend   | React 19 + Vite 8  | 5173 | Interface utilisateur |
| Backend    | FastAPI + Uvicorn  | 8000 | API REST + WebSocket |
| Base de données | PostgreSQL 16 | 5432 | Persistance des annotations |
| AI / Data  | Python + Jupyter   | —    | Traitement IA |

## Backend — structure des dossiers

```
backend/
├── main.py              # Point d'entrée, enregistrement des routers
├── database.py          # Connexion async PostgreSQL (SQLAlchemy)
├── routers/
│   ├── health.py        # GET /api/health
│   ├── annotations.py   # CRUD annotations
│   └── ws.py            # WebSocket /ws/{video_id}
├── models/
│   └── annotation.py    # Table annotations (SQLAlchemy)
├── schemas/
│   └── annotation.py    # Validation entrées/sorties (Pydantic)
└── services/
    └── annotation.py    # Logique métier
```

## Flux de données — annotation

```
Frontend                  Backend                  PostgreSQL
   │                         │                         │
   │  POST /api/annotations  │                         │
   │ ──────────────────────► │                         │
   │                         │  INSERT annotation      │
   │                         │ ───────────────────────►│
   │                         │◄─────────────────────── │
   │◄────────────────────────│                         │
   │    AnnotationResponse   │                         │
```

## Flux de données — collaboration temps réel

```
User A                    Backend                   User B
  │                          │                         │
  │  WS /ws/{video_id}       │                         │
  │ ────────────────────────►│◄──────────────────────  │
  │                          │   WS /ws/{video_id}     │
  │  { type: "cursor",       │                         │
  │    x: 42, y: 18 }        │                         │
  │ ────────────────────────►│ ───────────────────────►│
  │                          │   broadcast to room     │
```

---

## Frontend

> _À compléter par le dev frontend_

<!-- 
  Décrire ici :
  - Structure des composants (pages, layout, features)
  - Gestion de l'état (Context, Zustand, Redux...)
  - Intégration du player vidéo
  - Intégration du canvas de dessin
-->

---

## AI / Data

> _À compléter par le dev IA_

<!--
  Décrire ici :
  - Pipeline de traitement des vidéos
  - Modèles utilisés et leur rôle
  - Comment les résultats sont exposés au backend
-->
