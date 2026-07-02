import React, { useState, useRef } from 'react'
import Header from '../components/Header.jsx'
import { cacheChapters } from '../utils/aiCache.js'

export default function AIPage() {
  const fileInputRef = useRef(null)
  const [tab, setTab] = useState('process')

  // -- Process --
  const [videoFile, setVideoFile] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const [processError, setProcessError] = useState('')
  const [options, setOptions] = useState({
    target_lang: 'fr',
    model_size: 'tiny',
    skip_translation: false,
    skip_summary: false,
    skip_chapters: false,
  })

  // -- Search --
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState(null)
  const [searchError, setSearchError] = useState('')

  const handleProcess = async (e) => {
    e.preventDefault()
    if (!videoFile) return
    setProcessing(true)
    setResult(null)
    setProcessError('')
    try {
      const params = new URLSearchParams({
        target_lang: options.target_lang,
        model_size: options.model_size,
        skip_translation: options.skip_translation,
        skip_summary: options.skip_summary,
        skip_chapters: options.skip_chapters,
      })
      const formData = new FormData()
      formData.append('file', videoFile)
      const res = await fetch(`/process?${params}`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      const data = await res.json()
      setResult(data)
      if (data.chapters) cacheChapters(videoFile.name, data.chapters)
    } catch (err) {
      setProcessError(err.message || 'Erreur lors du traitement')
    } finally {
      setProcessing(false)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setSearchResults(null)
    setSearchError('')
    try {
      const res = await fetch('/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, top_k: 5 }),
      })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      setSearchResults(await res.json())
    } catch (err) {
      setSearchError(err.message || 'Erreur de recherche')
    } finally {
      setSearching(false)
    }
  }

  const fmt = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="page">
      <Header />
      <main className="ai-main">

        <div className="ai-header">
          <h1 className="ai-title">Indexation sémantique IA</h1>
          <p className="ai-subtitle">
            Transcription, résumé, chapitres, mots-clés et recherche vectorielle — 100% local.
          </p>
        </div>

        {/* Tabs */}
        <div className="ai-tabs">
          {[['process', 'Traiter une vidéo'], ['search', 'Recherche sémantique']].map(([key, label]) => (
            <button key={key} className={`ai-tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>

        {/* ── PROCESS TAB ── */}
        {tab === 'process' && (
          <form onSubmit={handleProcess}>
            {/* File picker */}
            <div
              className={`ai-dropzone ${videoFile ? 'has-file' : ''}`}
              onClick={() => fileInputRef.current?.click()}
            >
              {videoFile ? (
                <p className="ai-dropzone-file">
                  📹 <strong>{videoFile.name}</strong> ({(videoFile.size / 1024 / 1024).toFixed(1)} Mo) — <span className="ai-dropzone-change">Changer</span>
                </p>
              ) : (
                <>
                  <p className="ai-dropzone-title">Glissez ou cliquez pour choisir une vidéo</p>
                  <p className="ai-dropzone-sub">MP4, MOV, WEBM</p>
                </>
              )}
              <input ref={fileInputRef} type="file" accept="video/*" style={{ display: 'none' }}
                onChange={e => setVideoFile(e.target.files[0])} />
            </div>

            {/* Options */}
            <div className="ai-options-grid">
              <label className="ai-option-field">
                Langue cible
                <select value={options.target_lang} onChange={e => setOptions(o => ({ ...o, target_lang: e.target.value }))}>
                  <option value="fr">Français</option>
                  <option value="en">Anglais</option>
                  <option value="es">Espagnol</option>
                  <option value="de">Allemand</option>
                </select>
              </label>
              <label className="ai-option-field">
                Modèle Whisper
                <select value={options.model_size} onChange={e => setOptions(o => ({ ...o, model_size: e.target.value }))}>
                  <option value="tiny">tiny — rapide</option>
                  <option value="base">base — équilibré</option>
                  <option value="small">small — précis</option>
                </select>
              </label>
            </div>
            <div className="ai-skip-options">
              {[['skip_translation', 'Passer traduction'], ['skip_summary', 'Passer résumé'], ['skip_chapters', 'Passer chapitres']].map(([key, label]) => (
                <label key={key} className="ai-skip-item">
                  <input type="checkbox" checked={options[key]} onChange={e => setOptions(o => ({ ...o, [key]: e.target.checked }))} />
                  {label}
                </label>
              ))}
            </div>

            {processError && <p className="ai-error">{processError}</p>}

            <button type="submit" className="ai-submit-btn" disabled={!videoFile || processing}>
              {processing ? 'Traitement en cours… (peut prendre plusieurs minutes)' : 'Lancer le traitement'}
            </button>

            {/* Results */}
            {result && (
              <div className="ai-results">

                {/* Info vidéo */}
                <Section title="Vidéo">
                  <Row k="Fichier" v={result.video.filename} />
                  <Row k="Langue détectée" v={result.video.language} />
                  <Row k="Durée" v={fmt(result.video.durationSec)} />
                </Section>

                {/* Résumé */}
                {result.summary && (
                  <Section title="Résumé">
                    <p className="ai-summary-short">{result.summary.short}</p>
                    <p className="ai-summary-detailed">{result.summary.detailed}</p>
                    <ul className="ai-summary-bullets">
                      {result.summary.bullets?.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  </Section>
                )}

                {/* Chapitres */}
                {result.chapters?.length > 0 && (
                  <Section title="Chapitres">
                    {result.chapters.map((c, i) => (
                      <div key={i} className="ai-chapter-item">
                        <p className="ai-chapter-title">{fmt(c.start)} — {c.title}</p>
                        <p className="ai-chapter-summary">{c.summary}</p>
                      </div>
                    ))}
                  </Section>
                )}

                {/* Mots-clés */}
                {result.keywords?.length > 0 && (
                  <Section title="Mots-clés">
                    <div className="ai-keywords">
                      {result.keywords.map((k, i) => (
                        <span key={i} className="ai-keyword-chip">
                          {k.term} <span className="ai-keyword-score">({(k.score * 100).toFixed(0)}%)</span>
                        </span>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Transcription */}
                <Section title="Transcription">
                  <div className="ai-transcript">
                    {result.transcript.segments?.map((s, i) => (
                      <p key={i} className="ai-transcript-line">
                        <span className="ai-transcript-time">{fmt(s.start)}</span>
                        {s.text}
                      </p>
                    ))}
                  </div>
                </Section>

              </div>
            )}
          </form>
        )}

        {/* ── SEARCH TAB ── */}
        {tab === 'search' && (
          <form onSubmit={handleSearch}>
            <div className="ai-search-row">
              <input
                type="text"
                placeholder="Ex : chiffrement des données, introduction au sujet…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <button type="submit" disabled={!query.trim() || searching}>
                {searching ? '…' : 'Rechercher'}
              </button>
            </div>
            <p className="ai-search-hint">
              Recherche dans toutes les vidéos déjà traitées via l'onglet "Traiter une vidéo".
            </p>

            {searchError && <p className="ai-error">{searchError}</p>}

            {searchResults && (
              searchResults.results.length === 0
                ? <p className="ai-empty">Aucun résultat — traitez d'abord des vidéos.</p>
                : <div className="ai-search-results">
                  {searchResults.results.map((r, i) => (
                    <div key={i} className="ai-result-card">
                      <div className="ai-result-head">
                        <span className="ai-result-filename">{r.filename}</span>
                        <span className="ai-result-time">{fmt(r.start)} → {fmt(r.end)}</span>
                      </div>
                      <p className="ai-result-text">{r.text}</p>
                      <p className="ai-result-score">Score : {(r.score * 100).toFixed(0)}%</p>
                    </div>
                  ))}
                </div>
            )}
          </form>
        )}
      </main>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="ai-section">
      <h3 className="ai-section-title">{title}</h3>
      {children}
    </div>
  )
}

function Row({ k, v }) {
  return (
    <div className="ai-row">
      <span className="ai-row-key">{k}</span>
      <span>{v}</span>
    </div>
  )
}
