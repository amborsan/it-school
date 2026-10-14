export async function authorizedCreate(req, create) {
  const prisma = req.app.locals.prisma;
  if (!req.access?.checkCreate) return create(prisma);
  return prisma.$transaction(
    async (tx) => {
      await req.access.checkCreate(tx);
      return create(tx);
    },
    { isolationLevel: "Serializable" },
  );
}
