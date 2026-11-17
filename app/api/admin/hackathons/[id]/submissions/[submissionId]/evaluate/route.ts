import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { evaluationSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string; submissionId: string }> };

// PUT /api/admin/hackathons/[id]/submissions/[submissionId]/evaluate
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { submissionId } = await params;

  try {
    const body = await req.json();
    const parsed = evaluationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const submission = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        score: parsed.data.score,
        adminFeedback: parsed.data.adminFeedback,
      },
    });
    return NextResponse.json(submission);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
