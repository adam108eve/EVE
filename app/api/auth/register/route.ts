import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { assertAuthConfigured, signToken, setSessionCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
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

    const { name, email, password, college } = parsed.data;

    // Fail before writing the account if login sessions cannot be issued.
    assertAuthConfigured();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    let user;
    try {
      user = await prisma.user.create({
        data: { name, email, passwordHash, college: college || null, role: "USER" },
      });
    } catch (error) {
      // Another request may have registered this email after the lookup above.
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
        return NextResponse.json({ error: "Email already registered." }, { status: 409 });
      }
      throw error;
    }

    const token = await signToken({ sub: user.id, email: user.email, role: user.role, name: user.name });
    const { name: cookieName, value, options } = setSessionCookie(token);

    const response = NextResponse.json(
      { user: { id: user.id, name: user.name, email: user.email, role: user.role } },
      { status: 201 }
    );
    response.cookies.set(cookieName, value, options as Parameters<typeof response.cookies.set>[2]);
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
