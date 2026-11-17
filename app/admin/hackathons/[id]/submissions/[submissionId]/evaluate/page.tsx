import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import EvaluateForm from "./EvaluateForm";

type Props = { params: Promise<{ id: string; submissionId: string }> };

export default async function EvaluatePage({ params }: Props) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { id: hackathonId, submissionId } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      registration: {
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });
  if (!submission) notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={{ name: session.name, email: session.email, role: session.role }} />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="mb-6">
          <Link href={`/admin/hackathons/${hackathonId}`} className="text-gray-500 hover:text-gray-300 text-sm">← Back to Hackathon</Link>
          <h1 className="text-2xl font-bold text-white mt-2">Evaluate Submission</h1>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <p className="text-gray-400 text-sm mb-1">Participant</p>
          <p className="text-white font-semibold">{submission.registration.user.name}</p>
          <p className="text-gray-500 text-sm">{submission.registration.user.email}</p>

          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-white font-semibold text-lg">{submission.title}</p>
            <p className="text-gray-400 mt-2 text-sm whitespace-pre-wrap">{submission.description}</p>
            {submission.repoUrl && (
              <a href={submission.repoUrl} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline text-sm mt-2 inline-block">
                🔗 {submission.repoUrl}
              </a>
            )}
            <div className="flex items-center gap-4 mt-3 text-gray-500 text-xs">
              <span>Size: {(submission.zipSize / 1024 / 1024).toFixed(2)} MB</span>
              <span>Submitted: {new Date(submission.submittedAt).toLocaleString()}</span>
            </div>
            <a
              href={`/api/admin/hackathons/${hackathonId}/submissions/${submission.id}/download`}
              className="inline-block mt-3 bg-green-600 hover:bg-green-500 text-white text-xs px-4 py-2 rounded-lg transition-colors"
            >
              Download ZIP
            </a>
          </div>
        </div>

        <EvaluateForm
          hackathonId={hackathonId}
          submissionId={submission.id}
          initialScore={submission.score ?? undefined}
          initialFeedback={submission.adminFeedback ?? ""}
        />
      </main>
    </div>
  );
}
