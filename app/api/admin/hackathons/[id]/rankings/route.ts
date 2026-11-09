import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { rankAssignmentSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

// PUT /api/admin/hackathons/[id]/rankings — save rank assignments for real participants
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id: hackathonId } = await params;

  try {
    const body = await req.json();
    const parsed = rankAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const supabase = supabaseAdmin();
    const { data: hackathon, error: hackathonError } = await supabase.from("hackathons").select("totalSlots")
      .eq("id", hackathonId).maybeSingle();
    if (hackathonError) throw hackathonError;
    if (!hackathon) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const { assignments } = parsed.data;

    const registrationIds = assignments.map((assignment) => assignment.registrationId);
    if (new Set(registrationIds).size !== registrationIds.length) {
      return NextResponse.json({ error: "A participant can only be assigned once." }, { status: 400 });
    }
    const { data: matchingRegistrations, error: matchingError } = registrationIds.length > 0
      ? await supabase.from("registrations").select("id").in("id", registrationIds).eq("hackathonId", hackathonId)
      : { data: [], error: null };
    if (matchingError) throw matchingError;
    if ((matchingRegistrations?.length ?? 0) !== registrationIds.length) {
      return NextResponse.json({ error: "One or more participants are not registered for this hackathon." }, { status: 400 });
    }
    const { count: registeredCount, error: registeredError } = await supabase.from("registrations")
      .select("id", { count: "exact", head: true }).eq("hackathonId", hackathonId);
    if (registeredError) throw registeredError;
    if (registrationIds.length !== (registeredCount ?? 0)) {
      return NextResponse.json({ error: "Assign a rank to every registered participant." }, { status: 400 });
    }

    // Validate uniqueness
    const ranks = assignments.map((a) => a.rank);
    const uniqueRanks = new Set(ranks);
    if (uniqueRanks.size !== ranks.length) {
      return NextResponse.json({ error: "Duplicate ranks detected." }, { status: 400 });
    }
    // Validate within bounds
    const outOfBounds = ranks.filter((r) => r < 1 || r > hackathon.totalSlots);
    if (outOfBounds.length > 0) {
      return NextResponse.json(
        { error: `Ranks must be between 1 and ${hackathon.totalSlots}.` },
        { status: 400 }
      );
    }

    // Clear current participants and placeholders at assigned ranks in one
    // transaction so swaps and edits cannot collide with the unique rank key.
    const { error: saveError } = await supabase.rpc("save_rank_assignments", {
      p_hackathon_id: hackathonId,
      p_assignments: assignments.map((a) => ({ ...a, displayName: a.displayName.trim() })),
    });
    if (saveError) throw saveError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// GET /api/admin/hackathons/[id]/rankings — get current rank assignments
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id: hackathonId } = await params;
  const supabase = supabaseAdmin();
  const { data: entries, error } = await supabase.from("leaderboard_entries").select("*").eq("hackathonId", hackathonId).order("rank");
  if (error) return NextResponse.json({ error: "Could not load rankings." }, { status: 500 });
  const registrationIds = (entries ?? []).flatMap((entry) => entry.registrationId ? [entry.registrationId] : []);
  const { data: registrations } = registrationIds.length
    ? await supabase.from("registrations").select("id, userId").in("id", registrationIds)
    : { data: [] };
  const userIds = [...new Set((registrations ?? []).map((registration) => registration.userId))];
  const { data: users } = userIds.length
    ? await supabase.from("users").select("id, name, email").in("id", userIds)
    : { data: [] };
  const userById = new Map((users ?? []).map((user) => [user.id, { name: user.name, email: user.email }]));
  const registrationById = new Map((registrations ?? []).map((registration) => [registration.id, registration]));
  return NextResponse.json((entries ?? []).map((entry) => ({
    ...entry,
    registration: entry.registrationId ? {
      ...registrationById.get(entry.registrationId),
      user: userById.get(registrationById.get(entry.registrationId)?.userId ?? "") ?? null,
    } : null,
  })));
}
