import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { announcementSchema } from "@/lib/validations";

// GET /api/announcements — list announcements (optionally filtered by hackathonId)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hackathonId = searchParams.get("hackathonId");

  const announcements = await prisma.announcement.findMany({
    where: hackathonId ? { hackathonId } : undefined,
    orderBy: { createdAt: "desc" },
    include: { hackathon: { select: { title: true } } },
  });
  return NextResponse.json(announcements);
}

// POST /api/announcements — create (ADMIN only)
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = announcementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: parsed.data.title,
        body: parsed.data.body,
        hackathonId: parsed.data.hackathonId || null,
      },
    });
    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
