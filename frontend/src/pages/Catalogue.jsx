import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import VideoCard from '../components/VideoCard.jsx'
import { SkeletonGrid } from '../components/Skeleton.jsx'
import { mockVideos, CATEGORIES } from '../data/mockVideos.js'
import useFakeLoading from '../hooks/useFakeLoading.js'

export default function Catalogue() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [activeCategory, setActiveCategory] = useState(
    searchParams.get('cat') || 'Toutes'
  )
  const loading = useFakeLoading(1000)

  const categories = ['Toutes', ...CATEGORIES]
  const filtered = activeCategory === 'Toutes'
    ? mockVideos
    : mockVideos.filter(v => v.category === activeCategory)

  return (
    <div className="page">
      <Header />
      <main className="catalogue-main">
        <h1 className="catalogue-title">Catalogue</h1>

        <div className="catalogue-filters">
          {categories.map(cat => (
            <button
              key={cat}
              className={`catalogue-filter-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="page-enter"><SkeletonGrid count={9} /></div>
        ) : (
          <div className="catalogue-grid page-enter">
            {filtered.map(v => (
              <VideoCard
                key={v.id}
                video={v}
                onClick={() => navigate(`/app/player/${v.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
