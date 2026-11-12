import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Check, X, Wifi, WifiOff, CloudCheck, HardDrive, ChevronsDown,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { enqueue, flush, hasPending } from '../lib/outbox'
import { useLineup } from '../lib/useLineup'

// One shared column for header, card and bottom bar.
// Phones use a fixed column; laptops/desktops cap it at 25rem; portrait tablets
// size it from the viewport height so the card fills the screen and the chrome
// (sized in cqw) stays exactly as wide as the card.
const COLUMN =
  'mx-auto w-full max-w-md px-4 [container-type:inline-size] md:max-w-[25rem] md:portrait:max-w-[min(52rem,calc(43dvh_+_3rem))] md:portrait:px-6'

// ---------- TEMPORARY DATA: replace with the real lineup later ----------
const titles = { 3: 'Adult Members', 4: 'Trainees Batch 1', 5: 'Trainees Batch 2' }

// -------------------------------------------------------------------------

function PerformerCard({ p, vote, onVote, locked }) {
  const initials = p.name.split(' ').map((w) => w[0]).join('').slice(0, 2)

  return (
    <div className="relative h-full overflow-hidden rounded-3xl border border-white/10 bg-card [container-type:inline-size]">
      <div className="absolute inset-0">
        {p.photo ? (
          <img src={p.photo} alt={p.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-start justify-center bg-gradient-to-b from-brand/40 to-black pt-16 text-7xl font-extrabold text-white/30 md:portrait:pt-[17.9cqw] md:portrait:text-[20.1cqw]">
            {initials}
          </div>
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 via-35% to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-5 md:portrait:p-[5.6cqw]">
        <h2 className="text-3xl font-extrabold leading-tight md:portrait:text-[8.4cqw]">{p.name}</h2>
        <p className="mb-4 mt-1 text-base font-semibold text-brand md:portrait:mb-[4.5cqw] md:portrait:mt-[1.1cqw] md:portrait:text-[4.5cqw]">{p.age} years old</p>

        <div className="flex flex-wrap gap-2 md:portrait:gap-[2.2cqw]">
          {p.styles.slice(0, 2).map((s) => (
            <span
              key={s}
              className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white/90 backdrop-blur-md md:portrait:px-[3.35cqw] md:portrait:py-[1.7cqw] md:portrait:text-[3.35cqw]"
            >
              {s}
            </span>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:portrait:mt-[5.6cqw] md:portrait:gap-[3.35cqw]">
          <button
            disabled={locked}
            onClick={() => onVote(p.id, false)}
            className={`flex items-center justify-center gap-2 rounded-full border py-3.5 font-bold transition active:scale-95 disabled:opacity-60 md:portrait:gap-[2.2cqw] md:portrait:py-[3.9cqw] md:portrait:text-[4.5cqw] ${
              vote === false
                ? 'border-white bg-white text-black'
                : 'border-white/30 bg-white/5 text-white'
            }`}
          >
            <X className="h-5 w-5 md:portrait:h-[5.6cqw] md:portrait:w-[5.6cqw]" /> NO
          </button>
          <button
            disabled={locked}
            onClick={() => onVote(p.id, true)}
            className={`flex items-center justify-center gap-2 rounded-full py-3.5 font-bold transition active:scale-95 disabled:opacity-60 md:portrait:gap-[2.2cqw] md:portrait:py-[3.9cqw] md:portrait:text-[4.5cqw] ${
              vote === true
                ? 'bg-brand text-white shadow-lg shadow-brand/40 ring-2 ring-white'
                : 'bg-brand/70 text-white'
            }`}
          >
            <Check className="h-5 w-5 md:portrait:h-[5.6cqw] md:portrait:w-[5.6cqw]" /> YES
          </button>
        </div>
      </div>
    </div>
  )
}

function PerformanceSlide({ perf, votes, onVote, locked, sub }) {
  const vScroller = useRef(null)
  const [activeMember, setActiveMember] = useState(0)
  const count = perf.members.length

  const goToMember = (i) => {
    const el = vScroller.current
    if (el) el.scrollTo({ top: i * el.clientHeight, behavior: 'smooth' })
  }

  const handleScroll = () => {
    const el = vScroller.current
    if (!el) return
    setActiveMember(Math.min(count - 1, Math.round(el.scrollTop / el.clientHeight)))
  }

  const handleVote = (id, value) => {
    onVote(id, value)
    const i = perf.members.findIndex((m) => m.id === id)
    if (i < count - 1) setTimeout(() => goToMember(i + 1), 300)
  }

  return (
    <div className={`${COLUMN} flex h-full flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-semibold backdrop-blur-md md:portrait:px-[3.35cqw] md:portrait:py-[1.1cqw] md:portrait:text-[3.35cqw]">
          #{perf.order} · {perf.type.toUpperCase()}
        </span>
        <span className="text-xs font-semibold text-white/70 md:portrait:text-[3.35cqw]">
          {count > 1 && `Performer ${activeMember + 1} of ${count}`}
          {sub && (count > 1 ? ' · ' : '')}
          {sub && (sub.status === 'synced' ? 'Synced ✓' : 'Saved on device')}
        </span>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={vScroller}
          onScroll={handleScroll}
          className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {perf.members.map((m) => (
            <div
              key={m.id}
              className="flex h-full snap-start snap-always items-center justify-center"
            >
              {/* fills the height on portrait tablets, phone-sized + capped on wider screens */}
              <div className="h-full w-full md:mx-auto md:h-full md:w-auto md:max-w-full md:aspect-[2/3] md:landscape:max-h-[34rem]">
                <PerformerCard p={m} vote={votes[m.id]} onVote={handleVote} locked={locked} />
              </div>
            </div>
          ))}
        </div>

        {count > 1 && (
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col gap-2 rounded-full bg-black/40 px-1.5 py-2 backdrop-blur-md">
            {perf.members.map((m, i) => (
              <button
                key={m.id}
                onClick={() => goToMember(i)}
                aria-label={`Go to performer ${i + 1}`}
                className={`w-2 rounded-full transition-all ${
                  i === activeMember
                    ? 'h-6 bg-brand'
                    : m.id in votes
                      ? 'h-2 bg-white/80'
                      : 'h-2 bg-white/30'
                }`}
              />
            ))}
          </div>
        )}

        {count > 1 && activeMember < count - 1 && (
          <div className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-[11px] text-white/80 backdrop-blur-md">
            <ChevronsDown className="h-3.5 w-3.5 animate-bounce" /> Swipe up for next performer
          </div>
        )}
      </div>
    </div>
  )
}

export default function Batch() {
    const { id } = useParams()
    const { performances: lineup, loading } = useLineup(id)
    const performances = lineup ?? []
    const title = titles[id] ?? 'Batch'

    const [votes, setVotes] = useState({})
    const [submissions, setSubmissions] = useState({})
    const [active, setActive] = useState(0)
    const [online, setOnline] = useState(navigator.onLine)
    const [finished, setFinished] = useState(false)
    const [dir, setDir] = useState(null) 

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  useEffect(() => {
    if (!lineup) return
     let cancelled = false
     ;(async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        if (!session) return

        const { data } = await supabase
            .from('votes')
            .select('performance_id, performer_id, vote')
            .eq('judge_id', session.user.id)

        if (cancelled) return
        const subs = {}
        const restored = {}
        ;(data ?? []).forEach((v) => {
            subs[v.performance_id] = { status: 'synced' }
            restored[v.performer_id] = v.vote
        })
        lineup.forEach((p) => {
            if (!subs[p.id] && hasPending(p.id)) subs[p.id] = { status: 'local' }
        })

        setSubmissions((s) => ({ ...subs, ...s }))
        setVotes((v) => ({ ...restored, ...v }))
        const firstOpen = lineup.findIndex((p) => !subs[p.id])
        if (firstOpen === -1) {
          setActive(lineup.length - 1)
          setFinished(true)
        } else {
          setActive(firstOpen)
        }
    })()
    return () => { cancelled = true }
    }, [lineup])

  useEffect(() => {
    const markSynced = (pid) =>
        setSubmissions((s) => ({ ...s, [pid]: { ...s[pid], status: 'synced' } }))
    const run = () => flush(markSynced)
    run()
     const t = setInterval(run, 5000)
     window.addEventListener('online', run)
     return () => {
        clearInterval(t)
        window.removeEventListener('online', run)
  }
}, [])

  const handleVote = (performerId, value) =>
    setVotes((v) => ({ ...v, [performerId]: value }))

  const current = performances[active]
  const currentSub = current ? submissions[current.id] : undefined
  const allVoted = current ? current.members.every((m) => m.id in votes) : false
  const missing = current ? current.members.filter((m) => !(m.id in votes)).length : 0

  const handleSubmit = async () => {
    if (!current || !allVoted || currentSub) return
    const { data: { session } } = await supabase.auth.getSession() // reads the saved session, works offline
    if (!session) return
     const rows = current.members.map((m) => ({
        judge_id: session.user.id,
        performer_id: m.id,
        performance_id: current.id,
        vote: votes[m.id],
        client_ts: new Date().toISOString(),
    }))
    enqueue(current.id, rows) // saved on the phone first
    setSubmissions((s) => ({ ...s, [current.id]: { status: 'local', at: Date.now() } }))
    flush((pid) => setSubmissions((s) => ({ ...s, [pid]: { ...s[pid], status: 'synced' } })))
}

  const canPrev = active > 0
  const isLast = active === performances.length - 1
  const canNext = !!currentSub  


  const submittedCount = Object.keys(submissions).length
  const pendingCount = Object.values(submissions).filter((s) => s.status === 'local').length

  let banner
  if (currentSub?.status === 'synced') {
    banner = { icon: CloudCheck, text: 'Synced to the database', cls: 'border-green-500/40 bg-green-500/15 text-green-300' }
  } else if (currentSub?.status === 'local') {
    banner = {
      icon: HardDrive,
      text: online
        ? 'Saved on this device. Syncing...'
        : 'Saved on this device. Will sync when online. Keep the app open.',
      cls: 'border-amber-400/40 bg-amber-400/15 text-amber-200',
    }
  } else {
    banner = {
      icon: Check,
      text: allVoted
        ? 'Ready to submit'
        : `Vote on ${missing} more performer${missing > 1 ? 's' : ''} to submit`,
      cls: 'border-white/10 bg-white/5 text-white/70',
    }
  }
  const BannerIcon = banner.icon

  const arrowCls =
    'flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 transition active:scale-95 disabled:opacity-30 md:portrait:h-[15.6cqw] md:portrait:w-[15.6cqw] lg:landscape:h-12 lg:landscape:w-12'

  if (loading && !lineup) {
    return <div className="flex h-dvh items-center justify-center text-white/60">Loading lineup...</div>
    }
    if (!performances.length) {
    return (
        <div className="flex h-dvh flex-col items-center justify-center gap-4 text-white/60">
        <p>No performances in this batch.</p>
        <Link to="/" className="rounded-full bg-white/10 px-5 py-2.5 text-white">Back</Link>
        </div>
    )
    }

    if (finished) {
      return (
        <div className="flex h-dvh flex-col overflow-y-auto">
          <div className={`${COLUMN} flex flex-1 flex-col items-center justify-center gap-6 text-center`}>
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand/20 ring-2 ring-brand">
              <Check className="h-10 w-10 text-brand" />
            </div>

            <div>
              <h1 className="text-3xl font-extrabold leading-tight [text-wrap:balance]">
                You’ve finished the roster
              </h1>
              <p className="mt-3 text-white/60 [text-wrap:balance]">
                You voted on all {performances.length} performances in{' '}
                <span className="whitespace-nowrap font-semibold text-white/80">{title}</span>.
              </p>
            </div>

            {pendingCount > 0 && (
              <div className="flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/15 px-4 py-2.5 text-sm text-amber-200">
                <HardDrive className="h-4 w-4 shrink-0" />
                <span>{pendingCount} not synced yet. Keep the app open until they sync.</span>
              </div>
            )}

            <Link
              to="/"
              state={{ scrollToBatches: true }}
              className="w-full rounded-full bg-brand py-4 text-lg font-bold text-white shadow-lg shadow-brand/30 transition active:scale-95"
            >
              Back to categories
            </Link>
          </div>
        </div>
      )
    }

  return (
    <div className="flex h-dvh flex-col overflow-y-auto">
      {/* header */}
      <header className={`${COLUMN} flex items-center gap-3 pb-3 pt-5 md:portrait:gap-[3.35cqw] md:portrait:pb-[3.35cqw] md:portrait:pt-[5.6cqw]`}>
        <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 md:portrait:h-[11.2cqw] md:portrait:w-[11.2cqw]">
          <ArrowLeft className="h-5 w-5 md:portrait:h-[5.6cqw] md:portrait:w-[5.6cqw]" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold leading-tight md:portrait:text-[5cqw]">{title}</h1>
          <p className="text-xs text-white/60 md:portrait:text-[3.35cqw]">
            {submittedCount} of {performances.length} submitted
            {pendingCount > 0 && ` · ${pendingCount} not synced`}
          </p>
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold md:portrait:gap-[1.7cqw] md:portrait:px-[3.35cqw] md:portrait:py-[1.7cqw] md:portrait:text-[3.35cqw] ${
            online ? 'bg-green-500/15 text-green-300' : 'bg-amber-400/15 text-amber-200'
          }`}
        >
          {online ? <Wifi className="h-3.5 w-3.5 md:portrait:h-[3.9cqw] md:portrait:w-[3.9cqw]" /> : <WifiOff className="h-3.5 w-3.5 md:portrait:h-[3.9cqw] md:portrait:w-[3.9cqw]" />}
          {online ? 'Online' : 'Offline'}
        </div>
      </header>

      {/* current performance: flexes with screen height, never below 26rem */}
      <div className="min-h-[26rem] flex-1 shrink-0 overflow-x-hidden">
        {current && (
          <div
            key={current.id}
            className={`h-full ${dir === 'next' ? 'slide-next' : dir === 'prev' ? 'slide-prev' : ''}`}
          >
            <PerformanceSlide
              perf={current}
              votes={votes}
              onVote={handleVote}
              locked={!!currentSub}
              sub={currentSub}
            />
          </div>
        )}
      </div>

      {/* progress dots */}
      <div className="flex w-full items-center justify-center gap-1 px-4 py-3 md:portrait:gap-1.5 md:portrait:py-4">
        {performances.map((perf, i) => {
          const s = submissions[perf.id]?.status
          return (
            <span
              key={perf.id}
              className={`h-2 min-w-0 rounded-full transition-all md:portrait:h-2.5 ${
                i === active
                  ? 'max-w-6 flex-[3] bg-brand md:portrait:max-w-8'
                  : `max-w-2 flex-1 md:portrait:max-w-2.5 ${
                      s === 'synced'
                        ? 'bg-green-400'
                        : s === 'local'
                          ? 'bg-amber-300'
                          : 'bg-white/25'
                    }`
              }`}
            />
          )
        })} 
      </div>

      {/* bottom bar */}
      <div className={`${COLUMN} space-y-2 pb-[max(1rem,env(safe-area-inset-bottom))] md:portrait:space-y-[2.2cqw]`}>
        <div className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm md:portrait:gap-[2.2cqw] md:portrait:px-[4.5cqw] md:portrait:py-[2.8cqw] md:portrait:text-[3.9cqw] ${banner.cls}`}>
          <BannerIcon className="h-4 w-4 shrink-0 md:portrait:h-[4.5cqw] md:portrait:w-[4.5cqw]" />
          <span>{banner.text}</span>
        </div>

        <div className="flex items-center gap-3 md:portrait:gap-[3.35cqw]">
          <button
            onClick={() => { setDir('prev'); setActive((a) => a - 1) }}
            disabled={!canPrev}
            aria-label="Previous performance"
            className={arrowCls}
          >
            <ArrowLeft className="h-6 w-6 md:portrait:h-[6.7cqw] md:portrait:w-[6.7cqw] lg:landscape:h-5 lg:landscape:w-5" />
          </button>

          <button
            onClick={handleSubmit}
            disabled={!allVoted || !!currentSub}
            className="h-14 flex-1 rounded-full bg-brand text-lg font-bold text-white shadow-lg shadow-brand/30 transition active:scale-95 disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none md:portrait:h-[15.6cqw] md:portrait:text-[5cqw] lg:landscape:h-12 lg:landscape:text-base"
          >
            {currentSub ? 'Submitted' : `Submit #${current?.order ?? ''}`}
          </button>

          <button
            onClick={() => {
              if (isLast) {
                setFinished(true)
              } else {
                setDir('next')
                setActive((a) => a + 1)
              }
            }}
            disabled={!canNext}
            aria-label={isLast ? 'Finish roster' : 'Next performance'}
            className={`${arrowCls} ${canNext ? 'border-brand bg-brand' : ''}`}
          >
            <ArrowRight className="h-6 w-6 md:portrait:h-[6.7cqw] md:portrait:w-[6.7cqw] lg:landscape:h-5 lg:landscape:w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}