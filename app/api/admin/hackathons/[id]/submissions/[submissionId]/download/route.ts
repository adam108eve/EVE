import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFileBuffer } from "@/lib/storage";

type Params = { params: Promise<{ id: string; submissionId: string }> };

// GET /api/admin/hackathons/[id]/submissions/[submissionId]/download
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { submissionId } = await params;

  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
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
