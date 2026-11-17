import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

function digestKey(key: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || secret.length < 32) throw new Error("SUPABASE_SERVICE_ROLE_KEY must be configured before rate limiting.");
  return createHmac("sha256", secret).update(key).digest("hex");
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const hashedKey = digestKey(key);
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
    VALUES (${hashedKey}, 1, NOW() + (${windowMs} * INTERVAL '1 millisecond'))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."resetAt" <= NOW() THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimitBucket"."resetAt" <= NOW() THEN NOW() + (${windowMs} * INTERVAL '1 millisecond')
        ELSE "RateLimitBucket"."resetAt"
      END
    RETURNING "count"
  `;
  const count = Number(rows[0]?.count ?? limit + 1);

  // Occasional opportunistic cleanup keeps expired IP hashes from accumulating.
  if (Math.random() < 0.001) {
    await prisma.rateLimitBucket.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
  }
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}
