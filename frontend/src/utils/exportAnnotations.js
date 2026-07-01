/**
 * Sérialise les annotations au format du backend (compatible POST /api/annotations/import).
 *
 * Format produit :
 * {
 *   version: "1.0",
 *   video_id: "...",
 *   exported_at: "ISO string",
 *   annotations: [{ id, type, content, timestamp, color, user_id }]
 * }
 */
export function exportAnnotations({ videoId, annotations, comments }) {
  const allAnnotations = [
    ...annotations.map(a => ({
      id: a.id,
      type: 'drawing',
      content: JSON.stringify(a),
      timestamp: a.timestamp ?? 0,
      color: a.color ?? '#F97316',
      user_id: a.user_id ?? null,
    })),
    ...comments.map(c => ({
      id: c.id,
      type: 'comment',
      content: c.text,
      timestamp: c.timestamp ?? 0,
      color: '#3B82F6',
      user_id: c.user_id ?? null,
    })),
  ]

  const payload = {
    version: '1.0',
    video_id: videoId,
    exported_at: new Date().toISOString(),
    annotations: allAnnotations,
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
