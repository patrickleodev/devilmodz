import "reflect-metadata";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const run = async () => {
  const [{ default: AppDataSource }, { seedDefaultProducts }] = await Promise.all([
    import("../src/lib/data-source"),
    import("../src/lib/db"),
  ]);

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    await seedDefaultProducts({ force: true });
    console.log("Produtos padrao sincronizados.");
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
