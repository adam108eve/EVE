import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getFileBuffer } from "@/lib/storage";

type Params = { params: Promise<{ id: string; submissionId: string }> };

// GET /api/admin/hackathons/[id]/submissions/[submissionId]/download
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { submissionId } = await params;

  const { data: submission, error } = await supabaseAdmin().from("submissions").select("zipPath").eq("id", submissionId).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load submission." }, { status: 500 });
  if (!submission) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let buffer: Buffer;
  try {
    buffer = await getFileBuffer(submission.zipPath);
  } catch {
    return NextResponse.json({ error: "File not found on server." }, { status: 404 });
  }
  const filename = submission.zipPath.split("/").pop() ?? "submission.zip";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
