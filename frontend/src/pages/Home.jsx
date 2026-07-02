import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header.jsx'
import VideoRow from '../components/VideoRow.jsx'
import { SkeletonRow } from '../components/Skeleton.jsx'
import { mockVideos, CATEGORIES } from '../data/mockVideos.js'
import { fetchUploadedVideos, UPLOADED_CATEGORY } from '../utils/uploadedVideos.js'
import useFakeLoading from '../hooks/useFakeLoading.js'

export default function Home() {
  const navigate = useNavigate()
  const loading = useFakeLoading(1200)
  const [uploaded, setUploaded] = useState([])

  useEffect(() => { fetchUploadedVideos().then(setUploaded) }, [])

  // 4 vidéos les plus récentes
  const recent = mockVideos.slice(0, 4)

  const handleVideoClick = (video) => {
    navigate(`/app/player/${video.id}`)
  }

  return (
    <div className="page">
      <Header />
      <main className="home-main">

        {loading ? (
          // ── Skeleton ──
          <div className="page-enter">
            <SkeletonRow count={4} title={false} />
            <SkeletonRow count={4} />
            <SkeletonRow count={4} />
          </div>
        ) : (
          // ── Contenu réel ──
          <div className="page-enter">
        <div className="home-section-top">
          <span className="home-section-label">Récemment ajoutées</span>
          <button className="home-upload-btn" onClick={() => navigate("/upload")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Uploader une vidéo
          </button>
        </div>
        <VideoRow
          videos={recent}
          onVideoClick={handleVideoClick}
        />

        {/* Vidéos uploadées par les utilisateurs */}
        {uploaded.length > 0 && (
          <VideoRow
            title={UPLOADED_CATEGORY}
            videos={uploaded}
            onSeeAll={() => navigate(`/catalogue?cat=${encodeURIComponent(UPLOADED_CATEGORY)}`)}
            onVideoClick={handleVideoClick}
          />
        )}

        {/* Une section par catégorie */}
        {CATEGORIES.map(cat => {
          const videos = mockVideos.filter(v => v.category === cat)
          if (!videos.length) return null
          return (
            <VideoRow
              key={cat}
              title={cat}
              videos={videos}
              onSeeAll={() => navigate(`/catalogue?cat=${encodeURIComponent(cat)}`)}
              onVideoClick={handleVideoClick}
            />
          )
        })}
        </div>
        )}

      </main>
    </div>
  )
}
