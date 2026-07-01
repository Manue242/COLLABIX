# Lecteur de Revue Augmenté — Front-end

Hackathon ESTIAM × 42c 2026 — Pôle 1 / Sujet A.

## Installation

```bash
npm install
npm run dev
```

Placez une vidéo de démo dans `public/sample.mp4`, ou changez le `src` dans `App.jsx`.

## Connexion au serveur WebSocket

Créez un fichier `.env` à la racine :

```
VITE_WS_URL=ws://localhost:PORT
```

Le contrat de message attendu côté serveur (JSON) :

```json
{ "type": "annotation" | "comment", "payload": { ... } }
```

## Structure

- `src/components/VideoPlayer.jsx` — wrapper vidéo natif
- `src/components/AnnotationCanvas.jsx` — overlay Canvas (flèches, rectangles, ellipses), lié au timestamp
- `src/components/CommentThread.jsx` — commentaires horodatés
- `src/hooks/useWebSocket.js` — client WS générique
- `src/utils/exportAnnotations.js` — export du livrable JSON

## Workflow Git (rappel)

```bash
git clone <url-du-repo>
cd <repo>
git checkout -b feature/lecteur-annotations
# ... travail, commits réguliers ...
git push origin feature/lecteur-annotations
# puis Pull Request vers main sur GitHub
```

## Prochaines étapes possibles

- Brancher le vrai serveur WS quand l'équipe infra/backend en a un
- Ajouter l'authentification utilisateur (actuellement "Vous" en dur dans CommentThread)
- Persister les annotations/commentaires (actuellement uniquement en mémoire côté client)
- Gérer la suppression/édition d'annotations
