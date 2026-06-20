# Fase 3 — Verificação: Webhook Events + Idempotência

## Arquivos Revisados

| Arquivo | Status | Notas |
|---------|--------|-------|
| `migrations/006_webhook_events.sql` | ✅ Corrigido | `UUID` → `TEXT` no `tenant_id` FK |
| `server/db/schema.ts` | ✅ Aprovado | Drizzle table sync com migration |
| `server/services/webhook-events.ts` | ✅ Aprovado | Todas as funções verificadas |
| `server/routes/webhooks.ts` | ✅ Aprovado | Meta webhook integrado |
| `WEBHOOK_EVENTS_IDEMPOTENCY_PHASE_3.md` | ✅ Aprovado | Documentação completa |

## Migration Revisada

- ✅ Tabela `webhook_events` com todos os campos obrigatórios
- ✅ `tenant_id TEXT NOT NULL REFERENCES tenants(id)` — corrigido
- ✅ `provider TEXT NOT NULL DEFAULT 'meta'`
- ✅ `event_id TEXT NOT NULL`
- ✅ `status` com CHECK constraint (received/processing/processed/failed/ignored/duplicate)
- ✅ `payload JSONB` para armazenar payload original
- ✅ `raw_body_hash TEXT` para SHA-256 do body completo
- ✅ `signature_valid BOOLEAN` para rastrear validação HMAC
- ✅ `attempts INTEGER DEFAULT 1` para suportar retry futuro
- ✅ `UNIQUE INDEX (tenant_id, provider, event_id)` — garante idempotência
- ✅ Índices auxiliares: status, provider, raw_body_hash

## Testes Rodados

### Testes Fase 3 (`tests/webhook-events.test.ts`)
```
10/10 pass ✅
  - Criação de evento
  - Duplicata detectada
  - Providers diferentes não conflitam
  - Tenants diferentes não conflitam
  - Status processing/processed/failed
  - hashRawBody SHA-256
  - IdempotencyKey format
```

### Testes Fase 2 (`tests/provider-abstraction.test.ts`)
```
8/8 pass ✅
```

### Compilação esbuild
- ✅ `server/services/webhook-events.ts` — compilou (820kb, 17s)
- ✅ `server/routes/webhooks.ts` — syntax check passou (7.3kb, 2.5s)
- ⏱ Bundle total (com express/supabase) ultrapassou 120s timeout — pre-existente
- ⏱ `tsc --noEmit` timeout — pre-existente (documentado em AGENTS.md)

## Problemas Encontrados e Corrigidos

### 🔴 Crítico: Type mismatch na FK da migration
**Problema:** Migration 006 usava `tenant_id UUID NOT NULL REFERENCES tenants(id)`, mas `tenants.id` é `TEXT` (definido como `uuid_generate_v4()::text` em `001_initial.sql`). PostgreSQL rejeitaria a FK por type mismatch.

**Correção:** `UUID` → `TEXT` no migration 006. Commit `b38a9fd`.

**Impacto:** Migration falharia no Supabase. Nenhum dado afetado (não foi executada).

### ⚠️ Menor: `getWebhookEventIdempotencyKey` não usada no receiver
A função é exportada, testada, mas `webhooks.ts` constrói o `event_id` inline (`message:${message.id}`). Inconsistência menor, sem impacto funcional.

### ⚠️ Menor: `mark*` functions não filtram por `tenant_id`
As funções `markWebhookEvent*` atualizam por `event.id` apenas. Como UUIDs são globalmente únicos, não há risco prático. Pode ser reforçado no futuro.

## Pendências

| Pendência | Bloqueia Fase 4? | Pode ficar? | Ação |
|-----------|-----------------|-------------|------|
| Evolution webhook route não montada | ❌ Não | Sim | Ativar quando Evolution for necessário |
| Painel admin para failed events | ❌ Não | Sim | Feature futura |
| DLQ/retry automático | ❌ Não | Sim | Feature futura |

Nenhuma pendência bloqueia o avanço para Fase 4.

## Riscos Restantes

1. **Migration não executada em produção** — A migration `006` precisa ser aplicada no Supabase SQL Editor antes de receber webhooks. Sem ela, `createWebhookEvent` falha (tabela não existe).
2. **Performance em pico** — Cada webhook message/status gera 2-3 escritas (insert + update). Com índices, deve ser aceitável para volumes típicos de WhatsApp.
3. **Race condition teórica** — Se dois workers receberem o mesmo webhook simultaneamente, o segundo pode passar pela verificação `findExistingWebhookEvent` antes do primeiro fazer o insert. O tratamento via `error.code === '23505'` cobre este caso.

## Veredito

### ✅ APROVADA — Fase 3 completa para avançar à Fase 4

**Resumo:** Uma correção crítica foi encontrada e aplicada (type mismatch na FK). Nenhum outro problema funcional. Todos os testes passam (18/18). As pendências documentadas não bloqueiam a próxima fase.

## Próximo Passo

**Fase 4 — Normalizadores + Status History**
- Criar normalizador de mensagens (estrutura padronizada de inbound)
- Criar histórico de status com timestamps (delivered, read, failed)
- Seguir o mesmo padrão de idempotência da Fase 3
