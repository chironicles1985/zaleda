import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const cacheKey = (id) => `zaleda-lineup-${id}`

const readCache = (id) => {
  try { return JSON.parse(localStorage.getItem(cacheKey(id))) } catch { return null }
}

const shape = (rows) =>
  rows.map((p) => ({
    id: p.id,
    order: p.order_no,
    type: p.type,
    members: p.performance_members.map((pm) => ({
      id: pm.performers.id,
      name: pm.performers.name,
      age: pm.performers.age,
      photo: pm.performers.photo_url || '',
      styles: pm.performers.styles || [],
    })),
  }))

export function useLineup(batchId) {
  const [performances, setPerformances] = useState(() => readCache(batchId))
  const [loading, setLoading] = useState(!readCache(batchId))
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const cached = readCache(batchId)

    // Offline with a cached lineup: the initial state already shows it, so
    // don't even attempt a network request.
    if (!navigator.onLine && cached) return () => { cancelled = true }

    supabase
      .from('performances')
      .select('id, order_no, type, performance_members(performers(id, name, age, photo_url, styles))')
      .eq('batch', Number(batchId))
      .order('order_no')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setError(error.message) // offline: keep showing the cached lineup
        } else {
          const shaped = shape(data)
          setPerformances(shaped)
          localStorage.setItem(cacheKey(batchId), JSON.stringify(shaped))
        }
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [batchId])

  return { performances, loading, error }
}