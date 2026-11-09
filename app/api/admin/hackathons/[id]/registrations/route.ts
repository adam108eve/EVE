import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET /api/admin/hackathons/[id]/registrations — list all registrations with submissions
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id: hackathonId } = await params;

  const supabase = supabaseAdmin();
  const { data: registrations, error } = await supabase.from("registrations").select("*").eq("hackathonId", hackathonId).order("createdAt");
  if (error) return NextResponse.json({ error: "Could not load registrations." }, { status: 500 });
  const ids = (registrations ?? []).map((registration) => registration.id);
  const userIds = [...new Set((registrations ?? []).map((registration) => registration.userId))];
  const [{ data: users }, { data: submissions }] = await Promise.all([
    userIds.length ? supabase.from("users").select("id, name, email, college").in("id", userIds) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("submissions").select("*").in("registrationId", ids) : Promise.resolve({ data: [] }),
  ]);
  const userById = new Map((users ?? []).map((user) => [user.id, user]));
  const submissionByRegistration = new Map((submissions ?? []).map((submission) => [submission.registrationId, submission]));
  return NextResponse.json((registrations ?? []).map((registration) => ({
    ...registration,
    user: userById.get(registration.userId) ?? null,
    submission: submissionByRegistration.get(registration.id) ?? null,
  })));
}
