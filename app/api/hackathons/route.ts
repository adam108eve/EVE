import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { hackathonSchema } from "@/lib/validations";

// GET /api/hackathons — list all hackathons (public)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const supabase = supabaseAdmin();
    let query = supabase.from("hackathons").select("id, title, description, startAt, endAt, status, totalSlots, maxRealParticipants, resultsPublished").order("startAt", { ascending: true });
    if (status && ["UPCOMING", "LIVE", "ENDED"].includes(status)) query = query.eq("status", status as "UPCOMING" | "LIVE" | "ENDED");
    const [{ data: hackathons, error }, { data: counts, error: countError }] = await Promise.all([
      query,
      supabase.rpc("get_hackathon_registration_counts"),
    ]);
    if (error) throw error;
    if (countError) throw countError;
    const countById = new Map((counts ?? []).map((row) => [row.hackathonId, row.registrationCount]));
    return NextResponse.json((hackathons ?? []).map((hackathon) => ({ ...hackathon, _count: { registrations: countById.get(hackathon.id) ?? 0 } })));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// POST /api/hackathons — create hackathon (ADMIN only)
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = hackathonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { data: hackathon, error } = await supabaseAdmin().from("hackathons").insert(parsed.data).select("*").single();
    if (error) throw error;
    return NextResponse.json(hackathon, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
