# OZION — Project Handoff Master

> **Data:** 2026-06-22
> **Propósito:** Documento mestre de transição para qualquer nova IA, novo dev ou novo ambiente continuar exatamente de onde paramos.
> **Projeto:** Ozion Chat AI — SaaS de WhatsApp CRM com AI Agents

---

## 1. Visão Geral do Produto

### O que é
Ozion é um SaaS multi-tenant de CRM omnichannel com foco em WhatsApp, automatizado por AI Agents. Permite que empresas conectem números de WhatsApp (via Meta Cloud API ou Evolution API), gerenciem conversas em um Inbox unificado, automatizem respostas com Flow Builder + IA, e vejam analytics.

### Objetivo Final
Ser uma plataforma completa de gestão de conversas e automação, similar a Umbler/Lailla/ManyChat, mas com motor próprio e integração direta com provedores de WhatsApp.

### Roadmap de Produto (ordem de prioridade)
1. ✅ **WhatsApp oficial rodando** — webhook Meta funcionando, mensagens recebidas e enviadas
2. 🔄 **CRM** — Inbox, contatos, timeline, notas, tarefas
3. ❌ **Flow Builder** — automações visuais com nós lógicos e IA
4. ❌ **Chatbot IA** — atendimento automático com contexto multi-turno
5. ❌ **Campanhas** — disparo em massa com tracking
6. ❌ **Voice** — integração de áudio/TTS (já tem ElevenLabs)
7. ❌ **Tracking & Analytics** — métricas reais de conversão

### Stack Resumida
| Camada | Tecnologia |
|--------|-----------|
| Runtime | Node.js 22 + TypeScript |
| Backend | Express.js (server/ + api/index.ts) |
| Frontend | Vanilla JS SPA (public/js/ozion.js, 4700+ linhas) |
| Banco Prod. | Supabase PostgreSQL |
| Banco Local | SQLite (data/ozion.db) |
| ORM | Drizzle ORM |
| Tempo Real | Socket.io |
| Deploy | Vercel (serverless entrypoint) |
| Auth | JWT + bcrypt |
| IA | Groq, OpenAI, DeepSeek |
| TTS | ElevenLabs |

---

## 2. Estado Atual do Projeto

### Estrutura de Pastas
```
/Users/natanmacedo/Documents/opencode/
├── ozion-chat-ai/          ← PROJETO NOVO CORRETO (Express + SPA)
│   ├── api/index.ts        ← Entrypoint serverless Vercel
│   ├── server/             ← Express app, rotas, serviços, db
│   ├── public/             ← SPA frontend (HTML/CSS/JS)
│   └── .vercel/            ← Link Vercel (projeto certo)
│
├── ozion-deploy/           ← PROJETO ANTIGO (Next.js com App Router)
│   ├── src/                ← Next.js pages e componentes
│   ├── next.config.ts
│   └── runbook files       ← META runbooks (PDF, docs)
│
└── ozion-chat-ai/.worktrees/
    └── crm-contatos-historico/  ← Git worktree com feature branch
```

### Projeto Novo (CORRETO) — `ozion-chat-ai/`
- **Branch:** `main`
- **Commit:** `2c87fe2` — "fix: server startup hang (Supabase timeout) + webhook verify token fallback + rawBody api entry"
- **Stack:** Express.js + TypeScript + Vanilla JS SPA
- **Deploy:** Vercel (produção: `app.mdii.com.br`)
- **Arquivos que provam que é o projeto certo:**
  - `api/index.ts` — entrypoint serverless Vercel (71 linhas, Express completo)
  - `server/index.ts` — entrypoint dev local
  - `server/routes/webhooks.ts` — webhook handler
  - `server/routes/inbox.ts` — Inbox MVP
  - `server/routes/crm.ts` — CRUD multi-tenant
  - `server/routes/chat.ts` — chat messaging
  - `server/routes/messages.ts` — mensagens
  - `server/db/supabase.ts` — Supabase client lazy
  - `vercel.json` — config Express+SPA (`framework: null`)
  - `public/js/ozion.js` — SPA principal (4700+ linhas)
  - `public/css/ozion.css` — tema dark com accent verde (`#00b894`)

### Projeto Antigo (RUIM) — `ozion-deploy/`
- **Stack:** Next.js 14 com App Router
- **Tema:** Roxo/púrpura
- **Entrypoint:** `next.config.ts`, sem `api/index.ts`
- **Destino:** Apenas documentação/referência — NÃO usar para deploy
- **Pode ser deletado ou arquivado após confirmação**

