import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/hackathons/[id]/registrations — list all registrations with submissions
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id: hackathonId } = await params;

  const registrations = await prisma.registration.findMany({
    where: { hackathonId },
    include: {
      user: { select: { id: true, name: true, email: true, college: true } },
      submission: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(registrations);
}
