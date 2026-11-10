import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ROLES = ['og', 'senior_choreo', 'adult', 'admin']

// MUST match how Login.jsx builds the email
const toEmail = (name) => `${name.trim().toLowerCase().replace(/\s+/g, '.')}@zaleda.app`

const lines = readFileSync('scripts/judges.csv', 'utf8')
  .replace(/^\uFEFF/, '')
  .split(/\r?\n/)
  .filter((l) => l.trim())
  .slice(1) // skip header

// existing accounts, so re-running the script updates instead of failing
const { data: existing } = await supabase.auth.admin.listUsers({ perPage: 1000 })
const byEmail = new Map(existing.users.map((u) => [u.email, u.id]))

const seen = new Set()
let ok = 0

for (const line of lines) {
  const [name, role, pin] = line.split(',').map((s) => s.trim())
  const email = toEmail(name)

  if (!name || !ROLES.includes(role) || !pin || pin.length < 6) {
    console.log(`SKIPPED (bad row): ${line}`)
    continue
  }
  if (seen.has(email)) {
    console.log(`SKIPPED (duplicate name): ${name}`)
    continue
  }
  seen.add(email)

  let id = byEmail.get(email)
  if (id) {
    await supabase.auth.admin.updateUserById(id, { password: pin })
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: pin,
      email_confirm: true,
    })
    if (error) {
      console.log(`FAILED: ${name} -> ${error.message}`)
      continue
    }
    id = data.user.id
  }

  const { error: pErr } = await supabase.from('profiles').upsert({ id, name, role })
  if (pErr) console.log(`PROFILE FAILED: ${name} -> ${pErr.message}`)
  else {
    ok++
    console.log(`OK: ${name} (${role})`)
  }
}

console.log(`\nDone. ${ok} accounts ready.`)