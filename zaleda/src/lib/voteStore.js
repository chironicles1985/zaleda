import { supabase } from './supabase'

// ---------------------------------------------------------------------------
// Per-judge vote mirror
//
// Votes are copied to localStorage whenever they are loaded or submitted, so
// the "done" state survives an offline reload. The outbox remains the source
// of truth for what still needs to be sent to the server.
// ---------------------------------------------------------------------------
const votesKey = (userId) => `zaleda-votes-${userId}`
const rowKey = (v) => `${v.performance_id}:${v.performer_id}`

const read = (userId) => {
  if (!userId) return []
  try {
    const rows = JSON.parse(localStorage.getItem(votesKey(userId)) || '[]')
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

const write = (userId, rows) => {
  if (!userId) return
  try {
    localStorage.setItem(votesKey(userId), JSON.stringify(rows))
  } catch {
    // Storage full: the outbox still holds anything not yet synced.
  }
}

export function getCachedVotes(userId) {
  return read(userId)
}

export function addCachedVotes(userId, rows) {
  if (!userId || !rows?.length) return
  const merged = new Map(read(userId).map((v) => [rowKey(v), v]))
  for (const row of rows) merged.set(rowKey(row), row)
  write(userId, [...merged.values()])
}

// Returns this judge's votes, preferring the server when it answers and
// falling back to (or merging with) the local mirror when offline.
export async function loadVotes(userId) {
  const cached = read(userId)
  if (!userId || !navigator.onLine) return cached

  const { data, error } = await supabase
    .from('votes')
    .select('performance_id, performer_id, vote')
    .eq('judge_id', userId)

  if (error || !Array.isArray(data)) return cached

  addCachedVotes(userId, data)

  const merged = new Map(cached.map((v) => [rowKey(v), v]))
  for (const row of data) merged.set(rowKey(row), row)
  return [...merged.values()]
}
