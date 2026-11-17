import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSessionCookies } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rateLimit";
import { createSupabaseUser, getSupabaseAuthErrorStatus, signInWithSupabase, type SupabaseAuthSession } from "@/lib/supabase-auth";

async function findAppUser(email: string) {
  return prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
}

async function linkAuthUser(authUser: { id: string; email?: string; user_metadata?: { name?: string; college?: string } }) {
  if (!authUser.email) throw new Error("Supabase Auth returned a user without an email.");
  const existing = await findAppUser(authUser.email);
  if (existing) {
    if (existing.authUserId && existing.authUserId !== authUser.id) return null;
    return prisma.user.update({
      where: { id: existing.id },
      data: { authUserId: authUser.id, passwordHash: null },
    });
  }
  return prisma.user.create({
    data: {
      authUserId: authUser.id,
      name: authUser.user_metadata?.name || authUser.email.split("@")[0],
      email: authUser.email,
      college: authUser.user_metadata?.college ?? null,
      role: "USER",
      passwordHash: null,
    },
  });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ?? "unknown";
  const { allowed } = await rateLimit(`login:${ip}`, 5, 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many login attempts. Try again in a minute." }, { status: 429 });
  }

  try {
    const parsed = loginSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid credentials." }, { status: 400 });
    const email = parsed.data.email.trim().toLowerCase();
    const { password } = parsed.data;
    let authSession: SupabaseAuthSession;

    try {
      authSession = await signInWithSupabase(email, password);
    } catch (error) {
      // One-time migration for existing bcrypt accounts: verify the old password,
      // create its Supabase identity, then clear the local password hash.
      const existing = await findAppUser(email);
      if (existing?.passwordHash && !existing.authUserId && await bcrypt.compare(password, existing.passwordHash)) {
        try {
          await createSupabaseUser(email, password, { name: existing.name, college: existing.college });
          authSession = await signInWithSupabase(email, password);
        } catch {
          // Do not reveal whether a matching Supabase Auth account exists.
          return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
        }
      } else {
        const status = getSupabaseAuthErrorStatus(error);
        if (status && status >= 500) throw error;
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }
    }

    const user = await linkAuthUser(authSession.user);
    if (!user) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    setSessionCookies(response, authSession);
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Authentication service is temporarily unavailable." }, { status: 503 });
  }
}
