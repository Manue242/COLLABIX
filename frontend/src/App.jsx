import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Verify2FA from './pages/Verify2FA.jsx'
import Home from './pages/Home.jsx'
import Catalogue from './pages/Catalogue.jsx'
import PlayerPage from './pages/PlayerPage.jsx'
import UploadVideo from './pages/UploadVideo.jsx'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login"           element={<Login />} />
            <Route path="/register"        element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-2fa"      element={<Verify2FA />} />
            <Route path="/app"             element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/catalogue"       element={<ProtectedRoute><Catalogue /></ProtectedRoute>} />
            <Route path="/app/player/:id"  element={<ProtectedRoute><PlayerPage /></ProtectedRoute>} />
            <Route path="/upload"          element={<ProtectedRoute><UploadVideo /></ProtectedRoute>} />
            <Route path="*"                element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
