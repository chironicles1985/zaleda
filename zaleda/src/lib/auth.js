import { supabase } from './supabase'

// ---------------------------------------------------------------------------
// Offline identity
//
// At the event there may be no internet. Supabase's stored session is kept
// when a token refresh fails because of the network, but getSession() then
// returns `null` for an expired access token. So the judge identity/role is
// cached locally after a successful online login and used whenever the real
// session cannot be read. Logging out clears it.
// ---------------------------------------------------------------------------
const IDENTITY_KEY = 'zaleda-identity'
const roleKey = (id) => `zaleda-role-${id}`

// If the network is up but there is no real internet (venue Wi-Fi), a session
// refresh can take a long time to fail. Don't leave the app on "Loading...".
const SESSION_TIMEOUT_MS = 3000

export function readIdentity() {
  try {
    const raw = JSON.parse(localStorage.getItem(IDENTITY_KEY))
    return raw?.userId ? raw : null
  } catch {
    return null
  }
}

export function saveIdentity(patch) {
  if (!patch) return null
  const prev = readIdentity()
  const next = { ...(prev ?? {}) }
  // Never carry one judge's cached role over to a different account.
  if (patch.userId && prev?.userId && patch.userId !== prev.userId) delete next.role
  Object.assign(next, patch)
  if (!next.userId) return null
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(next))
  if (next.role) localStorage.setItem(roleKey(next.userId), next.role)
  return next
}

export function clearIdentity() {
  const cached = readIdentity()
  localStorage.removeItem(IDENTITY_KEY)
  if (cached?.userId) localStorage.removeItem(roleKey(cached.userId))
}

function readSession() {
  if (!navigator.onLine) return Promise.resolve(null)

  let timer
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), SESSION_TIMEOUT_MS)
  })

  return Promise.race([
    supabase.auth
      .getSession()
      .then(({ data }) => data.session ?? null)
      .catch(() => null),
    timeout,
  ]).finally(() => clearTimeout(timer))
}

export async function getRole() {
  const cached = readIdentity()
  const session = await readSession()

  // Offline, or the token expired while there was no connection: trust the
  // identity saved at login so the judge stays signed in.
  if (!session) return cached?.role ?? null

  const userId = session.user.id
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (data?.role) {
    saveIdentity({ userId, email: session.user.email, role: data.role })
    return data.role
  }

  // Network/server error: fall back to what this device already knows.
  if (error) {
    const local = cached?.userId === userId
      ? cached.role
      : localStorage.getItem(roleKey(userId))
    return local ?? null
  }

  return null
}

// Offline-safe judge id for reading/writing votes.
export async function getUserId() {
  const cached = readIdentity()
  const session = await readSession()
  const userId = session?.user?.id ?? cached?.userId ?? null

  if (userId && session?.user?.id) {
    saveIdentity({ userId, email: session.user.email })
  }

  return userId
}

export async function logout() {
  clearIdentity()
  try {
    await supabase.auth.signOut()
  } catch {
    // Offline: the local identity is already cleared, which is enough here.
  }
}
