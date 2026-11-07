# Hackathon Platform

ADAM's hackathon platform, built with Next.js 16, Prisma, and SQLite for local development. It supports participant accounts, hackathon registration, ZIP submissions, admin evaluation, rank assignment, announcements, and public leaderboards.

## Local setup

1. Copy `.env.example` to `.env`.
2. Set `JWT_SECRET` to a unique random value of at least 32 characters. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (at least 12 characters) for the seeded admin account.
3. Install dependencies and initialize the local database:

   ```bash
   npm install
   npm run setup
   npm run dev
   ```

Local development stores submissions under `uploads/` and uses an in-process rate limiter. These are development fallbacks only.

## Public production setup

Configure these deployment environment variables before starting the app:

- `JWT_SECRET`: unique random secret, at least 32 characters.
- `DATABASE_URL`: SQLite URL on a host with a persistent mounted volume. This app's Prisma schema currently uses SQLite, so run a single application instance with persistent disk for production; multi-instance deployments require a separate PostgreSQL schema and migration.
- `AWS_REGION` and `AWS_BUCKET_NAME`: private S3 bucket for participant ZIP files. Grant the app's IAM role `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` for the bucket's upload prefix. Prefer an IAM role; otherwise set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: Upstash Redis REST credentials for shared login and upload rate limits.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: credentials used by `npm run db:seed` to create the admin account.

Authentication, rate-limited requests, and uploads fail clearly when their required production configuration is missing. Keep the S3 bucket private and never commit `.env` or cloud credentials.

## Admin flow

1. Create a hackathon and post announcements from the admin dashboard.
2. Review submissions and assign scores and feedback.
3. Assign participant ranks, generate filler leaderboard entries, then publish the results.