### Git Worktree
- `.worktrees/crm-contatos-historico/` — branch `feature/crm-contatos-historico`
- Último commit: `09ce3a2` — "feat: add contact timeline primitives"
- Tem mudanças não commitadas (schema, serviços, vercel.json)
- **Essas mudanças JÁ foram copiadas para main e deployadas**

---

## 3. Arquitetura Atual

### Frontend
- **SPA vanilla JS** em `public/js/ozion.js` (~4700 linhas)
- Sem framework (React/Vue) — HTML gerado por template strings JS
- CSS em `public/css/ozion.css` (~550 linhas) — tema dark com accent verde
- Ícones: Font Awesome 6
- Tempo real: Socket.io (`https://cdn.socket.io/4.7.5/socket.io.min.js`)
- PWA: `public/sw.js`

### Backend (Express.js)
- **Dev:** `server/index.ts` — sobe Express local na porta 3000
- **Prod:** `api/index.ts` — entrypoint Vercel serverless
- Rotas em `server/routes/`:
  - `webhooks.ts` — WhatsApp webhook
  - `inbox.ts` — Inbox MVP
  - `crm.ts` — CRUD multi-tenant
  - `chat.ts` — mensagens de chat
  - `messages.ts` — mensagens
  - `flows.ts` — Flow Builder
  - `auth.ts` — autenticação
  - `tenants.ts` — gerenciamento tenants
  - `settings.ts` — configurações
- Services em `server/services/`:
  - `provider.ts` — abstração de provedores WhatsApp
  - `meta-provider.ts` — provider Meta Cloud API
  - `evolution-provider.ts` — provider Evolution API
  - `contact-timeline.ts` — timeline de contatos
  - `media-service.ts` — mídia
  - `evolution.ts` — Evolution API
- DB em `server/db/`:
  - `supabase.ts` — cliente Supabase (lazy init)
  - `schema.ts` — schema SQLite (Drizzle)
  - `schema-deploy.ts` — schema deploy SQLite
- Middleware em `server/middleware/`:
  - `auth.ts` — JWT auth (lazy JWT_SECRET)

### Vercel
- Projeto: `prj_zNe9SRq0f1bj8Z1kjAdmvpcaaSil` (ozion-chat-ai)
- Link: `.vercel/project.json` aponta para o projeto correto
- Produção: `app.mdii.com.br` (aliased)
- Config: `vercel.json` com `framework: null`, `outputDirectory: public`
- Envs em Vercel: Production com `SUPABASE_URL`, `JWT_SECRET`, etc.
- Preview: branches `staging` e `development` com envs próprias

### Supabase
- URL: `https://bmeklofqobhrmxlvzify.supabase.co`
- Tabelas principais: `tenants`, `users`, `conversations`, `messages`, `contacts`, `flows`, `webhook_events`, `message_status_events`, `media_files`, `contact_events`
- Schema SQL em `migrations/`

### Fluxo de Mensagem (Webhook → Inbox)
```
Meta/Evolution → POST /api/webhooks/whatsapp → valida HMAC → normaliza → 
  → save webhook_event (idempotência) → save message → 
  → atualiza conversation → emite Socket.io → aparece no Inbox
```

### Fluxo de Envio (Inbox → Provedor)
```
Painel → POST /api/chat/send → getProviderForTenant(tenantId) →
  → sendByProvider → MetaMessageProvider.sendText() / EvolutionMessageProvider.sendText()
```

---

## 4. Fases Já Feitas

### Fase 1 — Correções Críticas
- ✅ Crypto imports (corrigido `crypto` → `node:crypto`)
- ✅ Cross-tenant leak (filtro por `tenant_id` em queries)
- ✅ Webhook signature (HMAC SHA256 validação)
- ✅ Tags tenant (`x-tenant-id` header + fallback)

### Fase 2 — Provider Abstraction
- ✅ `MessageProvider` interface
- ✅ `MetaMessageProvider` — implementação Meta Cloud API
- ✅ `EvolutionMessageProvider` — implementação Evolution API
- ✅ `getProviderForTenant(tenantId)` — factory
- ✅ `sendByProvider` — dispatch unificado

### Fase 3 — Webhook Events + Idempotência
- ✅ `webhook_events` table
- ✅ Idempotência (duplicate skip por `message_id`)
- ✅ Status: `processing` → `processed` → `failed`

