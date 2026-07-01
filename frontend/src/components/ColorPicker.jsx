import React, { useState, useRef, useEffect } from 'react'

const PRESETS = [
  // Ligne 1 — basiques
  '#ffffff','#000000','#6B7280','#D1D5DB',
  // Ligne 2 — chauds
  '#F97316','#EF4444','#F59E0B','#84CC16',
  // Ligne 3 — froids
  '#10B981','#06B6D4','#3B82F6','#8B5CF6',
  // Ligne 4 — pastels
  '#FCA5A5','#FCD34D','#6EE7B7','#93C5FD',
  // Ligne 5 — foncés
  '#7C2D12','#78350F','#14532D','#1E3A5F',
]

export default function ColorPicker({ color, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div className="cp-wrap" ref={ref}>
      {/* Bouton déclencheur */}
      <button
        className="cp-trigger"
        onClick={() => setOpen(v => !v)}
        title="Choisir une couleur"
      >
        <span className="cp-swatch" style={{ background: color }} />
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {/* Palette */}
      {open && (
        <div className="cp-panel">
          <div className="cp-grid">
            {PRESETS.map(c => (
              <button
                key={c}
                className={`cp-dot ${color === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => { onChange(c); setOpen(false) }}
                title={c}
              />
            ))}
          </div>

          <div className="cp-divider" />

          {/* Couleur personnalisée */}
          <div className="cp-custom">
            <label className="cp-custom-label">
              <span>Personnalisé</span>
              <div className="cp-custom-swatch" style={{ background: color }}>
                <input
                  type="color"
                  value={color}
                  onChange={e => onChange(e.target.value)}
                  className="cp-color-input"
                />
              </div>
            </label>
            <input
              type="text"
              value={color}
              onChange={e => {
                const v = e.target.value
                if (/^#[0-9A-Fa-f]{6}$/.test(v)) onChange(v)
              }}
              className="cp-hex-input"
              maxLength={7}
              placeholder="#F97316"
            />
          </div>
        </div>
      )}
    </div>
  )
}
