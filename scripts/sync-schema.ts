import "reflect-metadata";
import { loadEnvConfig } from "@next/env";
import { DataSource } from "typeorm";

loadEnvConfig(process.cwd());

const withSerializedQueryRunners = async <T>(dataSource: DataSource, task: () => Promise<T>) => {
  const originalCreateQueryRunner = dataSource.createQueryRunner.bind(dataSource);
  let queue = Promise.resolve();

  dataSource.createQueryRunner = ((mode?: "master" | "slave") => {
    const queryRunner = originalCreateQueryRunner(mode);
    const originalQuery = queryRunner.query.bind(queryRunner) as typeof queryRunner.query;

    queryRunner.query = ((...args: Parameters<typeof queryRunner.query>) => {
      const execution = queue.then(() => originalQuery(...args));
      queue = execution.then(() => undefined, () => undefined);
      return execution;
    }) as typeof queryRunner.query;

    return queryRunner;
  }) as typeof dataSource.createQueryRunner;

  try {
    return await task();
  } finally {
    dataSource.createQueryRunner = originalCreateQueryRunner;
  }
};

const run = async () => {
  const [{ default: AppDataSource }, { seedDefaultProducts }] = await Promise.all([
    import("../src/lib/data-source"),
    import("../src/lib/db"),
  ]);

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    await withSerializedQueryRunners(AppDataSource, async () => {
      await AppDataSource.synchronize(false);
    });

    const seedDataSource = new DataSource(AppDataSource.options);
    try {
      await seedDataSource.initialize();
      await seedDefaultProducts({ dataSource: seedDataSource });
    } finally {
      if (seedDataSource.isInitialized) {
        await seedDataSource.destroy();
      }
    }

    console.log("Schema e produtos padrao sincronizados.");
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
