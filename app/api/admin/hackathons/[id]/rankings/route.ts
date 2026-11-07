import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rankAssignmentSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

// PUT /api/admin/hackathons/[id]/rankings — save rank assignments for real participants
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id: hackathonId } = await params;

  try {
    const body = await req.json();
    const parsed = rankAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const hackathon = await prisma.hackathon.findUnique({ where: { id: hackathonId } });
    if (!hackathon) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const { assignments } = parsed.data;

    const registrationIds = assignments.map((assignment) => assignment.registrationId);
    if (new Set(registrationIds).size !== registrationIds.length) {
      return NextResponse.json({ error: "A participant can only be assigned once." }, { status: 400 });
    }
    const matchingRegistrations = await prisma.registration.count({
      where: { id: { in: registrationIds }, hackathonId },
    });
    if (matchingRegistrations !== registrationIds.length) {
      return NextResponse.json({ error: "One or more participants are not registered for this hackathon." }, { status: 400 });
    }

    // Validate uniqueness
    const ranks = assignments.map((a) => a.rank);
    const uniqueRanks = new Set(ranks);
    if (uniqueRanks.size !== ranks.length) {
      return NextResponse.json({ error: "Duplicate ranks detected." }, { status: 400 });
    }
    // Validate within bounds
    const outOfBounds = ranks.filter((r) => r < 1 || r > hackathon.totalSlots);
    if (outOfBounds.length > 0) {
      return NextResponse.json(
        { error: `Ranks must be between 1 and ${hackathon.totalSlots}.` },
        { status: 400 }
      );
    }

    // Upsert real leaderboard entries
    // Remove each participant's previous entry if their rank changed
    await prisma.leaderboardEntry.deleteMany({
      where: {
        hackathonId,
        registrationId: { in: assignments.map((a) => a.registrationId) },
        rank: { notIn: ranks },
      },
    });

    await prisma.$transaction(
      assignments.map((a) =>
        prisma.leaderboardEntry.upsert({
          where: { hackathonId_rank: { hackathonId, rank: a.rank } },
          create: {
            hackathonId,
            rank: a.rank,
            registrationId: a.registrationId,
            displayName: a.displayName,
            score: a.score,
          },
          update: {
            registrationId: a.registrationId,
            displayName: a.displayName,
            score: a.score,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// GET /api/admin/hackathons/[id]/rankings — get current rank assignments
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id: hackathonId } = await params;
  const entries = await prisma.leaderboardEntry.findMany({
    where: { hackathonId },
    orderBy: { rank: "asc" },
    include: {
      registration: {
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });
  return NextResponse.json(entries);
}
