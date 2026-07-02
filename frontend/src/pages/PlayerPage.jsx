import React, { useRef, useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import AnnotationCanvas from '../components/AnnotationCanvas.jsx'
import CommentThread from '../components/CommentThread.jsx'
import useWebSocket from '../hooks/useWebSocket.js'
import { exportAnnotations, downloadAnnotationsAsFile } from '../utils/exportAnnotations.js'
import ColorPicker from '../components/ColorPicker.jsx'
import { mockVideos } from '../data/mockVideos.js'

const TOOLS = [
  { id: 'arrow',     label: 'Flèche',    icon: '↗' },
  { id: 'rectangle', label: 'Rectangle', icon: '▭' },
  { id: 'ellipse',   label: 'Ellipse',   icon: '○' },
  { id: 'free',      label: 'Libre',     icon: '✏️' },
  { id: 'text',      label: 'Texte',     icon: 'T' },
]

const COLORS = ['#F97316','#EF4444','#F59E0B','#10B981','#3B82F6','#ffffff']

export default function PlayerPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const videoRef   = useRef(null)
  const wrapRef    = useRef(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration,    setDuration]    = useState(0)
  const [playing,     setPlaying]     = useState(false)
  const [dimensions,  setDimensions]  = useState({ width: 0, height: 0 })
  const [tool,        setTool]        = useState('arrow')
  const [color,       setColor]       = useState('#F97316')
  const [annotations, setAnnotations] = useState([])
  const [comments,    setComments]    = useState([])
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // URL WebSocket proxiée par Vite → backend /ws/{video_id}?user_id=...
  const userId = user?.id || user?.email || 'anonymous'
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const WS_URL = `${wsProtocol}//${window.location.host}/ws/${id}?user_id=${encodeURIComponent(userId)}`

  const { isConnected, messages, send } = useWebSocket(WS_URL)
  // Cherche dans mockVideos, sinon construit un objet à partir du filename backend
  const video = mockVideos.find(v => v.id === id) || {
    id,
    title: id,
    category: '',
    src: `/videos/${id}`,
    gradient: 'linear-gradient(135deg,#1e1b4b,#4338ca)',
  }

  // Charger les annotations + commentaires persistés depuis le backend
  useEffect(() => {
    fetch(`/api/annotations?video_id=${id}`)
      .then(r => r.json())
      .then(data => {
        const drawings = data
          .filter(a => a.type === 'drawing')
          .map(a => {
            try {
              return {
                ...JSON.parse(a.content), id: a.id, timestamp: a.timestamp, color: a.color,
                author: a.username || 'Utilisateur', createdAt: a.created_at, user_id: a.user_id ?? null,
              }
            } catch { return null }
          })
          .filter(Boolean)
        const loadedComments = data
          .filter(a => a.type === 'comment')
          .map(a => ({
            id: a.id, text: a.content, timestamp: a.timestamp,
            author: a.username || 'Utilisateur', createdAt: a.created_at, user_id: a.user_id ?? null,
          }))
        setAnnotations(drawings)
        setComments(loadedComments)
      })
      .catch(() => {})
  }, [id])

  // Traiter les messages WS entrants des autres utilisateurs
  useEffect(() => {
    messages.forEach(msg => {
      if (msg.type === 'annotation_added') {
        const a = msg.annotation
        if (a.type === 'comment') {
          setComments(p => p.some(x => x.id === a.id) ? p : [...p, {
            id: a.id, text: a.content, timestamp: a.timestamp,
            author: a.username || 'Utilisateur', createdAt: a.created_at || new Date().toISOString(),
            user_id: a.user_id ?? null,
          }])
        } else {
          try {
            const shape = {
              ...JSON.parse(a.content), id: a.id, timestamp: a.timestamp, color: a.color,
              author: a.username || 'Utilisateur', createdAt: a.created_at, user_id: a.user_id ?? null,
            }
            setAnnotations(p => p.some(x => x.id === a.id) ? p : [...p, shape])
          } catch {}
        }
      } else if (msg.type === 'annotation_deleted') {
        setAnnotations(p => p.filter(a => a.id !== msg.id))
        setComments(p => p.filter(c => c.id !== msg.id))
      }
    })
  }, [messages])

  // Fusionne annotations dessinées + commentaires en une seule timeline triée
  const timelineItems = useMemo(() => {
    const commentItems    = comments.map(c => ({ kind: 'comment', ...c }))
    const annotationItems = annotations.map(a => ({ kind: 'annotation', ...a }))
    return [...commentItems, ...annotationItems].sort((x, y) => x.timestamp - y.timestamp)
  }, [comments, annotations])

  // Mesure la vidéo pour le canvas
  useEffect(() => {
    const measure = () => {
      const v = videoRef.current
      if (v) setDimensions({ width: v.clientWidth, height: v.clientHeight })
    }
    const v = videoRef.current
    if (v) {
      v.addEventListener('loadedmetadata', measure)
    }
    window.addEventListener('resize', measure)
    // ResizeObserver pour fullscreen et autres changements de taille
    const ro = new ResizeObserver(measure)
    if (v) ro.observe(v)
    return () => {
      v?.removeEventListener('loadedmetadata', measure)
      window.removeEventListener('resize', measure)
      ro.disconnect()
    }
  }, [])

  // Fullscreen API
  const toggleFullscreen = () => {
    const el = wrapRef.current
    if (!document.fullscreenElement) {
      el?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      // Remettre à jour les dimensions du canvas après transition fullscreen
      setTimeout(() => {
        const v = videoRef.current
        if (v) setDimensions({ width: v.clientWidth, height: v.clientHeight })
      }, 100)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const togglePlay = () => {
    if (!videoRef.current) return
    playing ? videoRef.current.pause() : videoRef.current.play()
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    const newMuted = !muted
    videoRef.current.muted = newMuted
    setMuted(newMuted)
  }

  const handleVolume = (e) => {
    const val = parseFloat(e.target.value)
    if (!videoRef.current) return
    videoRef.current.volume = val
    videoRef.current.muted = val === 0
    setVolume(val)
    setMuted(val === 0)
  }
  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    if (videoRef.current) videoRef.current.currentTime = ratio * duration
  }
  const handleAnnotationCreate = async (a) => {
    const withAuthor = { ...a, author: user?.username || 'Vous', createdAt: new Date().toISOString(), user_id: user?.id ?? null }
    try {
      const res = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: id,
          type: 'drawing',
          content: JSON.stringify(a),
          timestamp: currentTime,
          color: a.color || color,
          user_id: user?.id || null,
        }),
      })
      const saved = await res.json()
      const shape = { ...withAuthor, id: saved.id }
      setAnnotations(p => [...p, shape])
      send({ type: 'annotation_added', annotation: { ...saved, username: user?.username } })
    } catch {
      setAnnotations(p => [...p, withAuthor])
    }
  }

  const handleAnnotationDelete = async (annotationId) => {
    setAnnotations(p => p.filter(a => a.id !== annotationId))
    send({ type: 'annotation_deleted', id: annotationId })
    fetch(`/api/annotations/${annotationId}`, { method: 'DELETE' }).catch(() => {})
  }

  const handleAnnotationsClear = () => {
    const visible = annotations.filter(a => Math.abs(a.timestamp - currentTime) < 0.5)
    setAnnotations(p => p.filter(a => Math.abs(a.timestamp - currentTime) >= 0.5))
    visible.forEach(a => {
      send({ type: 'annotation_deleted', id: a.id })
      fetch(`/api/annotations/${a.id}`, { method: 'DELETE' }).catch(() => {})
    })
  }

  const handleAddComment = async (c) => {
    try {
      const res = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: id,
          type: 'comment',
          content: c.text,
          timestamp: c.timestamp ?? currentTime,
          color: '#3B82F6',
          user_id: user?.id || null,
        }),
      })
      const saved = await res.json()
      const withId = { ...c, id: saved.id }
      setComments(p => [...p, withId])
      send({ type: 'annotation_added', annotation: { ...saved, username: user?.username, content: c.text } })
    } catch {
      setComments(p => [...p, c])
    }
  }

  const handleSeekTime = (t) => { if (videoRef.current) videoRef.current.currentTime = t }

  const handleExport = () => {
    downloadAnnotationsAsFile(
      exportAnnotations({ videoId: id, annotations, comments }),
      `annotations-${id}.json`
    )
  }

  const fmt = (t) => `${Math.floor(t/60)}:${Math.floor(t%60).toString().padStart(2,'0')}`

  return (
    <div className="player-page">

      {/* ── Header ── */}
      <header className="player-header">
        <button className="player-back" onClick={() => navigate('/app')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M5 12l7 7M5 12l7-7"/>
          </svg>
          Retour
        </button>
        <div className="player-header-title">
          <span className="player-video-title">{video.title}</span>
          <span className="player-video-category">{video.category}</span>
        </div>
        <div className="player-header-right">
          <span className={`player-ws ${isConnected ? 'on' : ''}`}>
            {WS_URL ? (isConnected ? '● En direct' : '○ Hors ligne') : '○ Solo'}
          </span>
          <button className="player-export-btn" onClick={handleExport}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exporter JSON
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="player-body">

        {/* ── Colonne gauche : vidéo ── */}
        <div className="player-left">

          {/* Toolbar */}
          <div className="player-toolbar">
            <div className="player-tools">
              {TOOLS.map(t => (
                <button key={t.id}
                  className={`player-tool-btn ${tool === t.id ? 'active' : ''}`}
                  onClick={() => setTool(t.id)} title={t.label}>
                  {t.icon} {t.label}
                </button>
              ))}
              <div className="player-tool-sep" />
              <button className="player-tool-btn player-tool-undo"
                onClick={() => {
                  const vis = annotations.filter(a => Math.abs(a.timestamp - currentTime) < 0.5)
                  if (vis.length) handleAnnotationDelete(vis[vis.length - 1].id)
                }}
                disabled={!annotations.some(a => Math.abs(a.timestamp - currentTime) < 0.5)}>
                ↩ Annuler
              </button>
              <button className="player-tool-btn player-tool-clear"
                onClick={handleAnnotationsClear}
                disabled={annotations.length === 0}>
                🗑 Effacer
              </button>
            </div>
            <div className="player-colors">
              <ColorPicker color={color} onChange={setColor} />
            </div>
          </div>

          {/* Zone vidéo limitée en hauteur */}
          <div className="player-video-outer" ref={wrapRef}>
            <div className="player-video-wrap">
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
                width={dimensions.width}
                height={dimensions.height}
                currentTime={currentTime}
                tool={tool} color={color}
                annotations={annotations}
                onAnnotationCreate={handleAnnotationCreate}
                onAnnotationDelete={handleAnnotationDelete}
                onAnnotationsClear={handleAnnotationsClear}
              />
            </div>

            {/* Contrôles vidéo */}
            <div className="player-controls">
              {/* Play/Pause */}
              <button className="player-play-btn" onClick={togglePlay}>
                {playing
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                }
              </button>

              {/* Timecode */}
              <span className="player-time">{fmt(currentTime)} / {fmt(duration)}</span>

              {/* Barre de progression */}
              <div className="player-progress-wrap" onClick={handleSeek}>
                <div className="player-progress-bg">
                  <div className="player-progress-fill"
                    style={{ width: duration ? `${(currentTime/duration)*100}%` : '0%' }} />
                </div>
              </div>

              {/* Volume */}
              <div className="player-volume-wrap">
                <button className="player-ctrl-btn" onClick={toggleMute} title={muted ? 'Activer le son' : 'Couper le son'}>
                  {muted || volume === 0 ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
                    </svg>
                  ) : volume < 0.5 ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                    </svg>
                  )}
                </button>
                <input
                  className="player-volume-slider"
                  type="range" min="0" max="1" step="0.05"
                  value={muted ? 0 : volume}
                  onChange={handleVolume}
                  style={{ '--val': `${(muted ? 0 : volume) * 100}` }}
                />
              </div>

              {/* Plein écran */}
              <button className="player-ctrl-btn" onClick={toggleFullscreen} title="Plein écran">
                {isFullscreen
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                }
              </button>
            </div>
          </div>
        </div>

        {/* ── Sidebar commentaires ── */}
        <div className="player-right">
          <div className="player-sidebar-title">Commentaires &amp; annotations</div>
          <CommentThread
            items={timelineItems}
            currentTime={currentTime}
            onAddComment={handleAddComment}
            onSeek={handleSeekTime}
          />
        </div>
      </div>
    </div>
  )
}
