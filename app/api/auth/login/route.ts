import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { signToken, setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { getTrustedClientIp, rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = getTrustedClientIp(req.headers);
  const bodyForRateLimit = await req.clone().json().catch(() => ({}));
  const email = bodyForRateLimit && typeof bodyForRateLimit === "object" ? (bodyForRateLimit as { email?: unknown }).email : undefined;
  const accountKey = typeof email === "string"
    ? createHash("sha256").update(email.trim().toLowerCase()).digest("hex")
    : "invalid";
  const { allowed: ipAllowed } = await rateLimit(`login:ip:${ip}`, 10, 60 * 1000);
  const { allowed: accountAllowed } = await rateLimit(`login:account:${accountKey}`, 5, 60 * 1000);
  if (!ipAllowed || !accountAllowed) {
    return NextResponse.json({ error: "Too many login attempts. Try again in a minute." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const { data: user, error } = await supabaseAdmin().from("users").select("*").eq("email", email).maybeSingle();
    if (error) throw error;
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = await signToken({ sub: user.id, email: user.email, role: user.role, name: user.name });
    const { name: cookieName, value, options } = setSessionCookie(token);

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
    response.cookies.set(cookieName, value, options as Parameters<typeof response.cookies.set>[2]);
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
