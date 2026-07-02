# Modèle de menace — Diffusion vidéo Zero-Trust

Complète [`cyber1-hls-encryption.md`](./cyber1-hls-encryption.md) (qui documente la mise en place technique) en explicitant ce qui est protégé, contre quoi, sous quelles hypothèses, et avec quelles limites — comme demandé par le sujet Cyber « Architecture de diffusion Zero-Trust ».

## Actifs à protéger

| Actif | Où il vit |
|---|---|
| Contenu vidéo (segments `.ts`) | `backend/media/hls/`, servis publiquement mais chiffrés |
| Clé de déchiffrement AES-128 | `backend/media/secrets/video.key`, jamais servie en clair sans autorisation |
| Compte utilisateur / mot de passe | table `users` (bcrypt) |
| Token de session (JWT, 24h) | côté client (localStorage), signé `JWT_SECRET` |
| Token de clé (JWT, 60s, `scope=hls-key`) | émis à la demande, jamais persisté |

## Principe Zero-Trust appliqué ici

Aucune requête n'est faite confiance par défaut : les segments sont chiffrés (inutiles sans la clé), et la clé n'est remise que contre un token **dédié et de très courte durée** (60s), distinct du token de session normal (24h) — voir `backend/services/auth.py::create_key_token` et `backend/dependencies.py::get_key_token_user`.

```
Client (lecteur)                Backend Auth              Backend HLS / Nginx
      |                              |                              |
      |-- POST /auth/login --------->|                              |
      |<-- JWT session (24h) --------|                              |
      |                              |                              |
      |-- GET /api/video/key-token (Bearer: session) -------------->|
      |                    vérifie la session (get_current_user)    |
      |<-- token clé (60s, scope=hls-key) ---------------------------|
      |                              |                              |
      |-- GET /hls/playlist.m3u8 ------------------------------------------------------->|
      |<-- playlist (#EXT-X-KEY URI=/api/video/key) --------------------------------------|
      |-- GET /hls/segment_000.ts (chiffré AES-128) --------------------------------------->|
      |<-- segment .ts chiffré -------------------------------------------------------------|
      |-- GET /api/video/key (Bearer: token clé, via xhrSetup) --------------------------->|
      |                    vérifie scope=hls-key + expiration (get_key_token_user)         |
      |<-- clé AES-128 (16 octets) ----------------------------------------------------------|
      |-- déchiffre et lit localement (hls.js) -----------------------------------------------|
```

## Menaces considérées

| Menace | Mitigation | Preuve |
|---|---|---|
| Téléchargement anonyme des segments vidéo | Segments chiffrés AES-128 — inutiles sans la clé, même si `/hls/*` est servi publiquement | `GET /hls/segment_000.ts` sans auth → contenu chiffré illisible |
| Récupération de la clé sans être authentifié | `GET /api/video/key` refuse par défaut (401/403) sans token valide | tests `test_key_requires_auth`, `test_key_rejects_invalid_token` |
| Rejeu d'un token de clé intercepté/loggé | TTL de 60s (`scope=hls-key`) — inutilisable passé ce délai | test `test_key_rejects_expired_key_token` |
| Utilisation du token de session pour lire la clé directement | Refusé : `/api/video/key` exige spécifiquement `scope=hls-key`, pas juste un JWT valide | test `test_key_rejects_normal_session_token` |
| Abus / brute-force sur l'endpoint clé | Rate limiting 10 req/min par utilisateur | tests `test_key_rate_limit*` |

## Hypothèses

- Déploiement local/dev (Docker Compose) — pas de cloud payant requis, conforme au sujet.
- TLS est **hors périmètre** de cette implémentation : en production, un reverse proxy (Nginx) devant l'API terminerait le TLS ; en local, tout circule en clair sur le réseau local, ce qui est accepté par le sujet.
- `JWT_SECRET` doit être positionné via l'environnement en production — la valeur par défaut (`changeme-in-production`) ne doit jamais être utilisée telle quelle.
- Un seul flux HLS de démonstration est généré (`backend/media/source/demo-video.mp4` → `backend/media/hls/`), pas un flux par vidéo uploadée.

## Limites connues (assumées, pas cachées)

- **Un token de session volé reste exploitable indirectement** : le TTL de 60s protège contre le rejeu d'un token de clé capturé isolément, mais un attaquant en possession du token de session peut toujours re-émettre des tokens de clé à volonté (dans la limite du rate limit) tant que la session n'a pas expiré ou été révoquée. Il n'y a pas de révocation de session côté serveur.
- **Pas de rotation ni de révocation de clé** : une seule clé AES statique par déploiement ; la compromettre compromet tout le flux généré avec elle jusqu'au prochain `generate-key.ps1` / redémarrage de `hls-init`.
- **Rate limiter en mémoire, par processus** : non distribué, remis à zéro à chaque redémarrage du backend — suffisant pour une démo locale, pas pour une prod multi-instances.
- **Pas de contrôle d'accès par contenu** : toute vidéo protégée partage aujourd'hui la même clé et le même flux de démonstration ; un modèle multi-vidéos nécessiterait une clé par contenu et une vérification des droits par `video_id`.
- **Pas de journalisation dédiée des accès à la clé** au-delà des logs applicatifs par défaut — une extension pertinente serait de logger chaque délivrance de clé (user, timestamp, IP) pour la détection d'abus.

## Extensions pertinentes non implémentées

- Rotation périodique de la clé + invalidation des flux HLS déjà générés avec l'ancienne.
- Droits par contenu (une clé par vidéo, vérifiée contre les permissions de l'utilisateur sur ce `video_id`).
- Journalisation structurée des délivrances de clé pour audit / détection d'abus.
- Rate limiting distribué (Redis) si le backend est répliqué.
