import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

let client: ReturnType<typeof createClient<Database>> | undefined;

export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server configuration is missing.");
  return client ??= createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
