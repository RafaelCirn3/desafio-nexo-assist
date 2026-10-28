import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./config/env.js";

export async function buildApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: env.CORS_ORIGIN });
  app.get("/health", async () => ({ status: "ok", service: "nexo-assist-backend" }));
  return app;
}
