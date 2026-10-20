import { env } from "./env.js";
import { prisma } from "./db.js";
import { createApp } from "./app.js";

await prisma.$connect().catch((err) => {
  console.error("Cannot reach the database:", err.message);
  process.exit(1);
});

const server = createApp().listen(env.PORT, () => {
  console.log(`API on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
