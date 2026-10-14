import "dotenv/config";
let prisma;
try {
  ({ prisma } = await import("../src/prisma.js"));
  const result = await prisma.session.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
  console.log(`Removed ${result.count} expired sessions.`);
} catch {
  console.error(
    "Session cleanup failed. Check database access and migrations.",
  );
  process.exitCode = 1;
} finally {
  if (prisma) await prisma.$disconnect();
}
