import React, { useRef, useState, useEffect, useCallback } from 'react'

/**
 * Deux canvas superposés :
 * - canvasRef   : annotations finalisées (redessiné seulement quand la liste change)
 * - previewRef  : forme en cours de dessin (redessiné à chaque mousemove)
 * → beaucoup plus fluide, surtout pour ellipse et rectangle
 */
export default function AnnotationCanvas({
  width,
  height,
  currentTime,
  tool = 'arrow',
  color = '#F97316',
  annotations = [],
  onAnnotationCreate,
  onAnnotationDelete,
  onAnnotationsClear
}) {
  const canvasRef  = useRef(null)  // couche annotations finalisées
  const previewRef = useRef(null)  // couche dessin en cours
  const [drawing, setDrawing]   = useState(false)
  const [start, setStart]       = useState(null)
  const [current, setCurrent]   = useState(null)

  // ── Dessin d'une forme sur un contexte donné ──────────────
  const drawShape = useCallback((ctx, shape) => {
    const { tool: t, color: c, start: s, end: e } = shape
    ctx.strokeStyle = c
    ctx.fillStyle   = c
    ctx.lineWidth   = 2
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
    } else {
      // flèche
      drawArrow(ctx, s, e)
    }
  }, [])

  // ── Redessine la couche finalisée ──────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const visible = annotations.filter(
      a => Math.abs(a.timestamp - currentTime) < 0.5
    )
    visible.forEach(a => drawShape(ctx, a))
  }, [annotations, currentTime, drawShape])

  // ── Redessine uniquement le preview ───────────────────────
  useEffect(() => {
    const canvas = previewRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (drawing && start && current) {
      ctx.globalAlpha = 0.85
      drawShape(ctx, { tool, color, start, end: current })
      ctx.globalAlpha = 1
    }
  }, [drawing, start, current, tool, color, drawShape])

  // ── Ctrl+Z : annuler la dernière annotation ───────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        // Supprimer la dernière annotation du timecode courant
        const visible = annotations.filter(
          a => Math.abs(a.timestamp - currentTime) < 0.5
        )
        if (visible.length > 0) {
          const last = visible[visible.length - 1]
          onAnnotationDelete?.(last.id)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [annotations, currentTime, onAnnotationDelete])

  // ── Coordonnées relatives ──────────────────────────────────
  const getPos = (e) => {
    const rect = previewRef.current.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (previewRef.current.width / rect.width),
      y: (e.clientY - rect.top)  * (previewRef.current.height / rect.height)
    }
  }

  // ── Gestion du trait libre ─────────────────────────────────
  const freePointsRef = useRef([])

  const handleMouseDown = (e) => {
    const pos = getPos(e)
    setDrawing(true)
    setStart(pos)
    setCurrent(pos)
    if (tool === 'free') freePointsRef.current = [pos]
  }

  const handleMouseMove = (e) => {
    if (!drawing) return
    const pos = getPos(e)
    setCurrent(pos)

    if (tool === 'free') {
      freePointsRef.current.push(pos)
      // Dessin immédiat du trait libre sur le preview
      const canvas = previewRef.current
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = color
      ctx.lineWidth   = 2
      ctx.lineCap     = 'round'
      ctx.lineJoin    = 'round'
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
    if (!drawing || !start) return
    const end = getPos(e)
    setDrawing(false)

    // Ne créer une annotation que si la forme a une taille minimale
    const minSize = tool === 'free' ? 0 : 5
    if (Math.abs(end.x - start.x) < minSize && Math.abs(end.y - start.y) < minSize) {
      setCurrent(null)
      return
    }

    const annotation = {
      id: crypto.randomUUID(),
      tool,
      color,
      start,
      end,
      points: tool === 'free' ? [...freePointsRef.current] : undefined,
      timestamp: currentTime,
      createdAt: new Date().toISOString()
    }

    onAnnotationCreate?.(annotation)
    setStart(null)
    setCurrent(null)
    freePointsRef.current = []

    // Nettoyer le preview
    const ctx = previewRef.current?.getContext('2d')
    ctx?.clearRect(0, 0, previewRef.current.width, previewRef.current.height)
  }

  const handleMouseLeave = () => {
    if (drawing) handleMouseUp({ clientX: 0, clientY: 0 })
  }

  const canvasStyle = {
    position: 'absolute', top: 0, left: 0,
    width: '100%', height: '100%'
  }

  return (
    <>
      {/* Couche annotations finalisées */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ ...canvasStyle, pointerEvents: 'none' }}
      />
      {/* Couche preview interactive */}
      <canvas
        ref={previewRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ ...canvasStyle, cursor: 'crosshair' }}
      />
    </>
  )
}

// ── Flèche ────────────────────────────────────────────────────
function drawArrow(ctx, start, end) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 2) return

  const angle      = Math.atan2(dy, dx)
  const headLength = Math.min(16, len * 0.4)

  ctx.beginPath()
  ctx.moveTo(start.x, start.y)
  ctx.lineTo(end.x, end.y)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(end.x, end.y)
  ctx.lineTo(
    end.x - headLength * Math.cos(angle - Math.PI / 6),
    end.y - headLength * Math.sin(angle - Math.PI / 6)
  )
  ctx.lineTo(
    end.x - headLength * Math.cos(angle + Math.PI / 6),
    end.y - headLength * Math.sin(angle + Math.PI / 6)
  )
  ctx.closePath()
  ctx.fill()
}
