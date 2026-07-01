import React, { useRef, useState, useEffect, useCallback } from 'react'

// Durée d'affichage des annotations en secondes
const DISPLAY_DURATION = 5

export default function AnnotationCanvas({
  width, height, currentTime,
  tool = 'arrow', color = '#F97316',
  annotations = [],
  onAnnotationCreate, onAnnotationDelete, onAnnotationsClear
}) {
  const canvasRef  = useRef(null)
  const previewRef = useRef(null)
  const [drawing, setDrawing]   = useState(false)
  const [start, setStart]       = useState(null)
  const [current, setCurrent]   = useState(null)

  // Saisie texte
  const [cursor, setCursor]       = useState('crosshair')
  const [textInput, setTextInput] = useState(null)
  const [textValue, setTextValue] = useState('')
  const textRef = useRef(null)

  // ── Dessin d'une forme ────────────────────────────────────────
  const drawShape = useCallback((ctx, shape) => {
    const { tool: t, color: c, start: s, end: e } = shape
    ctx.strokeStyle = c
    ctx.fillStyle   = c
    ctx.lineWidth   = 2.5
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'

    if (t === 'rectangle') {
      ctx.beginPath()
      ctx.strokeRect(s.x, s.y, e.x - s.x, e.y - s.y)
    } else if (t === 'ellipse') {
      const rx = Math.abs(e.x - s.x) / 2
      const ry = Math.abs(e.y - s.y) / 2
      const cx = s.x + (e.x - s.x) / 2
      const cy = s.y + (e.y - s.y) / 2
      ctx.beginPath()
      ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2)
      ctx.stroke()
    } else if (t === 'free') {
      if (!shape.points || shape.points.length < 2) return
      ctx.beginPath()
      ctx.moveTo(shape.points[0].x, shape.points[0].y)
      shape.points.forEach(p => ctx.lineTo(p.x, p.y))
      ctx.stroke()
    } else if (t === 'text') {
      if (!shape.text) return
      const fontSize = 18
      ctx.font = `600 ${fontSize}px 'Inter', -apple-system, sans-serif`
      ctx.fillStyle = c
      ctx.shadowColor = 'rgba(0,0,0,0.85)'
      ctx.shadowBlur = 3
      ctx.shadowOffsetX = 1
      ctx.shadowOffsetY = 1
      ctx.fillText(shape.text, s.x, s.y)
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
    } else {
      drawArrow(ctx, s, e)
    }
  }, [])

  // ── Redessine la couche finalisée ────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const visible = annotations.filter(
      a => Math.abs(a.timestamp - currentTime) < DISPLAY_DURATION
    )

    visible.forEach(a => {
      // Fade out progressif sur la dernière seconde
      const age = Math.abs(a.timestamp - currentTime)
      const alpha = age > DISPLAY_DURATION - 1
        ? 1 - (age - (DISPLAY_DURATION - 1))
        : 1
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
      drawShape(ctx, a)
    })
    ctx.globalAlpha = 1
  }, [annotations, currentTime, drawShape])

  // ── Preview ───────────────────────────────────────────────────
  useEffect(() => {
    const canvas = previewRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (drawing && start && current && tool !== 'text') {
      ctx.globalAlpha = 0.85
      drawShape(ctx, { tool, color, start, end: current })
      ctx.globalAlpha = 1
    }
  }, [drawing, start, current, tool, color, drawShape])

  // ── Ctrl+Z ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        const vis = annotations.filter(a => Math.abs(a.timestamp - currentTime) < DISPLAY_DURATION)
        if (vis.length) onAnnotationDelete?.(vis[vis.length - 1].id)
      }
      if (e.key === 'Escape') {
        setTextInput(null); setTextValue('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [annotations, currentTime, onAnnotationDelete])

  const getPos = (e) => {
    const rect = previewRef.current.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (previewRef.current.width / rect.width),
      y: (e.clientY - rect.top)  * (previewRef.current.height / rect.height)
    }
  }

  const getPosPx = (e) => {
    const rect = previewRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const freePointsRef = useRef([])
  const dragRef = useRef(null) // { annotationId, offsetX, offsetY }

  // Teste si on clique sur une annotation texte existante
  const hitTestText = (pos) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    ctx.font = "600 18px 'Inter', -apple-system, sans-serif"

    const visible = annotations.filter(
      a => a.tool === 'text' && Math.abs(a.timestamp - currentTime) < DISPLAY_DURATION
    )
    // On parcourt en sens inverse pour prendre le plus récent en priorité
    for (let i = visible.length - 1; i >= 0; i--) {
      const a = visible[i]
      const metrics = ctx.measureText(a.text)
      const pad = 4
      const x1 = a.start.x - pad
      const y1 = a.start.y - 18 - pad
      const x2 = a.start.x + metrics.width + pad
      const y2 = a.start.y + pad
      if (pos.x >= x1 && pos.x <= x2 && pos.y >= y1 && pos.y <= y2) {
        return { id: a.id, offsetX: pos.x - a.start.x, offsetY: pos.y - a.start.y }
      }
    }
    return null
  }

  const handleMouseDown = (e) => {
    if (tool === 'text') {
      // D'abord vérifier si on clique sur un texte existant (pour déplacer)
      const pos   = getPos(e)
      const hit   = hitTestText(pos)
      if (hit) {
        dragRef.current = hit
        return
      }
      // Sinon créer un nouveau texte
      const posPx = getPosPx(e)
      setTextInput({ canvasPos: pos, screenPos: posPx })
      setTextValue('')
      setTimeout(() => textRef.current?.focus(), 50)
      return
    }
    const pos = getPos(e)
    setDrawing(true); setStart(pos); setCurrent(pos)
    if (tool === 'free') freePointsRef.current = [pos]
  }

  const handleMouseMove = (e) => {
    // Mettre à jour le curseur selon ce qui est sous la souris
    if (tool === 'text' && !dragRef.current) {
      const pos = getPos(e)
      const hit = hitTestText(pos)
      setCursor(hit ? 'move' : 'text')
    }

    // Preview drag texte sur le canvas
    if (dragRef.current && dragRef.current.id) {
      const pos = getPos(e)
      const newStart = {
        x: pos.x - dragRef.current.offsetX,
        y: pos.y - dragRef.current.offsetY
      }
      // Dessiner le ghost sur le preview canvas
      const canvas = previewRef.current
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const ann = annotations.find(a => a.id === dragRef.current.id)
      if (ann) {
        ctx.globalAlpha = 0.7
        ctx.font = "600 18px 'Inter', -apple-system, sans-serif"
        ctx.fillStyle = ann.color
        ctx.shadowColor = 'rgba(0,0,0,0.85)'
        ctx.shadowBlur = 3
        ctx.fillText(ann.text, newStart.x, newStart.y)
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
      }
      dragRef.current.newStart = newStart
      return
    }
    if (!drawing || tool === 'text') return
    const pos = getPos(e)
    setCurrent(pos)
    if (tool === 'free') {
      freePointsRef.current.push(pos)
      const canvas = previewRef.current
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = color; ctx.lineWidth = 2.5
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      const pts = freePointsRef.current
      ctx.moveTo(pts[0].x, pts[0].y)
      pts.forEach(p => ctx.lineTo(p.x, p.y))
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }

  const handleMouseUp = (e) => {
    // Finaliser le drag texte
    if (dragRef.current && dragRef.current.id && dragRef.current.newStart) {
      const ann = annotations.find(a => a.id === dragRef.current.id)
      if (ann) {
        onAnnotationDelete?.(ann.id)
        onAnnotationCreate?.({
          ...ann,
          id: crypto.randomUUID(),
          start: dragRef.current.newStart,
          end:   dragRef.current.newStart
        })
      }
      // Nettoyer le preview
      previewRef.current?.getContext('2d')?.clearRect(0, 0, width, height)
      dragRef.current = null
      return
    }
    dragRef.current = null

    if (!drawing || !start || tool === 'text') return
    const end = getPos(e)
    setDrawing(false)
    const minSize = tool === 'free' ? 0 : 5
    if (Math.abs(end.x - start.x) < minSize && Math.abs(end.y - start.y) < minSize) {
      setCurrent(null); return
    }
    onAnnotationCreate?.({
      id: crypto.randomUUID(), tool, color, start, end,
      points: tool === 'free' ? [...freePointsRef.current] : undefined,
      timestamp: currentTime, createdAt: new Date().toISOString()
    })
    setStart(null); setCurrent(null)
    freePointsRef.current = []
    previewRef.current?.getContext('2d')?.clearRect(0, 0, width, height)
  }

  const handleTextSubmit = () => {
    if (!textValue.trim() || !textInput) { setTextInput(null); setTextValue(''); return }
    onAnnotationCreate?.({
      id: crypto.randomUUID(), tool: 'text', color,
      start: textInput.canvasPos,
      end:   textInput.canvasPos,
      text:  textValue.trim(),
      timestamp: currentTime, createdAt: new Date().toISOString()
    })
    setTextInput(null); setTextValue('')
  }

  const s = { position:'absolute', top:0, left:0, width:'100%', height:'100%' }

  return (
    <>
      <canvas ref={canvasRef} width={width} height={height}
        style={{ ...s, pointerEvents:'none' }} />
      <canvas ref={previewRef} width={width} height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => drawing && handleMouseUp({ clientX:0, clientY:0 })}
        style={{ ...s, cursor: tool === 'text' ? cursor : 'crosshair' }}
      />
      {/* Input texte flottant */}
      {textInput && (
        <input
          ref={textRef}
          className="annotation-text-input"
          value={textValue}
          onChange={e => setTextValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleTextSubmit()
            if (e.key === 'Escape') { setTextInput(null); setTextValue('') }
          }}
          onBlur={handleTextSubmit}
          placeholder="Tapez votre texte…"
          style={{
            position: 'absolute',
            left: textInput.screenPos.x,
            top:  textInput.screenPos.y - 10,
            color,
          }}
        />
      )}
    </>
  )
}

function drawArrow(ctx, start, end) {
  const dx = end.x - start.x, dy = end.y - start.y
  const len = Math.sqrt(dx*dx + dy*dy)
  if (len < 2) return
  const angle = Math.atan2(dy, dx)
  const head  = Math.min(16, len * 0.4)
  ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(end.x, end.y)
  ctx.lineTo(end.x - head * Math.cos(angle - Math.PI/6), end.y - head * Math.sin(angle - Math.PI/6))
  ctx.lineTo(end.x - head * Math.cos(angle + Math.PI/6), end.y - head * Math.sin(angle + Math.PI/6))
  ctx.closePath(); ctx.fill()
}
