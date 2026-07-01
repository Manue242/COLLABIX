// Helper d'authentification — API FastAPI backend (port 8000, proxié par Vite)
// Endpoints : POST /auth/login  POST /auth/register  GET /auth/me
const TOKEN_KEY = 'collabix_token'

export async function login(email, password) {
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error('Identifiants invalides')
  const data = await res.json()
  localStorage.setItem(TOKEN_KEY, data.access_token)
  return data
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem('collabix_user')
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

// fetch authentifié : ajoute automatiquement Authorization: Bearer <token>
export async function authFetch(path, options = {}) {
  const token = getToken()
  return fetch(path, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}
