import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, CheckCircle2, XCircle, Clock, RefreshCw, LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { logout } from '../../lib/auth'

// ---------- SETTINGS (answers pending from the director) ----------
const PASS_PERCENT = 80
const PASS_RULE = 'at_least' // 'at_least' (>= 80%) or 'more_than' (> 80%)
const BORDERLINE_FROM = 75 // fails from here up to the pass mark get a "close call" flag

const BATCHES = [
  { id: 3, label: 'Adults' },
  { id: 4, label: 'Trainees 1' },
  { id: 5, label: 'Trainees 2' },
]

// ---------- SCORING ----------
function getResult(r) {
  // nobody can abstain, so a performer is PENDING until every active judge has voted
  if (!r.eligible || r.votesIn < r.eligible) return { status: 'pending', pct: null }
  const pct = (r.yes / r.eligible) * 100
  // compare whole numbers to avoid floating-point surprises at exactly 80%
  const scaled = r.yes * 100
  const line = PASS_PERCENT * r.eligible
  const pass = PASS_RULE === 'at_least' ? scaled >= line : scaled > line
  return { status: pass ? 'pass' : 'fail', pct, borderline: !pass && pct >= BORDERLINE_FROM }
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
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updated, setUpdated] = useState(null)
  const [batchId, setBatchId] = useState(BATCHES[0].id)
  const [sortBy, setSortBy] = useState('order') // 'order' | 'rating'

  const load = useCallback(async () => {
    const [perfRes, resRes] = await Promise.all([
      supabase
        .from('performances')
        .select('id, batch, order_no, type, performance_members(performers(id, name))')
        .in('batch', [3, 4, 5])
        .order('order_no'),
      supabase.from('results').select('performer_id, yes_count, votes_in, eligible'),
    ])

    const err = perfRes.error || resRes.error
    if (err) {
      setError(err.message) // keep whatever we already had on screen
      setLoading(false)
      return
    }

    const byPerformer = new Map(resRes.data.map((r) => [r.performer_id, r]))
    const list = []
    perfRes.data.forEach((p) => {
      p.performance_members.forEach((pm) => {
        const r = byPerformer.get(pm.performers.id)
        list.push({
          id: pm.performers.id,
          batch: p.batch,
          order: p.order_no,
          type: p.type,
          name: pm.performers.name,
          yes: Number(r?.yes_count ?? 0),
          votesIn: Number(r?.votes_in ?? 0),
          eligible: Number(r?.eligible ?? 0),
        })
      })
    })

    setRows(list)
    setError('')
    setUpdated(new Date())
    setLoading(false)
  }, [])

  // load now, then refresh every 10 seconds
  useEffect(() => {
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [load])

  const batch = BATCHES.find((b) => b.id === batchId)

  const batchRows = useMemo(() => {
    const list = rows
      .filter((r) => r.batch === batchId)
      .map((r) => ({ ...r, result: getResult(r) }))
      .sort((a, b) => a.order - b.order)
    if (sortBy === 'rating') list.sort((a, b) => (b.result.pct ?? -1) - (a.result.pct ?? -1))
    return list
  }, [rows, batchId, sortBy])

  const counts = {
    pass: batchRows.filter((r) => r.result.status === 'pass').length,
    fail: batchRows.filter((r) => r.result.status === 'fail').length,
    pending: batchRows.filter((r) => r.result.status === 'pending').length,
  }

  const exportCsv = () => {
    const lines = [['Batch', 'Order', 'Type', 'Name', 'YES', 'Votes in', 'Judges', 'Percent', 'Status']]
    BATCHES.forEach((b) => {
      rows
        .filter((r) => r.batch === b.id)
        .sort((x, y) => x.order - y.order)
        .forEach((r) => {
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

  const eligible = batchRows[0]?.eligible ?? 0

  return (
    <div className="min-h-dvh px-4 py-8 md:px-8">
      <div className="mx-auto w-full max-w-4xl">
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold md:text-4xl">ZALEDA 2.0 Results</h1>
            <p className="mt-1 text-sm text-white/60">
              Pass mark: {PASS_RULE === 'at_least' ? 'at least' : 'more than'} {PASS_PERCENT}% YES
              {updated && ` · Updated ${updated.toLocaleTimeString()}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={load}
              className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold transition active:scale-95"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button
              onClick={exportCsv}
              disabled={!rows.length}
              className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold transition active:scale-95 disabled:opacity-40"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button
              onClick={async () => { await logout(); navigate('/login', { replace: true }) }}
              className="flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 py-2.5 text-sm font-semibold transition active:scale-95"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </div>

        {/* error banner */}
        {error && (
          <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/15 px-4 py-3 text-sm text-red-200">
            Couldn't load the latest results: {error}
            {rows.length > 0 && ' Showing the last loaded numbers.'}
          </p>
        )}

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
              <span className="ml-2 text-xs opacity-70">{rows.filter((r) => r.batch === b.id).length}</span>
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
            <span>{eligible} judges per performer</span>
            <button
              onClick={() => setSortBy((s) => (s === 'order' ? 'rating' : 'order'))}
              className="rounded-full bg-white/10 px-3 py-1.5 font-semibold text-white/80"
            >
              Sort: {sortBy === 'order' ? 'Performance order' : 'Highest rating'}
            </button>
          </div>

          {loading ? (
            <p className="px-5 py-10 text-center text-white/60">Loading results...</p>
          ) : batchRows.length === 0 ? (
            <p className="px-5 py-10 text-center text-white/60">
              No performers in {batch.label} yet.
            </p>
          ) : (
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
                  {batchRows.map((r) => {
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
          )}
        </div>
      </div>
    </div>
  )
}