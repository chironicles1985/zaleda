import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getRole } from '../lib/auth'

export default function RequireAuth({ children, admin = false }) {
  const [role, setRole] = useState(undefined) // undefined = still checking

  useEffect(() => {
    getRole().then(setRole)
  }, [])

  if (role === undefined) {
    return <div className="flex min-h-dvh items-center justify-center text-white/60">Loading...</div>
  }
  if (!role) return <Navigate to="/login" replace />
  if (admin && role !== 'admin') return <Navigate to="/" replace />
  if (!admin && role === 'admin') return <Navigate to="/admin" replace />
  return children
}