import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import HackathonForm from "@/components/HackathonForm";
import Navbar from "@/components/Navbar";

export default async function NewHackathonPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={{ name: session.name, email: session.email, role: session.role }} />
      <HackathonForm />
    </div>
  );
}
