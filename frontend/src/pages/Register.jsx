import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    setSubmitting(true)
    try {
      // TODO: brancher sur POST /auth/register quand l'endpoint backend existera
      // Pour l'instant on redirige vers le login
      navigate('/login')
    } catch (err) {
      setError(err.message || "Erreur lors de la création du compte")
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
          <p className="auth-tagline-title">Rejoignez votre équipe sur Collabix.</p>
          <p className="auth-tagline-sub">Créez votre compte et commencez à collaborer sur vos vidéos en quelques secondes.</p>
        </div>
      </div>

      <div className="auth-right">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-header">
            <h1>Créer un compte</h1>
            <p>Renseignez vos informations pour commencer</p>
          </div>

          <div className="auth-field">
            <label>Nom complet</label>
            <input
              type="text"
              placeholder="Jean Dupont"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

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

          <div className="auth-field">
            <label>Mot de passe</label>
            <input
              type="password"
              placeholder="8 caractères minimum"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div className="auth-field">
            <label>Confirmer le mot de passe</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-btn-primary" disabled={submitting}>
            {submitting ? 'Création...' : 'Créer mon compte'}
          </button>

          <div className="auth-divider">
            <span></span>
            <small>ou</small>
            <span></span>
          </div>

          <p className="auth-switch">
            Déjà un compte ?{' '}
            <Link to="/login">Se connecter</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
