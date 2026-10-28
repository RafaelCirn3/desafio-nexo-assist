import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { z } from "zod";
import { env } from "../../config/env.js";

export const roles = z.enum(["EMPLOYEE", "ANALYST_N1", "ANALYST_N2"]);
export type Role = z.infer<typeof roles>;
export type Identity = { id: string; role: Role; email: string };
export class AuthError extends Error {
  constructor(public readonly statusCode: 401 | 403, message: string) { super(message); }
}
const payloadSchema = z.object({
  sub: z.string().uuid(), role: roles, email: z.string().email(), exp: z.number().int(), ver: z.literal(1),
});
function b64(value: string | Buffer) { return Buffer.from(value).toString("base64url"); }
function signature(data: string) { return createHmac("sha256", env.AUTH_SECRET).update(data).digest(); }
export function issueToken(identity: Identity, at = Date.now()): string {
  const payload = b64(JSON.stringify({ sub: identity.id, role: identity.role, email: identity.email, exp: Math.floor(at / 1000) + 8 * 3600, ver: 1 }));
  return `${payload}.${b64(signature(payload))}`;
}
export function verifyToken(token: string, at = Date.now()): Identity {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new AuthError(401, "Sessão inválida");
  const expected = signature(parts[0]);
  let given: Buffer;
  try { given = Buffer.from(parts[1], "base64url"); } catch { throw new AuthError(401, "Sessão inválida"); }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new AuthError(401, "Sessão inválida");
  let parsed: unknown;
  try { parsed = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")); } catch { throw new AuthError(401, "Sessão inválida"); }
  const result = payloadSchema.safeParse(parsed);
  if (!result.success || result.data.exp <= Math.floor(at / 1000)) throw new AuthError(401, "Sessão expirada ou inválida");
  return { id: result.data.sub, role: result.data.role, email: result.data.email };
}
export function requireIdentity(request: FastifyRequest): Identity {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new AuthError(401, "Autenticação obrigatória");
  return verifyToken(header.slice(7));
}
export function requireAnalyst(identity: Identity): void {
  if (identity.role !== "ANALYST_N1" && identity.role !== "ANALYST_N2") throw new AuthError(403, "Acesso restrito aos analistas");
}
export function requireOwner(identity: Identity, ownerId: string): void {
  if (identity.id !== ownerId) throw new AuthError(403, "Acesso negado ao recurso de outro funcionário");
}
