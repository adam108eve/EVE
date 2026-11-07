import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateFillerName, generateFillerScores } from "@/lib/nameGenerator";

type Params = { params: Promise<{ id: string }> };

// POST /api/admin/hackathons/[id]/generate-leaderboard
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id: hackathonId } = await params;

  try {
    const hackathon = await prisma.hackathon.findUnique({ where: { id: hackathonId } });
    if (!hackathon) return NextResponse.json({ error: "Not found." }, { status: 404 });

    // Get real entries (registrationId IS NOT NULL)
    const realEntries = await prisma.leaderboardEntry.findMany({
      where: { hackathonId, registrationId: { not: null } },
      orderBy: { rank: "asc" },
    });

    if (realEntries.length === 0) {
      return NextResponse.json({ error: "No real participant ranks assigned yet." }, { status: 400 });
    }

    // Delete existing filler entries (registrationId IS NULL)
    await prisma.leaderboardEntry.deleteMany({
      where: { hackathonId, registrationId: null },
    });

    // Generate filler scores
    const realForScoring = realEntries.map((e) => ({ rank: e.rank, score: e.score }));
    const fillerScores = generateFillerScores(realForScoring, hackathon.totalSlots);

    // Build filler entries
    const realRanks = new Set(realEntries.map((e) => e.rank));
    const fillerEntries = [];
    for (let rank = 1; rank <= hackathon.totalSlots; rank++) {
      if (realRanks.has(rank)) continue;
      fillerEntries.push({
        hackathonId,
        rank,
        registrationId: null,
        displayName: generateFillerName(rank, hackathonId),
        score: fillerScores.get(rank) ?? 0,
      });
    }

    // Batch insert (SQLite-safe: chunk of 100)
    const CHUNK = 100;
    for (let i = 0; i < fillerEntries.length; i += CHUNK) {
      await prisma.leaderboardEntry.createMany({
        data: fillerEntries.slice(i, i + CHUNK),
      });
    }

    return NextResponse.json({ generated: fillerEntries.length, real: realEntries.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
