import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import RankingClient from "./RankingClient";

type Props = { params: Promise<{ id: string }> };

export default async function RankingsPage({ params }: Props) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { id: hackathonId } = await params;
  const hackathon = await prisma.hackathon.findUnique({
    where: { id: hackathonId },
    include: {
      registrations: {
        include: {
          user: { select: { name: true, email: true } },
          submission: { select: { score: true } },
          leaderboardEntries: true,
        },
      },
    },
  });
  if (!hackathon) notFound();

  const realEntries = await prisma.leaderboardEntry.findMany({
    where: { hackathonId, registrationId: { not: null } },
    orderBy: { rank: "asc" },
  });

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
          participants={hackathon.registrations.map((reg) => ({
            registrationId: reg.id,
            name: reg.user.name,
            email: reg.user.email,
            score: reg.submission?.score ?? null,
            currentRank: realEntries.find((e) => e.registrationId === reg.id)?.rank ?? null,
            currentDisplayName: realEntries.find((e) => e.registrationId === reg.id)?.displayName ?? reg.user.name,
            currentScore: realEntries.find((e) => e.registrationId === reg.id)?.score ?? reg.submission?.score ?? 50,
          }))}
        />
      </main>
    </div>
  );
}
