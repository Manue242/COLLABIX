import React, { useRef, useState, useEffect, useMemo } from 'react'
import Hls from 'hls.js'
import AnnotationCanvas from './AnnotationCanvas.jsx'
import CommentThread from './CommentThread.jsx'
import useWebSocket from '../hooks/useWebSocket.js'
import { exportAnnotations, downloadAnnotationsAsFile } from '../utils/exportAnnotations.js'
import ColorPicker from './ColorPicker.jsx'

const TOOLS = [
  { id: 'arrow',     label: 'Flèche',    icon: '↗' },
  { id: 'rectangle', label: 'Rectangle', icon: '▭' },
  { id: 'ellipse',   label: 'Ellipse',   icon: '○' },
  { id: 'free',      label: 'Libre',     icon: '✏️' },
  { id: 'text',      label: 'Texte',     icon: 'T' },
]

const CURSOR_SEND_INTERVAL_MS = 80
const CURSOR_STALE_MS = 3000
const CURSOR_COLORS = ['#F97316', '#059669', '#0369a1', '#0f766e', '#EA580C', '#be185d', '#dc2626']
const DURATION_OPTIONS = [2, 3, 5, 8, 10, 15]

function cursorColor(userId) {
  const code = userId ? userId.charCodeAt(0) : 0
  return CURSOR_COLORS[code % CURSOR_COLORS.length]
}

function initials(name) {
  return name ? name.slice(0, 2).toUpperCase() : '?'
}

const ONLINE_POLL_MS = 4000
const TOAST_TTL_MS = 4500
const HEATMAP_BUCKETS = 40
const REACTION_TTL_MS = 2000
const REACTIONS = ['👍', '❤️', '😂', '😮', '👏']

/**
 * Lecteur de revue augmenté — composant autonome et réutilisable.
 * Ne dépend ni de react-router ni d'un contexte d'auth précis : tout arrive en props.
 *
 * Props :
 *  - videoSrc  (string, requis)  URL de la vidéo en lecture progressive (fallback)
 *  - hlsSrc    (string, optionnel) URL de la playlist HLS chiffrée (.m3u8) — tentée en priorité
 *  - user      ({ id, username } | null) utilisateur courant, pour l'attribution des annotations
 *  - sessionId (string, requis)  identifiant de session/vidéo — sert de clé pour l'API et la room WS
 *  - title, category (string, optionnels) affichés dans l'en-tête
 *  - chapters  (Array<{start, title}>, optionnel) marqueurs de chapitres IA sur la barre de progression
 *  - onBack    (fn, optionnel)   appelé au clic sur « Retour »
 */
