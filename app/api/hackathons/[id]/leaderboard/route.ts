import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Params = { params: Promise<{ id: string }> };

// GET /api/hackathons/[id]/leaderboard
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id: hackathonId } = await params;

    const supabase = supabaseAdmin();
    const { data: hackathon, error } = await supabase.from("hackathons").select("resultsPublished").eq("id", hackathonId).maybeSingle();
    if (error) throw error;
    if (!hackathon) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (!hackathon.resultsPublished) {
      return NextResponse.json({ error: "Results not published yet." }, { status: 403 });
    }

    const { data: entries, error: entriesError } = await supabase.from("leaderboard_entries")
      .select("id, rank, displayName, score, registrationId, isPlaceholder").eq("hackathonId", hackathonId).order("rank");
    if (entriesError) throw entriesError;

    return NextResponse.json(entries ?? []);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
