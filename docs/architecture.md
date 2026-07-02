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
| Frontend   | React 18 + Vite 5  | 5173 | Interface utilisateur |
| Backend    | FastAPI + Uvicorn  | 8000 | API REST + WebSocket |
| Base de données | PostgreSQL 16 | 5432 | Persistance des annotations |
| AI / Data  | FastAPI + Whisper/Ollama/ChromaDB | 8080 | Transcription, résumé, recherche sémantique |
| Ollama     | llama3.2 (2GB)     | 11434 | Modèle local pour traduction/résumé/chapitres |

## Backend — structure des dossiers

```
backend/
├── main.py              # Point d'entrée, enregistrement des routers
├── database.py          # Connexion async PostgreSQL (SQLAlchemy)
├── dependencies.py      # get_current_user (session JWT) + get_key_token_user (token clé HLS)
├── routers/
│   ├── health.py        # GET /api/health
│   ├── auth.py          # register, login, me, password
│   ├── annotations.py   # CRUD annotations + export/import
│   ├── videos.py        # upload, liste, DELETE
│   ├── ws.py            # WebSocket /ws/{video_id}
│   ├── sessions.py      # users connectés par vidéo
│   └── hls.py           # key-token + key (Zero-Trust, voir threat-model.md)
├── models/
│   ├── user.py
│   └── annotation.py    # Table annotations (SQLAlchemy)
├── schemas/
│   └── annotation.py    # Validation entrées/sorties (Pydantic)
└── services/
    ├── auth.py           # create_token (session) + create_key_token (HLS)
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

## Diffusion vidéo — Zero-Trust (HLS + AES-128)

```
Player                 Backend Auth          Backend HLS
  │  POST /auth/login       │                     │
  │ ───────────────────────►│                     │
  │◄──── JWT session (24h) ─│                     │
  │                         │                     │
  │  GET /api/video/key-token (Bearer session) ───►│
  │◄──── token clé (60s, scope=hls-key) ───────────│
  │                         │                     │
  │  GET /hls/playlist.m3u8 ───────────────────────►│  (public, chiffré)
  │  GET /hls/segment_000.ts ──────────────────────►│  (public, chiffré)
  │  GET /api/video/key (Bearer token clé) ────────►│
  │◄──── clé AES-128 (16 octets) ───────────────────│
  │  déchiffre localement (hls.js) et lit           │
```

Détail complet, hypothèses et limites assumées : [`docs/threat-model.md`](./threat-model.md).

---

## Frontend

**Composants clés**

- `AnnotatedReviewPlayer.jsx` — composant réutilisable qui porte tout le lecteur de revue (vidéo, dessin, timeline, curseurs, HLS). Reçoit `videoSrc`, `hlsSrc`, `user`, `sessionId` en props — aucune dépendance à react-router ou à un contexte d'auth précis, pour rester intégrable ailleurs.
- `PlayerPage.jsx` — page de routage : résout la vidéo depuis l'URL (mock ou backend), lit `user` depuis `AuthContext`, et rend `AnnotatedReviewPlayer` avec les bonnes props.
- `AnnotationCanvas.jsx` — overlay `<canvas>` positionné par-dessus la balise `<video>`. Dessine formes/texte, gère l'interaction souris/clavier, et notifie le parent via `onAnnotationCreate`/`onAnnotationDelete` (le canvas ne connaît pas l'API backend, juste des callbacks).
- `CommentThread.jsx` — reçoit une timeline déjà fusionnée et triée (annotations + commentaires) en props ; composant contrôlé, sans état dupliqué, pour éviter que des données chargées après le premier rendu restent invisibles.

**Gestion de l'état**

Pas de librairie de state management globale : `useState`/`useEffect` locaux à chaque page, plus deux contextes React (`AuthContext`, `ThemeContext`) pour ce qui doit vraiment être global. `AnnotatedReviewPlayer` centralise l'état du player/annotations et le redescend en props à `AnnotationCanvas`/`CommentThread`.

**Intégration player vidéo**

Balise `<video>` native pilotée par ref. Quand une playlist HLS chiffrée est disponible, `hls.js` prend le relais (avec repli automatique sur la lecture progressive MP4 si le flux HLS n'est pas généré). Voir la section Zero-Trust ci-dessus pour le flux de récupération de clé.

**Intégration du canvas de dessin**

Canvas API native (pas de librairie type Fabric/Konva) : suffisant pour flèches/formes/traits/texte, sans dépendance supplémentaire. Deux couches de canvas superposées (une pour les tracés finalisés, une pour la prévisualisation pendant le dessin) pour éviter de tout redessiner à chaque frame.

**Temps réel**

Un salon WebSocket par vidéo (`/ws/{video_id}`). Trois types de message : `cursor` (position normalisée, throttlée), `annotation_added`, `annotation_deleted` — les commentaires réutilisent `annotation_added` plutôt qu'un type dédié, pour rester alignés avec ce que le backend relaie déjà.

---

## AI / Data

**Pipeline** (`ai-data/indexation-semantique/`, service `ai-api` dans Docker) :

```
Vidéo (upload ou /ai) → FFmpeg (audio mono 16kHz) → Whisper (transcription + langue)
   → Ollama/llama3.2 (traduction, résumé, chapitres) → KeyBERT (mots-clés)
   → ChromaDB + sentence-transformers (indexation vectorielle) → /search
```

**Modèles et pourquoi**

- **Whisper** (`tiny`/`base`/`small`) — transcription + détection de langue, local, pas de clé API. `tiny` utilisé par défaut sur l'auto-indexation à l'upload pour rester rapide.
- **Ollama + llama3.2** — traduction/résumé/chapitres, 100% local (pas d'appel OpenAI), léger (~2GB) et suffisant en CPU pour un cas d'usage hackathon.
- **KeyBERT** — extraction de mots-clés à partir des embeddings de la transcription, sans entraînement supplémentaire.
- **ChromaDB + sentence-transformers** — base vectorielle embarquée (pas de service externe) pour la recherche sémantique cross-vidéos.

**Intégration avec le flux de révision vidéo**

`UploadVideo.jsx` déclenche un `POST /process` en arrière-plan juste après l'upload principal (`POST /api/videos/upload`) — la vidéo devient cherchable via `POST /search` sans étape manuelle supplémentaire. La page `/ai` reste disponible pour un traitement à la demande avec des options plus poussées (langue cible, modèle Whisper plus précis, etc.).
