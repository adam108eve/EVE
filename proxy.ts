import { decodeJwt } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAuthErrorStatus, refreshSupabaseSession } from "@/lib/supabase-auth";

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge,
    path: "/",
  };
}

export async function proxy(req: NextRequest) {
  const accessToken = req.cookies.get("session")?.value;
  const refreshToken = req.cookies.get("refresh_token")?.value;
  let response: NextResponse;

  if (refreshToken) {
    let expiresAt = 0;
    try {
      expiresAt = accessToken ? Number(decodeJwt(accessToken).exp ?? 0) * 1000 : 0;
    } catch {
      expiresAt = 0;
    }

    // Refresh shortly before expiry so server pages and API handlers always
    // validate a live Supabase Auth access token.
    if (expiresAt < Date.now() + 60_000) {
      try {
        const session = await refreshSupabaseSession(refreshToken);
        if (!session.access_token || !session.refresh_token) throw new Error("Supabase Auth returned an incomplete session.");
        req.cookies.set("session", session.access_token);
        req.cookies.set("refresh_token", session.refresh_token);
        response = NextResponse.next({ request: { headers: req.headers } });
        response.cookies.set("session", session.access_token, sessionCookieOptions(session.expires_in ?? 3600));
        response.cookies.set("refresh_token", session.refresh_token, sessionCookieOptions(60 * 60 * 24 * 30));
      } catch (error) {
        const status = getSupabaseAuthErrorStatus(error);
        response = NextResponse.next();
        if (status && status < 500) {
          response.cookies.set("session", "", sessionCookieOptions(0));
          response.cookies.set("refresh_token", "", sessionCookieOptions(0));
        }
      }
    } else {
      response = NextResponse.next();
    }
  } else {
    response = NextResponse.next();
  }

  const { pathname } = req.nextUrl;
  const protectedPage = pathname.startsWith("/admin") || pathname.startsWith("/dashboard") ||
    (pathname.startsWith("/hackathons/") && pathname.includes("/submit"));
  const requestHasSession = Boolean(req.cookies.get("session")?.value);
  if (protectedPage && !requestHasSession) {
    return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(pathname)}`, req.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
