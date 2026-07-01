import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import AnnotationCanvas from '../components/AnnotationCanvas.jsx'
import CommentThread from '../components/CommentThread.jsx'
import useWebSocket from '../hooks/useWebSocket.js'
import { exportAnnotations, downloadAnnotationsAsFile } from '../utils/exportAnnotations.js'
import { mockVideos } from '../data/mockVideos.js'

const WS_URL = import.meta.env.VITE_WS_URL || null

const TOOLS = [
  { id: 'arrow',     label: 'Flèche',    icon: '↗' },
  { id: 'rectangle', label: 'Rectangle', icon: '▭' },
  { id: 'ellipse',   label: 'Ellipse',   icon: '○' },
  { id: 'free',      label: 'Libre',     icon: '✏️' },
]

export default function PlayerPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 800, height: 450 })
  const [tool, setTool] = useState('arrow')
  const [color, setColor] = useState('#7C3AED')
  const [annotations, setAnnotations] = useState([])
  const [comments, setComments] = useState([])
  const { isConnected, messages, send } = useWebSocket(WS_URL)

  const video = mockVideos.find(v => v.id === id) || mockVideos[0]

  useEffect(() => {
    messages.forEach(msg => {
      if (msg.type === 'annotation') setAnnotations(p => [...p, msg.payload])
      else if (msg.type === 'comment') setComments(p => [...p, msg.payload])
    })
  }, [messages])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const updateDims = () => setDimensions({ width: v.clientWidth, height: v.clientHeight })
    v.addEventListener('loadedmetadata', updateDims)
    window.addEventListener('resize', updateDims)
    return () => {
      v.removeEventListener('loadedmetadata', updateDims)
      window.removeEventListener('resize', updateDims)
    }
  }, [])

  const handleAnnotationCreate = (a) => {
    setAnnotations(p => [...p, a])
    send('annotation', a)
  }

  const handleAnnotationDelete = (id) => {
    setAnnotations(p => p.filter(a => a.id !== id))
    send('annotationDelete', { id })
  }

  const handleAnnotationsClear = () => {
    setAnnotations([])
    send('annotationsClear', {})
  }
  const handleAddComment = (c) => {
    setComments(p => [...p, c])
    send('comment', c)
  }
  const handleSeek = (t) => { if (videoRef.current) videoRef.current.currentTime = t }
  const togglePlay = () => {
    if (!videoRef.current) return
    playing ? videoRef.current.pause() : videoRef.current.play()
    setPlaying(!playing)
  }
  const handleExport = () => {
    const json = exportAnnotations({ videoSrc: video.title, annotations, comments })
    downloadAnnotationsAsFile(json, `annotations-${video.id}.json`)
  }

  const formatTime = (t) => {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="player-page">

      {/* Header compact */}
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
          <span className={`player-ws ${isConnected ? 'on' : 'off'}`}>
            {WS_URL ? (isConnected ? '● En direct' : '○ Hors ligne') : '○ Temps réel non configuré'}
          </span>
          <button className="player-export-btn" onClick={handleExport}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exporter JSON
          </button>
        </div>
      </header>

      <div className="player-body">

        {/* Zone vidéo + canvas */}
        <div className="player-left">

          {/* Toolbar annotations */}
          <div className="player-toolbar">
            <div className="player-tools">
              {TOOLS.map(t => (
                <button
                  key={t.id}
                  className={`player-tool-btn ${tool === t.id ? 'active' : ''}`}
                  onClick={() => setTool(t.id)}
                  title={t.label}
                >
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
              <div className="player-tool-sep" />
              <button
                className="player-tool-btn player-tool-undo"
                onClick={() => {
                  const visible = annotations.filter(
                    a => Math.abs(a.timestamp - currentTime) < 0.5
                  )
                  if (visible.length > 0) handleAnnotationDelete(visible[visible.length - 1].id)
                }}
                title="Annuler dernière annotation (Ctrl+Z)"
                disabled={!annotations.some(a => Math.abs(a.timestamp - currentTime) < 0.5)}
              >
                ↩ Annuler
              </button>
              <button
                className="player-tool-btn player-tool-clear"
                onClick={handleAnnotationsClear}
                title="Effacer toutes les annotations"
                disabled={annotations.length === 0}
              >
                🗑 Tout effacer
              </button>
            </div>
            <div className="player-colors">
              {['#7C3AED','#EF4444','#F59E0B','#10B981','#3B82F6'].map(c => (
                <button
                  key={c}
                  className={`player-color-btn ${color === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {/* Vidéo + canvas superposé */}
          <div className="player-video-wrap">
            <video
              ref={videoRef}
              style={{ width: '100%', display: 'block', borderRadius: '0 0 10px 10px' }}
              onTimeUpdate={e => setCurrentTime(e.target.currentTime)}
              onLoadedMetadata={e => setDuration(e.target.duration)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              controls={false}
            />
            <AnnotationCanvas
              width={dimensions.width}
              height={dimensions.height}
              currentTime={currentTime}
              tool={tool}
              color={color}
              annotations={annotations}
              onAnnotationCreate={handleAnnotationCreate}
              onAnnotationDelete={handleAnnotationDelete}
              onAnnotationsClear={handleAnnotationsClear}
            />
          </div>

          {/* Contrôles custom */}
          <div className="player-controls">
            <button className="player-play-btn" onClick={togglePlay}>
              {playing
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              }
            </button>
            <span className="player-time">{formatTime(currentTime)} / {formatTime(duration)}</span>
            <div className="player-progress-wrap" onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect()
              const ratio = (e.clientX - rect.left) / rect.width
              if (videoRef.current) videoRef.current.currentTime = ratio * duration
            }}>
              <div className="player-progress-bg">
                <div className="player-progress-fill" style={{ width: duration ? `${(currentTime/duration)*100}%` : '0%' }} />
              </div>
            </div>
            <span className="player-user-badge">{user?.username}</span>
          </div>
        </div>

        {/* Sidebar commentaires */}
        <div className="player-right">
          <div className="player-sidebar-title">Commentaires</div>
          <CommentThread
            comments={comments}
            currentTime={currentTime}
            onAddComment={handleAddComment}
            onSeek={handleSeek}
          />
        </div>

      </div>
    </div>
  )
}
