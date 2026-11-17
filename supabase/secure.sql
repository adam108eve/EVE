-- Run after the Prisma schema has been pushed to the Supabase project.
-- Browser roles get no policies for app tables; the Next.js server connects
-- through its private DATABASE_URL and performs authorization in server code.
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Hackathon" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Registration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Submission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LeaderboardEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Announcement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RateLimitBucket" ENABLE ROW LEVEL SECURITY;

-- Submission ZIPs must remain private. The service role is used only by the
-- server-side storage module and must never be exposed to browser code.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('submissions', 'submissions', false, 52428800, ARRAY['application/zip'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/zip'];
