$ErrorActionPreference = "Stop"

$keyDirectory = "backend/media/secrets"
$keyFile = "$keyDirectory/video.key"
$keyInfoFile = "$keyDirectory/key_info.txt"
$keyUri = "/api/video/key"

if (-not (Test-Path $keyDirectory)) {
    New-Item -ItemType Directory -Path $keyDirectory -Force | Out-Null
}

$bytes = New-Object byte[] 16
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()

try {
    $rng.GetBytes($bytes)
    [System.IO.File]::WriteAllBytes($keyFile, $bytes)

    $keySize = (Get-Item $keyFile).Length

    if ($keySize -ne 16) {
        throw "La clé créée ne fait pas 16 octets."
    }

    Write-Host "Clé AES-128 créée avec succès."
    Write-Host "Emplacement : $keyFile"
    Write-Host "Taille : $keySize octets"

    # key_info.txt attendu par generate-hls.ps1 (-hls_key_info_file) :
    # ligne 1 = URI référencée dans la playlist (#EXT-X-KEY), ligne 2 = chemin
    # du fichier clé utilisé par FFmpeg pour chiffrer. Sans ce fichier,
    # generate-hls.ps1 échoue — il n'était généré nulle part auparavant.
    Set-Content -Path $keyInfoFile -Value @($keyUri, $keyFile) -Encoding ASCII

    Write-Host ""
    Write-Host "Fichier key_info.txt créé avec succès."
    Write-Host "Emplacement : $keyInfoFile"
}
finally {
    $rng.Dispose()
}