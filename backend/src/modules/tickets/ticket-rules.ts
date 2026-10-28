import { z } from "zod";

export const ticketType = z.enum(["INC", "REQ"]);
export const ticketCategory = z.enum(["ACESSO", "REDE_VPN", "HARDWARE", "SOFTWARE", "EMAIL", "OUTROS"]);
export const ticketPriority = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
export const affectedScope = z.enum(["SELF", "TEAM", "COMPANY", "UNKNOWN"]);
export const ticketStatus = z.enum(["OPEN", "WAITING_ANALYST", "IN_PROGRESS", "APPROVED", "RESOLVED", "CLOSED"]);

export const ticketInput = z.object({
  title: z.string().trim().min(5).max(160),
  description: z.string().trim().min(10).max(10000),
  type: ticketType,
  category: ticketCategory,
  priority: ticketPriority,
  affectedScope,
  affectedId: z.string().uuid().optional(),
});

export const ticketPatch = ticketInput.partial().refine(
  (fields) => Object.keys(fields).length > 0, "Informe pelo menos um campo",
);
export type TicketInput = z.infer<typeof ticketInput>;
export type TicketPatch = z.infer<typeof ticketPatch>;

export function normalizeTitle(title: string): string {
  return title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

/** Simple deterministic duplicate guard; semantic matching belongs to a later agent feature. */
export function isDuplicate(a: { title: string; category: string; type: string }, b: typeof a): boolean {
  return a.category === b.category && a.type === b.type && normalizeTitle(a.title) === normalizeTitle(b.title);
}

export function canReopen(resolvedAt: Date | null, now: Date): boolean {
  return resolvedAt !== null && resolvedAt.getTime() <= now.getTime()
    && now.getTime() - resolvedAt.getTime() <= 7 * 24 * 60 * 60 * 1000;
}
