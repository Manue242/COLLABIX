// Cache local des résultats IA (/process) par nom de fichier, pour que le player
// puisse afficher les chapitres générés même si /process a fini après la navigation
// (traitement en arrière-plan) ou lors d'une visite ultérieure de la même vidéo.
// Pas de backend pour persister ça côté ai-api — localStorage suffit pour une démo.
const PREFIX = 'collabix:chapters:'

export function cacheChapters(filename, chapters) {
  if (!filename || !chapters?.length) return
  try {
    localStorage.setItem(PREFIX + filename, JSON.stringify(chapters))
  } catch {}
}

export function getCachedChapters(filename) {
  if (!filename) return []
  try {
    const raw = localStorage.getItem(PREFIX + filename)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// Statut du traitement IA en arrière-plan — /upload navigue immédiatement vers
// le player sans attendre /process, donc rien ne prouvait visuellement que
// l'indexation avait réellement lieu. Ce flag rend ça visible dans le player.
const STATUS_PREFIX = 'collabix:ai-status:'

export function setAiStatus(filename, status) {
  if (!filename) return
  try {
    localStorage.setItem(STATUS_PREFIX + filename, status)
  } catch {}
}

export function getAiStatus(filename) {
  if (!filename) return null
  try {
    return localStorage.getItem(STATUS_PREFIX + filename)
  } catch {
    return null
  }
}
