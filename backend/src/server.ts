import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./db/client.js";

const app = await buildApp();

const shutdown = async () => {
  await app.close();
  await prisma.$disconnect();
};
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

try {
  await prisma.$connect();
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (error) {
  app.log.error(error);
  await shutdown();
  process.exitCode = 1;
}
