import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, CheckCircle2, XCircle, Clock, RefreshCw, LogOut, ChevronDown } from 'lucide-react'
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
  pass: { label: 'PASS', icon: CheckCircle2, tone: 'text-green-300' },
  fail: { label: 'FAIL', icon: XCircle, tone: 'text-red-300' },
  pending: { label: 'PENDING', icon: Clock, tone: 'text-amber-300' },
}

const STATUS_ORDER = ['pass', 'fail', 'pending']

// The admin picks the status by hand. The saved choice is kept on this device,
// so it survives the 10-second refresh and a page reload.
const STATUS_KEY = 'zaleda-status'

function readStatusChoices() {
  try {
    const saved = JSON.parse(localStorage.getItem(STATUS_KEY))
    return saved && typeof saved === 'object' ? saved : {}
  } catch {
    return {}
  }
}

function VoterList({ title, tone, dot, icon: Icon, names }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className={`mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${tone}`}>
        <Icon className="h-4 w-4" /> {title} · {names.length}
      </div>
      {names.length ? (
        <ul className="grid gap-1.5 text-sm text-white/80 sm:grid-cols-2">
          {names.map((name, i) => (
            <li key={`${name}-${i}`} className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
              {name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-white/40">None yet</p>
      )}
    </div>
  )
}

function StatusSelect({ value, onChange, name }) {
  const s = STATUS[value] ?? STATUS.pending
  const Icon = s.icon
  return (
    <span className="relative inline-flex items-center">
      <Icon className={`pointer-events-none absolute left-3 h-3.5 w-3.5 ${s.tone}`} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Status for ${name}`}
        className="cursor-pointer appearance-none rounded-full border border-white/20 bg-white/10 py-1.5 pl-8 pr-8 text-xs font-bold uppercase tracking-wider text-white/90 outline-none backdrop-blur-md transition hover:bg-white/15 focus:border-white/40"
      >
        {STATUS_ORDER.map((key) => (
          <option key={key} value={key} className="bg-neutral-900 text-white">
            {STATUS[key].label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-white/60" />
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
  const [sortBy, setSortBy] = useState('order') // 'order' | 'no'
  const [openVoter, setOpenVoter] = useState(null) // performer id whose voter names are shown
  const [statusChoices, setStatusChoices] = useState(readStatusChoices)

  const chooseStatus = (id, value) => {
    setStatusChoices((prev) => {
      const next = { ...prev, [id]: value }
      try {
        localStorage.setItem(STATUS_KEY, JSON.stringify(next))
      } catch {
        // Storage full/unavailable: the choice still applies until reload.
      }
      return next
    })
  }

  const load = useCallback(async () => {
    const [perfRes, resRes, votesRes, profilesRes] = await Promise.all([
      supabase
        .from('performances')
        .select('id, batch, order_no, type, performance_members(performers(id, name))')
        .in('batch', [3, 4, 5])
        .order('order_no'),
      supabase.from('results').select('performer_id, yes_count, votes_in, eligible'),
      supabase.from('votes').select('performer_id, judge_id, vote'),
      supabase.from('profiles').select('id, name'),
    ])

    const err = perfRes.error || resRes.error || votesRes.error || profilesRes.error
    if (err) {
      setError(err.message) // keep whatever we already had on screen
      setLoading(false)
      return
    }

    // Judge names for the "who voted yes/no" breakdown. Fall back to a short
    // id fragment so a missing profile never hides a vote entirely.
    const judgeNames = new Map((profilesRes.data ?? []).map((p) => [p.id, p.name]))
    const voters = new Map()
    ;(votesRes.data ?? []).forEach((v) => {
      if (!voters.has(v.performer_id)) voters.set(v.performer_id, { yes: [], no: [] })
      const name = judgeNames.get(v.judge_id) ?? `Judge ${String(v.judge_id).slice(0, 8)}`
      voters.get(v.performer_id)[v.vote ? 'yes' : 'no'].push(name)
    })
    voters.forEach((g) => {
      g.yes.sort()
      g.no.sort()
    })

    const byPerformer = new Map(resRes.data.map((r) => [r.performer_id, r]))
    const list = []
    perfRes.data.forEach((p) => {
      p.performance_members.forEach((pm) => {
        const r = byPerformer.get(pm.performers.id)
        const v = voters.get(pm.performers.id)
        list.push({
          id: pm.performers.id,
          batch: p.batch,
          order: p.order_no,
          type: p.type,
          name: pm.performers.name,
          yes: Number(r?.yes_count ?? 0),
          no: Number(r?.votes_in ?? 0) - Number(r?.yes_count ?? 0),
          votesIn: Number(r?.votes_in ?? 0),
          eligible: Number(r?.eligible ?? 0),
          yesVoters: v?.yes ?? [],
          noVoters: v?.no ?? [],
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
    const kick = setTimeout(load, 0)
    const t = setInterval(load, 10000)
    return () => {
      clearTimeout(kick)
      clearInterval(t)
    }
  }, [load])

  const batch = BATCHES.find((b) => b.id === batchId)

  const batchRows = useMemo(() => {
    const list = rows
      .filter((r) => r.batch === batchId)
      .map((r) => ({ ...r, status: statusChoices[r.id] ?? getResult(r).status }))
      .sort((a, b) => a.order - b.order)
    if (sortBy === 'no') list.sort((a, b) => b.no - a.no || a.order - b.order)
    return list
  }, [rows, batchId, sortBy, statusChoices])

  const counts = {
    pass: batchRows.filter((r) => r.status === 'pass').length,
    fail: batchRows.filter((r) => r.status === 'fail').length,
    pending: batchRows.filter((r) => r.status === 'pending').length,
  }

  const exportCsv = () => {
    const lines = [[
      'Batch', 'Order', 'Type', 'Name', 'YES', 'NO', 'Votes in', 'Judges', 'Percent', 'Status',
      'YES voters', 'NO voters',
    ]]
    BATCHES.forEach((b) => {
      rows
        .filter((r) => r.batch === b.id)
        .sort((x, y) => x.order - y.order)
        .forEach((r) => {
          const res = getResult(r)
          const status = statusChoices[r.id] ?? res.status
          lines.push([
            b.label, r.order, r.type, r.name, r.yes, r.no, r.votesIn, r.eligible,
            res.pct === null ? '' : res.pct.toFixed(1), status.toUpperCase(),
            r.yesVoters.join('; '), r.noVoters.join('; '),
          ])
        })
    })
    const csv = lines
      .map((l) => l.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(','))
      .join('\n')
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
              onClick={() => { setBatchId(b.id); setOpenVoter(null) }}
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
            <span>{eligible} judges per performer · tap the arrow to see who voted</span>
            <button
              onClick={() => setSortBy((s) => (s === 'order' ? 'no' : 'order'))}
              className="rounded-full bg-white/10 px-3 py-1.5 font-semibold text-white/80"
            >
              Sort: {sortBy === 'order' ? 'Performance order' : 'Most NO votes'}
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
              <table className="w-full min-w-[32rem] text-left">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-white/50">
                    <th className="px-5 py-3 font-semibold">Performer</th>
                    <th className="px-3 py-3 font-semibold">YES</th>
                    <th className="px-3 py-3 font-semibold">NO</th>
                    <th className="px-2 py-3 text-center font-semibold">Votes</th>
                    <th className="px-5 py-3 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {batchRows.map((r) => {
                    const { status } = r
                    const expanded = openVoter === r.id
                    return (
                      <Fragment key={r.id}>
                        <tr className="border-t border-white/5">
                          <td className="px-5 py-3.5">
                            <div className="font-semibold">{r.name}</div>
                            <div className="text-xs text-white/50">
                              #{r.order} · {r.type.toUpperCase()}
                            </div>
                          </td>

                          <td className="px-3 py-3.5 text-sm text-white/70">
                            {r.yes}/{r.eligible}
                            {status === 'pending' && (
                              <div className="text-[11px] text-amber-200">
                                {r.votesIn}/{r.eligible} voted
                              </div>
                            )}
                          </td>

                          <td className="px-3 py-3.5 text-sm">
                            <span className={r.no > 0 ? 'font-semibold text-red-300' : 'text-white/40'}>
                              {r.no}
                            </span>
                            <span className="text-white/40">/{r.eligible}</span>
                          </td>

                          <td className="px-2 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => setOpenVoter(expanded ? null : r.id)}
                              aria-expanded={expanded}
                              aria-label={`Show judges who voted for ${r.name}`}
                              title="Show who voted YES / NO"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 transition hover:bg-white/15 active:scale-95"
                            >
                              <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                            </button>
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <StatusSelect
                              value={status}
                              name={r.name}
                              onChange={(value) => chooseStatus(r.id, value)}
                            />
                          </td>
                        </tr>

                        {expanded && (
                          <tr className="border-t border-white/5 bg-white/[0.03]">
                            <td colSpan={5} className="px-5 py-4">
                              <div className="grid gap-3 md:grid-cols-2">
                                <VoterList
                                  title="Voted YES"
                                  tone="text-green-300"
                                  dot="bg-green-400"
                                  icon={CheckCircle2}
                                  names={r.yesVoters}
                                />
                                <VoterList
                                  title="Voted NO"
                                  tone="text-red-300"
                                  dot="bg-red-400"
                                  icon={XCircle}
                                  names={r.noVoters}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
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