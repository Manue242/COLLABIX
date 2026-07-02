import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import VideoCard from '../components/VideoCard.jsx'
import { SkeletonGrid } from '../components/Skeleton.jsx'
import { mockVideos, CATEGORIES } from '../data/mockVideos.js'
import { fetchUploadedVideos, UPLOADED_CATEGORY } from '../utils/uploadedVideos.js'
import useFakeLoading from '../hooks/useFakeLoading.js'

export default function Catalogue() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [activeCategory, setActiveCategory] = useState(
    searchParams.get('cat') || 'Toutes'
  )
  const [uploaded, setUploaded] = useState([])
  const [editing, setEditing] = useState(null) // vidéo en cours d'édition
  const [editForm, setEditForm] = useState({ title: '', description: '', category: '' })
  const loading = useFakeLoading(1000)

  const reloadUploaded = () => fetchUploadedVideos().then(setUploaded)
  useEffect(() => { reloadUploaded() }, [])

  const allVideos = [...uploaded, ...mockVideos]
  const categories = ['Toutes', ...CATEGORIES, ...(uploaded.length ? [UPLOADED_CATEGORY] : [])]
  const filtered = activeCategory === 'Toutes'
    ? allVideos
    : allVideos.filter(v => v.category === activeCategory)

  const openEdit = (video) => {
    setEditing(video)
    setEditForm({ title: video.title, description: video.description || '', category: video.realCategory || '' })
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    const formData = new FormData()
    formData.append('title', editForm.title)
    formData.append('description', editForm.description)
    formData.append('category', editForm.category)
    await fetch(`/api/videos/${encodeURIComponent(editing.id)}`, { method: 'PATCH', body: formData }).catch(() => {})
    setEditing(null)
    reloadUploaded()
  }

  const handleDelete = async (video) => {
    if (!window.confirm(`Supprimer « ${video.title} » ? Cette action est définitive.`)) return
    await fetch(`/api/videos/${encodeURIComponent(video.id)}`, { method: 'DELETE' }).catch(() => {})
    reloadUploaded()
  }

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
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {editing && (
          <div className="modal-overlay" onClick={() => setEditing(null)}>
            <form className="modal-card" onClick={e => e.stopPropagation()} onSubmit={saveEdit}>
              <h2>Modifier la vidéo</h2>
              <label>Titre
                <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} required />
              </label>
              <label>Description
                <textarea rows={3} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
              </label>
              <label>Catégorie
                <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="">—</option>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
              <div className="modal-actions">
                <button type="button" onClick={() => setEditing(null)}>Annuler</button>
                <button type="submit" className="primary">Enregistrer</button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
