import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      // Si 2FA activé côté backend, rediriger vers /verify-2fa
      // Sinon directement vers /app
      navigate('/app')
    } catch (err) {
      setError(err.message || 'Identifiants incorrects')
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
          <p className="auth-tagline-title">La revue vidéo collaborative pour vos équipes.</p>
          <p className="auth-tagline-sub">Annotez, commentez et collaborez en temps réel sur vos contenus vidéo.</p>
        </div>
      </div>

      <div className="auth-right">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-header">
            <h1>Connexion</h1>
            <p>Accédez à votre espace de travail</p>
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <Link to="/forgot-password" className="auth-forgot">
            Mot de passe oublié ?
          </Link>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-btn-primary" disabled={submitting}>
            {submitting ? 'Connexion...' : 'Se connecter'}
          </button>

          <div className="auth-divider">
            <span></span>
            <small>ou</small>
            <span></span>
          </div>

          <p className="auth-switch">
            Pas encore de compte ?{' '}
            <Link to="/register">Créer un compte</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
