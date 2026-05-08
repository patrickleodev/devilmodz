import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const env = process.env as NodeJS.ProcessEnv & {
  NODE_ENV?: string;
  TYPEORM_SYNCHRONIZE?: string;
};

env.TYPEORM_SYNCHRONIZE ??= "false";
env.NODE_ENV ??= "production";

void (async () => {
  await import("./main");
})();
