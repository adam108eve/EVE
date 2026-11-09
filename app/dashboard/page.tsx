import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const supabase = supabaseAdmin();
  const [{ data: user }, { data: registrations }] = await Promise.all([
    supabase.from("users").select("id, name, email, college, role").eq("id", session.sub).maybeSingle(),
    supabase.from("registrations").select("*").eq("userId", session.sub).order("createdAt", { ascending: false }),
  ]);

  if (!user) redirect("/login");

  const registrationIds = (registrations ?? []).map((registration) => registration.id);
  const hackathonIds = [...new Set((registrations ?? []).map((registration) => registration.hackathonId))];
  const [{ data: hackathons }, { data: submissions }] = await Promise.all([
    hackathonIds.length ? supabase.from("hackathons").select("*").in("id", hackathonIds) : Promise.resolve({ data: [] }),
    registrationIds.length ? supabase.from("submissions").select("*").in("registrationId", registrationIds) : Promise.resolve({ data: [] }),
  ]);
  const hackathonById = new Map((hackathons ?? []).map((hackathon) => [hackathon.id, hackathon]));
  const submissionByRegistration = new Map((submissions ?? []).map((submission) => [submission.registrationId, submission]));
  const userRegistrations = (registrations ?? []).flatMap((registration) => {
    const hackathon = hackathonById.get(registration.hackathonId);
    return hackathon ? [{ ...registration, hackathon, submission: submissionByRegistration.get(registration.id) ?? null }] : [];
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={{ name: user.name, email: user.email, role: user.role }} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Welcome back, {user.name}!</p>
        </div>

        {/* Profile Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Your Profile</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Name</span>
              <p className="text-white font-medium mt-0.5">{user.name}</p>
            </div>
            <div>
              <span className="text-gray-500">Email</span>
              <p className="text-white font-medium mt-0.5">{user.email}</p>
            </div>
            <div>
              <span className="text-gray-500">College</span>
              <p className="text-white font-medium mt-0.5">{user.college ?? "—"}</p>
            </div>
          </div>
        </div>

        {/* Registered Hackathons */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Your Hackathons</h2>
            <Link href="/hackathons" className="text-amber-400 hover:text-amber-300 text-sm">
              Browse more →
            </Link>
          </div>

          {userRegistrations.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 border-dashed rounded-2xl p-12 text-center">
              <p className="text-gray-500 text-lg">You haven&apos;t registered for any hackathons yet.</p>
              <Link
                href="/hackathons"
                className="inline-block mt-4 bg-amber-500 hover:bg-amber-400 text-stone-950 px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Browse Hackathons
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {userRegistrations.map((reg) => (
                <div key={reg.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold">{reg.hackathon.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          reg.hackathon.status === "LIVE"
                            ? "bg-green-500/20 text-green-400"
                            : reg.hackathon.status === "UPCOMING"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-gray-700 text-gray-400"
                        }`}>
                          {reg.hackathon.status}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">
                        {new Date(reg.hackathon.startAt).toLocaleDateString()} – {new Date(reg.hackathon.endAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {reg.submission ? (
                        <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-xs px-3 py-1 rounded-full">
                          Submitted ✓
                        </span>
                      ) : reg.hackathon.status !== "ENDED" ? (
                        <Link
                          href={`/hackathons/${reg.hackathon.id}/submit`}
                          className="bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                        >
                          Submit Project
                        </Link>
                      ) : (
                        <span className="bg-gray-700 text-gray-400 text-xs px-3 py-1 rounded-full">
                          Not submitted
                        </span>
                      )}

                      <Link
                        href={`/hackathons/${reg.hackathon.id}`}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded-lg transition-colors"
                      >
                        View Details
                      </Link>

                      {reg.hackathon.resultsPublished && (
                        <Link
                          href={`/hackathons/${reg.hackathon.id}/leaderboard`}
                          className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 text-xs px-3 py-1.5 rounded-lg transition-colors"
                        >
                          View Leaderboard
                        </Link>
                      )}
                    </div>
                  </div>

                  {reg.submission && (
                    <div className="mt-4 pt-4 border-t border-gray-800">
                      <p className="text-sm text-gray-400 font-medium mb-1">Your Submission: <span className="text-white">{reg.submission.title}</span></p>
                      {reg.submission.score !== null && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-gray-500 text-sm">Score:</span>
                          <span className="text-amber-400 font-semibold">{reg.submission.score}/100</span>
                          {reg.submission.adminFeedback && (
                            <span className="text-gray-400 text-sm ml-2">— {reg.submission.adminFeedback}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
