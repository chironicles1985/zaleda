import { useMemo, useState } from 'react'
import { Download, CheckCircle2, XCircle, Clock } from 'lucide-react'

// ---------- SETTINGS (answers pending from the director) ----------
const PASS_PERCENT = 80
const PASS_RULE = 'at_least' // 'at_least' (>= 80%) or 'more_than' (> 80%)
const BORDERLINE_FROM = 75 // results from 75% up to the pass mark get a "close call" flag

// ---------- TEMPORARY DATA: replace with Firestore later ----------
const BATCHES = [
  { id: 3, label: 'Adults', eligible: 20 }, // OGs + Sr. Choreos
  { id: 4, label: 'Trainees 1', eligible: 50 }, // everyone above
  { id: 5, label: 'Trainees 2', eligible: 50 },
]

const TYPES = {
  3: ['solo', 'duo', 'trio', 'solo', 'duo'],
  4: ['solo', 'solo', 'solo', 'solo', 'solo', 'solo'],
  5: ['solo', 'solo', 'solo', 'solo', 'solo', 'solo'],
}

const RATIOS = [0.95, 0.8, 0.7, 0.85, 0.6, 0.78, 1, 0.9, 0.82, 0.74]

function makeRows(batch) {
  const rows = []
  let n = 0
  TYPES[batch.id].forEach((type, i) => {
    const size = { solo: 1, duo: 2, trio: 3 }[type]
    for (let k = 0; k < size; k++) {
      const ratio = RATIOS[n % RATIOS.length]
      const pending = n % 7 === 6 // a few "still voting" rows for testing
      const votesIn = pending ? batch.eligible - 3 : batch.eligible
      rows.push({
        id: `${batch.id}-${n}`,
        order: i + 1,
        type,
        name: `Performer ${n + 1}`,
        yes: Math.round(votesIn * ratio),
        votesIn,
        eligible: batch.eligible,
      })
      n++
    }
  })
  return rows
}

const ALL_ROWS = Object.fromEntries(BATCHES.map((b) => [b.id, makeRows(b)]))

// ---------- SCORING (later this moves to src/lib/scoring.js) ----------
function getResult(r) {
  if (r.votesIn < r.eligible) return { status: 'pending', pct: null }
  const pct = (r.yes / r.eligible) * 100
  // compare with integers to avoid floating-point surprises at exactly 80%
  const scaled = r.yes * 100
  const line = PASS_PERCENT * r.eligible
  const pass = PASS_RULE === 'at_least' ? scaled >= line : scaled > line
  return {
    status: pass ? 'pass' : 'fail',
    pct,
    borderline: !pass && pct >= BORDERLINE_FROM,
  }
}

