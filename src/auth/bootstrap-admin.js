import { RegisterSchema } from "../validation/school-schema.js";
import { hashPassword } from "./passwords.js";
import { publicUser } from "./public-user.js";
export async function bootstrapAdmin(prisma, input) {
  const { password, ...profile } = RegisterSchema.parse(input);
  const passwordHash = await hashPassword(password);
  return prisma.$transaction(
    async (tx) => {
      if (await tx.user.findFirst({ where: { role: "ADMIN" } }))
        throw new Error(
          "An administrator already exists. Use authenticated administrator management.",
        );
      const user = await tx.user.create({
        data: { ...profile, passwordHash, role: "ADMIN" },
      });
      return publicUser(user);
    },
    { isolationLevel: "Serializable" },
  );
}
