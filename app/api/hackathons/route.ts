import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hackathonSchema } from "@/lib/validations";

// GET /api/hackathons — list all hackathons (public)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const hackathons = await prisma.hackathon.findMany({
      where: status ? { status: status as "UPCOMING" | "LIVE" | "ENDED" } : undefined,
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        startAt: true,
        endAt: true,
        status: true,
        totalSlots: true,
        maxRealParticipants: true,
        resultsPublished: true,
        _count: { select: { registrations: true } },
      },
    });
    return NextResponse.json(hackathons);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// POST /api/hackathons — create hackathon (ADMIN only)
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = hackathonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const hackathon = await prisma.hackathon.create({ data: parsed.data });
    return NextResponse.json(hackathon, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