### Fase 4 — Normalizadores + Status History
- ✅ Normalizers Meta/Evolution
- ✅ `NormalizedMessage`, `NormalizedStatusUpdate`
- ✅ `message_status_events` table
- ✅ `failed_at`, `error_message` colunas

### Fase 5 — Media Library + Contact Events
- ✅ `media_files` table
- ✅ `contact_events` table
- ✅ `extractMediaInfo` helper
- ✅ `first_message` event tracking

### Fase 6 — Inbox Real MVP
- ✅ `server/routes/inbox.ts`
- ✅ Inbox 3 colunas (conversas, mensagens, detalhes)
- ✅ Lista de `conversations`
- ✅ Mensagens por conversa
- ✅ Contact detail panel
- ✅ Envio via `sendByProvider`

### Fase 7 — WhatsApp Connections
- ✅ Settings → Canais (UI)
- ✅ Página `/whatsapp`
- ✅ Cards: Meta, Evolution, Webhook
- ✅ `EvolutionService` — QR Code, status
- ✅ Test Message
- ✅ Webhook URL display
- ✅ Tokens protegidos (input type password)

### Meta Official API Audit
- ✅ GET webhook challenge (`hub.mode`, `hub.verify_token`, `hub.challenge`)
- ✅ POST webhook handler
- ✅ HMAC signature validation
- ✅ Runbook (`META_OFFICIAL_REAL_TEST_RUNBOOK.md`)
- ✅ Testes curl locais
- ✅ Envs mapeadas

---

## 5. Estado dos Testes

### Suítes Existentes
```
tests/
├── contact-timeline.test.ts    — Timeline service (passando)
├── provider.test.ts            — Provider abstraction (passando)
├── normalizer.test.ts          — Normalizers (passando)
├── webhook.test.ts             — Webhook handler (passando)
└── ...
```

### Frameworks
- **Test runner:** Node.js built-in (`node --test`)
- **Mocking:** `mock.module` (ESM mocking)
- **Runner:** `node --test --import tsx tests/<file>.test.ts`
- **Build:** `tsc` (type-check only, `noEmit: true`)

### Erros Conhecidos
- Build local `tsc` demora (+60s) — Vercel faz build próprio
- `@ts-nocheck` em 21 arquivos — type safety comprometida
- `strict: false` no tsconfig

---

## 6. Arquivos Importantes

| Arquivo | Função |
|---------|--------|
| `api/index.ts` | Entrypoint Vercel serverless — monta Express, importa rotas |
| `server/index.ts` | Entrypoint dev local — sobe servidor na porta 3000 |
| `server/routes/webhooks.ts` | Webhook WhatsApp (GET challenge + POST mensagens) |
| `server/routes/inbox.ts` | Inbox MVP — conversas, mensagens, envio |
| `server/routes/crm.ts` | CRUD multi-tenant (contatos, notas, etc) |
| `server/routes/chat.ts` | Envio de mensagens pelo Inbox |
| `server/routes/flows.ts` | Flow Builder CRUD + analytics |
| `server/middleware/auth.ts` | JWT auth middleware |
| `server/db/supabase.ts` | Supabase client (lazy init — só falha se usado) |
| `server/db/schema.ts` | Drizzle schema SQLite |
| `server/services/provider.ts` | Factory de provedores WhatsApp |
| `server/services/meta-provider.ts` | Provider Meta Cloud API |
| `server/services/evolution-provider.ts` | Provider Evolution API |
| `server/services/contact-timeline.ts` | Timeline de contatos |
| `server/services/evolution.ts` | Evolution API service |
| `server/lib/encryption.ts` | Encryption helper |
| `public/js/ozion.js` | SPA principal (~4700 linhas) |
| `public/css/ozion.css` | Tema dark verde |
| `vercel.json` | Config Vercel Express+SPA |
| `META_OFFICIAL_REAL_TEST_RUNBOOK.md` | Runbook Meta oficial |
| `META_OFFICIAL_API_SETUP_CHECKLIST.md` | Checklist Meta |
| `WHATSAPP_CONNECTIONS_PHASE_7_VERIFICATION.md` | Verificação Fase 7 |
| `OZION_PROJECT_HANDOFF_MASTER.md` | **← Este documento** |

---

## 7. Deploy e Git

