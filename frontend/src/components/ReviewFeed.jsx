import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'

const TOOL_ICONS = {
  arrow:     { icon: '↗', label: 'Flèche',     color: '#EF4444' },
  rectangle: { icon: '▭', label: 'Rectangle',  color: '#F97316' },
  ellipse:   { icon: '○', label: 'Ellipse',    color: '#10B981' },
  free:      { icon: '✏', label: 'Trait libre',color: '#3B82F6' },
  text:      { icon: 'T', label: 'Texte',      color: '#8B5CF6' },
}

function fmt(t) {
  return `${Math.floor(t/60)}:${Math.floor(t%60).toString().padStart(2,'0')}`
}
function timeAgo(iso) {
  const d = (Date.now() - new Date(iso)) / 1000
  if (d < 60)    return "à l'instant"
  if (d < 3600)  return `${Math.floor(d/60)}min`
  if (d < 86400) return `${Math.floor(d/3600)}h`
  return `${Math.floor(d/86400)}j`
}

function Avatar({ name, size = 28 }) {
  const colors = ['#F97316','#059669','#0369a1','#8B5CF6','#EF4444','#0f766e']
  const bg = colors[(name?.charCodeAt(0) || 0) % colors.length]
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:bg, color:'#fff',
      fontSize:size*0.38, fontWeight:700, display:'flex', alignItems:'center',
      justifyContent:'center', flexShrink:0 }}>
      {(name||'U').slice(0,2).toUpperCase()}
    </div>
  )
}

