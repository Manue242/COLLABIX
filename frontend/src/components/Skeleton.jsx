import React from 'react'

// Bloc skeleton générique
export function SkeletonBlock({ width = '100%', height = 16, radius = 6, style = {} }) {
  return (
    <div className="skeleton-block" style={{ width, height, borderRadius: radius, ...style }} />
  )
}

// Card vidéo skeleton
export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-block skeleton-thumb" />
      <div className="skeleton-card-body">
        <div className="skeleton-block" style={{ height: 13, width: '85%', marginBottom: 8 }} />
        <div className="skeleton-block" style={{ height: 11, width: '55%' }} />
      </div>
    </div>
  )
}

// Ligne de cards skeleton
export function SkeletonRow({ count = 4, title = true }) {
  return (
    <div className="skeleton-row-section">
      {title && (
        <div className="skeleton-row-header">
          <div className="skeleton-block" style={{ height: 15, width: 140, borderRadius: 6 }} />
        </div>
      )}
      <div className="skeleton-row-cards">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}

// Grille skeleton pour le catalogue
export function SkeletonGrid({ count = 9 }) {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
