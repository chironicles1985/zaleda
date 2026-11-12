import { supabase } from './supabase'

export async function getRole() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const key = `zaleda-role-${session.user.id}`
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (data?.role) {
    localStorage.setItem(key, data.role)
    return data.role
  }
  return localStorage.getItem(key) // offline fallback
}

export async function logout() {
  await supabase.auth.signOut()
}