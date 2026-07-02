# Collabix — Lecteur de Revue Augmenté

> Hackathon ESTIAM x 42C 2026 — Pôle 1, Sujet A  
> Stack : React 18 + Vite · CSS custom · WebSocket (optionnel)

---

## Présentation

Collabix est une plateforme vidéo B2B collaborative qui permet à des équipes de réviser des vidéos ensemble — comme on commente un document partagé. Fini les retours par e-mail flous ("à 1:32 le logo est trop petit") : on dessine directement sur l'image, on commente un instant précis, et tout est synchronisé en temps réel.

---

## Lancement rapide

```bash
cd frontend
npm install
npm run dev
```

L'app tourne sur `http://localhost:5173`.

**Comptes de test**

| Rôle  | Email                  | Mot de passe |
|-------|------------------------|--------------|
| Admin | admin@collabix.com     | n'importe    |
| User  | alice@collabix.com     | n'importe    |

> Le rôle admin s'active automatiquement si l'email contient "admin".

---

## Structure du projet

```
frontend/
├── public/
│   └── collabix-logo.png
├── src/
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── ForgotPassword.jsx
│   │   ├── Verify2FA.jsx
│   │   ├── Home.jsx              ← accueil style Netflix
│   │   ├── Catalogue.jsx         ← grille filtrée par catégorie
│   │   ├── PlayerPage.jsx        ← lecteur augmenté principal
│   │   └── UploadVideo.jsx       ← upload admin only
│   ├── components/
│   │   ├── Header.jsx            ← nav + dark mode toggle
│   │   ├── VideoCard.jsx         ← card avec miniature vidéo réelle
│   │   ├── VideoRow.jsx          ← carousel horizontal
│   │   ├── Skeleton.jsx          ← skeleton loading
│   │   ├── AnnotationCanvas.jsx  ← double canvas pour les annotations
│   │   ├── ReviewFeed.jsx        ← feed mixte commentaires + annotations
│   │   └── ColorPicker.jsx       ← palette + input hex custom
│   ├── context/
│   │   ├── AuthContext.jsx       ← auth + rôles
│   │   └── ThemeContext.jsx      ← dark/light mode persisté
│   ├── hooks/
│   │   ├── useWebSocket.js       ← temps réel (à brancher)
│   │   └── useFakeLoading.js     ← skeleton loading simulé
│   ├── utils/
│   │   └── exportAnnotations.js  ← export JSON propre
│   ├── data/
│   │   └── mockVideos.js         ← 32 vidéos Mixkit (URLs MP4 directes)
│   ├── routes/
│   │   └── ProtectedRoute.jsx
│   ├── theme.css                 ← CSS variables light/dark
│   └── App.css                   ← styles globaux
```

---

## Fonctionnalités implémentées

### Authentification
- Login / Register / Forgot password / Vérification 2FA (stubs)
- Rôles : `admin` et `user`
- Sessions persistées via `localStorage`

### Accueil & Catalogue
- Carousel sections par catégorie (Formations, Présentations, Démos, Communication interne)
- Miniatures vidéo réelles capturées depuis les MP4 (frame à 2s)
- Barre de progression orange par vidéo
- Skeleton loading animé (shimmer)
- Filtres par catégorie dans le catalogue
- Grille responsive `auto-fill minmax(280px)`

### Lecteur de Revue Augmenté
Le cœur du projet. Toutes les contraintes du sujet sont respectées.

#### Annotations liées au timecode
- 5 outils : **Curseur** (play/pause au clic), **Flèche**, **Rectangle**, **Ellipse**, **Trait libre**, **Texte**
- Chaque annotation est horodatée au timecode exact de pause
- Affichage pendant 5 secondes autour du timecode, avec fade-out progressif
- Texte déplaçable (drag & drop sur le canvas)
- Curseur `move` au survol d'un texte existant
- Ctrl+Z pour annuler la dernière annotation visible
- Bouton "Effacer tout"

#### Toolbar flottante verticale
- Cachée par défaut, toggle via bouton "Annoter" dans le header
- Positionnée en haut à gauche de la vidéo
- ColorPicker intégré : 20 presets + roue chromatique + input hex
- Outils annuler / effacer avec icônes propres

