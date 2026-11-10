import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const SIZE = { solo: 1, duo: 2, trio: 3 }

// refuse to double-seed
const { count } = await supabase.from('performers').select('*', { count: 'exact', head: true })
if (count > 0) {
  console.log('performers table is not empty. Clear it first (see the note), then run again.')
  process.exit(1)
}

const [header, ...lines] = readFileSync('scripts/lineup.csv', 'utf8')
  .replace(/^\uFEFF/, '')
  .split(/\r?\n/)
  .filter((l) => l.trim())
const cols = header.split(',').map((c) => c.trim())

const rows = lines.map((l) => {
  const cells = l.split(',').map((c) => c.trim())
  return Object.fromEntries(cols.map((c, i) => [c, cells[i] ?? '']))
})

// rows sharing the same batch + order are one duo/trio
const groups = new Map()
for (const r of rows) {
  const key = `${r.batch}-${r.order}`
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key).push(r)
}

for (const [key, members] of groups) {
  const { batch, order, type } = members[0]
  if (SIZE[type] !== members.length) {
    console.log(`WARNING ${key}: type is "${type}" but ${members.length} people listed. Skipped.`)
    continue
  }

  const { data: perf, error } = await supabase
    .from('performances')
    .insert({ batch: Number(batch), order_no: Number(order), type })
    .select('id')
    .single()
  if (error) { console.log(`FAILED ${key}: ${error.message}`); continue }

  for (const m of members) {
    const { data: person, error: e2 } = await supabase
      .from('performers')
      .insert({
        name: m.name,
        age: m.age ? Number(m.age) : null,
        batch: Number(batch),
        photo_url: m.photo || null,
        styles: m.styles ? m.styles.split('|').map((s) => s.trim()) : [],
        is_evaluated: Number(batch) >= 3, // batches 1 and 2 are not evaluated
      })
      .select('id')
      .single()
    if (e2) { console.log(`FAILED ${m.name}: ${e2.message}`); continue }

    await supabase
      .from('performance_members')
      .insert({ performance_id: perf.id, performer_id: person.id })
    console.log(`OK: batch ${batch} #${order} ${m.name}`)
  }
}
console.log('\nDone.')