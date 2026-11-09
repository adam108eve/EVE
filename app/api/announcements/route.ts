import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { announcementSchema } from "@/lib/validations";

// GET /api/announcements — list announcements (optionally filtered by hackathonId)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hackathonId = searchParams.get("hackathonId");

  const supabase = supabaseAdmin();
  let query = supabase.from("announcements").select("*").order("createdAt", { ascending: false });
  if (hackathonId) query = query.eq("hackathonId", hackathonId);
  const { data: announcements, error } = await query;
  if (error) return NextResponse.json({ error: "Could not load announcements." }, { status: 500 });
  const hackathonIds = [...new Set((announcements ?? []).flatMap((announcement) => announcement.hackathonId ? [announcement.hackathonId] : []))];
  const { data: hackathons } = hackathonIds.length
    ? await supabase.from("hackathons").select("id, title").in("id", hackathonIds)
    : { data: [] };
  const titleById = new Map((hackathons ?? []).map((hackathon) => [hackathon.id, hackathon.title]));
  return NextResponse.json((announcements ?? []).map((announcement) => ({
    ...announcement,
    hackathon: announcement.hackathonId ? { title: titleById.get(announcement.hackathonId) ?? null } : null,
  })));
}

// POST /api/announcements — create (ADMIN only)
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = announcementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { data: announcement, error } = await supabaseAdmin().from("announcements").insert({
        title: parsed.data.title,
        body: parsed.data.body,
        hackathonId: parsed.data.hackathonId || null,
      }).select("*").single();
    if (error) throw error;
    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
