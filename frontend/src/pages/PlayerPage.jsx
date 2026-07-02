import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import AnnotationCanvas from '../components/AnnotationCanvas.jsx'
import ReviewFeed from '../components/ReviewFeed.jsx'
import ColorPicker from '../components/ColorPicker.jsx'
import useWebSocket from '../hooks/useWebSocket.js'
import { exportAnnotations, downloadAnnotationsAsFile } from '../utils/exportAnnotations.js'
import { mockVideos } from '../data/mockVideos.js'

const WS_URL = import.meta.env.VITE_WS_URL || null

const TOOLS = [
  { id: 'cursor',    label: 'Curseur',   icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M4 0l16 12-7 1-4 8z" transform="scale(0.85) translate(2,1)"/></svg> },
  { id: 'arrow',     label: 'Flèche',    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="9 5 19 5 19 15"/></svg> },
  { id: 'rectangle', label: 'Rectangle', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="6" width="18" height="12" rx="1"/></svg> },
  { id: 'ellipse',   label: 'Ellipse',   icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="12" rx="10" ry="6"/></svg> },
  { id: 'free',      label: 'Libre',     icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 17c2-4 4-6 6-4s3 5 5 4 3-4 4-6"/></svg> },
  { id: 'text',      label: 'Texte',     icon: <span style={{fontWeight:700,fontSize:14}}>T</span> },
]

// Icône "Annoter" — crayon qui dessine sur un écran
function AnnotateIcon({ active }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

export default function PlayerPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const videoRef   = useRef(null)
  const wrapRef    = useRef(null)
  const sidebarRef = useRef(null)
  const dragRef2   = useRef(null) // pour le resize (différent du drag texte)

  const [currentTime,  setCurrentTime]  = useState(0)
  const [duration,     setDuration]     = useState(0)
  const [playing,      setPlaying]      = useState(false)
  const [muted,        setMuted]        = useState(false)
  const [volume,       setVolume]       = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [dimensions,   setDimensions]   = useState({ width: 0, height: 0 })

  // Panneaux
  const [showToolbar,  setShowToolbar]  = useState(false)
  const [showSidebar,  setShowSidebar]  = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(300)

  // Annotation
  const [tool, setTool] = useState('cursor')
  const [color,       setColor]       = useState('#F97316')
  const [annotations, setAnnotations] = useState([])
  const [comments,    setComments]    = useState([])

  const { isConnected, messages, send } = useWebSocket(WS_URL)
  const video = mockVideos.find(v => v.id === id) || mockVideos[0]

  useEffect(() => {
    messages.forEach(msg => {
      if (msg.type === 'annotation')   setAnnotations(p => [...p, msg.payload])
      if (msg.type === 'comment')      setComments(p => [...p, msg.payload])
    })
  }, [messages])

  // Mesure canvas
  useEffect(() => {
    const measure = () => {
      const v = videoRef.current
      if (v) setDimensions({ width: v.clientWidth, height: v.clientHeight })
    }
    const v = videoRef.current
    if (v) v.addEventListener('loadedmetadata', measure)
    window.addEventListener('resize', measure)
    const ro = new ResizeObserver(measure)
    if (v) ro.observe(v)
    return () => { v?.removeEventListener('loadedmetadata', measure); window.removeEventListener('resize', measure); ro.disconnect() }
  }, [])

  // Fullscreen
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      setTimeout(() => {
        const v = videoRef.current
        if (v) setDimensions({ width: v.clientWidth, height: v.clientHeight })
      }, 100)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // ── Drag resize sidebar ────────────────────────────────────
  const startResize = (e) => {
    dragRef2.current = { startX: e.clientX, startW: sidebarWidth }
    const onMove = (ev) => {
      const delta = dragRef2.current.startX - ev.clientX
      const newW  = Math.max(220, Math.min(500, dragRef2.current.startW + delta))
      setSidebarWidth(newW)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const [playEffect, setPlayEffect] = useState(null) // 'play' | 'pause' | null

  const togglePlay = () => {
    if (!videoRef.current) return
    if (playing) {
      videoRef.current.pause()
      setPlayEffect('pause')
    } else {
      videoRef.current.play()
      setPlayEffect('play')
    }
    setTimeout(() => setPlayEffect(null), 600)
  }
  const toggleMute = () => { const m = !muted; videoRef.current && (videoRef.current.muted = m); setMuted(m) }
  const handleVolume = (e) => { const v = parseFloat(e.target.value); videoRef.current && (videoRef.current.volume = v, videoRef.current.muted = v === 0); setVolume(v); setMuted(v === 0) }
  const handleSeekBar = (e) => { const r = (e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.clientWidth; if (videoRef.current) videoRef.current.currentTime = r * duration }
  const toggleFullscreen = () => { document.fullscreenElement ? document.exitFullscreen() : wrapRef.current?.requestFullscreen() }

  const handleAnnotationCreate = (a) => { setAnnotations(p => [...p, a]); send('annotation', a) }
  const handleAnnotationDelete  = (id) => { setAnnotations(p => p.filter(a => a.id !== id)); send('annotationDelete', { id }) }
  const handleAnnotationsClear  = ()   => { setAnnotations([]); send('annotationsClear', {}) }
  const handleAddComment        = (c)  => { setComments(p => [...p, c]); send('comment', c) }
  const handleSeekTime          = (t)  => { if (videoRef.current) videoRef.current.currentTime = t }
  const handleExport            = ()   => downloadAnnotationsAsFile(exportAnnotations({ videoSrc: video.title, annotations, comments }), `annotations-${video.id}.json`)

  const undoLast = () => {
    const vis = annotations.filter(a => Math.abs(a.timestamp - currentTime) < 5)
    if (vis.length) handleAnnotationDelete(vis[vis.length - 1].id)
  }

  const fmt = (t) => `${Math.floor(t/60)}:${Math.floor(t%60).toString().padStart(2,'0')}`

  return (
    <div className="player-page">

      {/* ── Header ── */}
      <header className="player-header">
        <button className="player-back" onClick={() => navigate('/app')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M5 12l7 7M5 12l7-7"/></svg>
          Retour
        </button>

        <div className="player-header-title">
          <span className="player-video-title">{video.title}</span>
          <span className="player-video-category">{video.category}</span>
        </div>

        <div className="player-header-right">

          {/* Toggle toolbar annotations */}
          <button
            className={`player-header-btn ${showToolbar ? 'active' : ''}`}
            onClick={() => setShowToolbar(v => !v)}
            title="Outils d'annotation"
          >
            <AnnotateIcon active={showToolbar} />
            <span>Annoter</span>
          </button>

          {/* Toggle sidebar */}
          <button
            className={`player-header-btn ${showSidebar ? 'active' : ''}`}
            onClick={() => setShowSidebar(v => !v)}
            title="Commentaires & annotations"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Commentaires</span>
          </button>

          {/* Export */}
          <button className="player-export-btn" onClick={handleExport}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Exporter
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="player-body">

        {/* ── Zone vidéo ── */}
        <div className="player-left">
          <div className="player-video-outer" ref={wrapRef}>

            {/* Toolbar verticale flottante */}
            {showToolbar && (
              <div className="player-float-toolbar">
                {/* Outils */}
                {TOOLS.map(t => (
                  <button
                    key={t.id}
                    className={`pft-btn ${tool === t.id ? 'active' : ''}`}
                    onClick={() => setTool(t.id)}
                    title={t.label}
                  >
                    {t.icon}
                  </button>
                ))}

                <div className="pft-sep" />

                {/* Color picker intégré */}
                <div className="pft-color-wrap">
                  <ColorPicker color={color} onChange={setColor} vertical />
                </div>

                <div className="pft-sep" />

                {/* Annuler / Effacer */}
                <button className="pft-btn pft-undo" onClick={undoLast}
                  disabled={!annotations.some(a => Math.abs(a.timestamp - currentTime) < 5)}
                  title="Annuler (Ctrl+Z)">
                  ↩
                </button>
                <button className="pft-btn pft-clear" onClick={handleAnnotationsClear}
                  disabled={annotations.length === 0}
                  title="Tout effacer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                </button>
              </div>
            )}

            {/* Vidéo + canvas */}
            <div
              className="player-video-wrap"
              onClick={() => { if (tool === 'cursor') togglePlay() }}
              style={{ cursor: tool === 'cursor' ? 'pointer' : 'default' }}
            >
              {/* Effet play/pause au clic */}
              {playEffect && (
                <div className="player-click-effect">
                  {playEffect === 'play'
                    ? <svg width="48" height="48" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    : <svg width="48" height="48" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  }
                </div>
              )}
              <video
                ref={videoRef}
                src={video.src || ''}
                style={{ width:'100%', display:'block' }}
                onTimeUpdate={e => setCurrentTime(e.target.currentTime)}
                onLoadedMetadata={e => { setDuration(e.target.duration); setDimensions({ width: e.target.clientWidth, height: e.target.clientHeight }) }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                controls={false}
                crossOrigin="anonymous"
              />
              <AnnotationCanvas
                width={dimensions.width} height={dimensions.height}
                currentTime={currentTime} tool={tool} color={color}
                annotations={annotations}
                onAnnotationCreate={tool !== 'cursor' ? handleAnnotationCreate : undefined}
                onAnnotationDelete={handleAnnotationDelete}
                onAnnotationsClear={handleAnnotationsClear}
              />
            </div>

            {/* Contrôles */}
            <div className="player-controls">
              <div className="player-progress-wrap" onClick={handleSeekBar}>
                <div className="player-progress-bg">
                  <div className="player-progress-fill" style={{ width: duration ? `${(currentTime/duration)*100}%` : '0%' }} />
                </div>
              </div>
              <div className="player-controls-row">
                <button className="player-play-btn" onClick={togglePlay}>
                  {playing
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    : <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  }
                </button>
                <span className="player-time">{fmt(currentTime)} / {fmt(duration)}</span>
                <div style={{flex:1}} />
                <div className="player-volume-wrap">                  <button className="player-ctrl-btn" onClick={toggleMute}>
                    {muted || volume === 0
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                    }
                  </button>
                  <input className="player-volume-slider" type="range" min="0" max="1" step="0.05"
                    value={muted ? 0 : volume} onChange={handleVolume}
                    style={{ '--val': `${(muted ? 0 : volume) * 100}` }} />
                </div>
                <button className="player-ctrl-btn" onClick={toggleFullscreen} title="Plein écran">
                  {isFullscreen
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Drag resize handle ── */}
        {showSidebar && (
          <div className="player-drag-handle" onMouseDown={startResize} title="Redimensionner" />
        )}

        {/* ── Sidebar ── */}
        {showSidebar && (
          <div className="player-right" style={{ width: sidebarWidth, minWidth: 220, maxWidth: 500 }}>
            <div className="player-sidebar-title">
              Commentaires
              <button className="player-sidebar-close" onClick={() => setShowSidebar(false)} title="Fermer">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <ReviewFeed
              comments={comments}
              annotations={annotations.map(a => ({ ...a, author: user?.username || 'Vous' }))}
              currentTime={currentTime}
              onAddComment={handleAddComment}
              onSeek={handleSeekTime}
            />
          </div>
        )}
      </div>
    </div>
  )
}
