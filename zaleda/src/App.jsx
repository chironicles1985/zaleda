import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Home from './pages/Home'
import Batch from './pages/Batch'
import Dashboard from './pages/admin/Dashboard'
import RequireAuth from './components/RequireAuth'
import ColorBends from './assets/Particles'

export default function App() {
  return (
    <>
      <ColorBends
        className="app-background"
        colors={['#ff0000', '#b30000', '#6d0819']}
        rotation={90}
        speed={0.2}
        scale={1}
        frequency={1}
        warpStrength={1}
        mouseInfluence={0.45}
        noise={0.41}
        parallax={0.5}
        iterations={0.8}
        intensity={0.4}
        bandWidth={6}
        transparent
        autoRotate={0}
      />
      <main className="app-content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
          <Route path="/batch/:id" element={<RequireAuth><Batch /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth admin><Dashboard /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}