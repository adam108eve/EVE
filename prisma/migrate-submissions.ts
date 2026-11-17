import { readFile } from "node:fs/promises";
import path from "node:path";

async function loadEnvFile() {
  try {
    const contents = await readFile(path.join(process.cwd(), ".env"), "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function main() {
  await loadEnvFile();
  const [{ prisma }, { deleteFile, getFileBuffer, uploadFile }] = await Promise.all([
    import("../lib/prisma"),
    import("../lib/storage"),
  ]);
  const submissions = await prisma.submission.findMany({ include: { registration: { select: { hackathonId: true } } } });
  let moved = 0;
  let failed = 0;

  for (const submission of submissions) {
    if (submission.zipPath.startsWith("supabase:")) continue;
    let newPath: string | undefined;
    try {
      const file = await getFileBuffer(submission.zipPath);
      const uploaded = await uploadFile(submission.registration.hackathonId, file, path.basename(submission.zipPath));
      newPath = uploaded.relativePath;
      await prisma.submission.update({ where: { id: submission.id }, data: { zipPath: newPath } });
      await deleteFile(submission.zipPath);
      moved += 1;
    } catch (error) {
      if (newPath) await deleteFile(newPath);
      failed += 1;
      console.error(`Could not move submission ${submission.id}:`, error);
    }
  }

  console.log(`Moved ${moved} submission file(s); ${failed} failed.`);
  if (failed) process.exitCode = 1;
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
