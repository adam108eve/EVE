import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// POST /api/hackathons/[id]/register
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const { id: hackathonId } = await params;

    const result = await prisma.$transaction(async (tx) => {
      // Check hackathon exists and is LIVE or UPCOMING
      const hackathon = await tx.hackathon.findUnique({ where: { id: hackathonId } });
      if (!hackathon) throw new Error("NOT_FOUND");
      if (hackathon.status === "ENDED") throw new Error("ENDED");

      // Check if already registered
      const existing = await tx.registration.findUnique({
        where: { userId_hackathonId: { userId: session.sub, hackathonId } },
      });
      if (existing) throw new Error("ALREADY_REGISTERED");

      // Count real registrations (hard cap)
      const count = await tx.registration.count({ where: { hackathonId } });
      if (count >= hackathon.maxRealParticipants) throw new Error("FULL");

      // Create registration
      return tx.registration.create({
        data: { userId: session.sub, hackathonId },
      });
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const msg = error.message;
      if (msg === "NOT_FOUND") return NextResponse.json({ error: "Hackathon not found." }, { status: 404 });
      if (msg === "ENDED") return NextResponse.json({ error: "Registrations are closed." }, { status: 400 });
      if (msg === "ALREADY_REGISTERED") return NextResponse.json({ error: "Already registered." }, { status: 409 });
      if (msg === "FULL") return NextResponse.json({ error: "Registrations full." }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// GET /api/hackathons/[id]/register — check registration status
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ registered: false });

  const { id: hackathonId } = await params;
  const registration = await prisma.registration.findUnique({
    where: { userId_hackathonId: { userId: session.sub, hackathonId } },
    include: { submission: true },
  });

  return NextResponse.json({ registered: !!registration, registration });
}