// ── Item commentaire ──────────────────────────────────────────
function CommentItem({ item, onSeek, onLike, onDelete, onEdit, currentUser }) {
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [editing,  setEditing]  = useState(false)
  const [editText, setEditText] = useState(item.text)
  const menuRef = useRef(null)

  const isOwn   = item.author === (currentUser?.username || 'Vous')
  const isAdmin = currentUser?.role === 'admin'

  useEffect(() => {
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setShowMenu(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div className="rf-item">
      <Avatar name={item.author} />
      <div className="rf-body">
        <div className="rf-meta">
          <span className="rf-name">{item.author}</span>
          <span className="rf-ago">{timeAgo(item.createdAt)}</span>
          <button className="rf-badge" onClick={() => onSeek?.(item.timestamp)}>
            {fmt(item.timestamp)}
          </button>
        </div>

        {editing ? (
          <div className="rf-edit-wrap">
            <input className="rf-edit-input" value={editText} autoFocus
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && editText.trim()) { onEdit?.(item.id, editText.trim()); setEditing(false) }
                if (e.key === 'Escape') { setEditing(false); setEditText(item.text) }
              }} />
            <div className="rf-edit-btns">
              <button className="rf-cancel" onClick={() => { setEditing(false); setEditText(item.text) }}>Annuler</button>
              <button className="rf-submit" onClick={() => { if (editText.trim()) { onEdit?.(item.id, editText.trim()); setEditing(false) } }}>Modifier</button>
            </div>
          </div>
        ) : (
          <p className="rf-text">{item.text}</p>
        )}

        <div className="rf-actions">
          <button className={`rf-act ${item.liked ? 'liked' : ''}`} onClick={() => onLike?.(item.id)}>
            <svg width="13" height="13" viewBox="0 0 24 24"
              fill={item.liked ? '#f43f5e' : 'none'}
              stroke={item.liked ? '#f43f5e' : 'currentColor'} strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            {item.likes > 0 && <span>{item.likes}</span>}
          </button>
          <button className="rf-act" onClick={() => setShowReply(v => !v)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Répondre
          </button>

          {/* ── Menu 3 points contextuel ── */}
          <div className="rf-more-wrap" ref={menuRef}>
            <button className="rf-act rf-act-more" onClick={() => setShowMenu(v => !v)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="1.5"/>
                <circle cx="12" cy="12" r="1.5"/>
                <circle cx="19" cy="12" r="1.5"/>
              </svg>
            </button>

            {showMenu && (
              <div className="rf-menu">
                {/* Propre commentaire ou admin → Modifier + Supprimer */}
                {(isOwn || isAdmin) && (
                  <>
                    <button className="rf-menu-item" onClick={() => { setEditing(true); setShowMenu(false) }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/>
                      </svg>
                      Modifier
                    </button>
                    <button className="rf-menu-item rf-menu-danger" onClick={() => { onDelete?.(item.id); setShowMenu(false) }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      </svg>
                      Supprimer
                    </button>
                  </>
                )}
                {/* Commentaire d'un autre → Signaler */}
                {(!isOwn || isAdmin) && (
                  <button className="rf-menu-item rf-menu-warn" onClick={() => { alert('Commentaire signalé.'); setShowMenu(false) }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                      <line x1="4" y1="22" x2="4" y2="15"/>
                    </svg>
                    Signaler
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {showReply && (
          <div className="rf-reply-row">
            <input className="rf-reply-input" placeholder="Répondre..."
              value={replyText} onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter' && replyText.trim()) { setShowReply(false); setReplyText('') } }}
              autoFocus />
            <button className="rf-reply-send" onClick={() => { if (replyText.trim()) { setShowReply(false); setReplyText('') } }}>
              Envoyer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Item annotation ───────────────────────────────────────────
function AnnotationItem({ item, onSeek }) {
  const info = TOOL_ICONS[item.tool] || TOOL_ICONS.arrow
  return (
    <div className="rf-item rf-item-ann" onClick={() => onSeek?.(item.timestamp)}>
      <div className="rf-ann-icon" style={{ background:`${info.color}20`, color:info.color }}>
        {info.icon}
      </div>
      <div className="rf-body">
        <div className="rf-meta">
          <span className="rf-name">{item.author || 'Vous'}</span>
          <span className="rf-ago">{timeAgo(item.createdAt)}</span>
          <button className="rf-badge" onClick={e => { e.stopPropagation(); onSeek?.(item.timestamp) }}>
            {fmt(item.timestamp)}
          </button>
        </div>
        <div className="rf-ann-desc">
          <span>{info.label} dessiné{item.tool==='text' && item.text ? ` : "${item.text}"` : ''}</span>
          <span className="rf-ann-seek">▶ Aller</span>
        </div>
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────
export default function ReviewFeed({ comments=[], annotations=[], currentTime, onAddComment, onSeek }) {
  const { user } = useAuth()
  const [text,    setText]    = useState('')
  const [sortBy,  setSortBy]  = useState('time')
  const [localComments, setLocalComments] = useState(comments)

  React.useEffect(() => { setLocalComments(comments) }, [comments])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onAddComment?.({
      id: crypto.randomUUID(), type:'comment',
      text: text.trim(), author: user?.username || 'Vous',
      timestamp: currentTime, createdAt: new Date().toISOString(),
      likes:0, liked:false
    })
    setText('')
  }

  const handleLike = (id) => {
    setLocalComments(prev => prev.map(c =>
      c.id===id ? { ...c, liked:!c.liked, likes:c.likes+(c.liked?-1:1) } : c
    ))
  }

  const handleDelete = (id) => {
    setLocalComments(prev => prev.filter(c => c.id !== id))
  }

  const handleEdit = (id, newText) => {
    setLocalComments(prev => prev.map(c => c.id===id ? { ...c, text:newText } : c))
  }

  const feed = useMemo(() => {
    const items = [
      ...localComments.map(c => ({ ...c, type:'comment' })),
      ...annotations.map(a => ({ ...a, type:'annotation' }))
    ]
    return sortBy==='time'
      ? items.sort((a,b) => a.timestamp - b.timestamp)
      : items.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [localComments, annotations, sortBy])

  const total = localComments.length + annotations.length

  return (
    <div className="rf-wrap">
      <div className="rf-header">
        <span className="rf-count">{total} élément{total!==1?'s':''}</span>
        <div className="rf-sort">
          <button className={`rf-sort-btn ${sortBy==='time'?'active':''}`} onClick={() => setSortBy('time')}>Par timecode</button>
          <button className={`rf-sort-btn ${sortBy==='recent'?'active':''}`} onClick={() => setSortBy('recent')}>Récents</button>
        </div>
      </div>

      <form className="rf-add" onSubmit={handleSubmit}>
        <Avatar name={user?.username} />
        <div className="rf-add-wrap">
          <div className="rf-timecode">{fmt(currentTime)}</div>
          <input className="rf-input" placeholder="Ajouter un commentaire..."
            value={text} onChange={e => setText(e.target.value)} />
          {text && (
            <div className="rf-add-btns">
              <button type="button" className="rf-cancel" onClick={() => setText('')}>Annuler</button>
              <button type="submit" className="rf-submit">Commenter</button>
            </div>
          )}
        </div>
      </form>

      <div className="rf-list">
        {feed.length===0 && <p className="rf-empty">Aucun commentaire ni annotation pour l'instant.</p>}
        {feed.map(item =>
          item.type==='comment' ? (
            <CommentItem key={item.id} item={item} onSeek={onSeek}
              onLike={handleLike} onDelete={handleDelete} onEdit={handleEdit}
              currentUser={user} />
          ) : (
            <AnnotationItem key={item.id} item={item} onSeek={onSeek} />
          )
        )}
      </div>
    </div>
  )
}
