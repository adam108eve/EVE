import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { redirect, notFound } from "next/navigation";
import HackathonForm from "@/components/HackathonForm";
import Navbar from "@/components/Navbar";

type Props = { params: Promise<{ id: string }> };

export default async function EditHackathonPage({ params }: Props) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const { data: hackathon } = await supabaseAdmin().from("hackathons").select("*").eq("id", id).maybeSingle();
  if (!hackathon) notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={{ name: session.name, email: session.email, role: session.role }} />
      <HackathonForm
        isEdit
        initialData={{
          id: hackathon.id,
          title: hackathon.title,
          description: hackathon.description,
          rules: hackathon.rules,
          startAt: hackathon.startAt,
          endAt: hackathon.endAt,
          status: hackathon.status,
          totalSlots: hackathon.totalSlots,
          maxRealParticipants: hackathon.maxRealParticipants,
        }}
      />
    </div>
  );
}
