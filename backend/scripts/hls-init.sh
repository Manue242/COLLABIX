#!/bin/sh
# Génère la clé AES-128 + key_info.txt puis, si une vidéo source est présente,
# le flux HLS chiffré — exécuté par le service docker-compose "hls-init"
# (image FFmpeg), pour que le pipeline Zero-Trust marche en une commande
# sans étape manuelle PowerShell/hôte. Tolère l'absence de vidéo source.
set -e

mkdir -p /media/secrets /media/hls

if [ ! -f /media/secrets/video.key ]; then
  echo "Génération de la clé AES-128..."
  dd if=/dev/urandom of=/media/secrets/video.key bs=16 count=1 status=none
fi

# key_info.txt attendu par FFmpeg (-hls_key_info_file) :
# ligne 1 = URI référencée dans la playlist, ligne 2 = chemin du fichier clé.
printf '/api/video/key\n/media/secrets/video.key\n' > /media/secrets/key_info.txt

if [ ! -f /media/source/demo-video.mp4 ]; then
  echo "Pas de vidéo source (media/source/demo-video.mp4) — flux HLS non généré, le lecteur utilisera le MP4 en repli."
  exit 0
fi

echo "Génération du flux HLS chiffré AES-128..."
ffmpeg -y -i /media/source/demo-video.mp4 \
  -map 0:v:0 -map 0:a? \
  -c:v libx264 -preset veryfast -crf 23 -vf "scale=-2:1080" \
  -c:a aac -b:a 128k \
  -force_key_frames "expr:gte(t,n_forced*6)" \
  -hls_time 6 -hls_playlist_type vod -hls_list_size 0 \
  -hls_flags independent_segments -hls_segment_type mpegts \
  -hls_key_info_file /media/secrets/key_info.txt \
  -hls_segment_filename "/media/hls/segment_%03d.ts" \
  -f hls /media/hls/playlist.m3u8

echo "Flux HLS chiffré généré avec succès."