#### Contrôles vidéo
- Play/Pause (bouton + clic sur la vidéo en mode curseur)
- Effet visuel play/pause au clic (animation pulse)
- Barre de progression cliquable avec seek
- Volume avec slider orange + mute/unmute (3 états d'icône)
- Plein écran natif (Fullscreen API)
- Canvas redimensionné automatiquement via ResizeObserver

#### Feed de commentaires
- Sidebar togglable via bouton "Commentaires" dans le header
- Redimensionnable par drag sur le handle séparateur (220px–500px)
- **Feed mixte** : commentaires + annotations triés par timecode ou date
- Chaque item a un badge timecode cliquable → seek direct dans la vidéo
- ❤ Like, 💬 Répondre, ··· Menu contextuel
- **Menu contextuel intelligent** :
  - Son commentaire → Modifier (édition inline) + Supprimer
  - Commentaire d'un autre → Signaler
  - Admin → toutes les options sur tous les commentaires

### Dark mode
- Toggle depuis le dropdown avatar (switch animé)
- Persisté en `localStorage`
- Le lecteur vidéo est **toujours en dark** indépendamment du thème
- Transitions fluides 0.3s sur tous les éléments

### Animations & UX
- Skeleton loading sur Home (1.2s) et Catalogue (1s)
- Transitions de page `fade + slideUp`
- Cards vidéo : zoom thumbnail interne + overlay + play élastique + glow orange
- Dropdown avec scale+fade
- Boutons avec scale au clic
- Overflow `visible` sur le carousel pour les animations de lift

### Export JSON
Format propre et réutilisable :
```json
{
  "videoSrc": "Titre de la vidéo",
  "exportedAt": "2026-07-01T...",
  "annotations": [
    {
      "id": "uuid",
      "tool": "arrow",
      "color": "#F97316",
      "start": { "x": 120, "y": 80 },
      "end": { "x": 240, "y": 160 },
      "timestamp": 92.4,
      "createdAt": "2026-07-01T..."
    }
  ],
  "comments": [...]
}
```

---

## Branchement backend

Tous les points d'extension sont identifiés et documentés dans le code.

| Feature | Fichier | Action |
|---------|---------|--------|
| Auth login | `src/context/AuthContext.jsx` | Remplacer le stub par `POST /auth/login` |
| Auth register | `src/pages/Register.jsx` | `POST /auth/register` |
| Auth 2FA | `src/pages/Verify2FA.jsx` | `POST /auth/verify-2fa` |
| Liste vidéos | `src/data/mockVideos.js` | Remplacer par `GET /api/videos` |
| Durée vidéo | `src/data/mockVideos.js` | Champ `duration` en `"MM:SS"` ou secondes |
| Upload vidéo | `src/pages/UploadVideo.jsx` | `POST /api/videos` avec FormData |
| Temps réel | `src/hooks/useWebSocket.js` | Définir `VITE_WS_URL=ws://...` dans `.env` |

### Variables d'environnement

```env
VITE_WS_URL=ws://localhost:3001   # WebSocket temps réel (optionnel)
```

Sans `VITE_WS_URL`, l'app fonctionne en mode solo (pas de collaboration temps réel).

### Événements WebSocket attendus

```js
// Annotation créée
{ type: 'annotation', payload: { id, tool, color, start, end, timestamp, ... } }

// Annotation supprimée
{ type: 'annotationDelete', payload: { id } }

// Commentaire ajouté
{ type: 'comment', payload: { id, text, author, timestamp, ... } }
```

---

## Données vidéo (mock)

32 vidéos issues de [Mixkit](https://mixkit.co) (licence gratuite, usage commercial autorisé, sans attribution obligatoire). URLs MP4 directes depuis leur CDN — aucun téléchargement nécessaire.

Réparties en 4 catégories :
- **Formations** (8 vidéos) — bureaux, formations, laptops
- **Présentations** (7 vidéos) — réunions, équipes
- **Démos** (5 vidéos) — écrans, signatures
- **Communication interne** (6 vidéos) — panoramas, silhouettes

---

## Composant réutilisable

Conformément aux contraintes du sujet, le lecteur est conçu pour être autonome. Les props attendues :

```jsx
<PlayerPage />
// Reçoit : videoSrc, user, sessionId via React Router params + AuthContext
```

Pour un usage en composant pur (hors routing) :

```jsx
<AnnotationCanvas
  width={640}
  height={360}
  currentTime={currentTime}
  tool="arrow"
  color="#F97316"
  annotations={annotations}
  onAnnotationCreate={(a) => console.log(a)}
  onAnnotationDelete={(id) => ...}
  onAnnotationsClear={() => ...}
/>

<ReviewFeed
  comments={comments}
  annotations={annotations}
  currentTime={currentTime}
  onAddComment={(c) => ...}
  onSeek={(t) => ...}
/>
```

---

## Ce qui reste à faire (backend)

- [ ] Brancher l'API REST NestJS
- [ ] Authentification JWT réelle
- [ ] Persistance des annotations en base
- [ ] Serveur WebSocket pour la collaboration temps réel
- [ ] Upload réel des vidéos (stockage S3 ou équivalent)
- [ ] Durées vidéo dynamiques depuis les métadonnées

---

*Collabix — ESTIAM x 42C Hackathon 2026*

---

## Choix techniques — Frontend

### React 18 + Vite
- Framework UI déclaratif avec hooks modernes (`useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`)
- Vite comme bundler : démarrage instantané, HMR (Hot Module Replacement) en développement
- Composants fonctionnels uniquement — architecture claire et testable
- Routing via React Router v6 avec routes protégées par rôle

### CSS custom (sans framework UI)
- Zéro dépendance à Tailwind, Bootstrap ou MUI — contrôle total sur le rendu
- **CSS variables** pour le theming (`--bg`, `--surface`, `--primary`, etc.) : un seul fichier `theme.css` pilote light et dark mode
- `[data-theme="dark"]` sur `<html>` pour le dark mode — standard natif, performant
- Transitions fluides via CSS (`transition: background 0.3s ease`) sans JavaScript

### Double canvas pour les annotations
- Deux `<canvas>` superposés : un pour les annotations finalisées, un pour le dessin en cours (preview)
- Le canvas de preview est effacé et redessiné à chaque `mousemove` — fluidité maximale sans redessiner toutes les annotations
- `ResizeObserver` pour recalibrer les dimensions du canvas en temps réel (redimensionnement, plein écran)
- Annotations stockées en state React — prêtes à être envoyées via WebSocket ou API

### Context API pour l'état global
- `AuthContext` : session utilisateur, rôle (`admin` / `user`), login/logout
- `ThemeContext` : préférence light/dark persistée en `localStorage`
- Pas de Redux — la complexité de l'état ne le justifie pas pour ce périmètre

### WebSocket (hook custom)
- `useWebSocket.js` : connexion, écoute des messages, envoi d'événements
- Activé uniquement si `VITE_WS_URL` est défini — l'app fonctionne en mode solo sans configuration
- Protocole d'événements aligné avec le backend FastAPI : `annotation`, `annotationDelete`, `comment`

### Données mock (Mixkit CDN)
- 32 vidéos MP4 accessibles directement par URL publique — pas de serveur nécessaire pour la démo
- Miniatures générées côté client : `<video preload="metadata">` seeké à 2s → frame capturée sans canvas (pas de problème CORS)
- Champ `duration` en string `"MM:SS"` → à remplacer par la valeur réelle renvoyée par l'API

### Export JSON
- Format structuré et réutilisable : `id`, `tool`, `color`, `start`, `end`, `timestamp`, `createdAt`
- Téléchargement via `URL.createObjectURL(Blob)` — natif, sans dépendance
- Conçu pour être réimportable et exploitable côté backend ou autre outil

### Choix d'architecture notables
| Décision | Pourquoi |
|----------|----------|
| Pas de state manager externe | Context API suffit pour auth + thème ; les annotations restent locales au player |
| CSS custom plutôt que Tailwind | Contrôle total sur les animations, transitions et variables de thème |
| Double canvas | Performances : on ne redessine pas tout à chaque pixel de mouvement |
| `object-fit: contain` sur la vidéo | La vidéo n'est jamais coupée, les proportions sont toujours respectées |
| Toolbar masquée par défaut | Priorité à la lecture — l'annotation est un mode explicitement activé |
| Feed mixte chronologique | Vue unifiée de la session de revue sans jongler entre onglets |

