// local postgres for development (data in server/.pgdata), stop with ctrl+c
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";
import net from "node:net";

const dataDir = path.resolve(import.meta.dirname, "../.pgdata");

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "admin",
  password: "example",
  port: 54329,
  persistent: true,
});

// already running (another terminal, or left over): nothing to do
const busy = await new Promise<boolean>((resolve) => {
  const socket = net.connect(54329, "127.0.0.1");
  socket.once("connect", () => (socket.destroy(), resolve(true)));
  socket.once("error", () => resolve(false));
});
if (busy) {
  console.log("Postgres is already running on localhost:54329. To stop it: kill -INT $(lsof -ti tcp:54329 -sTCP:LISTEN)");
  process.exit(0);
}

if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
  console.log("Creating the local cluster in", dataDir);
  await pg.initialise();
}
await pg.start();
try {
  await pg.createDatabase("rezervariCamin");
  console.log("Created database rezervariCamin");
} catch {
  // already exists
}
console.log("Postgres on localhost:54329, database rezervariCamin. Ctrl+C to stop.");

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
