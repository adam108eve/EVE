"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface NavbarProps {
  user?: { name: string; email: string; role: string } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <span className="text-stone-950 font-bold text-sm">A</span>
            </div>
            <span className="font-bold text-white text-lg">ADAM Hackathon</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/hackathons" className="text-gray-300 hover:text-white transition-colors text-sm">
              Hackathons
            </Link>

            {user ? (
              <>
                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="text-amber-400 hover:text-amber-300 transition-colors text-sm font-medium"
                  >
                    Admin Panel
                  </Link>
                )}
                <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors text-sm">
                  Dashboard
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm hidden sm:block">{user.name}</span>
                  <button
                    onClick={handleLogout}
                    disabled={loading}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    {loading ? "..." : "Logout"}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-gray-300 hover:text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-amber-500 hover:bg-amber-400 text-stone-950 px-3 py-1.5 rounded-lg text-sm transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
