import { getSession } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Link from "next/link";

const highlights = [
  { number: "01", title: "Find your league", desc: "Browse upcoming and live events, and register for a problem worth solving." },
  { number: "02", title: "Build and submit", desc: "Work on your project, and send in your final build." },
  { number: "03", title: "See where you stand", desc: "Follow judging, compete and check public results when they are released." },
];

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={session ? { name: session.name, email: session.email, role: session.role } : null} />
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-20 sm:pt-20 sm:pb-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div className="max-w-2xl">
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-[0.22em] mb-7">ADAM · Hackathon Platform</p>
            <h1 className="text-5xl sm:text-7xl font-semibold tracking-[-0.055em] leading-[1.02] text-stone-100">
              Ideas deserve<br /><span className="text-amber-400">to be built.</span>
            </h1>
            <p className="text-stone-400 text-lg sm:text-xl max-w-xl mt-7 leading-8">
              A place to take on real challenges, make something with other people, and put your work in front of judges.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-9">
              <Link href="/hackathons" className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold px-6 py-3 rounded-lg transition-colors">Explore hackathons <span aria-hidden="true">→</span></Link>
              {!session && <Link href="/register" className="text-stone-300 hover:text-white px-5 py-3 rounded-lg border border-stone-700 hover:border-stone-500 transition-colors">Create an account</Link>}
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-xl lg:ml-auto" aria-label="Top 20 percent achievement preview">
            <div className="absolute -inset-8 rounded-full bg-amber-500/[0.07] blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.09] bg-gradient-to-br from-stone-900 via-[#15130e] to-stone-950 p-6 shadow-2xl shadow-black/40 sm:p-8">
              <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-amber-400/10" />
              <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full border border-amber-400/[0.08]" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">The recognition</span>
                  
                </div>

                <div className="mt-9 flex items-center gap-5">
                  <div className="relative flex h-[5.25rem] w-[5.25rem] shrink-0 items-center justify-center rounded-[1.65rem] border border-amber-300/25 bg-gradient-to-br from-amber-300/20 to-amber-600/[0.06] shadow-[0_0_40px_rgba(245,158,11,0.12)]">
                    <svg viewBox="0 0 48 48" className="h-10 w-10 text-amber-300" fill="none" aria-hidden="true">
                      <path d="M15 8h18v10c0 8-4.2 13-9 13s-9-5-9-13V8Z" stroke="currentColor" strokeWidth="2" />
                      <path d="M15 12H8v4c0 6 3 9 8 9M33 12h7v4c0 6-3 9-8 9M24 31v7m-7 3h14m-12-3h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="m24 13 1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5 1.5-3Z" fill="currentColor" />
                    </svg>
                    <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#17140e] bg-amber-400 text-[10px] font-black text-stone-950">✦</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Earn recognition</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight text-stone-50 sm:text-3xl">Beat 20% of participants.</h2>
                  </div>
                </div>

                <p className="mt-7 max-w-md text-sm leading-6 text-stone-400 sm:text-base sm:leading-7">
                  Score higher than <span className="font-semibold text-stone-100">20% of everyone competing</span> to earn an achievement.
                </p>

                <div className="mt-8 rounded-2xl border border-white/[0.07] bg-black/25 p-4 sm:p-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-500">The goal</p>
                      <p className="mt-1 text-sm font-medium text-stone-200">Build better than the rest</p>
                    </div>
                    <p className="text-3xl font-semibold tracking-tight text-amber-300">Beat 20<span className="text-lg">%</span></p>
                  </div>
                  <div className="mt-4 flex h-2 gap-1.5" role="img" aria-label="Your performance leads the field">
                    <span className="w-4/5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-200 shadow-[0_0_14px_rgba(252,211,77,0.45)]" />
                    <span className="flex-1 rounded-full bg-stone-700/70" />
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] font-medium uppercase tracking-wider text-stone-500">
                    <span>Outscore other participants</span>
                    <Link href="/hackathons" className="text-amber-300 transition-colors hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
                      Find a hackathon →
                    </Link>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3 border-t border-white/[0.07] pt-5">
                  <div className="flex -space-x-2" aria-hidden="true">
                    <span className="h-7 w-7 rounded-full border-2 border-[#17140e] bg-gradient-to-br from-orange-300 to-rose-500" />
                    <span className="h-7 w-7 rounded-full border-2 border-[#17140e] bg-gradient-to-br from-sky-300 to-indigo-500" />
                    <span className="h-7 w-7 rounded-full border-2 border-[#17140e] bg-gradient-to-br from-emerald-300 to-teal-600" />
                  </div>
                  <p className="text-xs text-stone-400">Big ideas deserve to be seen.</p>
                  <span className="ml-auto text-amber-300" aria-hidden="true">✳</span>
                </div>
              </div>
            </div>
          </div>
          </div>
          <div className="mt-20 border-t border-stone-800 grid grid-cols-1 md:grid-cols-3">
            {highlights.map((item) => (
              <article key={item.number} className="py-6 md:py-7 md:pr-8 md:border-r md:border-stone-800 md:mr-8 last:border-0 last:mr-0">
                <p className="text-amber-500 text-xs font-semibold tracking-widest">{item.number}</p>
                <h2 className="text-stone-100 font-medium text-lg mt-4">{item.title}</h2>
                <p className="text-stone-400 text-sm mt-2 leading-6 max-w-xs">{item.desc}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="border-t border-stone-800 py-5 text-center text-stone-500 text-xs tracking-wide">© {new Date().getFullYear()} ADAM Hackathon Platform</footer>
    </div>
  );
}
