"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterButton({
  hackathonId,
  status,
}: {
  hackathonId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (status === "ENDED") return null;

  async function handleRegister() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/hackathons/${hackathonId}/register`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <p className="text-red-400 text-xs mb-1 text-right">{error}</p>}
      <button
        onClick={handleRegister}
        disabled={loading}
        className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 text-sm px-6 py-1.5 rounded-lg font-medium transition-colors"
      >
        {loading ? "Registering..." : "Register Now"}
      </button>
    </div>
  );
}
