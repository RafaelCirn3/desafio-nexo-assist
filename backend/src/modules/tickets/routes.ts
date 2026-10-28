import type { FastifyInstance } from "fastify";
import { prisma } from "../../db/client.js";
import { requireIdentity } from "../auth/session.js";
import { TicketService } from "./ticket-service.js";
import { z } from "zod";

const idParams = z.object({ id: z.string().uuid() });
const service = new TicketService(prisma);
export async function ticketRoutes(app: FastifyInstance) {
  app.get("/tickets", async (request) => service.listMine(requireIdentity(request).id));
  app.get("/tickets/:id", async (request) => {
    const { id } = idParams.parse(request.params);
    return service.getMine(requireIdentity(request).id, id);
  });
  // Ticket mutations remain behind the confirmation workflow, which is not an HTTP endpoint yet.
}
