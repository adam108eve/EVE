import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword || adminPassword.length < 12) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) before seeding.");
  }
  const adminName = process.env.ADMIN_NAME ?? "Platform Admin";

  console.log("🌱 Seeding database...");

  // Create admin
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { name: adminName, email: adminEmail, passwordHash, role: "ADMIN" },
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // Create a sample hackathon
  const now = new Date();
  const hackathon = await prisma.hackathon.upsert({
    where: { id: "sample-hackathon-001" },
    update: {},
    create: {
      id: "sample-hackathon-001",
      title: "ADAM Hackathon 2026",
      description:
        "Build the next generation of AI-powered applications. Showcase your innovation, creativity, and technical skills in this exciting hackathon organized by ADAM.",
      rules: `1. Teams can have 1-4 members.\n2. Projects must be original work created during the hackathon.\n3. All code must be submitted as a .zip file.\n4. Projects must include a README.\n5. Plagiarism will result in immediate disqualification.\n6. The decision of judges is final.`,
      startAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      endAt: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000),   // 9 days from now
      status: "UPCOMING",
      totalSlots: 100,
      maxRealParticipants: 5,
    },
  });
  console.log(`✅ Sample hackathon created: ${hackathon.title}`);

  // Create a sample announcement
  await prisma.announcement.upsert({
    where: { id: "sample-ann-001" },
    update: {},
    create: {
      id: "sample-ann-001",
      hackathonId: hackathon.id,
      title: "Welcome to ADAM Hackathon 2026!",
      body: "We are thrilled to announce the ADAM Hackathon 2026. Register now to secure your spot. Good luck to all participants!",
    },
  });
  console.log("✅ Sample announcement created.");

  console.log("\n🎉 Seeding complete!");
  console.log(`\n   Admin Login:\n   Email:    ${adminEmail}\n   Password: ${adminPassword}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
