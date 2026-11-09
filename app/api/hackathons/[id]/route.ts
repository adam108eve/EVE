import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { hackathonSchema } from "@/lib/validations";

type Params = { params: Promise<{ id: string }> };

// GET /api/hackathons/[id]
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = supabaseAdmin();
    const [{ data: hackathon, error }, { data: announcements, error: announcementError }, { count, error: countError }] = await Promise.all([
      supabase.from("hackathons").select("*").eq("id", id).maybeSingle(),
      supabase.from("announcements").select("*").eq("hackathonId", id).order("createdAt", { ascending: false }),
      supabase.from("registrations").select("id", { count: "exact", head: true }).eq("hackathonId", id),
    ]);
    if (error) throw error;
    if (announcementError) throw announcementError;
    if (countError) throw countError;
    if (!hackathon) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ ...hackathon, announcements, _count: { registrations: count ?? 0 } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// PUT /api/hackathons/[id] — update (ADMIN only)
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = hackathonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { data: hackathon, error } = await supabaseAdmin().from("hackathons").update(parsed.data).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    if (!hackathon) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json(hackathon);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
