import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Home from './pages/Home'
import Batch from './pages/Batch'
import Vote from './pages/Vote'
import Dashboard from './pages/admin/Dashboard'
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
          <Route path="/" element={<Home />} />
          <Route path="/batch/:id" element={<Batch />} />
          <Route path="/vote/:performanceId" element={<Vote />} />
          <Route path="/admin" element={<Dashboard />} />
        </Routes>
      </main>
    </>
  )
}