# Cyber 1 — Ingestion vidéo et chiffrement HLS

## Responsable

Olivier — Cyber 1

## Objectif

Cette partie du projet **COLLABIX** prépare une vidéo sécurisée au format HLS.

La vidéo source est découpée en plusieurs segments `.ts`. Chaque segment est chiffré avec l’algorithme **AES-128**. Le lecteur doit récupérer une clé de déchiffrement avant de pouvoir lire le contenu.

> **Via Docker (recommandé)** : le service `hls-init` du `docker-compose.yml` racine automatise tout ce document — génération de la clé, de `key_info.txt`, et du flux HLS si `backend/media/source/demo-video.mp4` est présent. FFmpeg tourne dans un conteneur (`jrottenberg/ffmpeg`) ; **rien à installer sur l'hôte**. Les sections ci-dessous restent utiles pour comprendre le détail du pipeline ou l'exécuter manuellement sous Windows.

## Prérequis : FFmpeg (génération manuelle uniquement)

Pour la génération manuelle via PowerShell (hors Docker), FFmpeg doit être installé et accessible depuis le terminal.

Pour vérifier l’installation, exécuter :

```powershell
ffmpeg -version
```

La commande doit afficher une version de FFmpeg et se terminer sans erreur.

## Architecture du flux

```text
Vidéo MP4
   ↓
FFmpeg
   ↓
Playlist HLS (.m3u8) + segments vidéo (.ts)
   ↓
Chiffrement AES-128
   ↓
Clé protégée
   ↓
Endpoint sécurisé : /api/video/key
```

## Arborescence du module

```text
backend/
├── media/
│   ├── source/
│   │   └── demo-video.mp4
│   ├── hls/
│   │   ├── playlist.m3u8
│   │   ├── segment_000.ts
│   │   ├── segment_001.ts
│   │   ├── segment_002.ts
│   │   ├── segment_003.ts
│   │   ├── segment_004.ts
│   │   └── segment_005.ts
│   └── secrets/
│       ├── video.key
│       └── key_info.txt
└── scripts/
    ├── generate-key.ps1
    └── generate-hls.ps1
```

## Fichiers protégés par Git

Les fichiers suivants restent locaux et ne doivent jamais être envoyés sur GitHub :

- `backend/media/source/demo-video.mp4`
- `backend/media/secrets/video.key`
- `backend/media/secrets/key_info.txt`
- les fichiers `.ts`
- le fichier `playlist.m3u8`

Le fichier `.gitignore` exclut ces éléments du dépôt.

## Génération de la clé AES-128

La clé de chiffrement AES-128 doit faire exactement **16 octets**.

Exécuter les commandes suivantes dans le terminal PowerShell ouvert à la racine du dépôt `COLLABIX` :

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\backend\scripts\generate-key.ps1
```

Résultat attendu :

```text
Clé AES-128 créée avec succès.
Emplacement : backend/media/secrets/video.key
Taille : 16 octets

Fichier key_info.txt créé avec succès.
Emplacement : backend/media/secrets/key_info.txt
```

> `key_info.txt` (URI de la playlist + chemin de la clé) est désormais généré automatiquement par ce script — c'est le fichier que `generate-hls.ps1` attend via `-hls_key_info_file`.

La clé est stockée ici :

```text
backend/media/secrets/video.key
```

Elle ne doit jamais être exposée par GitHub, Nginx ou un dossier public.

## Préparation de la vidéo source

La vidéo de démonstration doit être déposée ici :

```text
backend/media/source/demo-video.mp4
```

La vidéo utilisée pour la démonstration dure environ 33 secondes. Le flux est découpé en segments d’environ 6 secondes.

## Génération du flux HLS chiffré

Exécuter la commande suivante dans le terminal PowerShell :

```powershell
.\backend\scripts\generate-hls.ps1
```

Le script utilise FFmpeg pour :

1. lire la vidéo source ;
2. réduire la vidéo à une hauteur maximale de 1080 pixels ;
3. créer des segments HLS d’environ 6 secondes ;
4. chiffrer les segments avec AES-128 ;
5. générer la playlist HLS ;
6. référencer l’endpoint `/api/video/key` pour la clé de déchiffrement.

Les fichiers générés sont créés localement dans :

```text
backend/media/hls/
```

Exemple de résultat :

```text
playlist.m3u8
segment_000.ts
segment_001.ts
segment_002.ts
segment_003.ts
segment_004.ts
segment_005.ts
```

## Vérification du chiffrement

Pour afficher la playlist HLS :

```powershell
Get-Content backend/media/hls/playlist.m3u8
```

La playlist doit contenir une ligne similaire à :

```text
#EXT-X-KEY:METHOD=AES-128,URI="/api/video/key"
```

Cette ligne confirme que les segments sont chiffrés en AES-128 et que le lecteur doit demander la clé à l’endpoint sécurisé.

La playlist doit aussi référencer les segments :

```text
#EXTINF:6.000000,
segment_000.ts
```

## Vérification de la protection Git

Exécuter :

```powershell
git status
```

Les fichiers suivants ne doivent pas apparaître dans la liste des fichiers à envoyer :

```text
backend/media/source/demo-video.mp4
backend/media/secrets/video.key
backend/media/secrets/key_info.txt
backend/media/hls/playlist.m3u8
backend/media/hls/segment_000.ts
```

## Intégration avec le service d’authentification — implémenté

Le flux à deux étapes suivant est en place (`backend/dependencies.py`, `backend/services/auth.py`, `backend/routers/hls.py`) :

```text
GET /api/video/key-token   (session JWT requise, 24h)  → token de 60s, scope=hls-key
GET /api/video/key         (token de clé requis)       → clé AES-128
```

`GET /api/video/key` :

1. refuse tout appel sans token (`403`) ou avec un token invalide (`401`) ;
2. refuse spécifiquement un token de session normal — seul un token émis par `/api/video/key-token` (scope `hls-key`, 60s) est accepté ;
3. applique l’expiration de 60 secondes via ce token dédié (et non le token de session) ;
4. applique le rate limiting (10 req/min par utilisateur) ;
5. retourne la clé AES uniquement si l’accès est autorisé.

Vérifié en direct : sans token → `403`, token de session seul → `401`, token de clé → `200`.

Côté lecteur, `AnnotatedReviewPlayer.jsx` récupère le token via `xhrSetup` (hls.js) avant de demander la clé — voir [`docs/threat-model.md`](./threat-model.md) pour le modèle de menace complet et le schéma de séquence.

## Intégration avec Nginx

Nginx peut servir les fichiers HLS :

```text
/hls/playlist.m3u8
/hls/segment_000.ts
/hls/segment_001.ts
```

Nginx ne doit jamais servir directement les fichiers suivants :

```text
backend/media/secrets/video.key
backend/media/secrets/key_info.txt
```

La route `/api/video/key` doit être redirigée vers le service d’authentification de Nina et non vers un fichier statique.

## Résultat obtenu

La vidéo de démonstration a été transformée en flux HLS sécurisé avec :

- une playlist `.m3u8` ;
- six segments vidéo `.ts` ;
- un chiffrement AES-128 ;
- une clé AES de 16 octets ;
- une référence vers `/api/video/key` ;
- des secrets et médias générés exclus de Git.

Cette implémentation correspond à la partie **ingestion vidéo, segmentation HLS et chiffrement AES-128** du pôle Cyber 1.
