import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Verify2FA() {
  const navigate = useNavigate()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputs = useRef([])

  useEffect(() => {
    inputs.current[0]?.focus()
  }, [])

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    if (value && index < 5) {
      inputs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setCode(pasted.split(''))
      inputs.current[5]?.focus()
    }
    e.preventDefault()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const fullCode = code.join('')
    if (fullCode.length < 6) {
      setError('Veuillez saisir les 6 chiffres du code')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      // TODO: brancher sur POST /auth/verify-2fa { code: fullCode }
      await new Promise((r) => setTimeout(r, 800)) // simulation
      navigate('/app')
    } catch (err) {
      setError('Code incorrect ou expiré')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-left">
        <div className="auth-brand">
          <img src="/collabix-logo.png" alt="Collabix" className="auth-logo-img" />
        </div>
        <div className="auth-tagline">
          <p className="auth-tagline-title">Vérification en deux étapes.</p>
          <p className="auth-tagline-sub">Cette étape supplémentaire protège votre compte et les données de votre entreprise.</p>
        </div>
      </div>

      <div className="auth-right">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-header">
            <h1>Vérification 2FA</h1>
            <p>Saisissez le code à 6 chiffres envoyé à votre adresse email</p>
          </div>

          <div className="otp-row" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                className="otp-input"
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
              />
            ))}
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-btn-primary" disabled={submitting}>
            {submitting ? 'Vérification...' : 'Vérifier le code'}
          </button>

          <p className="auth-switch" style={{marginTop:'1rem'}}>
            Code non reçu ? <span style={{color:'#7C3AED', cursor:'pointer'}}>Renvoyer</span>
          </p>
        </form>
      </div>
    </div>
  )
}
