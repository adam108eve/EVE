import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile, deleteFile, validateZip } from "@/lib/storage";
import { submissionSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";

type Params = { params: Promise<{ id: string }> };

// POST /api/hackathons/[id]/submit — create or replace submission
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed } = await rateLimit(`upload:${ip}`, 10, 60 * 1000);
  if (!allowed) return NextResponse.json({ error: "Too many uploads. Wait a minute." }, { status: 429 });

  try {
    const { id: hackathonId } = await params;

    // Check registered
    const registration = await prisma.registration.findUnique({
      where: { userId_hackathonId: { userId: session.sub, hackathonId } },
      include: { submission: true, hackathon: true },
    });
    if (!registration) return NextResponse.json({ error: "Not registered for this hackathon." }, { status: 403 });

    // Check deadline
    if (new Date() > registration.hackathon.endAt) {
      return NextResponse.json({ error: "Submission deadline has passed." }, { status: 400 });
    }

    const contentLengthHeader = req.headers.get("content-length");
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : NaN;
    if (!Number.isFinite(contentLength) || contentLength <= 0) {
      return NextResponse.json({ error: "A valid Content-Length header is required for ZIP uploads." }, { status: 411 });
    }
    if (contentLength > 52 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 50 MB limit." }, { status: 413 });
    }
    const formData = await req.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const repoUrl = (formData.get("repoUrl") as string) || undefined;
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 50 MB limit." }, { status: 413 });
    }

    const parsed = submissionSchema.safeParse({ title, description, repoUrl: repoUrl || "" });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = validateZip(buffer, file.name, buffer.length);
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });

    // Delete old zip if re-uploading
    if (registration.submission?.zipPath) {
      await deleteFile(registration.submission.zipPath);
    }

    const { relativePath, size } = await uploadFile(hackathonId, buffer, file.name);

    const submission = await prisma.submission.upsert({
      where: { registrationId: registration.id },
      create: {
        registrationId: registration.id,
        title: parsed.data.title,
        description: parsed.data.description,
        repoUrl: parsed.data.repoUrl || null,
        zipPath: relativePath,
        zipSize: size,
        submittedAt: new Date(),
      },
      update: {
        title: parsed.data.title,
        description: parsed.data.description,
        repoUrl: parsed.data.repoUrl || null,
        zipPath: relativePath,
        zipSize: size,
        submittedAt: new Date(),
      },
    });

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// GET /api/hackathons/[id]/submit — get own submission
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id: hackathonId } = await params;
  const registration = await prisma.registration.findUnique({
    where: { userId_hackathonId: { userId: session.sub, hackathonId } },
    include: { submission: true },
  });

  if (!registration) return NextResponse.json({ error: "Not registered." }, { status: 404 });
  return NextResponse.json({ submission: registration.submission });
}
