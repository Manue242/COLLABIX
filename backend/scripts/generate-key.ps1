$ErrorActionPreference = "Stop"

$keyDirectory = "backend/media/secrets"
$keyFile = "$keyDirectory/video.key"

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
}
finally {
    $rng.Dispose()
}