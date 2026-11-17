-- Run once in the Supabase SQL Editor as postgres after replacing the password.
-- Keep this password server-side and use it only in Prisma connection URLs.
CREATE USER "prisma" WITH PASSWORD 'REPLACE_WITH_A_LONG_RANDOM_PASSWORD' BYPASSRLS CREATEDB;
GRANT "prisma" TO "postgres";
GRANT USAGE, CREATE ON SCHEMA public TO "prisma";
GRANT ALL ON ALL TABLES IN SCHEMA public TO "prisma";
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO "prisma";
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO "prisma";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA public GRANT ALL ON TABLES TO "prisma";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA public GRANT ALL ON ROUTINES TO "prisma";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA public GRANT ALL ON SEQUENCES TO "prisma";
