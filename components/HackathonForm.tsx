"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface HackathonFormProps {
  initialData?: {
    id?: string;
    title: string;
    description: string;
    rules: string;
    startAt: string;
    endAt: string;
    status: string;
    totalSlots: number;
    maxRealParticipants: number;
  };
  isEdit?: boolean;
}

export default function HackathonForm({ initialData, isEdit }: HackathonFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    rules: initialData?.rules ?? "",
    startAt: initialData?.startAt ? new Date(initialData.startAt).toISOString().slice(0, 16) : "",
    endAt: initialData?.endAt ? new Date(initialData.endAt).toISOString().slice(0, 16) : "",
    status: initialData?.status ?? "UPCOMING",
    totalSlots: initialData?.totalSlots ?? 100,
    maxRealParticipants: initialData?.maxRealParticipants ?? 5,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      ...form,
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
      totalSlots: Number(form.totalSlots),
      maxRealParticipants: Number(form.maxRealParticipants),
    };

    try {
      const url = isEdit ? `/api/hackathons/${initialData?.id}` : "/api/hackathons";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to save hackathon.");
      } else {
        router.push("/admin");
        router.refresh();
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <Link href="/admin" className="text-gray-500 hover:text-gray-300 text-sm">← Admin Panel</Link>
        <h1 className="text-2xl font-bold text-white mt-2">{isEdit ? "Edit Hackathon" : "Create Hackathon"}</h1>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-6 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Title</label>
            <input type="text" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className={inputClass} placeholder="Hackathon title" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
            <textarea required rows={4} value={form.description} onChange={e => setForm({...form, description: e.target.value})} className={`${inputClass} resize-none`} placeholder="Describe the hackathon..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Rules</label>
            <textarea required rows={5} value={form.rules} onChange={e => setForm({...form, rules: e.target.value})} className={`${inputClass} resize-none`} placeholder="List the rules (one per line)..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Start Date & Time</label>
              <input type="datetime-local" required value={form.startAt} onChange={e => setForm({...form, startAt: e.target.value})} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">End Date & Time</label>
              <input type="datetime-local" required value={form.endAt} onChange={e => setForm({...form, endAt: e.target.value})} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={inputClass}>
                <option value="UPCOMING">UPCOMING</option>
                <option value="LIVE">LIVE</option>
                <option value="ENDED">ENDED</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Total Slots</label>
              <input type="number" min={1} max={10000} required value={form.totalSlots} onChange={e => setForm({...form, totalSlots: Number(e.target.value)})} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Max Real Participants</label>
              <input type="number" min={1} max={100} required value={form.maxRealParticipants} onChange={e => setForm({...form, maxRealParticipants: Number(e.target.value)})} className={inputClass} />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold py-2.5 rounded-lg transition-colors">
            {loading ? "Saving..." : isEdit ? "Update Hackathon" : "Create Hackathon"}
          </button>
        </form>
      </div>
    </div>
  );
}
