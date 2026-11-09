import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { uploadFile, deleteFile, validateZip } from "@/lib/storage";
import { submissionSchema } from "@/lib/validations";
import { getTrustedClientIp, rateLimit } from "@/lib/rateLimit";

type Params = { params: Promise<{ id: string }> };

// POST /api/hackathons/[id]/submit — create or replace submission
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const ip = getTrustedClientIp(req.headers);
  const { allowed: ipAllowed } = await rateLimit(`upload:ip:${ip}`, 10, 60 * 1000);
  const { allowed: userAllowed } = await rateLimit(`upload:user:${session.sub}`, 10, 60 * 1000);
  if (!ipAllowed || !userAllowed) return NextResponse.json({ error: "Too many uploads. Wait a minute." }, { status: 429 });

  try {
    const { id: hackathonId } = await params;

    // Check registered
    const supabase = supabaseAdmin();
    const { data: registration, error: registrationError } = await supabase.from("registrations").select("*")
      .eq("userId", session.sub).eq("hackathonId", hackathonId).maybeSingle();
    if (registrationError) throw registrationError;
    if (!registration) return NextResponse.json({ error: "Not registered for this hackathon." }, { status: 403 });

    const [{ data: hackathon, error: hackathonError }, { data: oldSubmission, error: submissionError }] = await Promise.all([
      supabase.from("hackathons").select("endAt").eq("id", hackathonId).maybeSingle(),
      supabase.from("submissions").select("*").eq("registrationId", registration.id).maybeSingle(),
    ]);
    if (hackathonError) throw hackathonError;
    if (submissionError) throw submissionError;
    if (!hackathon) return NextResponse.json({ error: "Hackathon not found." }, { status: 404 });

    // Check deadline
    if (new Date() > new Date(hackathon.endAt)) {
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

    const { relativePath, size } = await uploadFile(hackathonId, buffer);
    try {
      const { data: submission, error } = await supabase.from("submissions").upsert({
          registrationId: registration.id,
          title: parsed.data.title,
          description: parsed.data.description,
          repoUrl: parsed.data.repoUrl || null,
          zipPath: relativePath,
          zipSize: size,
          submittedAt: new Date().toISOString(),
        }, { onConflict: "registrationId" }).select("id, title, description, repoUrl, zipSize, submittedAt, score, adminFeedback").single();
      if (error) throw error;

      if (oldSubmission?.zipPath) {
        try {
          await deleteFile(oldSubmission.zipPath);
        } catch (cleanupError) {
          console.error("Unable to remove superseded submission file", cleanupError);
        }
      }
      return NextResponse.json(submission, { status: 201 });
    } catch (dbError) {
      try {
        await deleteFile(relativePath);
      } catch (cleanupError) {
        console.error("Unable to remove uncommitted submission file", cleanupError);
      }
      throw dbError;
    }
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
  const supabase = supabaseAdmin();
  const { data: registration, error } = await supabase.from("registrations").select("id")
    .eq("userId", session.sub).eq("hackathonId", hackathonId).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load registration." }, { status: 500 });

  if (!registration) return NextResponse.json({ error: "Not registered." }, { status: 404 });
  const { data: submission, error: submissionError } = await supabase.from("submissions").select("*")
    .eq("registrationId", registration.id).maybeSingle();
  if (submissionError) return NextResponse.json({ error: "Could not load submission." }, { status: 500 });
  return NextResponse.json({ submission });
}
