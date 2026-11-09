import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
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

    const { data: submission, error } = await supabaseAdmin().from("submissions").update({
        score: parsed.data.score,
        adminFeedback: parsed.data.adminFeedback ?? null,
      }).eq("id", submissionId).select("*").maybeSingle();
    if (error) throw error;
    if (!submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    return NextResponse.json(submission);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
