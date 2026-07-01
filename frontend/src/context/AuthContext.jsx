import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restaurer la session depuis le localStorage au montage
  useEffect(() => {
    const token = localStorage.getItem('collabix_token')
    const stored = localStorage.getItem('collabix_user')
    if (token && stored) {
      setUser(JSON.parse(stored))
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    if (!email || !password) throw new Error('Champs requis')
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Identifiants incorrects')
    }
    const data = await res.json()
    localStorage.setItem('collabix_token', data.access_token)

    // Récupérer le profil complet (id, username, email)
    const profileRes = await fetch('/auth/me', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    })
    const profile = await profileRes.json()
    localStorage.setItem('collabix_user', JSON.stringify(profile))
    setUser(profile)
  }

  const register = async (username, email, password) => {
    const res = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Erreur lors de la création du compte')
    }
    // Auto-login après register
    await login(email, password)
  }

  const logout = () => {
    localStorage.removeItem('collabix_token')
    localStorage.removeItem('collabix_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return ctx
}
