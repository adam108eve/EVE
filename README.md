# Hackathon Platform

ADAM's hackathon platform, built with Next.js 16 and Supabase. Supabase provides PostgreSQL, Auth, and private Storage. The Next.js application still needs a Node.js host such as Vercel or another compatible host.

## Supabase setup

1. In Supabase, create a project. In the SQL Editor, create a dedicated Prisma database role by running `supabase/prisma-role.sql` after replacing its password placeholder with a long random password. Skip this if your project already has the configured `prisma` role.
2. Copy the project URL, anon/publishable key, service-role/secret key, and database connection strings from Supabase. Use the transaction pooler on port `6543` for `DATABASE_URL` on a serverless host; append `?pgbouncer=true`. Use the session pooler or direct connection on port `5432` for `DIRECT_URL`. Use the Prisma role and password in both URLs, and copy the pooler host from Supabase rather than constructing it yourself.
3. Copy `.env.example` to `.env` and replace the placeholders (do not commit `.env`):

   ```env
   DATABASE_URL="postgresql://...pooler...:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://...:5432/postgres"
   SUPABASE_URL="https://your-project.supabase.co"
   SUPABASE_ANON_KEY="your-anon-or-publishable-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-or-secret-key"
   ADMIN_EMAIL="admin@example.com"
   ADMIN_PASSWORD="replace-with-a-password-at-least-12-characters"
   ```

   Keep `SUPABASE_SERVICE_ROLE_KEY` and database URLs server-side only. Never prefix them with `NEXT_PUBLIC_` or put them in browser code.
4. Enable email/password sign-in in Supabase Auth. Set the production site URL and allowed redirect URLs in Supabase Auth. If email confirmation is enabled, registration shows a check-your-email message; the user must confirm before signing in.
5. Install dependencies and create/update the Supabase schema and seed the admin and sample hackathon:

   ```bash
   npm install
   npm run setup
   ```

6. After setup, run `supabase/secure.sql` in the Supabase SQL Editor as the project owner. This enables RLS on app tables and creates the private submissions bucket; the Prisma role intentionally cannot manage Supabase's Storage schema.
7. Start the local app:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000). Sign in with the admin credentials from `.env`.

`npm run setup` runs `prisma db push` and seeds sample data. For existing Supabase data, back it up first and review the Prisma schema changes before pushing. This command updates schema; it does not transfer records from an old SQLite database. Run `supabase/secure.sql` in the SQL Editor after schema changes that add an app table. Existing bcrypt accounts already in the PostgreSQL `User` table migrate to Supabase Auth the first time each person signs in with their current password.

## Security model

- Passwords are verified and stored by Supabase Auth. Existing bcrypt password hashes are cleared after a successful one-time account migration.
- Supabase Auth issues the access and refresh tokens stored in `HttpOnly`, `SameSite=Strict` cookies. The Next.js Proxy refreshes expiring sessions, and protected requests validate the access token with Supabase Auth and re-read the app role from PostgreSQL, so role changes take effect immediately.
- Supabase Storage bucket `submissions` is private and restricted to ZIP uploads up to 50 MB. Only server routes with the service key access it; participant downloads are not public. The admin download route checks the current database role.
- App tables have RLS enabled with no browser-role policies. The browser should call the Next.js app routes; keep database credentials and the service key on the server.
- Login, registration, and upload limits use an atomic rate-limit table in Supabase Postgres. The table stores keyed hashes of rate-limit keys rather than raw IP addresses; the server-only Supabase service key is used as the HMAC key.
- HTTPS must be enabled on the deployed app so production cookies are secure. Rotate Supabase secrets if exposed, and do not commit `.env`.

This app currently uses custom server-side authorization with Prisma. Do not add direct browser queries to app tables without adding and reviewing user-specific RLS policies. Supabase's service key bypasses RLS, so the server routes must keep their explicit user and admin authorization checks.

## Moving existing submissions

New ZIP uploads go to private Supabase Storage. Existing rows that point to local files or S3 remain readable through the legacy compatibility path while the old files and credentials are available. After configuring the old storage credentials (AWS variables are only needed if legacy files are in S3), run `npm run migrate:submissions`. It copies available files into the private bucket, updates each database row, and then deletes the old copy. Back up the database and source files first; rows that point to missing files are reported and left unchanged.

## Production notes

- Set all values above in the Node.js host's server environment. Do not expose Supabase secrets to the browser.
- Use Supabase's pooled connection URL for serverless application traffic and a direct/session connection for Prisma schema changes.
- Configure Supabase Auth email delivery and production redirect URLs before opening registration.
- Back up the Supabase project and review database migrations before applying schema changes to production.
