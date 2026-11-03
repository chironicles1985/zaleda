import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { Users, GraduationCap, ArrowRight, ChevronDown } from 'lucide-react'

const batches = [
  {
    id: 3,
    title: 'Adult Members',
    sub: 'Evaluated by OGs and Sr. Choreos',
    icon: Users,
    chips: ['Solo', 'Duo', 'Trio', 'Yes / No vote'],
  },
  {
    id: 4,
    title: 'Trainees Batch 1',
    sub: 'Evaluated by everyone above',
    icon: GraduationCap,
    chips: ['Solo only', 'Yes / No vote'],
  },
  {
    id: 5,
    title: 'Trainees Batch 2',
    sub: 'Evaluated by everyone above',
    icon: GraduationCap,
    chips: ['Solo only', 'Yes / No vote'],
  },
]

export default function Home() {
  const batchesRef = useRef(null)

  const scrollToBatches = () => {
    batchesRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div>
      {/* HERO */}
      <section className="relative flex min-h-dvh flex-col items-center justify-between px-6 pb-10 pt-16 text-center">
        {/* logo placeholder */}
          <img src="/logo-white.png" alt="Zaleda" className="h-52 w-52 object-contain" />

        {/* welcome text */}
        <div className="max-w-sm">
          <h1 className="text-5xl font-extrabold tracking-tight">
            ZALEDA 2.0
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/80">
            Zaleda is SZHD's evaluation concert, where current members and
            trainees take the stage and are judged by the people who guide
            them. Every performance counts.
          </p>
          <p className="mt-3 text-sm text-white/60">
            Vote honestly. Vote fairly.
          </p>
        </div>

        {/* button */}
        <div className="flex w-full max-w-sm flex-col items-center gap-3">
          <button
            onClick={scrollToBatches}
            className="w-full rounded-full bg-white py-2 text-lg font-bold text-black shadow-lg transition active:scale-95"
          >
            Let's GO!
          </button>
          <ChevronDown className="h-6 w-6 animate-bounce text-white/60" />
        </div>
      </section>

      {/* BATCH CARDS */}
      <section
        ref={batchesRef}
        className="mx-auto max-w-md space-y-4 px-4 pb-12 pt-8"
      >
        <h2 className="text-xl font-bold">Select a batch</h2>

        {batches.map((b) => {
          const Icon = b.icon
          return (
            <Link
              key={b.id}
              to={`/batch/${b.id}`}
              className="relative block overflow-hidden rounded-3xl border border-white/10 bg-card p-5 transition active:scale-[0.98]"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(225,29,46,0.22),transparent_55%)]" />

              <div className="relative flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand shadow-lg shadow-brand/30">
                  <Icon className="h-7 w-7 text-white" strokeWidth={2} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-lg font-bold">{b.title}</div>
                  <div className="text-sm leading-snug text-white/60">
                    {b.sub}
                  </div>
                </div>

                <ArrowRight className="h-6 w-6 shrink-0 text-brand" />
              </div>

              <div className="relative mt-4 flex flex-wrap items-center gap-2">
                {b.chips.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </Link>
          )
        })}
      </section>
    </div>
  )
}