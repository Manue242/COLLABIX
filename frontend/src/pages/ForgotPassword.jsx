import React, { useState } from 'react'
import { Link } from 'react-router-dom'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      // TODO: brancher sur POST /auth/forgot-password côté backend
      await new Promise((r) => setTimeout(r, 800)) // simulation
      setSent(true)
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
          <p className="auth-tagline-title">Réinitialisez votre mot de passe en toute sécurité.</p>
          <p className="auth-tagline-sub">Nous vous enverrons un lien de réinitialisation à votre adresse email professionnelle.</p>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form">
          <div className="auth-form-header">
            <h1>Mot de passe oublié</h1>
            <p>Saisissez votre email pour recevoir un lien de réinitialisation</p>
          </div>

          {sent ? (
            <div className="auth-success-box">
              <p>Un email a été envoyé à <strong>{email}</strong>.</p>
              <p>Vérifiez votre boîte de réception et suivez les instructions.</p>
              <Link to="/login" className="auth-btn-primary" style={{display:'block', textAlign:'center', marginTop:'1rem', textDecoration:'none'}}>
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="auth-field">
                <label>Adresse email</label>
                <input
                  type="email"
                  placeholder="vous@entreprise.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <button type="submit" className="auth-btn-primary" disabled={submitting}>
                {submitting ? 'Envoi...' : 'Envoyer le lien'}
              </button>

              <p className="auth-switch" style={{marginTop:'1rem'}}>
                <Link to="/login">← Retour à la connexion</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
