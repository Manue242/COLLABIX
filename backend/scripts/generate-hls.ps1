$ErrorActionPreference = "Stop"

$sourceVideo = "backend/media/source/demo-video.mp4"
$keyFile = "backend/media/secrets/video.key"
$keyInfoFile = "backend/media/secrets/key_info.txt"
$outputDirectory = "backend/media/hls"
$playlistFile = "$outputDirectory/playlist.m3u8"

function Stop-WithError {
    param([string]$Message)

    Write-Host "ERREUR : $Message" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Stop-WithError "FFmpeg est introuvable dans le PATH."
}

if (-not (Test-Path $sourceVideo)) {
    Stop-WithError "Vidéo source introuvable : $sourceVideo"
}

if (-not (Test-Path $keyFile)) {
    Stop-WithError "Clé AES introuvable : $keyFile"
}

if (-not (Test-Path $keyInfoFile)) {
    Stop-WithError "Fichier key_info.txt introuvable : $keyInfoFile"
}

$keySize = (Get-Item $keyFile).Length

if ($keySize -ne 16) {
    Stop-WithError "La clé AES doit faire exactement 16 octets. Taille actuelle : $keySize octets."
}

if (-not (Test-Path $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

Get-ChildItem $outputDirectory -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -in ".ts", ".m3u8" } |
    Remove-Item -Force

Write-Host "Génération du flux HLS chiffré AES-128..." -ForegroundColor Cyan

ffmpeg -y `
    -i $sourceVideo `
    -map 0:v:0 `
    -map 0:a? `
    -c:v libx264 `
    -preset veryfast `
    -crf 23 `
    -vf "scale=-2:1080" `
    -c:a aac `
    -b:a 128k `
    -force_key_frames "expr:gte(t,n_forced*6)" `
    -hls_time 6 `
    -hls_playlist_type vod `
    -hls_list_size 0 `
    -hls_flags independent_segments `
    -hls_segment_type mpegts `
    -hls_key_info_file $keyInfoFile `
    -hls_segment_filename "$outputDirectory/segment_%03d.ts" `
    -f hls `
    $playlistFile

if ($LASTEXITCODE -ne 0) {
    Stop-WithError "FFmpeg a échoué pendant la génération du flux HLS."
}

if (-not (Test-Path $playlistFile)) {
    Stop-WithError "La playlist HLS n'a pas été générée."
}

$segmentCount = (Get-ChildItem $outputDirectory -Filter "*.ts").Count

if ($segmentCount -lt 1) {
    Stop-WithError "Aucun segment .ts n'a été généré."
}

Write-Host ""
Write-Host "SUCCÈS : flux HLS chiffré généré." -ForegroundColor Green
Write-Host "Playlist : $playlistFile"
Write-Host "Segments générés : $segmentCount"
Write-Host "Clé AES : protégée dans backend/media/secrets/"