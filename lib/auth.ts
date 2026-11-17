import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSupabaseUser, type SupabaseAuthSession } from "@/lib/supabase-auth";

export interface JWTPayload {
  sub: string; // local profile id
  email: string;
  role: "USER" | "ADMIN";
  name: string;
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return resolveSession(token);
}

export async function getSessionFromRequest(req: NextRequest): Promise<JWTPayload | null> {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  return resolveSession(token);
}

async function resolveSession(accessToken: string): Promise<JWTPayload | null> {
  const authUser = await getSupabaseUser(accessToken);
  if (!authUser) return null;
  const user = await prisma.user.findUnique({ where: { authUserId: authUser.id } });
  if (!user) return null;
  // Database roles are authoritative, so demotions take effect immediately.
  return { sub: user.id, email: user.email, role: user.role, name: user.name };
}

export function setSessionCookies(response: NextResponse, session: SupabaseAuthSession) {
  if (!session.access_token || !session.refresh_token) throw new Error("Supabase Auth did not return a complete session.");
  const common = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
  };
  response.cookies.set("session", session.access_token, {
    ...common,
    maxAge: Math.max(60, session.expires_in ?? 3600),
  });
  response.cookies.set("refresh_token", session.refresh_token, {
    ...common,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSessionCookies(response: NextResponse) {
  const common = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: 0,
    path: "/",
  };
  response.cookies.set("session", "", common);
  response.cookies.set("refresh_token", "", common);
}
