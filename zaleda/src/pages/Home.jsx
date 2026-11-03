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
      <section className="relative flex min-h-dvh flex-col items-center justify-center px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] text-center sm:px-8 sm:pt-[max(3rem,env(safe-area-inset-top))] sm:pb-[max(3rem,env(safe-area-inset-bottom))]">
        <div className="flex w-full max-w-md flex-col items-center gap-7 sm:max-w-xl sm:gap-9 md:max-w-2xl md:gap-10">
          {/* logo */}
          <img
            src="/logo-white.png"
            alt="Zaleda"
            className="h-[clamp(6rem,24dvh,15rem)] w-auto max-w-full object-contain"
          />

          {/* welcome text */}
          <div className="w-full max-w-sm sm:max-w-lg md:max-w-xl">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              ZALEDA 2.0
            </h1>
            <p className="mx-auto mt-4 max-w-prose text-base leading-relaxed text-white/80 sm:mt-5 sm:text-lg">
              Zaleda is SZHD's evaluation concert, where current members and
              trainees take the stage and are judged by the people who guide
              them. Every performance counts.
            </p>
            <p className="mt-3 text-sm text-white/60 sm:text-base">
              Vote honestly. Vote fairly.
            </p>
          </div>

          {/* button */}
          <button
            onClick={scrollToBatches}
            className="w-full max-w-xs rounded-full bg-white px-8 py-2.5 text-lg font-bold text-black shadow-lg transition active:scale-95 sm:max-w-sm sm:py-3 sm:text-xl"
          >
            Let's GO!
          </button>
        </div>

        {/* scroll hint */}
        <ChevronDown
          className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 h-6 w-6 -translate-x-1/2 animate-bounce text-white/60 [@media(max-height:500px)]:hidden"
          aria-hidden="true"
        />
      </section>

      {/* BATCH CARDS */}
      <section
        ref={batchesRef}
        className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center space-y-4 px-4 py-5 sm:max-w-xl sm:space-y-5 sm:px-8 sm:py-6 md:max-w-2xl md:space-y-6 md:py-8"
      >
        <h2 className="text-xl font-bold sm:text-2xl md:text-3xl">
          Select a batch
        </h2>

        {batches.map((b) => {
          const Icon = b.icon
          return (
            <Link
              key={b.id}
              to={`/batch/${b.id}`}
              className="relative block overflow-hidden rounded-3xl border border-white/10 bg-card p-5 transition active:scale-[0.98] sm:rounded-[1.75rem] sm:p-6 md:p-7"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(225,29,46,0.22),transparent_55%)]" />

              <div className="relative flex items-center gap-4 sm:gap-5 md:gap-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand shadow-lg shadow-brand/30 sm:h-16 sm:w-16 md:h-[4.5rem] md:w-[4.5rem]">
                  <Icon
                    className="h-7 w-7 text-white sm:h-8 sm:w-8 md:h-9 md:w-9"
                    strokeWidth={2}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-lg font-bold sm:text-xl md:text-2xl">
                    {b.title}
                  </div>
                  <div className="text-sm leading-snug text-white/60 sm:text-base">
                    {b.sub}
                  </div>
                </div>

                <ArrowRight className="h-6 w-6 shrink-0 text-brand sm:h-7 sm:w-7 md:h-8 md:w-8" />
              </div>

              <div className="relative mt-4 flex flex-wrap items-center gap-2 sm:mt-5 sm:gap-2.5 md:mt-6 md:gap-3">
                {b.chips.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80 sm:px-4 sm:py-2 sm:text-sm"
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