### Estado Git
| Item | Valor |
|------|-------|
| Branch atual | `main` |
| Último commit local | `2c87fe2` |
| Último commit remoto | `aacb884` (ORIGINAL — **ANTIGO!**) |
| Branch development | `aacb884` (v1.0.0 antigo) |
| Branch staging | `aacb884` (v1.0.0 antigo) |
| Branch feature/crm-contatos-historico | `09ce3a2` + uncommitted changes |

### ⚠️ ATENÇÃO: Divergência Git
- `origin/main` está em `aacb884` (código antigo)
- `local/main` está em `2c87fe2` (código novo)
- **Push direto para origin/main vai dar conflito**
- **OPÇÃO SEGURA:** Fazer merge ou force push APENAS após confirmar que produção está correta

### Vercel
- Projeto linkado corretamente: `.vercel/project.json` → `prj_zNe9SRq0f1bj8Z1kjAdmvpcaaSil`
- Produção aliased: `app.mdii.com.br`
- Deploy feito via `npx vercel --prod` (NÃO via git push)
- Preview funcional: branches `staging` e `development` com envs

### Por que o deploy anterior subiu o projeto antigo
**Causa raiz:** `git reset --hard development` mudou `main` do commit correto `2c87fe2` para `aacb884` (código antigo do development). O Vercel deploy subsequente subiu o código errado.

**Fixes aplicados:**
1. `main` restaurado para `2c87fe2`
2. JS syntax error corrigido (`public/js/ozion.js` linha 2575-2576)
3. Lazy env vars em `supabase.ts` e `auth.ts`
4. Worktree code copiado para main e deployado

---

## 8. Meta API Oficial

### Webhook Path
- **Path:** `/api/webhooks/whatsapp`
- **Local:** `http://localhost:3000/api/webhooks/whatsapp`
- **Produção:** `https://app.mdii.com.br/api/webhooks/whatsapp`
- **Verbo GET:** Challenge (verificação Meta)
- **Verbo POST:** Recebimento de mensagens

### Envs Usadas (Meta)
| Env | Finalidade |
|-----|-----------|
| `META_APP_ID` ou `FACEBOOK_APP_ID` | App ID do App Meta |
| `META_APP_SECRET` ou `FACEBOOK_APP_SECRET` | App Secret |
| `WHATSAPP_APP_SECRET` | HMAC signature (verificação webhook) |
| `WEBHOOK_VERIFY_TOKEN` | Token de verificação do webhook |
| `META_SYSTEM_USER_ACCESS_TOKEN` | Token de sistema (long-lived) |
| `META_EMBEDDED_SIGNUP_CONFIGURATION_ID` | Config ID Embedded Signup |

### Como testar local
```bash
# Teste GET (challenge)
curl "http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=ozion-verify-token-123&hub.challenge=123456"

# Teste POST (mensagem simulada)
curl -X POST "http://localhost:3000/api/webhooks/whatsapp" \
  -H "Content-Type: application/json" \
  -d '{"object":"whatsapp_business_account","entry":[{"changes":[{"value":{"messages":[{"from":"5511999999999","id":"wamid.test","text":{"body":"Teste"},"type":"text","timestamp":"1700000000"}],"metadata":{"phone_number_id":"123456789"}}}]}]}'
```

### O que falta para conectar número oficial
1. Configurar webhook no painel Meta Developers → WhatsApp → Configuration
2. Configurar Embedded Signup (ou token manual)
3. Conectar número de telefone
4. Enviar mensagem template para aprovação
5. Testar recebimento de mensagem real

---

## 9. Envs

### Obrigatórias para local (`.env`)
| Env | Finalidade |
|-----|-----------|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Anon key do Supabase |
| `JWT_SECRET` | Chave para assinar tokens JWT |

### Meta
| Env | Finalidade |
|-----|-----------|
| `META_APP_ID` | App ID do Meta Developer |
| `META_APP_SECRET` | App Secret |
| `WHATSAPP_APP_SECRET` | Para HMAC signature |
| `WEBHOOK_VERIFY_TOKEN` | Token de verificação (qualquer string) |
| `META_SYSTEM_USER_ACCESS_TOKEN` | Token de acesso do sistema |
| `META_EMBEDDED_SIGNUP_CONFIGURATION_ID` | Config ID do Embedded Signup |

### Evolution
| Env | Finalidade |
|-----|-----------|
| `EVOLUTION_API_URL` | URL da instância Evolution |
| `EVOLUTION_API_KEY` | API Key da instância |

