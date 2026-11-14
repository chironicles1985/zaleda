import { supabase } from './supabase'

const KEY = 'zaleda-outbox'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
const write = (q) => localStorage.setItem(KEY, JSON.stringify(q))

export const hasPending = (performanceId) => read().some((i) => i.performanceId === performanceId)

export function enqueue(performanceId, rows) {
  const q = read().filter((i) => i.performanceId !== performanceId)
  q.push({ performanceId, rows })
  write(q)
}

let flushing = false
export async function flush(onSynced) {
  if (flushing || !navigator.onLine) return
  flushing = true
  try {
    for (const item of read()) {
      const { error } = await supabase
        .from('votes')
        .upsert(item.rows, { onConflict: 'judge_id,performer_id', ignoreDuplicates: true })
      if (error) break // no signal or server error: keep it queued, try again later
      write(read().filter((i) => i.performanceId !== item.performanceId))
      onSynced?.(item.performanceId)
    }
  } finally {
    flushing = false
  }
}