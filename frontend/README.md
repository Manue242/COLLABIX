# Collabix — Frontend

React + Vite. Voir le [README racine](../README.md) pour la documentation complète (installation Docker, endpoints backend, structure des pages/composants) — ce fichier ne couvre que le démarrage local du frontend seul.

## Démarrage local (sans Docker)

```bash
npm install
npm run dev
```

Le serveur backend (`http://localhost:8000`) et le pipeline IA (`http://localhost:8080`) doivent tourner séparément — voir le README racine. Le proxy Vite (`vite.config.js`) redirige `/api`, `/auth`, `/videos`, `/hls`, `/ws` vers le backend et `/process`, `/search` vers le pipeline IA.

## Structure

- `src/components/AnnotatedReviewPlayer.jsx` — composant réutilisable : player, canvas d'annotation, timeline commentaires, curseurs collaboratifs, lecture HLS chiffrée
- `src/components/AnnotationCanvas.jsx` — overlay Canvas (flèches, rectangles, ellipses, texte), lié au timestamp, durée d'affichage configurable
- `src/components/CommentThread.jsx` — timeline fusionnée commentaires + annotations, triée par position vidéo
- `src/pages/PlayerPage.jsx` — page de routage, résout la source vidéo puis rend `AnnotatedReviewPlayer`
- `src/hooks/useWebSocket.js` — client WS générique (annotations, commentaires, curseurs)
- `src/utils/exportAnnotations.js` — export/import du JSON, format aligné avec le backend

## Workflow Git (rappel)

```bash
git checkout -b dev/ma-feature
# ... travail, commits réguliers ...
git push origin dev/ma-feature
# puis Pull Request vers develop sur GitHub — jamais de push direct sur main
```
