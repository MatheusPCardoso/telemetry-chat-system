import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ChatPage from './pages/ChatPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuthStore } from './stores/authStore'
import './App.css'

function App() {
  const [isHydrated, setIsHydrated] = useState(false)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const hydrate = useAuthStore((state) => state.hydrate)

  useEffect(() => {
    hydrate()
    setIsHydrated(true)
  }, [hydrate])

  if (!isHydrated) {
    return null
  }

  return (
    <BrowserRouter>
      <Routes>
        {}
        <Route 
          path="/" 
          element={isAuthenticated ? <Navigate to="/chat" replace /> : <Navigate to="/login" replace />} 
        />
        
        {}
        <Route path="/login" element={<LoginPage />} />
        
        {}
        <Route path="/signup" element={<SignupPage />} />
        
        {}
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          } 
        />
        
        {}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