### IA
| Env | Finalidade |
|-----|-----------|
| `GROQ_API_KEY` | API Key Groq |
| `OPENAI_API_KEY` | API Key OpenAI |
| `DEEPSEEK_API_KEY` | API Key DeepSeek |

### Vercel
| Env | Finalidade |
|-----|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Fallback para SUPABASE_URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Fallback para SUPABASE_ANON_KEY |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (admin) |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Para bypass de automação |

> ⚠️ **Nunca colocar valor real de segredo em documentação.**

---

## 10. O que está funcionando

- ✅ Projeto local abre em `http://localhost:3000`
- ✅ Navegação visual completa (SPA)
- ✅ Settings → Canais (Evolution, Meta, Webhook)
- ✅ Página `/whatsapp`
- ✅ Webhook GET local (challenge)
- ✅ Webhook POST local (recebimento)
- ✅ Inbox MVP (conversas, mensagens, detalhes)
- ✅ Testes passando (timeline, provider, normalizer, webhook)
- ✅ Produção Vercel rodando (`app.mdii.com.br`)
- ✅ Preview Vercel funcional
- ✅ Envs lazy loading (não quebra sem env)
- ✅ Tema verde deployado

---

## 11. O que ainda NÃO está funcionando

- ❌ Meta real ainda depende de configuração no painel Meta Developers
- ❌ Webhook público precisa URL HTTPS configurada no Meta (já temos a URL)
- ❌ GitHub push/keychain pendente (macOS keychain timeout)
- ❌ `origin/main` remoto desatualizado (divergência local/remote)
- ❌ QR Code Evolution só funciona com instância Evolution configurada
- ❌ Flow Builder ainda não executa automações reais (só CRUD)
- ❌ Chatbot ainda não usa IA real para responder
- ❌ Automação não executa de ponta a ponta
- ❌ `@ts-nocheck` em 21 arquivos
- ❌ `strict: false` no tsconfig
- ❌ Multi-tenant leak potencial em 4 arquivos (header vs JWT)

---

## 12. Próximos Passos — Plano de Execução

### Curto Prazo (meta: WhatsApp oficial rodando)

| # | Passo | Detalhes |
|---|-------|----------|
| 1 | Confirmar projeto correto | Verificar que está em `ozion-chat-ai/` branch `main` |
| 2 | Git push | Resolver keychain, fazer push de `main` para `origin/main` |
| 3 | Preview deploy | `npx vercel --yes` (sem `--prod`) |
| 4 | Testar URL pública | `GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=...&hub.challenge=test` |
| 5 | Configurar webhook Meta | Developer Portal → WhatsApp → Webhook → inserir URL produção |
| 6 | Embedded Signup | Configurar no painel Meta |
| 7 | Conectar número oficial | No painel Meta ou Embedded Signup |
| 8 | Enviar template message | Aprovar template no Meta |
| 9 | Mensagem cair no Inbox | Testar recebimento real |
| 10 | Responder pelo painel | Testar envio pelo Inbox |

### Médio Prazo
- Habilitar Flow Builder como motor real
- Integrar IA nos fluxos (Groq/OpenAI/DeepSeek)
- Campanhas de disparo
- Analytics reais
- Melhorar type safety (remover `@ts-nocheck`, ativar `strict`)

---

## 13. Código Crítico

### Onde o server sobe (dev)
`server/index.ts` — Express app com todas as rotas, middleware, CORS, Socket.io

### Onde o entrypoint Vercel está
`api/index.ts` — Importa e exporta o Express app do server

### Onde webhook valida token
`server/routes/webhooks.ts` — `GET` handler verifica `hub.verify_token` contra `WEBHOOK_VERIFY_TOKEN`

### Onde HMAC é validado
`server/routes/webhooks.ts` — `POST` handler verifica `SHA256` signature com `WHATSAPP_APP_SECRET`

### Onde sendByProvider é chamado
`server/services/provider.ts` → `getProviderForTenant(tenantId)` → `provider.sendMessage()`

### Onde as rotas do Inbox estão
`server/routes/inbox.ts` — GET conversations, GET messages, POST send

### Onde Settings → Canais está
`public/js/ozion.js` — função `renderSettingsSection()` com as tabs de canais

### Onde a página /whatsapp está
`public/js/ozion.js` — seção de configuração WhatsApp dentro das settings

