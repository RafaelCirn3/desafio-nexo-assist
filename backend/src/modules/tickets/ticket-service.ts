import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { ticketInput, ticketPatch, isDuplicate, canReopen, ticketStatus, type TicketInput, type TicketPatch } from "./ticket-rules.js";
import { calculateDueAt, isOverdue } from "./sla.js";

export class TicketError extends Error {
  constructor(public readonly code: "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "INVALID", message: string) {
    super(message);
    this.name = "TicketError";
  }
}

export class TicketService {
  constructor(private readonly db: PrismaClient, private readonly now: () => Date = () => new Date()) {}

  private async ensureOwner(ownerId: string) {
    const owner = await this.db.employee.findUnique({ where: { id: ownerId } });
    if (!owner || !owner.active) throw new TicketError("FORBIDDEN", "Funcionário inexistente ou inativo");
  }

  async listMine(ownerId: string) {
    await this.ensureOwner(ownerId);
    const items = await this.db.ticket.findMany({ where: { ownerId }, orderBy: { lastUpdatedAt: "desc" } });
    return items.map((ticket) => ({ ...ticket, overdue: !["RESOLVED", "CLOSED"].includes(ticket.status) && isOverdue(ticket.dueAt, this.now()) }));
  }

  async getMine(ownerId: string, ticketId: string) {
    await this.ensureOwner(ownerId);
    const ticket = await this.db.ticket.findFirst({ where: { id: ticketId, ownerId } });
    if (!ticket) throw new TicketError("NOT_FOUND", "Chamado não encontrado");
    return { ...ticket, overdue: !["RESOLVED", "CLOSED"].includes(ticket.status) && isOverdue(ticket.dueAt, this.now()) };
  }

  /** Returns candidate only; never exposes another employee's tickets. */
  async findDuplicate(ownerId: string, input: TicketInput) {
    await this.ensureOwner(ownerId);
    const candidates = await this.db.ticket.findMany({
      where: { ownerId, type: input.type, category: input.category, status: { notIn: ["RESOLVED", "CLOSED"] } },
    });
    return candidates.find((ticket) => isDuplicate(ticket, input)) ?? null;
  }

  /** All writes require a previously confirmed draft. Agent must not call this directly. */
  async confirmDraft(ownerId: string, draftId: string) {
    await this.ensureOwner(ownerId);
    return this.db.$transaction(async (tx) => {
      const draft = await tx.ticketDraft.findFirst({
        where: { id: draftId, conversation: { employeeId: ownerId } },
        include: { conversation: true },
      });
      if (!draft) throw new TicketError("NOT_FOUND", "Rascunho não encontrado");
      if (draft.state !== "PENDING") throw new TicketError("CONFLICT", "Rascunho já processado");
      if (draft.conversation.state !== "AGENT") throw new TicketError("CONFLICT", "Conversa indisponível para o agent");
      const input = ticketInput.parse({
        title: draft.title, description: draft.description, type: draft.type,
        category: draft.category, priority: draft.priority,
        affectedScope: draft.affectedScope, ...(draft.affectedId ? { affectedId: draft.affectedId } : {}),
      });
      const at = this.now();
      if (input.affectedId) {
        const affected = await tx.employee.findFirst({ where: { id: input.affectedId, active: true } });
        if (!affected) throw new TicketError("INVALID", "Funcionário afetado inválido");
      }
      let ticket;
      if (draft.operation === "CREATE") {
        const others = await tx.ticket.findMany({ where: { ownerId, category: input.category, type: input.type, status: { notIn: ["RESOLVED", "CLOSED"] } } });
        const duplicate = others.find((item) => isDuplicate(item, input));
        if (duplicate) throw new TicketError("CONFLICT", "Chamado semelhante já está aberto; atualize o existente");
        ticket = await tx.ticket.create({ data: {
          ...input, ownerId, conversationId: draft.conversationId,
          reference: `${input.type}-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
          dueAt: calculateDueAt(input.priority, at), lastUpdatedAt: at,
        } });
        await tx.ticketEvent.create({ data: { ticketId: ticket.id, actorId: ownerId, eventType: "CREATED" } });
      } else {
        if (!draft.existingTicketId) throw new TicketError("INVALID", "Chamado de destino obrigatório");
        const existing = await tx.ticket.findFirst({ where: { id: draft.existingTicketId, ownerId } });
        if (!existing) throw new TicketError("NOT_FOUND", "Chamado não encontrado");
        if (draft.operation === "REOPEN" && (!["RESOLVED", "CLOSED"].includes(existing.status) || !canReopen(existing.resolvedAt, at))) {
          throw new TicketError("CONFLICT", "Prazo de reabertura expirado");
        }
        if (draft.operation === "UPDATE" && ["RESOLVED", "CLOSED"].includes(existing.status)) {
          throw new TicketError("CONFLICT", "Chamado encerrado; solicite reabertura");
        }
        ticket = await tx.ticket.update({ where: { id: existing.id }, data: {
          ...input, lastUpdatedAt: at, dueAt: calculateDueAt(input.priority, at),
          ...(draft.operation === "REOPEN" ? { status: "OPEN", resolvedAt: null, reopenedAt: at } : {}),
        } });
        await tx.ticketEvent.create({ data: { ticketId: ticket.id, actorId: ownerId, eventType: draft.operation === "REOPEN" ? "REOPENED" : "UPDATED" } });
      }
      await tx.ticketDraft.update({ where: { id: draft.id }, data: { state: "CONFIRMED", confirmedAt: at } });
      return ticket;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async prepareDraft(ownerId: string, conversationId: string, rawInput: unknown, existingTicketId?: string, operation: "CREATE" | "UPDATE" | "REOPEN" = "CREATE") {
    await this.ensureOwner(ownerId);
    const input = ticketInput.parse(rawInput);
    const conversation = await this.db.conversation.findFirst({ where: { id: conversationId, employeeId: ownerId, state: "AGENT" } });
    if (!conversation) throw new TicketError("NOT_FOUND", "Conversa ativa não encontrada");
    if (operation !== "CREATE" && !existingTicketId) throw new TicketError("INVALID", "Chamado obrigatório");
    if (operation === "CREATE" && existingTicketId) throw new TicketError("INVALID", "Criação não recebe chamado existente");
    if (existingTicketId) await this.getMine(ownerId, existingTicketId);
    if (operation === "CREATE" && await this.findDuplicate(ownerId, input)) throw new TicketError("CONFLICT", "Já existe chamado aberto com o mesmo título e categoria");
    return this.db.ticketDraft.create({ data: {
      ...input, conversationId, operation, ...(existingTicketId ? { existingTicketId } : {}),
    } });
  }
}
