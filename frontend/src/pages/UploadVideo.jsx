import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header.jsx'
import { CATEGORIES } from '../data/mockVideos.js'

export default function UploadVideo() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [videoFile, setVideoFile] = useState(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: CATEGORIES[0],
    visibility: 'all'
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleFile = (file) => {
    if (!file) return
    if (!file.type.startsWith('video/')) {
      setError('Le fichier doit être une vidéo (MP4, MOV, AVI...)')
      return
    }
    if (file.size > 2 * 1024 * 1024 * 1024) {
      setError('Fichier trop lourd — 2 Go maximum')
      return
    }
    setError('')
    setVideoFile(file)
    if (!form.title) setForm(f => ({ ...f, title: file.name.replace(/\.[^.]+$/, '') }))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleChange = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!videoFile) { setError('Veuillez sélectionner une vidéo'); return }
    if (!form.title.trim()) { setError('Le titre est requis'); return }
    setError('')
    setSubmitting(true)
    try {
      // TODO: POST /api/videos avec FormData quand le backend sera prêt
      await new Promise(r => setTimeout(r, 1000)) // simulation upload
      navigate('/app')
    } catch {
      setError("Erreur lors de la publication")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <Header />
      <main className="upload-main">
        <div className="upload-header">
          <h1 className="upload-title">Ajouter une vidéo</h1>
        </div>

        <form className="upload-form" onSubmit={handleSubmit}>

          {/* Zone de dépôt */}
          {!videoFile ? (
            <div
              className={`upload-dropzone ${dragging ? 'dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-drop-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <p className="upload-drop-title">Glissez votre vidéo ici</p>
              <p className="upload-drop-sub">MP4, MOV, AVI — 2 Go max</p>
              <button type="button" className="upload-drop-btn">Parcourir les fichiers</button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="upload-preview">
              <div className="upload-preview-thumb">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </div>
              <div className="upload-preview-info">
                <p className="upload-preview-name">{videoFile.name}</p>
                <p className="upload-preview-size">{(videoFile.size / 1024 / 1024).toFixed(1)} Mo</p>
              </div>
              <button
                type="button"
                className="upload-preview-change"
                onClick={() => { setVideoFile(null); setError('') }}
              >
                Changer
              </button>
            </div>
          )}

          {/* Informations */}
          <div className="upload-card">
            <p className="upload-card-title">Informations</p>

            <div className="upload-field">
              <label>Titre <span className="upload-required">*</span></label>
              <input
                type="text"
                placeholder="Ex : Onboarding développeurs 2026"
                value={form.title}
                onChange={handleChange('title')}
                required
              />
            </div>

            <div className="upload-field">
              <label>Description</label>
              <textarea
                placeholder="Décrivez le contenu de cette vidéo..."
                value={form.description}
                onChange={handleChange('description')}
                rows={3}
              />
            </div>

            <div className="upload-field-row">
              <div className="upload-field">
                <label>Catégorie <span className="upload-required">*</span></label>
                <select value={form.category} onChange={handleChange('category')}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="upload-field">
                <label>Visibilité</label>
                <select value={form.visibility} onChange={handleChange('visibility')}>
                  <option value="all">Tous les utilisateurs</option>
                  <option value="admin">Admins uniquement</option>
                </select>
              </div>
            </div>
          </div>

          {error && <p className="upload-error">{error}</p>}

          <div className="upload-actions">
            <button type="button" className="upload-btn-cancel" onClick={() => navigate('/app')}>
              Annuler
            </button>
            <button type="submit" className="upload-btn-publish" disabled={submitting}>
              {submitting ? 'Publication...' : 'Publier'}
            </button>
          </div>

        </form>
      </main>
    </div>
  )
}
