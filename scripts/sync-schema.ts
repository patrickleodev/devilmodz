import "reflect-metadata";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const run = async () => {
  const { default: AppDataSource } = await import("../src/lib/data-source");

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    await AppDataSource.synchronize(false);
    console.log("Schema sincronizado com as entidades.");
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
