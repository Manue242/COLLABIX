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

### React 18 + Vite 5
- Framework UI déclaratif avec hooks modernes (`useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`)
- Vite comme bundler : démarrage instantané, HMR (Hot Module Replacement) en développement
- Composants fonctionnels uniquement — architecture claire et testable
- Routing via React Router v6, routes protégées via `ProtectedRoute` (redirige vers `/login` si pas de token)

### CSS custom (sans framework UI)
- Zéro dépendance à Tailwind, Bootstrap ou MUI — contrôle total sur le rendu
- CSS variables pour le theming (`--bg`, `--surface`, `--primary`, etc.) : un seul fichier `theme.css` pilote light et dark mode
- `[data-theme="dark"]` sur `<html>` pour le dark mode — standard natif, performant

### Lecteur vidéo — `<video>` natif + hls.js
- Élément `<video>` natif sans react-player ni video.js — contrôle total sur les événements, `object-fit: contain` (jamais coupée), Fullscreen API native
- Miniatures générées côté client : `<video preload="metadata">` seeké à 2s → frame affichée sans canvas (pas de souci CORS)
- **hls.js** ajouté spécifiquement pour le flux HLS chiffré du pôle Cyber — `xhrSetup` permet d'attacher facilement le token de clé à la requête AES, ce que peu d'alternatives exposent aussi simplement
- Repli automatique sur le MP4 direct si le HLS n'est pas généré, pour ne jamais bloquer la lecture en dev/démo

### Dessin — double canvas natif
- Deux `<canvas>` superposés : un pour les tracés validés, un pour la prévisualisation pendant le dessin — le calque preview est effacé et redessiné à chaque `mousemove`, sans retoucher les annotations déjà validées
- Pas de librairie tierce (Fabric.js, Konva) : les besoins (flèche, rectangle, ellipse, trait libre, texte) sont simples et fixes, une dépendance supplémentaire n'aurait rien apporté
- `ResizeObserver` pour recalibrer les dimensions en temps réel (redimensionnement fenêtre, plein écran)

### Composant réutilisable — `AnnotatedReviewPlayer.jsx`
- Le sujet impose que le lecteur soit livrable comme composant autonome (source vidéo / utilisateur / session en props). Choix : extraire toute la logique du player dans un seul composant sans dépendance à `react-router` ni à un contexte d'auth précis, et garder `PlayerPage.jsx` comme simple wrapper de routage qui lui fournit ces props. Alternative écartée : garder le player couplé à la page (plus simple à écrire, mais viole directement la contrainte non négociable du sujet).

### État global — Context API, pas de librairie dédiée
- `AuthContext` : session utilisateur, login/logout
- `ThemeContext` : préférence light/dark persistée en `localStorage`
- Pas de Redux/Zustand — la complexité de l'état ne le justifie pas pour ce périmètre ; le reste (player, annotations, formulaires) reste local aux composants qui l'utilisent

### Temps réel — WebSocket natif (hook `useWebSocket.js`)
- Pas de Socket.IO : FastAPI expose des WebSockets nativement, et le besoin (broadcast simple par room `video_id`) ne justifie pas la couche supplémentaire (reconnexion automatique, fallback long-polling...) pour un usage réseau local à 2-3 utilisateurs
- Connexion, écoute des messages et envoi d'événements encapsulés dans un hook React générique
- Trois types de message alignés avec le backend : `cursor`, `annotation_added`, `annotation_deleted` (les commentaires réutilisent `annotation_added` plutôt qu'un type dédié)

### Export JSON
- Format structuré et réutilisable, aligné sur le backend : `id`, `type`, `content`, `timestamp`, `color`, `user_id`
- Téléchargement via `URL.createObjectURL(Blob)` — natif, sans dépendance
- Conçu pour être réimportable (`POST /api/annotations/import`) et exploitable côté backend ou un autre outil

---

## AI / Data

### Whisper — transcription
- Modèle local (pas d'API payante), CPU-friendly avec la variante `tiny`/`base`, détection de langue intégrée. `tiny` est utilisé par défaut pour l'auto-indexation à l'upload (rapidité), `base`/`small` restent disponibles depuis la page `/ai` pour plus de précision.

### Ollama + llama3.2 — traduction, résumé, chapitres
- Alternative locale à l'API OpenAI : aucune clé API, aucun coût, tourne sur CPU. `llama3.2` (~2GB) offre un bon compromis qualité/poids pour un LLM généraliste utilisé en local dans un contexte hackathon.

### KeyBERT — mots-clés
- Extraction de mots-clés basée sur les embeddings de la transcription, sans modèle à entraîner ni service supplémentaire à héberger.

### ChromaDB + sentence-transformers — recherche sémantique
- Base vectorielle embarquée (pas de service externe type Pinecone/Weaviate) : suffisant pour indexer et rechercher dans un corpus de vidéos de taille hackathon, et respecte la contrainte « 100% local, aucun service payant ».

### Intégration au flux de révision
- Le pipeline IA était initialement une page isolée (`/ai`, upload manuel séparé). `UploadVideo.jsx` déclenche désormais `POST /process` automatiquement en arrière-plan après l'upload principal, pour que l'indexation IA fasse réellement partie du parcours de revue et pas seulement d'une démo à part.
