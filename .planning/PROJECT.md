# Ozion — WhatsApp CRM com AI Agents

## What This Is

Ozion é um CRM multicanal com foco em WhatsApp, automatizado por AI Agents. O sistema gerencia conversas, fluxos automatizados (Flow Builder + Flow Engine), integração com provedores de WhatsApp (Meta e UTalk), e analytics reais.

## Core Value

Um atendente ou empresa pode conectar números de WhatsApp (via Meta ou UTalk), gerenciar conversas em um Inbox unificado, automatizar respostas com fluxos visuais + IA, e ver analytics reais — tudo em uma plataforma multi-tenant.

## Core Users

- **Admin do workspace**: configura integrações, gerencia números, define fluxos
- **Atendente**: usa o Inbox para conversar com leads, vê histórico, envia mensagens
- **Sistema (Flow Engine)**: executa fluxos automaticamente quando mensagens chegam

## Context

### Stack
- **Runtime:** Node.js + TypeScript (com `// @ts-nocheck` — type checking desligado)
- **Framework:** Express.js (server/) com API REST
- **Frontend:** Vanilla JS SPA (`public/js/ozion.js`, 4700+ linhas)
- **Banco:** Supabase PostgreSQL (produção) + SQLite local (`data/ozion.db`)
- **ORM:** Drizzle ORM (esquemas em `server/db/`)
- **Tempo real:** Socket.io
- **Deploy:** Vercel (entrypoint `api/index.ts`)
- **PWA:** Service worker em `public/sw.js`

### O que já existe (validado do codebase)
- Estrutura de usuários/workspaces multi-tenant
- Conversas e mensagens no banco (tabelas `conversations`, `messages`)
- Provider Meta Cloud API (WhatsApp v22.0) funcional
- Provider Evolution API (Baileys)
- Webhook handler para mensagens recebidas
- Flow Builder com React Flow (blocos, conexões, salvamento)
- CRUD de flows (`server/routes/flows.ts`)
- 3 provedores de IA: Groq, OpenAI, DeepSeek
- ElevenLabs TTS (text-to-speech)
- Integração Flowise
- 7 gateways de pagamento (Stripe, Mercado Pago, Asaas, etc.)
- Toggle de ativar/desativar fluxo com validação
- Migrations SQL (001_initial, 002_saas_multitenant, 003_flow_controls)
- Analytics por nó (tabelas `flow_node_analytics`, `flow_executions`, `flow_execution_steps`)

### O que está em desenvolvimento (foco desta fase)
- Integração UTalk como provider de WhatsApp
- Inbox real com dados do banco (sem mock)
- Envio manual de mensagens pelo Inbox
- Flow Engine executando fluxos automaticamente
- Flow Builder finalizado (power toggle, dispositivos, analytics)
- Analytics reais (sem fake data)
- Player de áudio no Inbox
- Tags, atendentes, status, filtros

## Requirements

### Validated (já existe no codebase)

- ✓ Autenticação multi-tenant (workspaces)
- ✓ CRUD de conversas e mensagens no banco
- ✅ Provider Meta WhatsApp funcional
- ✅ Provider Evolution API (Baileys)
- ✅ Webhook para mensagens recebidas
- ✅ Flow Builder com React Flow (blocos, conexões, salvamento)
- ✅ API de flows (CRUD, toggle, analytics endpoints)
- ✅ 3 provedores de IA (Groq, OpenAI, DeepSeek)
- ✅ ElevenLabs TTS
- ✅ Flowise integration
- ✅ Migrations SQL (001, 002, 003)
- ✅ Tabelas: flow_executions, flow_execution_steps, flow_node_analytics
- ✅ Toggle ativar/desativar fluxo com validação
- ✅ Botões no Flow Builder: power, finalizar execuções, limpar analytics, dispositivos conectados

### Active (nova fase)

- [ ] **UTALK-01**: Integração UTalk como provider de WhatsApp
- [ ] **UTALK-02**: Tela de configuração UTalk (/integrations/utalk)
- [ ] **UTALK-03**: UTalk Client service (server/services/utalk-client.ts)
- [ ] **UTALK-04**: Migrations: utalk_integrations, utalk_mappings, provider/external_id
- [ ] **UTALK-05**: APIs internas de integração (test, sync, save, webhooks)
- [ ] **UTALK-06**: Webhook UTalk (POST /api/webhooks/utalk)
- [ ] **UTALK-07**: Normalizador UTalk
- [ ] **UTALK-08**: Provider agnóstico no Flow Engine
- [ ] **INBOX-01**: Inbox real com dados do banco
- [ ] **INBOX-02**: Envio manual de mensagem pelo Inbox
- [ ] **INBOX-03**: Player de áudio
- [ ] **INBOX-04**: Tags, status, atendente, filtros
- [ ] **INBOX-05**: Provider visível (meta/utalk) por conversa
- [ ] **FLOW-01**: Flow Builder final (voltar, power, dispositivos, analytics)
- [ ] **FLOW-02**: Linhas animadas quando fluxo ativo, paradas quando inativo
- [ ] **FLOW-03**: Flow Engine executando com ambos providers
- [ ] **FLOW-04**: Flow block: IA, áudio, lógica, handoff, segurança
- [ ] **ANALYTICS-01**: Analytics real (sem mock)
- [ ] **QA-01**: Build passa, sem mock, sem fake

### Out of Scope (para esta fase)

- Página Swagger/API Docs pública da Ozion — fase posterior
- Portal de desenvolvedor
- Tela pública de tokens API
- CAPI Meta (estrutura deixada, não finalizada)
- Substituir Flow Engine da Ozion pelo Flowchart da UTalk
- Usar AI Agents da UTalk como cérebro principal

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Provider separado "utalk" | Não quebrar provider Meta existente | Adotado |
| UTalk é só provider/canal | Ozion continua sendo o sistema principal (Inbox, Flow, IA, Analytics próprios) | Adotado |
| Flow Engine próprio e agnóstico | Engine precisa funcionar com qualquer provider (meta, utalk, futuro) | Adotado |
| Nada fake, nada mock | Todo dado vem do banco real ou de API real | Adotado |
| Modo MVP vertical slice | Cada fase entrega uma fatia funcional ponta a ponta | Adotado |
| Granularidade fina | 8-12 fases focadas para gerenciar complexidade | Adotado |

---

*Last updated: 2026-06-20 after initialization*
