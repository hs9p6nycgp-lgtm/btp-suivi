import { Client } from "pg";

const password = process.env.PGPASSWORD;
const regions = [
  "eu-central-1",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "ap-southeast-1",
  "ap-northeast-1",
  "sa-east-1",
];
const ports = [5432, 6543];

async function tryOne(host, port) {
  const client = new Client({
    host,
    port,
    database: "postgres",
    user: "postgres.lomxkkqhurimmxmtgckm",
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });
  try {
    await client.connect();
    const r = await client.query("select 1 as ok");
    await client.end();
    return { ok: true, result: r.rows };
  } catch (e) {
    try { await client.end(); } catch {}
    return { ok: false, error: e.message };
  }
}

async function main() {
  for (const port of ports) {
    for (const region of regions) {
      const host = `aws-0-${region}.pooler.supabase.com`;
      process.stdout.write(`Essai ${host}:${port} ... `);
      const res = await tryOne(host, port);
      console.log(res.ok ? "OK" : res.error);
      if (res.ok) {
        console.log(`\nPOOLER TROUVE: host=${host} port=${port}`);
        process.exit(0);
      }
    }
  }
  console.log("\nAucun pooler fonctionne avec project ref.");
  process.exit(1);
}

main();