/**
 * Sérialise l'état complet (annotations + commentaires) en JSON,
 * conformément au livrable attendu : "Composant autonome exportant
 * les annotations en JSON".
 */
export function exportAnnotations({ videoSrc, annotations, comments }) {
  const payload = {
    videoSrc,
    exportedAt: new Date().toISOString(),
    annotations,
    comments
  }
  return JSON.stringify(payload, null, 2)
}

/**
 * Déclenche le téléchargement du JSON dans le navigateur.
 */
export function downloadAnnotationsAsFile(data, filename = 'annotations.json') {
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
