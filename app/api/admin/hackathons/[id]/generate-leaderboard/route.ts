import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { generateFillerName, generateFillerScores } from "@/lib/nameGenerator";

type Params = { params: Promise<{ id: string }> };

// POST /api/admin/hackathons/[id]/generate-leaderboard
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id: hackathonId } = await params;

  try {
    const supabase = supabaseAdmin();
    const { data: hackathon, error: hackathonError } = await supabase.from("hackathons").select("id, totalSlots").eq("id", hackathonId).maybeSingle();
    if (hackathonError) throw hackathonError;
    if (!hackathon) return NextResponse.json({ error: "Not found." }, { status: 404 });

    // Get real entries (registrationId IS NOT NULL)
    const { data: realEntries, error: entriesError } = await supabase.from("leaderboard_entries")
      .select("rank, score").eq("hackathonId", hackathonId).not("registrationId", "is", null).order("rank");
    if (entriesError) throw entriesError;

    if (realEntries.length === 0) {
      return NextResponse.json({ error: "No real participant ranks assigned yet." }, { status: 400 });
    }
    const { count: participantCount, error: participantError } = await supabase.from("registrations")
      .select("id", { count: "exact", head: true }).eq("hackathonId", hackathonId);
    if (participantError) throw participantError;
    if (realEntries.length !== (participantCount ?? 0)) {
      return NextResponse.json({ error: "Assign a rank to every registered participant before filling the remaining ranks." }, { status: 400 });
    }

    // Delete existing filler entries (registrationId IS NULL)
    // Generate filler scores
    const realForScoring = realEntries.map((e) => ({ rank: e.rank, score: e.score }));
    const fillerScores = generateFillerScores(realForScoring, hackathon.totalSlots);

    // Build filler entries
    const realRanks = new Set(realEntries.map((e) => e.rank));
    const fillerEntries = [];
    for (let rank = 1; rank <= hackathon.totalSlots; rank++) {
      if (realRanks.has(rank)) continue;
      fillerEntries.push({
        rank,
        displayName: generateFillerName(rank, hackathonId),
        score: fillerScores.get(rank) ?? 0,
      });
    }

    const { data: generated, error: generateError } = await supabase.rpc("replace_filler_entries", {
      p_hackathon_id: hackathonId,
      p_entries: fillerEntries,
    });
    if (generateError) throw generateError;

    return NextResponse.json({ generated: generated ?? fillerEntries.length, real: realEntries.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