const STATUS = {
  pass: { label: 'PASS', icon: CheckCircle2, cls: 'bg-green-500/15 text-green-300 border-green-500/30' },
  fail: { label: 'FAIL', icon: XCircle, cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  pending: { label: 'PENDING', icon: Clock, cls: 'bg-amber-400/15 text-amber-200 border-amber-400/30' },
}

function StatusChip({ status }) {
  const s = STATUS[status]
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${s.cls}`}>
      <Icon className="h-3.5 w-3.5" /> {s.label}
    </span>
  )
}

export default function Dashboard() {
  const [batchId, setBatchId] = useState(BATCHES[0].id)
  const [sortBy, setSortBy] = useState('order') // 'order' | 'rating'

  const batch = BATCHES.find((b) => b.id === batchId)

  const rows = useMemo(() => {
    const list = ALL_ROWS[batchId].map((r) => ({ ...r, result: getResult(r) }))
    if (sortBy === 'rating') {
      list.sort((a, b) => (b.result.pct ?? -1) - (a.result.pct ?? -1))
    }
    return list
  }, [batchId, sortBy])

  const counts = {
    pass: rows.filter((r) => r.result.status === 'pass').length,
    fail: rows.filter((r) => r.result.status === 'fail').length,
    pending: rows.filter((r) => r.result.status === 'pending').length,
  }

  const exportCsv = () => {
    const lines = [['Batch', 'Order', 'Type', 'Name', 'YES', 'Votes in', 'Judges', 'Percent', 'Status']]
    BATCHES.forEach((b) => {
      ALL_ROWS[b.id].forEach((r) => {
        const res = getResult(r)
        lines.push([
          b.label, r.order, r.type, r.name, r.yes, r.votesIn, r.eligible,
          res.pct === null ? '' : res.pct.toFixed(1), res.status.toUpperCase(),
        ])
      })
    })
    const csv = lines.map((l) => l.map((c) => `"${c}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'zaleda-results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-dvh px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-4xl">
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold md:text-4xl">ZALEDA 2.0 Results</h1>
            <p className="mt-1 text-sm text-white/60">
              Pass mark: {PASS_RULE === 'at_least' ? 'at least' : 'more than'} {PASS_PERCENT}% YES
            </p>
          </div>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold transition active:scale-95"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={async () => { await logout(); navigate('/login') }}
            className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-sm text-white/80 backdrop-blur-md"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>

        {/* batch chips */}
        <div className="mt-6 flex flex-wrap gap-2">
          {BATCHES.map((b) => (
            <button
              key={b.id}
              onClick={() => setBatchId(b.id)}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                b.id === batchId
                  ? 'bg-brand text-white shadow-lg shadow-brand/30'
                  : 'border border-white/15 bg-white/10 text-white/80'
              }`}
            >
              {b.label}
              <span className="ml-2 text-xs opacity-70">{ALL_ROWS[b.id].length}</span>
            </button>
          ))}
        </div>

        {/* summary */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            ['Passed', counts.pass, 'text-green-300'],
            ['Failed', counts.fail, 'text-red-300'],
            ['Pending', counts.pending, 'text-amber-200'],
          ].map(([label, value, cls]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-md">
              <div className={`text-3xl font-extrabold ${cls}`}>{value}</div>
              <div className="text-xs text-white/60">{label}</div>
            </div>
          ))}
        </div>

        {/* table */}
        <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-xs text-white/60">
            <span>{batch.eligible} judges per performer</span>
            <button
              onClick={() => setSortBy((s) => (s === 'order' ? 'rating' : 'order'))}
              className="rounded-full bg-white/10 px-3 py-1.5 font-semibold text-white/80"
            >
              Sort: {sortBy === 'order' ? 'Performance order' : 'Highest rating'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-white/50">
                  <th className="px-5 py-3 font-semibold">Performer</th>
                  <th className="px-3 py-3 font-semibold">Rating</th>
                  <th className="px-3 py-3 font-semibold">YES</th>
                  <th className="px-5 py-3 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const { status, pct, borderline } = r.result
                  return (
                    <tr key={r.id} className="border-t border-white/5">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold">{r.name}</div>
                        <div className="text-xs text-white/50">
                          #{r.order} · {r.type.toUpperCase()}
                        </div>
                      </td>

                      <td className="w-56 px-3 py-3.5">
                        {pct === null ? (
                          <span className="text-sm text-white/40">Waiting for votes</span>
                        ) : (
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg font-bold">{pct.toFixed(0)}%</span>
                              {borderline && (
                                <span className="text-[11px] font-semibold text-amber-300">close call</span>
                              )}
                            </div>
                            {/* bar with a marker at the pass line */}
                            <div className="relative mt-1 h-1.5 rounded-full bg-white/10">
                              <div
                                className={`h-full rounded-full ${status === 'pass' ? 'bg-green-400' : 'bg-brand'}`}
                                style={{ width: `${pct}%` }}
                              />
                              <div
                                className="absolute -top-1 h-3.5 w-0.5 bg-white/70"
                                style={{ left: `${PASS_PERCENT}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3.5 text-sm text-white/70">
                        {r.yes}/{r.eligible}
                        {status === 'pending' && (
                          <div className="text-[11px] text-amber-200">
                            {r.votesIn}/{r.eligible} voted
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <StatusChip status={status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}