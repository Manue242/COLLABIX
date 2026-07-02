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

### React 18 + Vite 5.1
- Framework UI déclaratif avec hooks modernes (`useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`)
- Vite 5.1 comme bundler : démarrage instantané, HMR (Hot Module Replacement) en développement
- Composants fonctionnels uniquement — architecture claire et testable
- Routing via React Router v6 avec routes protégées par rôle

### CSS custom (sans framework UI)
- Zéro dépendance à Tailwind, Bootstrap ou MUI — contrôle total sur le rendu
- CSS variables pour le theming (`--bg`, `--surface`, `--primary`, etc.) : un seul fichier `theme.css` pilote light et dark mode
- `[data-theme="dark"]` sur `<html>` pour le dark mode — standard natif, performant
- Transitions fluides via CSS (`transition: background 0.3s ease`) sans JavaScript

### Double canvas natif pour les annotations
- Deux `<canvas>` superposés : un pour les annotations finalisées, un pour le dessin en cours (preview)
- Le canvas de preview est effacé et redessiné à chaque `mousemove` — fluidité maximale sans redessiner toutes les annotations
- Pas de librairie tierce (fabric.js, konva) — canvas natif pour un contrôle total et zéro overhead
- `ResizeObserver` pour recalibrer les dimensions en temps réel (redimensionnement fenêtre, plein écran)

### Context API pour l'état global
- `AuthContext` : session utilisateur, rôle (`admin` / `user`), login/logout
- `ThemeContext` : préférence light/dark persistée en `localStorage`
- Pas de Redux — la complexité de l'état ne le justifie pas pour ce périmètre

### Lecteur vidéo natif HTML5
- Élément `<video>` natif sans react-player ni video.js — contrôle total sur les événements
- `object-fit: contain` : la vidéo n'est jamais coupée, proportions toujours respectées
- Fullscreen API native pour le plein écran
- Miniatures générées côté client : `<video preload="metadata">` seeké à 2s → frame affichée sans canvas (pas de problème CORS)

### WebSocket (hook custom `useWebSocket.js`)
- Connexion, écoute des messages et envoi d'événements encapsulés dans un hook React
- Activé uniquement si `VITE_WS_URL` est défini — l'app fonctionne en mode solo sans configuration
- Protocole d'événements aligné avec le backend FastAPI : `annotation`, `annotationDelete`, `comment`

### Export JSON
- Format structuré et réutilisable : `id`, `tool`, `color`, `start`, `end`, `timestamp`, `createdAt`
- Téléchargement via `URL.createObjectURL(Blob)` — natif, sans dépendance
- Conçu pour être réimportable et exploitable côté backend ou autre outil

---


## AI / Data

> _À compléter par le dev IA_

<!--
  Justifier ici :
  - Modèles choisis et pourquoi
  - Framework ML (PyTorch, TensorFlow, HuggingFace...)
  - Comment l'IA s'intègre dans le flux de révision vidéo
-->
