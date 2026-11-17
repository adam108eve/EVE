"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminHackathonActions({
  hackathonId,
  resultsPublished,
}: {
  hackathonId: string;
  resultsPublished: boolean;
}) {
  const router = useRouter();
  const [published, setPublished] = useState(resultsPublished);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");

  async function handleGenerate() {
    setGenerating(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/hackathons/${hackathonId}/generate-leaderboard`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) setMessage(`Error: ${data.error}`);
      else setMessage(`Generated ${data.generated} filler entries (${data.real} real participants).`);
      router.refresh();
    } catch {
      setMessage("Network error.");
    } finally {
      setGenerating(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/hackathons/${hackathonId}/publish`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: !published }),
      });
      const data = await res.json();
      if (!res.ok) setMessage(`Error: ${data.error}`);
      else {
        setPublished(data.resultsPublished);
        setMessage(data.resultsPublished ? "Results published." : "Results unpublished.");
      }
      router.refresh();
    } catch {
      setMessage("Network error.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {generating ? "Generating..." : "Generate Leaderboard"}
        </button>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className={`text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
            published
              ? "bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/30"
              : "bg-green-600 hover:bg-green-500 text-white"
          }`}
        >
          {publishing ? "..." : published ? "Unpublish Results" : "Publish Results"}
        </button>
      </div>
      {message && <p className="text-xs text-gray-400">{message}</p>}
    </div>
  );
}
