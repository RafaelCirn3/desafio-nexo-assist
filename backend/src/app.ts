import Fastify from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { AuthError } from "./modules/auth/session.js";
import { TicketError } from "./modules/tickets/ticket-service.js";
import { authRoutes } from "./modules/auth/routes.js";
import { ticketRoutes } from "./modules/tickets/routes.js";

export async function buildApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: env.CORS_ORIGIN });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) return reply.code(400).send({ error: "VALIDATION_ERROR", details: error.issues });
    if (error instanceof AuthError) return reply.code(error.statusCode).send({ error: "AUTH_ERROR", message: error.message });
    if (error instanceof TicketError) {
      const codes = { NOT_FOUND: 404, FORBIDDEN: 403, CONFLICT: 409, INVALID: 400 } as const;
      return reply.code(codes[error.code]).send({ error: error.code, message: error.message });
    }
    app.log.error(error);
    return reply.code(500).send({ error: "INTERNAL_ERROR" });
  });
  app.get("/health", async () => ({ status: "ok", service: "nexo-assist-backend" }));
  await app.register(authRoutes);
  await app.register(ticketRoutes);
  return app;
}
