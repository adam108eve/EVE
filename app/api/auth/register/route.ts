import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { signToken, setSessionCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, email, password, college } = parsed.data;

    const supabase = supabaseAdmin();
    const { data: existing, error: lookupError } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) {
      return NextResponse.json({ error: "Email already registered." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { data: user, error } = await supabase.from("users")
      .insert({ name, email, passwordHash, college: college ?? null, role: "USER" })
      .select("id, name, email, role")
      .single();
    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Email already registered." }, { status: 409 });
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
