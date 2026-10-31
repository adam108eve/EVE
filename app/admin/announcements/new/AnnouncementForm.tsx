"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AnnouncementForm({ hackathons }: { hackathons: { id: string; title: string }[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [hackathonId, setHackathonId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const field = "w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 placeholder:text-stone-500 focus:border-amber-500 focus:outline-none";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, hackathonId }),
      });
      const result = await response.json();
      if (!response.ok) setError(typeof result.error === "string" ? result.error : "Could not post the announcement.");
      else { router.push("/admin"); router.refresh(); }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-stone-900/70 border border-stone-800 rounded-xl p-6 sm:p-8 space-y-5">
      {error && <p role="alert" className="text-sm text-red-300 bg-red-950/40 border border-red-900 rounded-lg p-3">{error}</p>}
      <label className="block text-sm text-stone-300">Title<input required minLength={3} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className={`${field} block mt-2`} /></label>
      <label className="block text-sm text-stone-300">Message<textarea required minLength={5} value={body} onChange={(e) => setBody(e.target.value)} className={`${field} block mt-2 min-h-36 resize-y`} /></label>
      <label className="block text-sm text-stone-300">Audience<select value={hackathonId} onChange={(e) => setHackathonId(e.target.value)} className={`${field} block mt-2`}><option value="">All participants</option>{hackathons.map((hackathon) => <option key={hackathon.id} value={hackathon.id}>{hackathon.title}</option>)}</select></label>
      <button disabled={loading} className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-lg px-5 py-3 disabled:opacity-60">{loading ? "Posting…" : "Post announcement"}</button>
    </form>
  );
}
