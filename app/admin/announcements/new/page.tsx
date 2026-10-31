import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import { redirect } from "next/navigation";
import Link from "next/link";
import AnnouncementForm from "./AnnouncementForm";

export default async function NewAnnouncementPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");
  const hackathons = await prisma.hackathon.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, title: true } });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={{ name: session.name, email: session.email, role: session.role }} />
      <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/admin" className="text-stone-400 hover:text-amber-400 text-sm">← Admin panel</Link>
        <h1 className="text-3xl font-semibold tracking-tight text-white mt-3">Post an announcement</h1>
        <p className="text-stone-400 mt-2 mb-7">Share an update with participants.</p>
        <AnnouncementForm hackathons={hackathons} />
      </main>
    </div>
  );
}
