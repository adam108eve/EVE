import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/auth";
import { signOutSupabase } from "@/lib/supabase-auth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (token) {
    try { await signOutSupabase(token); } catch (error) { console.error("Supabase sign-out failed:", error); }
  }
  const response = NextResponse.json({ success: true });
  clearSessionCookies(response);
  return response;
}
