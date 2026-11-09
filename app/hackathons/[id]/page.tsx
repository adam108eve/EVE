import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { notFound } from "next/navigation";
import RegisterButton from "./RegisterButton";

type Props = { params: Promise<{ id: string }> };

export default async function HackathonDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();

  const supabase = supabaseAdmin();
  const [{ data: hackathon }, { data: announcements }, { count }] = await Promise.all([
    supabase.from("hackathons").select("*").eq("id", id).maybeSingle(),
    supabase.from("announcements").select("*").eq("hackathonId", id).order("createdAt", { ascending: false }),
    supabase.from("registrations").select("id", { count: "exact", head: true }).eq("hackathonId", id),
  ]);

  if (!hackathon) notFound();

  // Check if user is registered
  let registration: { id: string; submission: { id: string } | null } | null = null;
  if (session) {
    const { data } = await supabase.from("registrations").select("id").eq("userId", session.sub).eq("hackathonId", id).maybeSingle();
    if (data) {
      const { data: submission } = await supabase.from("submissions").select("id").eq("registrationId", data.id).maybeSingle();
      registration = { id: data.id, submission };
    }
  }

  const registrationCount = count ?? 0;
  const isFull = registrationCount >= hackathon.maxRealParticipants;
  const user = session ? { name: session.name, email: session.email, role: session.role } : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Header */}
        <div className="mb-2">
          <Link href="/hackathons" className="text-gray-500 hover:text-gray-300 text-sm">← Back to Hackathons</Link>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{hackathon.title}</h1>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  hackathon.status === "LIVE"
                    ? "bg-green-500/20 text-green-400"
                    : hackathon.status === "UPCOMING"
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-gray-700 text-gray-400"
                }`}>
                  {hackathon.status}
                </span>
              </div>
              <p className="text-gray-400 text-sm">
                {new Date(hackathon.startAt).toLocaleDateString("en-IN", { dateStyle: "long" })} –{" "}
                {new Date(hackathon.endAt).toLocaleDateString("en-IN", { dateStyle: "long" })}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <span className="text-gray-400 text-sm">
                {registrationCount} / {hackathon.maxRealParticipants} participants
              </span>

              {registration ? (
                <div className="flex items-center gap-2">
                  <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-sm px-3 py-1.5 rounded-lg">
                    Registered ✓
                  </span>
                  {hackathon.status !== "ENDED" && (
                    <Link
                      href={`/hackathons/${id}/submit`}
                      className="bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm px-4 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      {registration.submission ? "Re-submit" : "Submit Project"}
                    </Link>
                  )}
                  {hackathon.resultsPublished && (
                    <Link
                      href={`/hackathons/${id}/leaderboard`}
                      className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 text-sm px-4 py-1.5 rounded-lg transition-colors"
                    >
                      Leaderboard
                    </Link>
                  )}
                </div>
              ) : isFull ? (
                <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-sm px-4 py-1.5 rounded-lg">
                  Registrations Full
                </span>
              ) : session ? (
                <RegisterButton hackathonId={id} status={hackathon.status} />
              ) : (
                <Link
                  href={`/login?redirect=/hackathons/${id}`}
                  className="bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm px-4 py-1.5 rounded-lg font-medium transition-colors"
                >
                  Login to Register
                </Link>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-gray-300 font-semibold mb-2">About</h2>
              <p className="text-gray-400 whitespace-pre-wrap">{hackathon.description}</p>
            </div>
            <div>
              <h2 className="text-gray-300 font-semibold mb-2">Rules</h2>
              <p className="text-gray-400 whitespace-pre-wrap">{hackathon.rules}</p>
            </div>
          </div>
        </div>

        {/* Announcements */}
          {(announcements ?? []).length > 0 && (
          <div>
            <h2 className="text-white font-semibold text-lg mb-4">Announcements</h2>
            <div className="space-y-3">
                {(announcements ?? []).map((ann) => (
                <div key={ann.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-white font-medium">{ann.title}</h3>
                    <span className="text-gray-500 text-xs">
                      {new Date(ann.createdAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm whitespace-pre-wrap">{ann.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {hackathon.resultsPublished && (
          <div className="mt-6 text-center">
            <Link
              href={`/hackathons/${id}/leaderboard`}
              className="inline-block bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              View Leaderboard
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
