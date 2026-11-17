import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hackathonSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

// GET /api/hackathons/[id]
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const hackathon = await prisma.hackathon.findUnique({
      where: { id },
      include: {
        announcements: { orderBy: { createdAt: "desc" } },
        _count: { select: { registrations: true } },
      },
    });
    if (!hackathon) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json(hackathon);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// PUT /api/hackathons/[id] — update (ADMIN only)
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = hackathonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const hackathon = await prisma.hackathon.update({ where: { id }, data: parsed.data });
    return NextResponse.json(hackathon);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
