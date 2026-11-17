import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

// PUT /api/admin/hackathons/[id]/publish
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id: hackathonId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = z.object({ publish: z.boolean() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "publish must be a boolean." }, { status: 400 });

  const existing = await prisma.hackathon.findUnique({ where: { id: hackathonId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Hackathon not found." }, { status: 404 });

  const hackathon = await prisma.hackathon.update({
    where: { id: hackathonId },
    data: { resultsPublished: parsed.data.publish },
  });

  return NextResponse.json({ resultsPublished: hackathon.resultsPublished });
}
