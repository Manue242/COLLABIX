// Récupère les vidéos réellement uploadées sur le backend (GET /api/videos/)
// et les met en forme comme les entrées de mockVideos.js, pour qu'elles
// s'affichent normalement dans Home/Catalogue via VideoCard/VideoRow.
export const UPLOADED_CATEGORY = 'Vos vidéos'

export async function fetchUploadedVideos() {
  try {
    const res = await fetch('/api/videos/')
    if (!res.ok) return []
    const files = await res.json()
    return files.map(f => ({
      id: f.filename,
      title: f.title || f.filename.replace(/\.[^.]+$/, ''),
      description: f.description || '',
      realCategory: f.category || '',
      category: UPLOADED_CATEGORY,
      duration: '',
      addedAt: 'Ajoutée récemment',
      progress: 0,
      gradient: 'linear-gradient(135deg,#1e1b4b,#4338ca)',
      src: f.url,
      editable: true,
    }))
  } catch {
    return []
  }
}
