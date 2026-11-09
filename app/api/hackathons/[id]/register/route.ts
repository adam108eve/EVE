import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Params = { params: Promise<{ id: string }> };

// POST /api/hackathons/[id]/register
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const { id: hackathonId } = await params;

    const { data: result, error } = await supabaseAdmin().rpc("register_for_hackathon", {
      p_user_id: session.sub,
      p_hackathon_id: hackathonId,
    });
    if (error) throw new Error(error.message);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const msg = ["NOT_FOUND", "ENDED", "ALREADY_REGISTERED", "FULL"].find((code) => error.message.includes(code)) ?? error.message;
      if (msg === "NOT_FOUND") return NextResponse.json({ error: "Hackathon not found." }, { status: 404 });
      if (msg === "ENDED") return NextResponse.json({ error: "Registrations are closed." }, { status: 400 });
      if (msg === "ALREADY_REGISTERED") return NextResponse.json({ error: "Already registered." }, { status: 409 });
      if (msg === "FULL") return NextResponse.json({ error: "Registrations full." }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// GET /api/hackathons/[id]/register — check registration status
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ registered: false });

  const { id: hackathonId } = await params;
  const supabase = supabaseAdmin();
  const { data: registration, error } = await supabase.from("registrations").select("*")
    .eq("userId", session.sub).eq("hackathonId", hackathonId).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load registration." }, { status: 500 });
  const { data: submission, error: submissionError } = registration
    ? await supabase.from("submissions").select("*").eq("registrationId", registration.id).maybeSingle()
    : { data: null, error: null };
  if (submissionError) return NextResponse.json({ error: "Could not load submission." }, { status: 500 });
  return NextResponse.json({ registered: !!registration, registration: registration ? { ...registration, submission } : null });
}
