import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// GET /api/hackathons/[id]/leaderboard
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id: hackathonId } = await params;

    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: { resultsPublished: true },
    });
    if (!hackathon) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (!hackathon.resultsPublished) {
      return NextResponse.json({ error: "Results not published yet." }, { status: 403 });
    }

    const entries = await prisma.leaderboardEntry.findMany({
      where: { hackathonId },
      orderBy: { rank: "asc" },
      select: {
        id: true,
        rank: true,
        displayName: true,
        score: true,
        registrationId: true,
      },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
