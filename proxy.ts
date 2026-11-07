import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin routes
  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login?redirect=/admin", req.url));
    }
    const payload = await verifyToken(token);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login?redirect=/admin", req.url));
    }
  }

  // Protected user routes
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/hackathons/") && (pathname.includes("/register") || pathname.includes("/submit"))
  ) {
    const token = req.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.redirect(new URL(`/login?redirect=${pathname}`, req.url));
    }
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.redirect(new URL(`/login?redirect=${pathname}`, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/hackathons/:id/submit", "/hackathons/:id/register"],
};