### Onde envs são lidas
- `server/db/supabase.ts` → `SUPABASE_URL` / `SUPABASE_ANON_KEY`
- `server/middleware/auth.ts` → `JWT_SECRET`
- `server/routes/webhooks.ts` → `WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`
- `server/services/provider.ts` → `META_APP_ID`, `META_APP_SECRET`
- `server/services/evolution.ts` → `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`

---

## 14. Regras Obrigatórias para Continuar Este Projeto

1. **Não criar provider UTalk** — UTalk/Umbler são apenas referência de produto
2. **Não depender de Umbler/UTalk** — zero dependência
3. **Não hardcodar token** — sempre usar env vars
4. **Não hardcodar tenant** — sempre respeitar multi-tenant (`req.user.tenant_id` ou `x-tenant-id`)
5. **Não fazer force push sem diagnóstico completo** — risco de sobrescrever código bom
6. **Não fazer deploy produção sem preview primeiro** — sempre testar preview
7. **Primeiro: deixar Meta oficial rodando** — prioridade #1
8. **Depois: Flow Builder** — motor de automação
9. **Depois: Chatbot** — IA conversacional
10. **Depois: Automações** — campanhas, tracking, voice
11. **Sempre preservar multi-tenant** — toda query deve filtrar por tenant
12. **Lazy env vars** — env var checks só dentro de funções, nunca em módulo load
13. **Se for editar CSS:** atualizar `--accent` + `--gradient` + hardcoded refs em JS
14. **Sempre copiar worktree changes** antes de deployar (verificar `.worktrees/`)

---

## 15. Arquivos Auxiliares

| Arquivo | Conteúdo |
|---------|----------|
| `CURRENT_CODEBASE_STATE.md` | Não criado (este documento cobre) |
| `DEPLOY_CORRECT_PROJECT_DIAGNOSIS.md` | Diagnóstico do deploy incorreto (já existe) |
| `META_OFFICIAL_REAL_TEST_RUNBOOK.md` | Runbook Meta oficial passo-a-passo |
| `PRODUCT_DIRECTION_AND_MVP_PRIORITY.md` | Não criado (seção 1 cobre) |
| `NEXT_STEPS_EXECUTION_PLAN.md` | Não criado (seção 12 cobre) |
| `.planning/codebase/ARCHITECTURE.md` | 281 linhas — arquitetura detalhada |
| `.planning/codebase/CONCERNS.md` | 533 linhas — issues de segurança e dívida |
| `.planning/codebase/CONVENTIONS.md` | 260 linhas — padrões de código |
| `.planning/codebase/INTEGRATIONS.md` | 260 linhas — integrações externas |
| `.planning/codebase/STACK.md` | 109 linhas — stack tecnológica |
| `.planning/codebase/STRUCTURE.md` | 358 linhas — estrutura de diretórios |
| `.planning/codebase/TESTING.md` | 267 linhas — testes |

---

## Inconsistências Encontradas

| Inconsistência | Detalhe |
|----------------|---------|
| `origin/main` remoto vs local | Remoto em `aacb884` (antigo), local em `2c87fe2` (novo) |
| `development` e `staging` atrás | Ambos em `aacb884` (v1.0.0) — precisam ser atualizados |
| Worktree não commitado | `.worktrees/crm-contatos-historico` tem mudanças não commitadas (já copiadas para main) |
| Feature branch worktree | `feature/crm-contatos-historico` branch com código mais recente |
| Green theme (divergência) | Tema mudou de roxo para verde durante handoff — verificar se é o desejado |
| `@ts-nocheck` em 21 arquivos | TypeScript desligado em muitos arquivos |
| `strict: false` | Type safety comprometida globalmente |

---

## Comandos Úteis

```bash
# Local
cd /Users/natanmacedo/Documents/opencode/ozion-chat-ai
npm run dev                         # Iniciar servidor local
node --test --import tsx tests/contact-timeline.test.ts  # Rodar teste

# Deploy
npx vercel --yes                    # Preview deploy
npx vercel --prod --yes             # Produção deploy

# Git
git status                          # Ver estado
git log --oneline -5                # Ver últimos commits
git push origin main                # Push (se keychain funcionar)

# Meta webhook test
curl "http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=ozion-verify-token-123&hub.challenge=test"

# Ver codebase maps
cat .planning/codebase/ARCHITECTURE.md
cat .planning/codebase/CONCERNS.md
cat .planning/codebase/STRUCTURE.md
```
