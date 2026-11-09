import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import RankingClient from "./RankingClient";

type Props = { params: Promise<{ id: string }> };

export default async function RankingsPage({ params }: Props) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { id: hackathonId } = await params;
  const supabase = supabaseAdmin();
  const [{ data: hackathon }, { data: registrations }, { data: realEntries }] = await Promise.all([
    supabase.from("hackathons").select("id, totalSlots").eq("id", hackathonId).maybeSingle(),
    supabase.from("registrations").select("*").eq("hackathonId", hackathonId),
    supabase.from("leaderboard_entries").select("*").eq("hackathonId", hackathonId).not("registrationId", "is", null).order("rank"),
  ]);
  if (!hackathon) notFound();
  const registrationIds = (registrations ?? []).map((registration) => registration.id);
  const userIds = [...new Set((registrations ?? []).map((registration) => registration.userId))];
  const [{ data: users }, { data: submissions }] = await Promise.all([
    userIds.length ? supabase.from("users").select("id, name, email").in("id", userIds) : Promise.resolve({ data: [] }),
    registrationIds.length ? supabase.from("submissions").select("registrationId, score").in("registrationId", registrationIds) : Promise.resolve({ data: [] }),
  ]);
  const userById = new Map((users ?? []).map((user) => [user.id, user]));
  const submissionByRegistration = new Map((submissions ?? []).map((submission) => [submission.registrationId, submission]));
  const entryByRegistration = new Map((realEntries ?? []).map((entry) => [entry.registrationId, entry]));

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={{ name: session.name, email: session.email, role: session.role }} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="mb-6">
          <Link href={`/admin/hackathons/${hackathonId}`} className="text-gray-500 hover:text-gray-300 text-sm">← Back to Hackathon</Link>
          <h1 className="text-2xl font-bold text-white mt-2">Rank Assignment</h1>
          <p className="text-gray-400 text-sm mt-1">
            Assign ranks to real participants. Ranks must be unique and within 1–{hackathon.totalSlots}.
            Default plan: 4 participants in ranks 40–60, 1 at rank 97.
          </p>
        </div>

        <RankingClient
          hackathonId={hackathonId}
          totalSlots={hackathon.totalSlots}
          participants={(registrations ?? []).map((reg) => {
            const entry = entryByRegistration.get(reg.id);
            const user = userById.get(reg.userId);
            const submission = submissionByRegistration.get(reg.id);
            return {
            registrationId: reg.id,
            name: user?.name ?? "Unknown user",
            email: user?.email ?? "",
            score: submission?.score ?? null,
            currentRank: entry?.rank ?? null,
            currentDisplayName: entry?.displayName ?? user?.name ?? "Unknown user",
            currentScore: entry?.score ?? submission?.score ?? 50,
          };
          })}
        />
      </main>
    </div>
  );
}
