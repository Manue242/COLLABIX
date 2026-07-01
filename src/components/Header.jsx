import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'

export default function Header() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const searchRef = useRef(null)
  const inputRef = useRef(null)
  const avatarRef = useRef(null)

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'U'

  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false)
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setDropdownOpen(false)
    }
    const handleKey = (e) => {
      if (e.key === 'Escape') { setSearchOpen(false); setDropdownOpen(false) }
    }
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  const openSearch = () => {
    setSearchOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <header className="app-header">
      <div className="app-header-left">
        <div className="app-logo" onClick={() => navigate('/app')}>
          <img src="/collabix-logo.png" alt="Collabix" className="app-logo-img" />
        </div>
        <nav className="app-nav">
          <button
            className={`app-nav-btn ${location.pathname === '/app' ? 'active' : ''}`}
            onClick={() => navigate('/app')}
          >Accueil</button>
          <button
            className={`app-nav-btn ${location.pathname === '/catalogue' ? 'active' : ''}`}
            onClick={() => navigate('/catalogue')}
          >Catalogue</button>
        </nav>
      </div>

      <div className="app-header-right">
        
        {/* Search */}
        <div
          ref={searchRef}
          className={`app-search ${searchOpen ? 'open' : ''}`}
          onClick={!searchOpen ? openSearch : undefined}
        >
          <div className="app-search-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <input
            ref={inputRef}
            className="app-search-input"
            type="text"
            placeholder="Rechercher une vidéo..."
            autoComplete="off"
          />
        </div>

        {/* Notifications */}
        <div className="app-icon-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="app-notif-dot" />
        </div>

        {/* Avatar + dropdown */}
        <div ref={avatarRef} style={{ position: 'relative' }}>
          <button className="app-avatar" onClick={() => setDropdownOpen(v => !v)}>
            {initials}
          </button>
          {dropdownOpen && (
            <div className="app-dropdown">
              <div className="app-dd-head">
                <div className="app-dd-name">{user?.username}</div>
                <span className="app-dd-role">{user?.role === 'admin' ? 'Admin' : 'Utilisateur'}</span>
              </div>
              <div className="app-dd-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Mon profil
              </div>
              <div className="app-dd-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Paramètres
              </div>
              <div className="app-dd-item app-dd-theme-row" onClick={toggle}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {theme === 'light'
                    ? <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    : <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></>
                  }
                </svg>
                <span>{theme === 'light' ? 'Mode sombre' : 'Mode clair'}</span>
                <div className={`app-dd-switch ${theme === 'dark' ? 'on' : ''}`}>
                  <div className="app-dd-switch-thumb" />
                </div>
              </div>
              <hr className="app-dd-sep" />
              <div className="app-dd-item app-dd-logout" onClick={logout}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Déconnexion
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
