"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Participant {
  registrationId: string;
  name: string;
  email: string;
  score: number | null;
  currentRank: number | null;
  currentDisplayName: string;
  currentScore: number;
}

interface Row {
  registrationId: string;
  name: string;
  email: string;
  evaluatedScore: number | null;
  rank: string;
  displayName: string;
  score: string;
}

const inputClass =
  "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500";

// Default plan: 4 participants spread across ranks 40-60, the last one at 97.
const DEFAULT_RANKS = [42, 48, 54, 59, 97];

export default function RankingClient({
  hackathonId,
  totalSlots,
  participants,
}: {
  hackathonId: string;
  totalSlots: number;
  participants: Participant[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(
    participants.map((p) => ({
      registrationId: p.registrationId,
      name: p.name,
      email: p.email,
      evaluatedScore: p.score,
      rank: p.currentRank?.toString() ?? "",
      displayName: p.currentDisplayName,
      score: p.currentScore.toString(),
    }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function update(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    setSuccess("");
  }

  function applyDefaultPlan() {
    // Highest evaluated score gets the best (lowest) rank.
    const order = rows
      .map((r, i) => ({ i, s: r.evaluatedScore ?? -1 }))
      .sort((a, b) => b.s - a.s);
    const next = [...rows];
    order.forEach(({ i }, pos) => {
      const rank = DEFAULT_RANKS[pos];
      next[i] = { ...next[i], rank: rank && rank <= totalSlots ? rank.toString() : "" };
    });
    setRows(next);
    setSuccess("");
    setError("");
  }

  function validate(): string | null {
    const seen = new Set<number>();
    for (const r of rows) {
      const rank = Number(r.rank);
      if (!r.rank || !Number.isInteger(rank)) return `Enter a whole-number rank for ${r.name}.`;
      if (rank < 1 || rank > totalSlots) return `Rank for ${r.name} must be between 1 and ${totalSlots}.`;
      if (seen.has(rank)) return `Rank ${rank} is assigned more than once.`;
      seen.add(rank);
      if (!r.displayName.trim()) return `Display name for ${r.name} is required.`;
      const score = Number(r.score);
      if (r.score === "" || Number.isNaN(score) || score < 0 || score > 100) {
        return `Score for ${r.name} must be between 0 and 100.`;
      }
    }
    return null;
  }

  async function handleSave() {
    setError("");
    setSuccess("");
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/hackathons/${hackathonId}/rankings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignments: rows.map((r) => ({
            registrationId: r.registrationId,
            rank: Number(r.rank),
            displayName: r.displayName.trim(),
            score: Number(r.score),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to save rankings.");
      } else {
        setSuccess("Rankings saved. Use “Generate Leaderboard” on the hackathon page to fill the remaining slots.");
        router.refresh();
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-400">
        No registered participants yet.
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-white font-semibold">Participants ({rows.length})</h2>
        <button
          type="button"
          onClick={applyDefaultPlan}
          className="text-sm px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-colors"
        >
          Apply default plan
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg px-4 py-3 mb-4 text-sm">{success}</div>
      )}

      <div className="space-y-4">
        {rows.map((r, i) => (
          <div key={r.registrationId} className="border border-gray-800 rounded-xl p-4">
            <div className="mb-3">
              <p className="text-white font-medium">{r.name}</p>
              <p className="text-gray-500 text-xs">
                {r.email} · Evaluated score: {r.evaluatedScore ?? "not evaluated"}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block">
                <span className="block text-xs text-gray-400 mb-1">Rank (1–{totalSlots})</span>
                <input
                  type="number"
                  min={1}
                  max={totalSlots}
                  value={r.rank}
                  onChange={(e) => update(i, { rank: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="block text-xs text-gray-400 mb-1">Display name</span>
                <input
                  type="text"
                  value={r.displayName}
                  onChange={(e) => update(i, { displayName: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="block text-xs text-gray-400 mb-1">Leaderboard score (0–100)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={r.score}
                  onChange={(e) => update(i, { score: e.target.value })}
                  className={inputClass}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-6 w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-medium py-2.5 rounded-lg transition-colors"
      >
        {saving ? "Saving..." : "Save Rankings"}
      </button>
    </div>
  );
}
