import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSession } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function LeaderboardPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();

  const supabase = supabaseAdmin();
  const { data: hackathon } = await supabase.from("hackathons").select("title, resultsPublished").eq("id", id).maybeSingle();
  if (!hackathon) notFound();

  const user = session ? { name: session.name, email: session.email, role: session.role } : null;

  if (!hackathon.resultsPublished) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Results Not Published</h1>
            <p className="text-gray-400 mt-2">Check back once the admin publishes the results.</p>
          </div>
        </main>
      </div>
    );
  }

  const { data: entries } = await supabase.from("leaderboard_entries").select("*").eq("hackathonId", id).order("rank");
  const leaderboardEntries = entries ?? [];

  // Find own registrationId
  let ownRegistrationId: string | null = null;
  if (session) {
    const { data: reg } = await supabase.from("registrations").select("id").eq("userId", session.sub).eq("hackathonId", id).maybeSingle();
    ownRegistrationId = reg?.id ?? null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">{hackathon.title}</h1>
          <p className="text-gray-400 mt-1">Final Leaderboard</p>
          {leaderboardEntries.some((entry) => entry.isPlaceholder) && (
            <p className="text-amber-300 text-sm mt-3">Illustrative entries fill unoccupied ranks and are not hackathon participants or judged results.</p>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3 bg-gray-800/50 border-b border-gray-800">
            <span className="col-span-2">Rank</span>
            <span className="col-span-7">Name</span>
            <span className="col-span-3 text-right">Score</span>
          </div>

          <div className="divide-y divide-gray-800/50 max-h-[600px] overflow-y-auto">
            {leaderboardEntries.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                Leaderboard is empty.
              </div>
            ) : (
              leaderboardEntries.map((entry) => {
                const isOwn = ownRegistrationId && entry.registrationId === ownRegistrationId;
                return (
                  <div
                    key={entry.id}
                    className={`grid grid-cols-12 px-6 py-3.5 items-center transition-colors ${
                      isOwn
                        ? "bg-amber-500/10 border-l-2 border-amber-500"
                        : "hover:bg-gray-800/30"
                    }`}
                  >
                    <span className={`col-span-2 font-bold text-sm ${
                      entry.rank === 1 ? "text-amber-400" :
                      entry.rank === 2 ? "text-gray-300" :
                      entry.rank === 3 ? "text-orange-300" :
                      "text-gray-500"
                    }`}>
                      #{entry.rank}
                    </span>
                    <span className={`col-span-7 font-medium ${isOwn ? "text-amber-300" : "text-white"}`}>
                      {entry.displayName}
                      {entry.isPlaceholder && <span className="ml-2 text-xs text-gray-500 font-normal">(Illustrative entry)</span>}
                      {isOwn && <span className="ml-2 text-xs text-amber-400 font-normal">(You)</span>}
                    </span>
                    <span className={`col-span-3 text-right font-semibold ${isOwn ? "text-amber-300" : "text-gray-300"}`}>
                      {entry.score.toFixed(2)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          Showing {leaderboardEntries.length} entries
        </p>
      </main>
    </div>
  );
}
