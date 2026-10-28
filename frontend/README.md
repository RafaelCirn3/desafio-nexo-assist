# Nexo Assist — frontend (Pencil)

React 19 + TypeScript estrito + Vite. Primeira etapa da interface, em branch exclusiva `feat/frontend-pencil`, com base nas seis telas do `nexo.pen` e no PRD v5.

## Execução
Em um terminal, inicie o backend a partir de `backend/` seguindo seu README, configure `.env` e rode `npm run db:generate && npm run db:push && npm run db:seed && npm run dev`.

Em outro terminal:
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Abra http://localhost:5173. Credenciais demonstrativas: `ana.martins@nexo.example` e qualquer senha não vazia. O backend exige `DEMO_AUTH_ENABLED=true` em desenvolvimento.

## Escopo implementado
- Layout de identificação responsivo baseado no Pencil.
- Login real via `POST /auth/login`, conferência de sessão via `GET /auth/me`; token só em memória (recarregar exige novo login).
- Shell autenticado, navegação de atendimento/perfil/console (somente analistas), consulta privada via `GET /tickets`.
- Estados de erro, carregamento e lista vazia.

## Não implementado ainda
- Mensagens do chat são **apenas demonstração local**, sem persistência nem agent; interface sinaliza isso.
- Abertura, alteração, confirmação de rascunho, transferência e atendimento humano dependem dos endpoints e da integração Mastra.
- Dados promocionais de 8s/72%/6 analistas do Pencil são **ilustrativos**, não métricas reais.
- O controle de sessão ainda usa token em memória; produção deve considerar cookie HttpOnly e autenticação real.

## Separação de PRs
Este PR modifica somente `frontend/`. Alterações de API e serviço são feitas em PRs próprios de backend para `main`.
