import { getSession } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Link from "next/link";

const highlights = [
  { number: "01", title: "Find your challenge", desc: "Browse upcoming and live events, and choose a problem worth solving." },
  { number: "02", title: "Build and submit", desc: "Register, work on your project, and send in your final build." },
  { number: "03", title: "See where you stand", desc: "Follow judging and check the public results when they are released." },
];

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={session ? { name: session.name, email: session.email, role: session.role } : null} />
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="max-w-4xl">
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
