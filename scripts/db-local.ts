/**
 * Starts a real PostgreSQL server for local development without Docker or a system install.
 * Data lives in .local/pg (git-ignored). Keep this process running while you develop.
 *
 *   npm run db:local
 *
 * Connection: postgresql://borrowly:borrowly@localhost:5433/borrowly
 * If you already run PostgreSQL (or Supabase), skip this and set DATABASE_URL instead.
 */
import fs from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const PORT = Number(process.env.LOCAL_PG_PORT ?? 5433);
const dir = path.resolve(__dirname, "..", ".local", "pg");

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: dir,
    user: "borrowly",
    password: "borrowly",
    port: PORT,
    persistent: true,
    onLog: () => {},
  });

  if (!fs.existsSync(path.join(dir, "PG_VERSION"))) {
    console.log("Initialising local PostgreSQL cluster in .local/pg …");
    await pg.initialise();
  }
  await pg.start();
  for (const name of ["borrowly", "borrowly_e2e"]) {
    await pg.createDatabase(name).catch(() => {});
  }
  console.log(`PostgreSQL ready on port ${PORT} (databases: borrowly, borrowly_e2e). Ctrl+C to stop.`);

  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  setInterval(() => {}, 1 << 30);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
