import "reflect-metadata";
import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";

loadEnvConfig(process.cwd());

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME || "Administrador";

if (!email || !password) {
  console.error("Defina ADMIN_EMAIL e ADMIN_PASSWORD antes de rodar este script.");
  process.exit(1);
}

const run = async () => {
  const [{ default: AppDataSource }, { User }] = await Promise.all([
    import("../src/lib/data-source"),
    import("../src/entities/User"),
  ]);

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const repo = AppDataSource.getRepository(User);
    let user = await repo.findOneBy({ email });
    const roles = Array.from(new Set([...(user?.roles || []), "admin"]));
    const passwordHash = await bcrypt.hash(password, 12);

    if (!user) {
      user = repo.create({
        email,
        name,
        passwordHash,
        roles,
      });
    } else {
      user.name = user.name || name;
      user.passwordHash = passwordHash;
      user.roles = roles;
    }

    await repo.save(user);

    console.log(`Admin pronto: ${email}`);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
