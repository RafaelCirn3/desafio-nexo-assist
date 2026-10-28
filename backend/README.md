# Nexo Assist — backend

Fundação do serviço de atendimento do desafio Nexo Assist. O primeiro commit implementa **somente a configuração e os modelos persistentes**, sem fingir que o agent ou o fluxo de chamados estão operacionais.

## Rodar localmente

Requer Node.js 20+ e npm.

```bash
cd backend
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run dev
```

Health check: `GET http://localhost:3333/health`. O SQLite fica em `backend/prisma/dev.db`, persistindo entre reinicializações; o banco e chaves não devem ser versionados.

## Decisões de arquitetura

- **TypeScript estrito + Fastify**: API HTTP independente do frontend e do agent.
- **Prisma + SQLite**: persistência relacional com zero infraestrutura para avaliação local. Para produção, pode-se migrar para PostgreSQL.
- **Serviço de chamados separado do agent**: regras, autorização e transições devem viver no serviço determinístico, nunca apenas no prompt do modelo.
- **Mastra** (próxima etapa): orquestração do agent. Provedor/modelo LLM ainda não implementados nem selecionados; serão justificados quando a integração for construída.
- **Decisões auditáveis**: `AgentDecision` registra intenção, ação, confiança, explicação e resultado (sem segredos nos logs).
- **Handoff explícito**: `Conversation.state` controla AGENT/WAITING_ANALYST/ANALYST/CLOSED; respostas do agent devem ser recusadas fora de AGENT.
- **Confirmação**: `TicketDraft` representa CREATE/UPDATE/REOPEN antes de qualquer mutação de chamado.
- **Isolamento**: `Ticket.ownerId` é a origem das verificações de acesso; toda consulta será escopada pelo usuário autenticado.

## Regras a implementar na próxima etapa

- Autenticação de funcionários de demonstração (qualquer senha, **somente no ambiente de desafio**), autenticação/autorização de analistas.
- Limite de 30 mensagens **por sessão**, aplicado atomicamente no serviço.
- Catálogo de categorias, distinção INC/REQ e prioridade por impacto + urgência; horário útil e feriados definidos explicitamente na lógica de SLA.
- Prazos: crítica 1h, alta 4 horas úteis, média 3 dias úteis, baixa 5 dias úteis. Vencimento considera a última atualização do chamado.
- Busca de duplicados, reabertura de resolvidos em até 7 dias, confirmação obrigatória e API legada simulada com indisponibilidade transitória.
- Central de ajuda com 5–10 artigos, fixtures de funcionários e chamados variados.
- Fluxo de atendimento humano com pausas, retomadas, histórico e testes de concorrência/privacidade.

## Convenções de desenvolvimento

Branches `feat/<escopo>`, `fix/<escopo>`, `test/<escopo>`; commits no padrão Conventional Commits (`feat(backend): ...`). Pull requests pequenos contra `main`; jamais commitar `.env` real ou o banco SQLite.

## Design

O protótipo `nexo.pen` contém login, abertura e consulta de chamados, console N1/N2, atendimento assumido e perfil. Os campos persistidos suportam os estados visuais e a explicabilidade exigida pelo PRD v5. Números promocionais exibidos no protótipo são ilustrativos.
