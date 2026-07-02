import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

function Avatar({ name, size = 36, bg }) {
  const initials = name
    ? name.slice(0, 2).toUpperCase()
    : 'U'
  const colors = ['#F97316','#059669','#0369a1','#0f766e','#EA580C','#be185d','#dc2626']
  const color = bg || colors[name?.charCodeAt(0) % colors.length] || '#7C3AED'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, color: '#fff',
      fontSize: size * 0.36, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0
    }}>
      {initials}
    </div>
  )
}

function HeartIcon({ filled }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24"
      fill={filled ? '#e00' : 'none'}
      stroke={filled ? '#e00' : 'currentColor'}
      strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  )
}

function ReplyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="5"  cy="12" r="1" fill="currentColor"/>
      <circle cx="12" cy="12" r="1" fill="currentColor"/>
      <circle cx="19" cy="12" r="1" fill="currentColor"/>
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v6l4 2"/>
    </svg>
  )
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60) return "à l'instant"
  if (diff < 3600) return `il y a ${Math.floor(diff/60)}min`
  if (diff < 86400) return `il y a ${Math.floor(diff/3600)}h`
  return `il y a ${Math.floor(diff/86400)}j`
}

function formatTime(t) {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

// Icône + libellé par outil de dessin, pour l'affichage dans le fil
const TOOL_META = {
  arrow:     { icon: '↗', label: 'a ajouté une flèche' },
  rectangle: { icon: '▭', label: 'a dessiné un rectangle' },
  ellipse:   { icon: '○', label: 'a dessiné une ellipse' },
  free:      { icon: '✏️', label: 'a fait un tracé libre' },
  text:      { icon: 'T', label: null },
}

// ── Composant annotation (dessin/texte sur la vidéo) ────────
function AnnotationItem({ item, onSeek }) {
  const meta = TOOL_META[item.tool] || TOOL_META.arrow
  return (
    <div className="ct-item ct-annotation-item">
      <div className="ct-row">
        <Avatar name={item.author} bg={item.color} />
        <div className="ct-body">
          <div className="ct-meta">
            <span className="ct-name">{item.author}</span>
            {item.createdAt && <span className="ct-ago">{timeAgo(item.createdAt)}</span>}
            <button className="ct-badge" onClick={() => onSeek?.(item.timestamp)}>
              <ClockIcon /> {formatTime(item.timestamp)}
            </button>
          </div>
          <p className="ct-text ct-annotation-label">
            <span className="ct-kind-icon" style={{ color: item.color }}>{meta.icon}</span>{' '}
            {item.tool === 'text' ? <>« {item.text} »</> : meta.label}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Composant réponse ──────────────────────────────────────
function Reply({ reply, onLike }) {
  return (
    <div className="ct-reply">
      <Avatar name={reply.author} size={28} />
      <div className="ct-reply-body">
        <div className="ct-reply-meta">
          <span className="ct-name">{reply.author}</span>
          <span className="ct-ago">{timeAgo(reply.createdAt)}</span>
        </div>
        <p className="ct-reply-text">{reply.text}</p>
        <div className="ct-actions">
          <button className={`ct-act ${reply.liked ? 'liked' : ''}`} onClick={() => onLike(reply.id)}>
            <HeartIcon filled={reply.liked} />
            {reply.likes > 0 && <span>{reply.likes}</span>}
          </button>
          <button className="ct-act"><ReplyIcon /> Répondre</button>
          <button className="ct-act"><MoreIcon /> Plus</button>
        </div>
      </div>
    </div>
  )
}

// ── Composant commentaire ──────────────────────────────────
function Comment({ comment, onLike, onLikeReply, onAddReply, onSeek }) {
  const [showReplies, setShowReplies]   = useState(false)
  const [showInput, setShowInput]       = useState(false)
  const [replyText, setReplyText]       = useState('')

  const handleSendReply = () => {
    if (!replyText.trim()) return
    onAddReply(comment.id, replyText.trim())
    setReplyText('')
    setShowInput(false)
    setShowReplies(true)
  }

  return (
    <div className="ct-item">
      <div className="ct-row">
        <Avatar name={comment.author} />
        <div className="ct-body">
          <div className="ct-meta">
            <span className="ct-name">{comment.author}</span>
            <span className="ct-ago">{timeAgo(comment.createdAt)}</span>
            <button className="ct-badge" onClick={() => onSeek?.(comment.timestamp)}>
              <ClockIcon /> {formatTime(comment.timestamp)}
            </button>
          </div>
          <p className="ct-text">{comment.text}</p>
          <div className="ct-actions">
            <button className={`ct-act ${comment.liked ? 'liked' : ''}`} onClick={() => onLike(comment.id)}>
              <HeartIcon filled={comment.liked} />
              {comment.likes > 0 && <span>{comment.likes}</span>}
            </button>
            <button className="ct-act" onClick={() => { setShowInput(v => !v) }}>
              <ReplyIcon /> Répondre
            </button>
            <button className="ct-act">
              <MoreIcon /> Plus
            </button>
          </div>

          {/* Réponses */}
          {comment.replies?.length > 0 && (
            <button className="ct-rep-toggle" onClick={() => setShowReplies(v => !v)}>
              <svg style={{ transform: showReplies ? 'rotate(180deg)' : '', transition:'transform 0.2s' }}
                width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#065fd4" strokeWidth="2.5">
                <path d="M6 9l6 6 6-6"/>
              </svg>
              {comment.replies.length} réponse{comment.replies.length > 1 ? 's' : ''}
            </button>
          )}

          {showReplies && (
            <div className="ct-replies">
              {comment.replies.map(r => (
                <Reply key={r.id} reply={r} onLike={(id) => onLikeReply(comment.id, id)} />
              ))}
            </div>
          )}

          {/* Input réponse */}
          {showInput && (
            <div className="ct-reply-input-row">
              <Avatar name="Vous" size={28} />
              <input
                className="ct-reply-input"
                placeholder={`Répondre à ${comment.author}...`}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendReply()}
                autoFocus
              />
              <button className="ct-send-btn" onClick={handleSendReply}>Envoyer</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────
// `items` est la timeline fusionnée (commentaires + annotations dessinées),
// triée par position dans la vidéo — fournie et possédée par PlayerPage.
// Les likes/réponses ne sont pas persistés côté backend : ils vivent ici
// dans une couche `interactions` séparée, indexée par id, pour ne jamais
// écraser la liste reçue du parent.
export default function CommentThread({ items = [], currentTime, onAddComment, onSeek }) {
  const { user } = useAuth()
  const [interactions, setInteractions] = useState({})
  const [text, setText] = useState('')

  const getInteraction = (id) => interactions[id] || { liked: false, likes: 0, replies: [] }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    const c = {
      id: crypto.randomUUID(),
      text: text.trim(),
      author: user?.username || 'Vous',
      timestamp: currentTime,
      createdAt: new Date().toISOString(),
      user_id: user?.id ?? null,
    }
    onAddComment?.(c)
    setText('')
  }

  const toggleLike = (id) => {
    setInteractions(p => {
      const cur = getInteraction(id)
      return { ...p, [id]: { ...cur, liked: !cur.liked, likes: cur.likes + (cur.liked ? -1 : 1) } }
    })
  }

  const toggleLikeReply = (commentId, replyId) => {
    setInteractions(p => {
      const cur = getInteraction(commentId)
      return {
        ...p,
        [commentId]: {
          ...cur,
          replies: cur.replies.map(r =>
            r.id === replyId ? { ...r, liked: !r.liked, likes: r.likes + (r.liked ? -1 : 1) } : r
          ),
        },
      }
    })
  }

  const addReply = (commentId, replyText) => {
    const r = {
      id: crypto.randomUUID(),
      text: replyText,
      author: user?.username || 'Vous',
      createdAt: new Date().toISOString(),
      likes: 0,
      liked: false,
    }
    setInteractions(p => {
      const cur = getInteraction(commentId)
      return { ...p, [commentId]: { ...cur, replies: [...cur.replies, r] } }
    })
  }

  const commentCount    = items.filter(i => i.kind === 'comment').length
  const annotationCount = items.filter(i => i.kind === 'annotation').length

  return (
    <div className="ct-wrap">

      {/* Header */}
      <div className="ct-header">
        <span className="ct-count">
          {commentCount} commentaire{commentCount !== 1 ? 's' : ''}
          {annotationCount > 0 && ` · ${annotationCount} annotation${annotationCount !== 1 ? 's' : ''}`}
        </span>
        <button className="ct-sort">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M7 12h10M11 18h2"/>
          </svg>
          Trier par
        </button>
      </div>

      {/* Zone de saisie */}
      <form className="ct-add" onSubmit={handleSubmit}>
        <Avatar name={user?.username || 'Vous'} />
        <div className="ct-add-wrap">
          <div className="ct-timecode">
            <ClockIcon /> {formatTime(currentTime)}
          </div>
          <input
            className="ct-input"
            placeholder="Ajouter un commentaire..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
          {text && (
            <div className="ct-add-actions">
              <button type="button" className="ct-cancel" onClick={() => setText('')}>Annuler</button>
              <button type="submit" className="ct-submit">Commenter</button>
            </div>
          )}
        </div>
      </form>

      {/* Liste — timeline fusionnée, triée par position dans la vidéo */}
      <div className="ct-list">
        {items.map(item => item.kind === 'annotation' ? (
          <AnnotationItem key={item.id} item={item} onSeek={onSeek} />
        ) : (
          <Comment
            key={item.id}
            comment={{ ...item, ...getInteraction(item.id) }}
            onLike={toggleLike}
            onLikeReply={toggleLikeReply}
            onAddReply={addReply}
            onSeek={onSeek}
          />
        ))}
      </div>
    </div>
  )
}
