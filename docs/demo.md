# Scénario de démo — COLLABIX

## Contexte

Deux membres d'une équipe interne révisent ensemble un montage vidéo.
Aujourd'hui les retours se font par e-mail — COLLABIX remplace ça par un espace collaboratif en temps réel.

---

## Parcours de démo

### 1. Ouverture de session
- User A ouvre COLLABIX et charge une vidéo de révision
- User B rejoint la même session via un lien partagé

### 2. Lecture synchronisée
- Les deux utilisateurs voient la vidéo au même endroit
- Les curseurs de chaque utilisateur sont visibles en temps réel sur le player

### 3. Ajout d'une annotation commentaire
- User A met la vidéo en pause à `0:42`
- Il ajoute un commentaire : _"Ce plan dure trop longtemps"_
- Le commentaire apparaît instantanément dans la liste de User B avec le timestamp `0:42`

### 4. Ajout d'une annotation dessin
- User B dessine une flèche sur l'image pour indiquer un élément précis, en choisissant une durée d'affichage (2 à 15s) dans le toolbar
- Le dessin est visible en overlay sur la vidéo pour User A, et apparaît dans la même timeline que les commentaires, triée par position dans la vidéo

### 5. Navigation par commentaires et annotations
- User A clique sur un commentaire ou une annotation dans la timeline
- Le player saute automatiquement au timestamp correspondant

### 6. Export / réimport
- Les annotations sont exportées en JSON
- Le fichier peut être réimporté pour retrouver l'état exact de la session

### 7. Diffusion sécurisée (Zero-Trust)
- La vidéo protégée est diffusée en HLS chiffré AES-128 (`hls-init` l'a généré automatiquement au démarrage de Docker)
- Preuve en direct via `curl` : sans token → `403`, avec le seul token de session → `401`, avec le token de clé (`/api/video/key-token`) → `200` et la clé est retournée
- Le lecteur, lui, fait tout ça de façon transparente via `hls.js`

### 8. Recherche sémantique IA
- La vidéo uploadée a été automatiquement transcrite et indexée en arrière-plan
- Sur la page `/ai`, une recherche en langage naturel (ex. « passage sur la sécurité ») retrouve le bon passage avec son timestamp, sans avoir eu à regarder la vidéo

---

## Endpoints appelés pendant la démo

| Action | Appel |
|--------|-------|
| Charger les annotations existantes | `GET /api/annotations?video_id=xxx` |
| Poster un commentaire | `POST /api/annotations` |
| Poster un dessin | `POST /api/annotations` (type: "drawing", content: JSON) |
| Curseurs / événements live | `WS /ws/{video_id}` |
| Supprimer une annotation | `DELETE /api/annotations/{id}` |
| Émettre un token de clé HLS | `GET /api/video/key-token` |
| Récupérer la clé AES-128 | `GET /api/video/key` |
| Indexer une vidéo (auto ou manuel) | `POST /process` |
| Recherche sémantique | `POST /search` |

---

## Notes pour la présentation

**Ordre suggéré** : démarrer par le parcours 1-6 (revue collaborative) sur deux fenêtres de navigateur côte à côte — c'est le cœur du sujet Dev/Web et le plus visuel. Enchaîner avec l'étape 7 (preuve Zero-Trust en `curl`, dans un terminal déjà ouvert, réponses 403/401/200 bien visibles) pour le pôle Cyber. Terminer par l'étape 8 (recherche sémantique) pour le pôle Data/IA — montrer qu'une vidéo juste uploadée est déjà cherchable, sans étape manuelle.

**Données à préparer avant la démo**
- Un compte de test par « utilisateur » de la démo (2-3 comptes), déjà enregistrés.
- Une vidéo courte préchargée (`backend/media/source/demo-video.mp4`) pour que `hls-init` ait généré le flux HLS chiffré avant la démo — sinon le lecteur retombe silencieusement sur le MP4, ce qui masque la partie Cyber.
- Quelques annotations/commentaires déjà présents sur la vidéo de démo, pour ne pas tout construire en direct.
- Un terminal prêt avec les 3 commandes `curl` de l'étape 7 (sans token / token de session / token de clé), pour ne pas les retaper en direct.

**Points à mettre en avant pour le jury**
- Le lecteur est un **composant réutilisable** (props `videoSrc`/`hlsSrc`/`user`/`sessionId`) — pas un simple prototype figé dans une page.
- La collaboration est **vraiment temps réel** : annotations, commentaires et curseurs, pas juste un rafraîchissement périodique.
- Le modèle Zero-Trust se **prouve en direct**, pas seulement sur schéma — refus par défaut, token de clé à durée de vie volontairement très courte (60s).
- `docker-compose up --build` est **la seule commande nécessaire** : HLS, IA et base de données s'initialisent tout seuls, aucune étape manuelle cachée.
- La recherche sémantique fonctionne **sans clé API ni service payant** — tout tourne en local (Whisper, Ollama, ChromaDB).
