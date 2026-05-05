import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env");
const envExamplePath = path.resolve(process.cwd(), ".env.example");

const requiredKeys = [
  "DATABASE_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "DISCORD_CLIENT_ID",
  "DISCORD_CLIENT_SECRET",
  "APP_URL",
  "MERCADO_PAGO_ACCESS_TOKEN",
  "DISCORD_BOT_TOKEN",
  "DISCORD_NOTIFICATION_CHANNEL_ID",
];

const readEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.trim().startsWith("#"))
    .reduce((accumulator, line) => {
      const index = line.indexOf("=");
      if (index === -1) {
        return accumulator;
      }

      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();
      accumulator[key] = value;
      return accumulator;
    }, {});
};

const currentEnv = readEnvFile(envPath);
const exampleEnv = readEnvFile(envExamplePath);
const missing = requiredKeys.filter((key) => !currentEnv[key] || currentEnv[key] === "replace-me");
const unusedExampleKeys = Object.keys(exampleEnv).filter((key) => !requiredKeys.includes(key));

if (missing.length > 0) {
  console.error("Missing required environment variables:");
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

console.log("Environment looks good.");

if (unusedExampleKeys.length > 0) {
  console.log(`Optional keys in .env.example: ${unusedExampleKeys.join(", ")}`);
}
