import { Client } from "pg";
import fs from "node:fs";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node scripts/run-migration.mjs <sql-file>");
    process.exit(1);
  }
  const sql = fs.readFileSync(file, "utf8");
  const client = new Client({
    host: process.env.PGHOST || "db.lomxkkqhurimmxmtgckm.supabase.co",
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || "postgres",
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("Connecte a PostgreSQL.");
  await client.query(sql);
  console.log("Migration executee :", file);
  await client.end();
}

main().catch((err) => {
  console.error("Erreur :", err.message);
  process.exit(1);
});