import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import AnnotatedReviewPlayer from '../components/AnnotatedReviewPlayer.jsx'
import { mockVideos } from '../data/mockVideos.js'
import { getCachedChapters } from '../utils/aiCache.js'

// Page de routage — résout la source vidéo depuis l'URL et délègue tout le reste
// au composant réutilisable AnnotatedReviewPlayer (video src / user / session en props).
export default function PlayerPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const mock = mockVideos.find(v => v.id === id)
  const videoSrc = mock ? mock.src : `/videos/${id}`
  // Le flux HLS chiffré démo n'existe que pour les vidéos servies par le backend
  // (pas pour les URLs mock externes) — repli automatique sur le MP4 s'il est absent.
  const hlsSrc = mock ? null : '/hls/playlist.m3u8'
  // Chapitres IA mis en cache localement lors d'un /process précédent (upload ou page /ai)
  const chapters = getCachedChapters(id)

  return (
    <AnnotatedReviewPlayer
      videoSrc={videoSrc}
      hlsSrc={hlsSrc}
      user={user}
      sessionId={id}
      title={mock?.title || id}
      category={mock?.category || ''}
      chapters={chapters}
      onBack={() => navigate('/app')}
    />
  )
}
