import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import AdminHackathonActions from "./AdminHackathonActions";

type Props = { params: Promise<{ id: string }> };

export default async function AdminHackathonPage({ params }: Props) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const hackathon = await prisma.hackathon.findUnique({
    where: { id },
    include: {
      registrations: {
        include: {
          user: { select: { id: true, name: true, email: true, college: true } },
          submission: true,
        },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { registrations: true } },
    },
  });

  if (!hackathon) notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={{ name: session.name, email: session.email, role: session.role }} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="mb-6">
          <Link href="/admin" className="text-gray-500 hover:text-gray-300 text-sm">← Admin Panel</Link>
          <div className="flex items-start justify-between mt-2 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{hackathon.title}</h1>
              <p className="text-gray-400 text-sm mt-1">
                {hackathon._count.registrations}/{hackathon.maxRealParticipants} participants ·{" "}
                {hackathon.status} ·{" "}
                {hackathon.resultsPublished ? "Results Published" : "Results Hidden"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/admin/hackathons/${id}/edit`} className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-lg transition-colors">Edit</Link>
              <Link href={`/admin/hackathons/${id}/rankings`} className="bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm px-4 py-2 rounded-lg transition-colors">Rank Assignment</Link>
              <AdminHackathonActions
                hackathonId={id}
                resultsPublished={hackathon.resultsPublished}
              />
            </div>
          </div>
        </div>

        {/* Participants & Submissions */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-white font-semibold">Participants & Submissions</h2>
          </div>

          {hackathon.registrations.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">No participants yet.</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {hackathon.registrations.map((reg) => (
                <div key={reg.id} className="px-6 py-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <p className="text-white font-medium">{reg.user.name}</p>
                      <p className="text-gray-500 text-sm">{reg.user.email} · {reg.user.college ?? "No college"}</p>
                    </div>

                    {reg.submission ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={`/api/admin/hackathons/${id}/submissions/${reg.submission.id}/download`}
                          className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Download ZIP
                        </a>
                        <Link
                          href={`/admin/hackathons/${id}/submissions/${reg.submission.id}/evaluate`}
                          className="bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Evaluate
                        </Link>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">No submission</span>
                    )}
                  </div>

                  {reg.submission && (
                    <div className="mt-3 bg-gray-800/50 rounded-lg p-4 text-sm">
                      <p className="text-white font-medium">{reg.submission.title}</p>
                      <p className="text-gray-400 mt-1">{reg.submission.description}</p>
                      {reg.submission.repoUrl && (
                        <a href={reg.submission.repoUrl} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline text-xs mt-1 inline-block">
                          {reg.submission.repoUrl}
                        </a>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-gray-500 text-xs">
                        <span>Size: {(reg.submission.zipSize / 1024 / 1024).toFixed(2)} MB</span>
                        <span>Submitted: {new Date(reg.submission.submittedAt).toLocaleString()}</span>
                        {reg.submission.score !== null && (
                          <span className="text-amber-400 font-semibold">Score: {reg.submission.score}/100</span>
                        )}
                      </div>
                      {reg.submission.adminFeedback && (
                        <p className="text-gray-400 mt-2 text-xs italic">Feedback: {reg.submission.adminFeedback}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
