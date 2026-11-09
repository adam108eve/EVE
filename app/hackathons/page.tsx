import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default async function HackathonsPage() {
  const session = await getSession();
  const supabase = supabaseAdmin();
  const [{ data: rows }, { data: registrationCounts }] = await Promise.all([
    supabase.from("hackathons").select("*").order("startAt", { ascending: true }),
    supabase.rpc("get_hackathon_registration_counts"),
  ]);
  const counts = new Map((registrationCounts ?? []).map((row) => [row.hackathonId, row.registrationCount]));
  const hackathons = (rows ?? []).map((hackathon) => ({
    ...hackathon,
    _count: { registrations: counts.get(hackathon.id) ?? 0 },
  }));

  const user = session
    ? { name: session.name, email: session.email, role: session.role }
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Hackathons</h1>
          <p className="text-gray-400 mt-1">Browse all hackathons and register for one.</p>
        </div>

        {hackathons.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-xl">No hackathons available yet.</p>
            <p className="text-gray-600 mt-2">Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hackathons.map((h) => (
              <Link key={h.id} href={`/hackathons/${h.id}`} className="group">
                <div className="bg-gray-900 border border-gray-800 group-hover:border-amber-500/50 rounded-2xl p-6 h-full transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      h.status === "LIVE"
                        ? "bg-green-500/20 text-green-400"
                        : h.status === "UPCOMING"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-gray-700 text-gray-400"
                    }`}>
                      {h.status === "LIVE" ? "LIVE" : h.status === "UPCOMING" ? "UPCOMING" : "ENDED"}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {h._count.registrations}/{h.maxRealParticipants} registered
                    </span>
                  </div>

                  <h2 className="text-white font-semibold text-lg mb-2 group-hover:text-amber-300 transition-colors">
                    {h.title}
                  </h2>
                  <p className="text-gray-400 text-sm line-clamp-2 mb-4">{h.description}</p>

                  <div className="text-xs text-gray-500 border-t border-gray-800 pt-4">
                    <div className="flex justify-between">
                      <span>Start: {new Date(h.startAt).toLocaleDateString()}</span>
                      <span>End: {new Date(h.endAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {h._count.registrations >= h.maxRealParticipants && (
                    <div className="mt-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-1.5 rounded-lg text-center">
                      Registrations Full
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
