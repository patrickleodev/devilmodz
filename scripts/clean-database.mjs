import pg from "pg";
import fs from "fs";
import path from "path";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

// Load environment variables
loadEnvConfig(process.cwd());

const localEnvPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(localEnvPath)) {
  const localEnv = fs.readFileSync(localEnvPath, "utf8");
  for (const line of localEnv.split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const separatorIndex = line.indexOf("=");
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^"|"$/g, "");
    if (!process.env[key] && value) {
      process.env[key] = value;
    }
  }
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não está configurada");
  process.exit(1);
}

console.log("🗑️  Limpando banco de dados...");
console.log(`📍 Banco: ${DATABASE_URL.replace(/:[^:]*@/, ":***@")}`);
console.log("");

const client = new pg.Client({
  connectionString: DATABASE_URL,
});

(async () => {
  try {
    await client.connect();
    console.log("✅ Conectado ao banco");

    const truncateQuery = `
      TRUNCATE TABLE 
        "cart_items",
        "delivery_logs",
        "payments",
        "orders",
        "users"
      CASCADE;
    `;

    await client.query(truncateQuery);
    console.log("✅ Banco limpo com sucesso!");
    console.log("");
    console.log("📊 Tabelas vazias:");
    console.log("  - users");
    console.log("  - products (mantida)");
    console.log("  - orders");
    console.log("  - payments");
    console.log("  - delivery_logs");
    console.log("  - cart_items");

    await client.end();
  } catch (error) {
    console.error("❌ Erro ao limpar banco:");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
})();
