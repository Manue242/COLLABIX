import React, { useState, useRef } from 'react'
import Header from '../components/Header.jsx'

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
      setResult(await res.json())
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
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem' }}>

        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>Indexation sémantique IA</h1>
          <p style={{ color: 'var(--text-muted, #888)', fontSize: '0.9rem' }}>
            Transcription, résumé, chapitres, mots-clés et recherche vectorielle — 100% local.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', borderBottom: '1px solid #2a2a3a' }}>
          {[['process', 'Traiter une vidéo'], ['search', 'Recherche sémantique']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '0.5rem 1.2rem', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: tab === key ? 700 : 400,
              color: tab === key ? '#7C3AED' : 'inherit',
              borderBottom: tab === key ? '2px solid #7C3AED' : '2px solid transparent',
              marginBottom: -1,
            }}>{label}</button>
          ))}
        </div>

        {/* ── PROCESS TAB ── */}
        {tab === 'process' && (
          <form onSubmit={handleProcess}>
            {/* File picker */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed #3a3a5a', borderRadius: 12, padding: '2rem',
                textAlign: 'center', cursor: 'pointer', marginBottom: '1.5rem',
                background: videoFile ? '#1a1a2e' : 'transparent',
              }}
            >
              {videoFile
                ? <p style={{ margin: 0 }}>📹 <strong>{videoFile.name}</strong> ({(videoFile.size / 1024 / 1024).toFixed(1)} Mo) — <span style={{ color: '#7C3AED', textDecoration: 'underline' }}>Changer</span></p>
                : <><p style={{ margin: '0 0 4px' }}>Glissez ou cliquez pour choisir une vidéo</p><p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>MP4, MOV, WEBM</p></>
              }
              <input ref={fileInputRef} type="file" accept="video/*" style={{ display: 'none' }}
                onChange={e => setVideoFile(e.target.files[0])} />
            </div>

            {/* Options */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.85rem' }}>
                Langue cible
                <select value={options.target_lang} onChange={e => setOptions(o => ({ ...o, target_lang: e.target.value }))}
                  style={{ padding: '0.4rem', borderRadius: 6, background: '#1a1a2e', border: '1px solid #3a3a5a', color: 'inherit' }}>
                  <option value="fr">Français</option>
                  <option value="en">Anglais</option>
                  <option value="es">Espagnol</option>
                  <option value="de">Allemand</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.85rem' }}>
                Modèle Whisper
                <select value={options.model_size} onChange={e => setOptions(o => ({ ...o, model_size: e.target.value }))}
                  style={{ padding: '0.4rem', borderRadius: 6, background: '#1a1a2e', border: '1px solid #3a3a5a', color: 'inherit' }}>
                  <option value="tiny">tiny — rapide</option>
                  <option value="base">base — équilibré</option>
                  <option value="small">small — précis</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              {[['skip_translation', 'Passer traduction'], ['skip_summary', 'Passer résumé'], ['skip_chapters', 'Passer chapitres']].map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={options[key]} onChange={e => setOptions(o => ({ ...o, [key]: e.target.checked }))} />
                  {label}
                </label>
              ))}
            </div>

            {processError && <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{processError}</p>}

            <button type="submit" disabled={!videoFile || processing}
              style={{ padding: '0.6rem 2rem', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, opacity: (!videoFile || processing) ? 0.5 : 1 }}>
              {processing ? 'Traitement en cours… (peut prendre plusieurs minutes)' : 'Lancer le traitement'}
            </button>

            {/* Results */}
            {result && (
              <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Info vidéo */}
                <Section title="Vidéo">
                  <Row k="Fichier" v={result.video.filename} />
                  <Row k="Langue détectée" v={result.video.language} />
                  <Row k="Durée" v={fmt(result.video.durationSec)} />
                </Section>

                {/* Résumé */}
                {result.summary && (
                  <Section title="Résumé">
                    <p style={{ margin: '0 0 8px', fontStyle: 'italic' }}>{result.summary.short}</p>
                    <p style={{ margin: '0 0 8px', fontSize: '0.9rem', color: '#ccc' }}>{result.summary.detailed}</p>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                      {result.summary.bullets?.map((b, i) => <li key={i} style={{ fontSize: '0.85rem', marginBottom: 4 }}>{b}</li>)}
                    </ul>
                  </Section>
                )}

                {/* Chapitres */}
                {result.chapters?.length > 0 && (
                  <Section title="Chapitres">
                    {result.chapters.map((c, i) => (
                      <div key={i} style={{ borderLeft: '3px solid #7C3AED', paddingLeft: 12, marginBottom: 12 }}>
                        <p style={{ margin: '0 0 2px', fontWeight: 600 }}>{fmt(c.start)} — {c.title}</p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#aaa' }}>{c.summary}</p>
                      </div>
                    ))}
                  </Section>
                )}

                {/* Mots-clés */}
                {result.keywords?.length > 0 && (
                  <Section title="Mots-clés">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {result.keywords.map((k, i) => (
                        <span key={i} style={{ background: '#2a1a4e', color: '#c084fc', padding: '3px 10px', borderRadius: 20, fontSize: '0.8rem' }}>
                          {k.term} <span style={{ opacity: 0.6 }}>({(k.score * 100).toFixed(0)}%)</span>
                        </span>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Transcription */}
                <Section title="Transcription">
                  <div style={{ maxHeight: 200, overflowY: 'auto', fontSize: '0.85rem', lineHeight: 1.6, color: '#ccc' }}>
                    {result.transcript.segments?.map((s, i) => (
                      <p key={i} style={{ margin: '0 0 4px' }}>
                        <span style={{ color: '#7C3AED', marginRight: 8, fontSize: '0.8rem' }}>{fmt(s.start)}</span>
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
            <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
              <input
                type="text"
                placeholder="Ex : chiffrement des données, introduction au sujet…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: 8, background: '#1a1a2e', border: '1px solid #3a3a5a', color: 'inherit', fontSize: '0.95rem' }}
              />
              <button type="submit" disabled={!query.trim() || searching}
                style={{ padding: '0.6rem 1.5rem', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                {searching ? '…' : 'Rechercher'}
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '1.5rem' }}>
              Recherche dans toutes les vidéos déjà traitées via l'onglet "Traiter une vidéo".
            </p>

            {searchError && <p style={{ color: '#ef4444' }}>{searchError}</p>}

            {searchResults && (
              searchResults.results.length === 0
                ? <p style={{ color: '#888' }}>Aucun résultat — traitez d'abord des vidéos.</p>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {searchResults.results.map((r, i) => (
                    <div key={i} style={{ background: '#1a1a2e', borderRadius: 10, padding: '1rem', borderLeft: '3px solid #7C3AED' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.filename}</span>
                        <span style={{ fontSize: '0.8rem', color: '#7C3AED' }}>{fmt(r.start)} → {fmt(r.end)}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#ccc' }}>{r.text}</p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#666' }}>Score : {(r.score * 100).toFixed(0)}%</p>
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
    <div style={{ background: '#12121e', borderRadius: 12, padding: '1.2rem' }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#7C3AED' }}>{title}</h3>
      {children}
    </div>
  )
}

function Row({ k, v }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 6, fontSize: '0.9rem' }}>
      <span style={{ color: '#888', minWidth: 140 }}>{k}</span>
      <span>{v}</span>
    </div>
  )
}