export default function AnnotatedReviewPlayer({
  videoSrc, hlsSrc, user = null, sessionId, title = '', category = '', chapters = [], onBack,
}) {
  const videoRef   = useRef(null)
  const wrapRef    = useRef(null)
  const hlsRef     = useRef(null)
  const keyTokenRef = useRef(null)
  const lastCursorSentRef = useRef(0)
  const processedMsgCountRef = useRef(0) // messages est cumulatif (append-only) — on ne rejoue que les nouveaux
  const [currentTime, setCurrentTime] = useState(0)
  const [duration,    setDuration]    = useState(0)
  const [playing,     setPlaying]     = useState(false)
  const [dimensions,  setDimensions]  = useState({ width: 0, height: 0 })
  const [tool,        setTool]        = useState('arrow')
  const [color,       setColor]       = useState('#F97316')
  const [annotationDuration, setAnnotationDuration] = useState(5) // secondes d'affichage à l'écran
  const [annotations, setAnnotations] = useState([])
  const [comments,    setComments]    = useState([])
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [remoteCursors, setRemoteCursors] = useState({}) // { [user_id]: {x, y, ts, username} }
  const [usingHls, setUsingHls] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState([]) // [{ id, username }] — autres utilisateurs connectés
  const [toasts, setToasts] = useState([]) // [{ id, text, timestamp }]
  const [aiQuery, setAiQuery] = useState('')
  const [aiResults, setAiResults] = useState(null)
  const [aiSearching, setAiSearching] = useState(false)
  const [flyingReactions, setFlyingReactions] = useState([]) // [{ id, emoji, x }]

  // URL WebSocket proxiée par Vite → backend /ws/{video_id}?user_id=...
  const userId = user?.id || user?.email || 'anonymous'
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const WS_URL = sessionId
    ? `${wsProtocol}//${window.location.host}/ws/${sessionId}?user_id=${encodeURIComponent(userId)}`
    : null

  const { isConnected, messages, send } = useWebSocket(WS_URL)
  const fmt = (t) => `${Math.floor(t/60)}:${Math.floor(t%60).toString().padStart(2,'0')}`

  // Réactions qui traversent l'écran — locale (feedback immédiat) ou reçue d'un autre user
  const spawnReaction = (emoji) => {
    const id = crypto.randomUUID()
    const x = 10 + Math.random() * 80 // position horizontale aléatoire, en %
    setFlyingReactions(p => [...p, { id, emoji, x }])
    setTimeout(() => setFlyingReactions(p => p.filter(r => r.id !== id)), REACTION_TTL_MS)
  }

  const handleSendReaction = (emoji) => {
    spawnReaction(emoji) // le serveur ne renvoie jamais un message à son émetteur
    if (WS_URL) send({ type: 'reaction', emoji, user_id: userId })
  }

  // Charger les annotations + commentaires persistés depuis le backend
  useEffect(() => {
    if (!sessionId) return
    fetch(`/api/annotations?video_id=${sessionId}`)
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
  }, [sessionId])

  // Traiter les messages WS entrants des autres utilisateurs.
  // `messages` est cumulatif (useWebSocket ne fait qu'accumuler) — sans ce
  // découpage, chaque nouveau message (curseur y compris, très fréquent)
  // rejouait TOUT l'historique : toasts et réactions se dupliquaient à l'infini,
  // et le travail par message croissait sans borne au fil de la session.
  useEffect(() => {
    const newMessages = messages.slice(processedMsgCountRef.current)
    processedMsgCountRef.current = messages.length
    newMessages.forEach(msg => {
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
        // Toast — le serveur ne renvoie jamais un message à son propre émetteur,
        // donc tout annotation_added reçu ici vient forcément d'un autre utilisateur.
        const toastAuthor = a.username || 'Quelqu’un'
        const toastText = a.type === 'comment'
          ? `${toastAuthor} a commenté à ${fmt(a.timestamp)}`
          : `${toastAuthor} a annoté à ${fmt(a.timestamp)}`
        const toastId = crypto.randomUUID()
        setToasts(p => [...p, { id: toastId, text: toastText, timestamp: a.timestamp }])
        setTimeout(() => setToasts(p => p.filter(t => t.id !== toastId)), TOAST_TTL_MS)
      } else if (msg.type === 'annotation_deleted') {
        setAnnotations(p => p.filter(a => a.id !== msg.id))
        setComments(p => p.filter(c => c.id !== msg.id))
      } else if (msg.type === 'cursor' && msg.user_id !== userId) {
        setRemoteCursors(p => ({ ...p, [msg.user_id]: { x: msg.x, y: msg.y, ts: Date.now(), username: msg.username } }))
      } else if (msg.type === 'reaction') {
        spawnReaction(msg.emoji)
      }
    })
  }, [messages, userId])

  // Purge les curseurs distants inactifs depuis plus de 3s
  useEffect(() => {
    const t = setInterval(() => {
      setRemoteCursors(p => {
        const now = Date.now()
        const next = {}
        for (const [uid, c] of Object.entries(p)) {
          if (now - c.ts < CURSOR_STALE_MS) next[uid] = c
        }
        return next
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // Qui regarde en ce moment — poll léger de la liste des users connectés à cette session
  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    const poll = () => {
      fetch(`/api/sessions/${sessionId}/users`)
        .then(r => r.json())
        .then(data => {
          if (cancelled) return
          const others = (data.users || [])
            .filter(uid => uid !== userId)
            .map(uid => ({ id: uid, username: data.usernames?.[uid] }))
          setOnlineUsers(others)
        })
        .catch(() => {})
    }
    poll()
    const t = setInterval(poll, ONLINE_POLL_MS)
    return () => { cancelled = true; clearInterval(t) }
  }, [sessionId, userId])

  const handleVideoAreaMouseMove = (e) => {
    if (!WS_URL) return
    const now = Date.now()
    if (now - lastCursorSentRef.current < CURSOR_SEND_INTERVAL_MS) return
    lastCursorSentRef.current = now
    const rect = e.currentTarget.getBoundingClientRect()
    send({
      type: 'cursor',
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
      user_id: userId,
      username: user?.username,
    })
  }

  // Fusionne annotations dessinées + commentaires en une seule timeline triée
  const timelineItems = useMemo(() => {
    const commentItems    = comments.map(c => ({ kind: 'comment', ...c }))
    const annotationItems = annotations.map(a => ({ kind: 'annotation', ...a }))
    return [...commentItems, ...annotationItems].sort((x, y) => x.timestamp - y.timestamp)
  }, [comments, annotations])

  // Densité d'annotations/commentaires par tranche de la vidéo — heatmap sur la timeline
  const heatmap = useMemo(() => {
    if (!duration) return []
    const buckets = new Array(HEATMAP_BUCKETS).fill(0)
    timelineItems.forEach(item => {
      const idx = Math.min(HEATMAP_BUCKETS - 1, Math.max(0, Math.floor((item.timestamp / duration) * HEATMAP_BUCKETS)))
      buckets[idx]++
    })
    const max = Math.max(1, ...buckets)
    return buckets.map(c => c / max)
  }, [timelineItems, duration])

  // Charge la vidéo — HLS chiffré si dispo (hls.js + xhrSetup pour la clé), sinon MP4 direct
  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    let cancelled = false

    const playPlain = () => {
      setUsingHls(false)
      v.src = videoSrc || ''
    }

    if (!hlsSrc) {
      playPlain()
      return
    }

    if (!Hls.isSupported()) {
      // Safari lit le HLS nativement sans hls.js — sinon on retombe sur le MP4
      if (v.canPlayType('application/vnd.apple.mpegurl')) {
        setUsingHls(true)
        v.src = hlsSrc
      } else {
        playPlain()
      }
      return
    }

    // Pré-récupère un token de clé de courte durée (60s) avant de démarrer hls.js —
    // xhrSetup est synchrone, donc le token doit déjà être en main quand hls.js
    // demande la clé AES-128 à /api/video/key.
    fetch('/api/video/key-token', {
      headers: user?.token ? { Authorization: `Bearer ${user.token}` } : {},
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => { keyTokenRef.current = data?.token || null })
      .catch(() => { keyTokenRef.current = null })
      .finally(() => {
        if (cancelled) return
        const hls = new Hls({
          xhrSetup: (xhr, url) => {
            if (url.includes('/api/video/key') && keyTokenRef.current) {
              xhr.setRequestHeader('Authorization', `Bearer ${keyTokenRef.current}`)
            }
          },
        })
        hlsRef.current = hls
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (data.fatal) {
            // Flux HLS indisponible (pas encore généré, clé refusée…) → repli silencieux sur le MP4
            hls.destroy()
            hlsRef.current = null
            playPlain()
          }
        })
        hls.loadSource(hlsSrc)
        hls.attachMedia(v)
        setUsingHls(true)
      })

    return () => {
      cancelled = true
      hlsRef.current?.destroy()
      hlsRef.current = null
    }
  }, [hlsSrc, videoSrc, user])

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
          video_id: sessionId,
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
          video_id: sessionId,
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
      exportAnnotations({ videoId: sessionId, annotations, comments }),
      `annotations-${sessionId}.json`
    )
  }

  // Recherche sémantique IA scopée à cette vidéo — /search est global, on filtre
  // côté client sur le filename (index_segments côté ai-api l'inclut dans chaque résultat).
  const handleAiSearch = async (e) => {
    e.preventDefault()
    if (!aiQuery.trim()) return
    setAiSearching(true)
    setAiResults(null)
    try {
      const res = await fetch('/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery, top_k: 10 }),
      })
      const data = await res.json()
      const scoped = (data.results || []).filter(r => r.filename === sessionId)
      setAiResults(scoped)
    } catch {
      setAiResults([])
    } finally {
      setAiSearching(false)
    }
  }

  return (
    <div className="player-page">

      {/* ── Header ── */}
      <header className="player-header">
        <button className="player-back" onClick={() => onBack?.()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M5 12l7 7M5 12l7-7"/>
          </svg>
          Retour
        </button>
        <div className="player-header-title">
          <span className="player-video-title">{title}</span>
          <span className="player-video-category">{category}</span>
        </div>
        <div className="player-header-right">
          {onlineUsers.length > 0 && (
            <div className="player-online-stack" title={`${onlineUsers.length} autre(s) connecté(s)`}>
              {onlineUsers.slice(0, 5).map(u => (
                <span key={u.id} className="player-online-avatar" style={{ background: cursorColor(u.id) }}>
                  {initials(u.username || u.id)}
                </span>
              ))}
              {onlineUsers.length > 5 && (
                <span className="player-online-avatar player-online-more">+{onlineUsers.length - 5}</span>
              )}
            </div>
          )}
          {usingHls && <span key="hls-badge" className="player-ws on player-hls-badge" title="Flux HLS chiffré AES-128 — clé vérifiée">🔒 HLS ✓</span>}
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
              <select
                className="player-duration-select"
                value={annotationDuration}
                onChange={e => setAnnotationDuration(Number(e.target.value))}
                title="Durée d'affichage de l'annotation"
              >
                {DURATION_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}s</option>
                ))}
              </select>
            </div>
          </div>

          {/* Zone vidéo limitée en hauteur */}
          <div className="player-video-outer" ref={wrapRef}>
            <div className="player-video-wrap" onMouseMove={handleVideoAreaMouseMove}>
              <video
                ref={videoRef}
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
                tool={tool} color={color} duration={annotationDuration}
                annotations={annotations}
                onAnnotationCreate={handleAnnotationCreate}
                onAnnotationDelete={handleAnnotationDelete}
                onAnnotationsClear={handleAnnotationsClear}
              />
              {/* Curseurs collaboratifs des autres utilisateurs connectés */}
              {Object.entries(remoteCursors).map(([uid, c]) => (
                <div key={uid} className="player-remote-cursor" style={{
                  left: `${c.x * 100}%`, top: `${c.y * 100}%`,
                  '--cursor-color': cursorColor(uid),
                }}>
                  <span className="player-remote-cursor-dot" />
                  <span className="player-remote-cursor-label">{c.username || uid.slice(0, 8)}</span>
                </div>
              ))}

              {/* Notifications live — annotations/commentaires ajoutés par d'autres utilisateurs */}
              <div className="player-toast-stack">
                {toasts.map(t => (
                  <button key={t.id} className="player-toast" onClick={() => handleSeekTime(t.timestamp)}>
                    {t.text}
                  </button>
                ))}
              </div>

              {/* Réactions qui traversent l'écran */}
              <div className="player-reactions-layer">
                {flyingReactions.map(r => (
                  <span key={r.id} className="player-flying-reaction" style={{ left: `${r.x}%` }}>
                    {r.emoji}
                  </span>
                ))}
              </div>
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
                {/* Heatmap de densité — où sont concentrées les annotations/commentaires */}
                {heatmap.length > 0 && (
                  <div className="player-heatmap" title="Densité d'annotations/commentaires">
                    {heatmap.map((v, i) => (
                      <span key={i} className="player-heatmap-bar" style={{ opacity: v > 0 ? 0.25 + v * 0.75 : 0 }} />
                    ))}
                  </div>
                )}
                <div className="player-progress-bg">
                  <div className="player-progress-fill"
                    style={{ width: duration ? `${(currentTime/duration)*100}%` : '0%' }} />
                  {/* Chapitres générés par l'IA (pipeline /process) */}
                  {duration > 0 && chapters.map((c, i) => (
                    <span key={i} className="player-chapter-marker"
                      style={{ left: `${Math.min(100, (c.start / duration) * 100)}%` }}
                      title={c.title}
                      onClick={e => { e.stopPropagation(); handleSeekTime(c.start) }}
                    />
                  ))}
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

              {/* Réactions rapides */}
              <div className="player-reaction-picker">
                {REACTIONS.map(emoji => (
                  <button key={emoji} className="player-reaction-btn" onClick={() => handleSendReaction(emoji)}>
                    {emoji}
                  </button>
                ))}
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
          <form className="player-ai-search" onSubmit={handleAiSearch}>
            <input
              type="text"
              placeholder="Rechercher dans cette vidéo (IA)…"
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
            />
            <button type="submit" disabled={!aiQuery.trim() || aiSearching}>
              {aiSearching ? '…' : '🔍'}
            </button>
          </form>
          {aiResults !== null && (
            <div className="player-ai-results">
              {aiResults.length === 0 ? (
                <p className="player-ai-empty">Aucun résultat — cette vidéo n'a peut-être pas encore été indexée.</p>
              ) : aiResults.map((r, i) => (
                <button key={i} className="player-ai-result" onClick={() => handleSeekTime(r.start)}>
                  <span className="player-ai-result-time">{fmt(r.start)}</span>
                  <span className="player-ai-result-text">{r.text}</span>
                </button>
              ))}
            </div>
          )}
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
