import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/client.js";
import { env } from "../../config/env.js";
import { issueToken, requireIdentity, roles, AuthError } from "./session.js";

const loginSchema = z.object({ email: z.string().trim().email().transform(v => v.toLowerCase()), password: z.string().min(1) });

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (request, reply) => {
    if (env.DEMO_AUTH_ENABLED !== true) throw new AuthError(403, "Login de demonstração desabilitado");
    const input = loginSchema.parse(request.body);
    // Intentionally any non-empty password for seeded employees, as required by the PRD.
    const employee = await prisma.employee.findUnique({ where: { email: input.email } });
    if (!employee?.active) throw new AuthError(401, "Credenciais inválidas");
    const role = roles.parse(employee.role);
    const identity = { id: employee.id, email: employee.email, role };
    return reply.send({ accessToken: issueToken(identity), tokenType: "Bearer", expiresIn: 8 * 3600, user: { id: employee.id, name: employee.name, email: employee.email, role } });
  });

  app.get("/auth/me", async (request) => {
    const identity = requireIdentity(request);
    const user = await prisma.employee.findUnique({ where: { id: identity.id } });
    if (!user?.active || user.role !== identity.role || user.email !== identity.email) throw new AuthError(401, "Sessão revogada");
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  });
}
