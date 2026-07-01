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
- User B dessine une flèche sur l'image pour indiquer un élément précis
- Le dessin est visible en overlay sur la vidéo pour User A

### 5. Navigation par commentaires
- User A clique sur un commentaire dans la liste
- Le player saute automatiquement au timestamp correspondant

### 6. Export / réimport
- Les annotations sont exportées en JSON
- Le fichier peut être réimporté pour retrouver l'état exact de la session

---

## Endpoints appelés pendant la démo

| Action | Appel |
|--------|-------|
| Charger les annotations existantes | `GET /api/annotations?video_id=xxx` |
| Poster un commentaire | `POST /api/annotations` |
| Poster un dessin | `POST /api/annotations` (type: "drawing", content: JSON) |
| Curseurs / événements live | `WS /ws/{video_id}` |
| Supprimer une annotation | `DELETE /api/annotations/{id}` |

---

## Notes pour la présentation

> _À compléter avant la démo_

<!--
  Ajouter ici :
  - Ordre exact des actions à montrer
  - Données de démo à préparer (video_id, annotations pré-chargées...)
  - Points à mettre en avant pour le jury
-->
