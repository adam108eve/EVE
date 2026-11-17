"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EvaluateForm({
  hackathonId,
  submissionId,
  initialScore,
  initialFeedback,
}: {
  hackathonId: string;
  submissionId: string;
  initialScore?: number;
  initialFeedback: string;
}) {
  const router = useRouter();
  const [score, setScore] = useState(initialScore?.toString() ?? "");
  const [feedback, setFeedback] = useState(initialFeedback);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/hackathons/${hackathonId}/submissions/${submissionId}/evaluate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: parseFloat(score), adminFeedback: feedback }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Failed.");
      else {
        setSuccess(true);
        router.refresh();
        setTimeout(() => router.push(`/admin/hackathons/${hackathonId}`), 1000);
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <h2 className="text-white font-semibold mb-4">Score & Feedback</h2>
      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg px-4 py-3 mb-4 text-sm">Saved. Redirecting...</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Score (0–100)</label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            required
            value={score}
            onChange={e => setScore(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="e.g. 85.5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Feedback <span className="text-gray-500">(optional)</span></label>
          <textarea
            rows={4}
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            placeholder="Great project! Consider improving..."
          />
        </div>
        <button
          type="submit"
          disabled={loading || success}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold py-2.5 rounded-lg transition-colors"
        >
          {loading ? "Saving..." : "Save Evaluation"}
        </button>
      </form>
    </div>
  );
}
