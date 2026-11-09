import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

// PUT /api/admin/hackathons/[id]/publish
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id: hackathonId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = z.object({ publish: z.boolean() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "publish must be a boolean." }, { status: 400 });

  const supabase = supabaseAdmin();
  const { data: existing, error: existingError } = await supabase.from("hackathons").select("id, totalSlots")
    .eq("id", hackathonId).maybeSingle();
  if (existingError) return NextResponse.json({ error: "Could not load hackathon." }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Hackathon not found." }, { status: 404 });

  if (parsed.data.publish) {
    const { data: entries, error: entriesError } = await supabase.from("leaderboard_entries").select("rank").eq("hackathonId", hackathonId);
    if (entriesError) return NextResponse.json({ error: "Could not load leaderboard." }, { status: 500 });
    if (entries.length !== existing.totalSlots || new Set(entries.map((entry) => entry.rank)).size !== existing.totalSlots) {
      return NextResponse.json({ error: "Fill every leaderboard rank before publishing results." }, { status: 400 });
    }
  }

  const { data: hackathon, error } = await supabase.from("hackathons").update({ resultsPublished: parsed.data.publish })
    .eq("id", hackathonId).select("resultsPublished").single();
  if (error) return NextResponse.json({ error: "Could not update publication status." }, { status: 500 });

  return NextResponse.json({ resultsPublished: hackathon.resultsPublished });
}
