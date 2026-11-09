import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Use only the address header supplied by the deployment's trusted reverse proxy.
 * x-forwarded-for is intentionally ignored because its leftmost value can be
 * controlled by a client on misconfigured deployments.
 */
export function getTrustedClientIp(headers: Headers): string {
  const ip = headers.get("x-real-ip")?.trim();
  return ip && ip.length <= 64 ? ip : "unknown-client";
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const hashedKey = createHash("sha256").update(key).digest("hex");
  const { data, error } = await supabaseAdmin().rpc("check_rate_limit", {
    p_key: hashedKey,
    p_limit: limit,
    p_window_ms: windowMs,
  });
  if (error) throw new Error(`Supabase rate limit failed: ${error.message}`);
  const result = data?.[0];
  if (!result) throw new Error("Supabase rate limit returned no result.");
  return result;
}
