import "reflect-metadata";
import { loadEnvConfig } from "@next/env";
import { DataSource } from "typeorm";

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

    const seedDataSource = new DataSource(AppDataSource.options);
    try {
      await seedDataSource.initialize();
      await seedDefaultProducts({ force: true, dataSource: seedDataSource });
    } finally {
      if (seedDataSource.isInitialized) {
        await seedDataSource.destroy();
      }
    }

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
