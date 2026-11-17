import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookies } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { deleteSupabaseUser, getSupabaseAuthErrorStatus, signUpWithSupabase } from "@/lib/supabase-auth";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ?? "unknown";
    const { allowed } = await rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
    if (!allowed) return NextResponse.json({ error: "Too many registration attempts. Try again later." }, { status: 429 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, password, college } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();
    const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    if (existing) return NextResponse.json({ error: "Email already registered." }, { status: 409 });

    const authResult = await signUpWithSupabase(email, password, { name, college: college || null });
    if (!authResult.user?.id || !authResult.user.email || authResult.user.identities?.length === 0) {
      return NextResponse.json({ error: "Could not create your account. Please try again." }, { status: 400 });
    }

    let user;
    try {
      user = await prisma.user.create({
        data: {
          authUserId: authResult.user.id,
          name,
          email,
          passwordHash: null,
          college: college || null,
          role: "USER",
        },
      });
    } catch (error) {
      try { await deleteSupabaseUser(authResult.user.id); } catch (rollbackError) { console.error(rollbackError); }
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
        return NextResponse.json({ error: "Email already registered." }, { status: 409 });
      }
      throw error;
    }

    const hasSession = Boolean(authResult.access_token && authResult.refresh_token);
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      confirmationRequired: !hasSession,
    }, { status: 201 });
    if (hasSession) setSessionCookies(response, authResult);
    return response;
  } catch (error) {
    const status = getSupabaseAuthErrorStatus(error);
    if (status && status < 500) {
      return NextResponse.json({ error: "Could not create account. Check the details and try again." }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Authentication service is temporarily unavailable." }, { status: 503 });
  }
}
