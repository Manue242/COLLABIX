"""
Extraction audio (point 1) via ffmpeg.
Extrait la piste audio d'une vidéo (mp4, mov, mkv, avi...) et la normalise au
format attendu par Whisper : WAV PCM 16 bits, mono, 16 kHz.
"""
import os
import subprocess
import tempfile


def extract_audio(video_path: str) -> str:
    """
    Extrait et normalise l'audio d'un fichier vidéo/audio.

    Args:
        video_path: chemin du fichier d'entrée (mp4, mov, etc.)

    Returns:
        Chemin d'un fichier WAV temporaire (mono, 16 kHz, PCM 16 bits).

    Raises:
        RuntimeError: si ffmpeg échoue (fichier illisible, format non géré...).
    """
    fd, wav_path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)

    cmd = [
        "ffmpeg", "-y",           # écraser le fichier de sortie si besoin
        "-i", video_path,         # entrée
        "-vn",                    # pas de vidéo
        "-ac", "1",               # mono
        "-ar", "16000",           # 16 kHz
        "-c:a", "pcm_s16le",      # PCM 16 bits (WAV standard)
        wav_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        # Nettoyage puis erreur explicite.
        if os.path.exists(wav_path):
            os.remove(wav_path)
        raise RuntimeError(f"Échec de l'extraction audio (ffmpeg) : {result.stderr.strip()}")

    return wav_path
