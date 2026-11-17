"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SubmitPage({ params }: { params: Promise<{ id: string }> }) {
  return <SubmitForm params={params} />;
}

function SubmitForm({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", description: "", repoUrl: "" });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError("Please select a .zip file."); return; }
    setError("");
    setLoading(true);

    try {
      const { id } = await params;
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("repoUrl", form.repoUrl);
      fd.append("file", file);

      const res = await fetch(`/api/hackathons/${id}/submit`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        if (typeof data.error === "string") {
          setError(data.error);
        } else if (data.error && typeof data.error === "object") {
          // Zod field errors, e.g. { description: ["String must contain at least 10 character(s)"] }
          const msgs = Object.entries(data.error as Record<string, string[]>)
            .map(([field, m]) => `${field}: ${m.join(", ")}`);
          setError(msgs.join(" · ") || "Submission failed.");
        } else {
          setError("Submission failed.");
        }
      } else {
        setSuccess(true);
        setTimeout(() => { router.push("/dashboard"); router.refresh(); }, 1500);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Submitted!</h2>
          <p className="text-gray-400 mt-2">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold text-white mb-6">Submit Your Project</h1>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Project Title</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="My Awesome Project"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
              <textarea
                required
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                placeholder="Describe your project, what it does, how it works..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Repository URL <span className="text-gray-500">(optional)</span>
              </label>
              <input
                type="url"
                value={form.repoUrl}
                onChange={(e) => setForm({ ...form, repoUrl: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="https://github.com/yourname/project"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Project ZIP <span className="text-red-400">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-amber-500/50 transition-colors">
                <input
                  type="file"
                  accept=".zip"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                  id="zipFile"
                />
                <label htmlFor="zipFile" className="cursor-pointer">
                  {file ? (
                    <div>
                      <p className="text-white font-medium">{file.name}</p>
                      <p className="text-gray-400 text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-400">Click to select a .zip file</p>
                      <p className="text-gray-500 text-sm mt-1">Max size: 50 MB</p>
                    </div>
                  )}
                </label>
              </div>
              <p className="text-gray-500 text-xs mt-1">Only .zip files accepted. Max 50 MB. You can re-submit before the deadline.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? "Uploading..." : "Submit Project"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
