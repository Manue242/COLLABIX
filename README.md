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

- [Docker](https://www.docker.com/) + Docker Compose
- **Backend** : Python 3.12+
- **Frontend** : Node.js 22+
- **AI/Data** : Python 3.12+, Jupyter

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

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:5173      |
| Backend  | http://localhost:8000      |
| API Docs | http://localhost:8000/docs |

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

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/health` | Santé de l'API |
| `POST` | `/api/videos/upload` | Upload une vidéo (mp4, webm, ogg) |
| `GET` | `/api/videos/` | Liste des vidéos disponibles |
| `GET` | `/videos/{filename}` | Stream d'une vidéo |
| `POST` | `/api/annotations` | Créer une annotation |
| `GET` | `/api/annotations?video_id=` | Lister les annotations d'une vidéo |
| `DELETE` | `/api/annotations/{id}` | Supprimer une annotation |
| `GET` | `/api/annotations/export?video_id=` | Exporter les annotations en JSON propre |
| `POST` | `/api/annotations/import` | Réimporter un fichier JSON d'annotations |
| `WS` | `/ws/{video_id}` | Session collaborative temps réel |

### Format d'export JSON

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
      "user_id": "user_a"
    }
  ]
}
```

### Dev local (sans Docker)

Mettre à jour le `.env` avec `@localhost` à la place de `@db` :

```env
DATABASE_URL=postgresql+asyncpg://collabix:collabix@localhost:5432/collabix?ssl=false
```

---

## Frontend — React + Vite

> **Section à compléter par le dev frontend**

```bash
cd frontend
npm install
npm run dev
```

<!-- 
  Ajouter ici :
  - Les dépendances supplémentaires installées
  - La structure des composants
  - Les variables d'env VITE_* utilisées
-->

---

## AI / Data

> **Section à compléter par le dev IA**

```bash
cd ai-data
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

<!--
  Ajouter ici :
  - Les notebooks disponibles et leur rôle
  - Les modèles utilisés
  - Les sources de données
-->

---

## Conventions Git

### Branches

Chaque pôle travaille sur son propre préfixe :

| Pôle | Format | Exemple |
|------|--------|---------|
| Dev (backend / frontend) | `dev/<feature>` | `dev/annotations-api` |
| Cyber | `cyber/<feature>` | `cyber/auth-jwt` |
| Data / IA | `data/<feature>` | `data/video-analysis` |

### Créer une branche

```bash
# Dev
git checkout -b dev/ma-feature

# Cyber
git checkout -b cyber/ma-feature

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
