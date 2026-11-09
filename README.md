# Hackathon Platform

ADAM's hackathon platform, built with Next.js 16 and Supabase Postgres and Storage. The app uses the Supabase JavaScript client directly for database queries and Supabase Storage; Prisma has been removed. Participants can register, submit project ZIPs, and view published leaderboards. Admins can evaluate submissions, assign scores and ranks, and generate clearly labeled illustrative entries for unoccupied ranks.

## Stack and collaboration

- **Supabase Postgres** is the shared relational database. Queries use `@supabase/supabase-js` from server-only code.
- **Supabase Storage** holds ZIP uploads in a private bucket. The service role key is used only by server code and must never use a `NEXT_PUBLIC_` variable name.
- **Supabase Postgres** also stores shared rate-limit counters.
- Passwords and app sessions are still managed by this application and stored in the Supabase `users` table. Supabase Auth is not enabled, so current login behavior is preserved.
- Multiple developers should work from the same Git repository and use the same Supabase development/staging project. Use separate Supabase branches or projects for schema changes that should not affect teammates. Do not point local development at production data.

## Supabase setup

1. Create a Supabase project. The SQL migration creates the tables, transaction-safe RPCs, and a **private** Storage bucket named `submissions`.
2. Copy `env.example` to `.env` and set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Both are used only by server code; never expose the service key through a `NEXT_PUBLIC_` variable or commit it.
3. Set a unique `JWT_SECRET` of at least 32 characters, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` (at least 12 characters).
4. Install dependencies, sign in to the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), and link the project before applying migrations from `supabase/migrations/`:

   ```bash
   npm install
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npm run db:push
   npm run db:seed
   npm run dev
   ```

The `db:seed` command creates or promotes only the configured admin; it does not add sample hackathons or announcements. Teammates need access to the Supabase organization/project and the same project URL/key in their local environment to share the database. Use a development or staging project for local work rather than pointing developer machines at production. Existing local SQLite records and files under `uploads/` are not copied automatically.

Production builds use Next.js's Webpack bundler because Turbopack currently exits during CSS processing in this environment; development continues to use Turbopack.

## Upload safety and rate limits

Uploads are capped at 50 MB. The server checks the ZIP central directory, rejects encrypted/unsupported entries, path traversal, symbolic links, ZIP64 archives, excessive entry counts, and suspicious expansion sizes. The application does not extract uploaded archives. These checks reduce common archive risks but do not make arbitrary ZIP contents safe to execute.

Rate limiting is stored in Supabase and uses `x-real-ip` only when supplied by a trusted reverse proxy, along with account/user limits. Configure the proxy to overwrite that header. If it is absent, IP-based requests share an `unknown-client` bucket; client-supplied `x-forwarded-for` is intentionally ignored.

## Leaderboards

Admins manually assign real participants' display names, scores, and ranks. Every registered participant must be ranked before the remaining ranks can be generated. Unoccupied ranks are synthetic illustrative entries, generated from nearby real scores and visibly labeled as illustrative on the public leaderboard. They are not real participants or judging results. Results can only be published once every rank is populated.

## Admin flow

1. Create a hackathon and post announcements from the admin dashboard.
2. Review submissions and assign evaluation scores and feedback.
3. Assign each participant's leaderboard score and rank, generate illustrative entries for the remaining positions, then publish.
