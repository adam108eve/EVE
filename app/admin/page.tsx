import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const [hackathons, announcements, userCount] = await Promise.all([
    prisma.hackathon.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { registrations: true } } },
    }),
    prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.user.count({ where: { role: "USER" } }),
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={{ name: session.name, email: session.email, role: session.role }} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
            <p className="text-gray-400 mt-1">Manage hackathons, submissions, and results.</p>
          </div>
          <Link
            href="/admin/hackathons/new"
            className="bg-amber-500 hover:bg-amber-400 text-stone-950 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            + New Hackathon
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Hackathons", value: hackathons.length, color: "amber" },
            { label: "Registered Users", value: userCount, color: "green" },
            { label: "Live Hackathons", value: hackathons.filter((h) => h.status === "LIVE").length, color: "yellow" },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <p className="text-gray-400 text-sm">{stat.label}</p>
              <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Hackathons Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-white font-semibold">Hackathons</h2>
            <Link href="/admin/hackathons/new" className="text-amber-400 hover:text-amber-300 text-sm">+ Create</Link>
          </div>

          {hackathons.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">No hackathons yet.</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {hackathons.map((h) => (
                <div key={h.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{h.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        h.status === "LIVE" ? "bg-green-500/20 text-green-400" :
                        h.status === "UPCOMING" ? "bg-blue-500/20 text-blue-400" :
                        "bg-gray-700 text-gray-400"
                      }`}>{h.status}</span>
                      {h.resultsPublished && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">Published</span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {h._count.registrations}/{h.maxRealParticipants} participants · {new Date(h.startAt).toLocaleDateString()} – {new Date(h.endAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/hackathons/${h.id}`} className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded-lg transition-colors">Manage</Link>
                    <Link href={`/admin/hackathons/${h.id}/edit`} className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded-lg transition-colors">Edit</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Announcements */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-white font-semibold">Recent Announcements</h2>
            <Link href="/admin/announcements/new" className="text-amber-400 hover:text-amber-300 text-sm">+ Post</Link>
          </div>
          {announcements.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">No announcements yet.</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {announcements.map((ann) => (
                <div key={ann.id} className="px-6 py-4">
                  <p className="text-white font-medium text-sm">{ann.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{new Date(ann.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
