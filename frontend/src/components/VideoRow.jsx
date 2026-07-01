import React, { useState, useRef, useEffect } from 'react'
import VideoCard from './VideoCard.jsx'

const GAP = 16

export default function VideoRow({ title, videos, onSeeAll, onVideoClick }) {
  const [index, setIndex]         = useState(0)
  const [isMobile, setIsMobile]   = useState(false)
  const [cardWidth, setCardWidth] = useState(0)
  const clipRef = useRef(null)
  const trackRef = useRef(null)

  const perPage  = isMobile ? 2 : 4
  const hasMore  = videos.length > perPage
  const maxIndex = Math.max(0, videos.length - perPage)

  const measure = () => {
    const mobile = window.innerWidth <= 768
    setIsMobile(mobile)
    if (!clipRef.current) return
    const w = clipRef.current.clientWidth
    if (mobile) {
      // Sur mobile : 2 cards + bout de la 3ème visible (~30%)
      // cardWidth = (container - gap) / 2.3 pour laisser dépasser
      setCardWidth((w - GAP) / 2.3)
    } else {
      // Desktop : 4 cards exactes
      setCardWidth((w - GAP * 3) / 4)
    }
  }

  useEffect(() => {
    const t = setTimeout(measure, 30)
    window.addEventListener('resize', measure)
    return () => { clearTimeout(t); window.removeEventListener('resize', measure) }
  }, [])

  useEffect(() => { setIndex(0) }, [isMobile])

  const goLeft  = () => setIndex(i => Math.max(0, i - perPage))
  const goRight = () => setIndex(i => Math.min(maxIndex, i + perPage))
  const translateX = cardWidth ? index * (cardWidth + GAP) : 0

  const Arrow = ({ dir }) => {
    const isLeft   = dir === 'left'
    const canClick = isLeft ? index > 0 : index < maxIndex
    const visible  = !isMobile && hasMore && canClick
    return (
      <button
        className={`vrow-arrow vrow-arrow-${dir}`}
        style={{ visibility: visible ? 'visible' : 'hidden' }}
        onClick={isLeft ? goLeft : goRight}
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          {isLeft ? <path d="M15 18l-6-6 6-6"/> : <path d="M9 18l6-6-6-6"/>}
        </svg>
      </button>
    )
  }

  return (
    <div className="vrow-section">
      <div className="vrow-header">
        <span className="vrow-title">{title}</span>
        {onSeeAll && <button className="vrow-seeall" onClick={onSeeAll}>Voir tout →</button>}
      </div>

      <div className="vrow-wrapper">
        <Arrow dir="left" />

        <div
          className={`vrow-clip ${isMobile ? 'vrow-clip-mobile' : ''}`}
          ref={clipRef}
        >
          {isMobile ? (
            // Mobile : scroll natif avec overflow-x, bout de card visible
            <div className="vrow-track-mobile" ref={trackRef}>
              {videos.map(v => (
                <div
                  key={v.id}
                  className="vrow-item"
                  style={{ width: cardWidth || 'calc(43vw)', flexShrink: 0 }}
                >
                  <VideoCard video={v} onClick={onVideoClick} />
                </div>
              ))}
            </div>
          ) : (
            // Desktop : carousel par index avec transform
            <div
              className="vrow-track"
              style={{ transform: `translateX(-${translateX}px)` }}
            >
              {videos.map(v => (
                <div
                  key={v.id}
                  className="vrow-item"
                  style={{ width: cardWidth || 'calc(25% - 12px)', flexShrink: 0 }}
                >
                  <VideoCard video={v} onClick={onVideoClick} />
                </div>
              ))}
            </div>
          )}
        </div>

        <Arrow dir="right" />
      </div>
    </div>
  )
}
