import Link from "next/link";

/**
 * Landing page for the POC.
 * For client demo, this page gives a premium first impression before opening /studio.
 */
export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07111f] text-white">
      {/* Background glow effects: cheap CSS, premium look */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] h-96 w-96 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#123456_0%,transparent_38%),linear-gradient(180deg,#07111f_0%,#030712_100%)]" />
      </div>

      <section className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">
              Pools 3D Studio
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Client-ready proof of concept
            </p>
          </div>

          <Link
            href="/studio"
            className="rounded-full border border-white/10 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white shadow-2xl shadow-cyan-950/40 backdrop-blur transition hover:bg-white/15"
          >
            Open Studio
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-bold text-white transition hover:bg-white/[0.08]"
          >
            View Leads Dashboard
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-100">
              Design pools in 3D. Preview them in your backyard.
            </div>

            <h1 className="max-w-3xl text-5xl font-black tracking-tight text-white md:text-7xl">
              A premium 3D pool configurator for modern pool companies.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              This POC will let customers customize a swimming pool in real-time
              and then preview it through their phone using AR. The first build
              focuses on the wow moment: design, customize, and view in space.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/studio"
                className="rounded-full bg-amber-400 px-7 py-4 text-center text-sm font-bold text-slate-950 shadow-[0_0_40px_rgba(251,191,36,0.28)] transition hover:bg-amber-300"
              >
                Launch 3D Studio
              </Link>

              <div className="rounded-full border border-white/10 bg-white/5 px-7 py-4 text-center text-sm font-semibold text-slate-200">
                PWA + AR path included
              </div>
            </div>
          </div>

          {/* This is a fake preview card for now.
              In Step 3, real 3D canvas will appear inside /studio. */}
          <div className="relative">
            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-4 shadow-2xl shadow-black/40 backdrop-blur">
              <div className="rounded-[1.5rem] bg-slate-950 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-200">
                    Live Pool Preview
                  </p>
                  <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-xs font-bold text-cyan-200">
                    POC
                  </span>
                </div>

                <div className="relative h-[360px] overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950">
                  <div className="absolute left-1/2 top-1/2 h-44 w-72 -translate-x-1/2 -translate-y-1/2 rotate-[-10deg] rounded-[3rem] border-[18px] border-stone-300 bg-cyan-400/80 shadow-[0_30px_80px_rgba(34,211,238,0.35)]" />
                  <div className="absolute left-1/2 top-1/2 h-28 w-52 -translate-x-1/2 -translate-y-1/2 rotate-[-10deg] rounded-[2rem] bg-cyan-300/70 blur-[1px]" />
                  <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur">
                    <p className="text-sm font-semibold text-white">
                      Rectangular pool · Bright Azure · Stone deck
                    </p>
                    <p className="mt-1 text-xs text-slate-300">
                      Real interactive 3D scene starts in the next step.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -right-6 rounded-2xl bg-amber-400 px-5 py-4 text-sm font-black text-slate-950 shadow-2xl">
              View in Backyard
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}