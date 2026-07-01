import React, { useRef } from 'react'
import { BADGE_STYLES } from '../data/mockVideos.js'

// Capture le premier frame de la vidéo comme thumbnail
function VideoThumb({ src, gradient }) {
  const videoRef = useRef(null)

  const handleLoaded = (e) => {
    const v = e.target
    v.currentTime = 2 // se place à 2s pour avoir un frame intéressant
    v.pause()
  }

  if (!src) {
    return <div style={{ position:'absolute', inset:0, background: gradient }} />
  }

  return (
    <video
      ref={videoRef}
      src={src}
      muted
      playsInline
      preload="metadata"
      onLoadedData={handleLoaded}
      style={{
        position:'absolute', inset:0,
        width:'100%', height:'100%',
        objectFit:'cover',
        transition:'transform 0.5s cubic-bezier(0.4,0,0.2,1)'
      }}
      className="vcard-thumb-inner"
    />
  )
}

export default function VideoCard({ video, onClick }) {
  const badge = BADGE_STYLES[video.category] || { bg: '#F3F4F6', color: '#374151' }
  const statusLabel = video.progress === 100 ? 'Terminé' : video.progress > 0 ? 'En cours' : null
  const statusBg    = video.progress === 100 ? 'rgba(21,128,61,0.85)' : 'rgba(124,58,237,0.85)'

  return (
    <div className="vcard" onClick={() => onClick?.(video)}>
      <div className="vcard-thumb">
        <VideoThumb src={video.src} gradient={video.gradient} />
        <div className="vcard-overlay">
          <div className="vcard-play">
            <svg width="14" height="16" viewBox="0 0 14 16" fill="#F97316">
              <path d="M0 0L14 8L0 16V0Z"/>
            </svg>
          </div>
        </div>
        <span className="vcard-duration">{video.duration}</span>
        {statusLabel && (
          <span className="vcard-status" style={{ background: statusBg }}>{statusLabel}</span>
        )}
      </div>

      <div className="vcard-progress">
        <div className="vcard-progress-fill" style={{ width: `${video.progress}%` }} />
      </div>

      <div className="vcard-body">
        <p className="vcard-title">{video.title}</p>
        <div className="vcard-meta">
          <span className="vcard-date">{video.addedAt}</span>
          <span className="vcard-badge" style={{ background: badge.bg, color: badge.color }}>
            {video.category}
          </span>
        </div>
      </div>
    </div>
  )
}
