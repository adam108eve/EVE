import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

loadEnvConfig(process.cwd());

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!url || !key || !email || !password || password.length < 12) {
  throw new Error("Set Supabase URL/service key and ADMIN_EMAIL plus ADMIN_PASSWORD (at least 12 characters) before seeding.");
}

const adminUrl = url as string;
const serviceKey = key as string;
const adminEmail = email as string;
const adminPassword = password as string;
const supabase = createClient<Database>(adminUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const { data: existingAdmin, error: lookupError } = await supabase.from("users").select("id").eq("email", adminEmail).maybeSingle();
  if (lookupError) throw lookupError;
  if (existingAdmin) {
    const { error } = await supabase.from("users").update({ role: "ADMIN" }).eq("id", existingAdmin.id);
    if (error) throw error;
  } else {
    const passwordHash: string = await bcrypt.hash(adminPassword, 12);
    const { error } = await supabase.from("users").insert({
      name: process.env.ADMIN_NAME ?? "Platform Admin",
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
    });
    if (error) throw error;
  }

  console.log(`Provisioned admin account ${adminEmail}. No sample content was added.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
