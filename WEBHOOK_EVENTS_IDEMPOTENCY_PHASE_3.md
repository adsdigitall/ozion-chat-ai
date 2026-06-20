# Fase 3 — Webhook Events + Idempotência

## Objetivo
Criar estrutura de `webhook_events` com idempotência para que webhooks recebidos não sejam processados duas vezes e possam ser auditados/reprocessados.

## Schema Criado

### Tabela: `webhook_events` (PostgreSQL — Supabase)

```sql
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  provider TEXT NOT NULL DEFAULT 'meta',
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'message',
  payload JSONB NOT NULL DEFAULT '{}',
  raw_body_hash TEXT,
  signature_valid BOOLEAN,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','processing','processed','failed','ignored','duplicate')),
  attempts INTEGER NOT NULL DEFAULT 1,
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_idempotency
  ON webhook_events(tenant_id, provider, event_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status
  ON webhook_events(tenant_id, status, received_at DESC);
```

### Definição Drizzle (SQLite — dev local)
Adicionada em `server/db/schema.ts` como `webhookEvents` table.

## Regras de Idempotência

### Como `event_id` é definido
- **Meta messages**: `message:{message.id}` — onde `message.id` é o ID único do Meta Cloud API
- **Meta status updates**: `status:{status.id}` — onde `status.id` é o ID do status update
- **Evolution messages** (preparado): `message:{messageId}` — onde `messageId` vem do parseWebhookEvent

### Unique Constraint
`UNIQUE(tenant_id, provider, event_id)` garante que:
- Cada evento é único por tenant + provider + ID externo
- Tenants diferentes com mesmo `event_id` do provider não colidem
- Providers diferentes com mesmo `event_id` não colidem

### Como duplicatas são tratadas
1. `createWebhookEvent()` verifica se já existe registro com mesmo `(tenant_id, provider, event_id)`
2. Se existir, marca como `duplicate` e retorna `{ duplicate: true }`
3. O receiver pula o processamento de eventos duplicados e loga `⏭️ Duplicate skipped`
4. Race conditions são tratadas: se insert falhar por unique violation, faz nova consulta

### Status possíveis
| Status | Significado |
|--------|-------------|
| `received` | Evento registrado, aguardando processamento |
| `processing` | Evento em processamento |
| `processed` | Processado com sucesso |
| `failed` | Processamento falhou, erro salvo |
| `ignored` | Evento ignorado intencionalmente |
| `duplicate` | Evento já processado anteriormente |

## Arquivos Criados/Modificados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `migrations/006_webhook_events.sql` | Criado | Migration PostgreSQL para Supabase |
| `server/db/schema.ts` | Modificado | Adicionada tabela `webhookEvents` Drizzle |
| `server/services/webhook-events.ts` | Criado | Serviço de idempotência (CRUD de webhook_events) |
| `server/routes/webhooks.ts` | Modificado | Meta webhook integrado com webhook_events |
| `WEBHOOK_EVENTS_IDEMPOTENCY_PHASE_3.md` | Criado | Esta documentação |

## Serviço: `server/services/webhook-events.ts`

### Funções Exportadas

| Função | Descrição |
|--------|-----------|
| `createWebhookEvent(params)` | Registra evento, detecta duplicata |
| `findExistingWebhookEvent(tenantId, provider, eventId)` | Busca evento existente |
| `markWebhookEventProcessing(eventId)` | Marca como processing |
| `markWebhookEventProcessed(eventId)` | Marca como processed |
| `markWebhookEventFailed(eventId, error)` | Marca como failed com erro |
| `markWebhookEventIgnored(eventId, reason)` | Marca como ignored |
| `hashRawBody(rawBody)` | Gera SHA-256 hash do body |
| `getWebhookEventIdempotencyKey(provider, eventType, id)` | Gera chave de idempotência |

## Provider Meta — Integração

O receiver `POST /api/webhooks/whatsapp` agora:
1. Valida assinatura HMAC (se `META_APP_SECRET` configurado)
2. Calcula `rawBodyHash` do payload completo
3. Para cada mensagem: cria `webhook_event` com `event_id = message:{message.id}`
4. Para cada status: cria `webhook_event` com `event_id = status:{status.id}`
5. Se duplicata → loga e pula sem reprocessar
6. Se novo → `processing` → processa → `processed`/`failed`
7. Sempre retorna 200 (mesmo em erro) para evitar retransmissão

## Provider Evolution — Preparado

O receiver Evolution (`server/routes/evolution.ts`) **não foi modificado nesta fase** porque:
- A rota não está montada em `server/index.ts` (está desativada)
- O provider EvolutionMessageProvider existe e funcionará quando a rota for ativada
- Quando for ativado, deverá seguir o mesmo padrão de idempotência

## Segurança Multi-tenant

- `webhook_events.tenant_id` é sempre populado
- Unique constraint inclui `tenant_id` → tenants diferentes não conflitam
- Nenhuma query busca webhook_events sem filtrar por tenant (no helper)
- Raw body hash é computado mas não armazenado em tabela sem tenant

## Riscos e Pendências

### Riscos
- **Unique constraint em Postgres**: O `CHECK` em `status` pode falhar se Supabase for versão antiga — é padrão PostgreSQL, sem risco
- **Payload grande**: `payload JSONB` pode crescer se o webhook tiver muitos campos — aceitável para auditoria
- **Performance em pico**: Cada mensagem/status gera 3-4 inserts/updates — com índices deve ser aceitável para volume típico de WhatsApp

### Pendências
- [ ] Ativar rota Evolution (`server/routes/evolution.ts`) e integrar webhook_events
- [ ] Criar painel admin para visualizar/reeprocessar webhook_events com status `failed`
- [ ] Implementar retry automático (DLQ) para eventos `failed`
- [ ] Adicionar webhook_events ao `processIncomingMessage` para Evolution (quando rota for ativada)
- [ ] Teste de carga com múltiplos webhooks simultâneos

## Comandos Rodados

```bash
# Compilação
npx esbuild --tsconfig=tsconfig.json --bundle --platform=node server/services/webhook-events.ts --outfile=/dev/null
npx esbuild --tsconfig=tsconfig.json --bundle --platform=node server/routes/webhooks.ts --outfile=/dev/null

# Testes
node --experimental-test-module-mocks --test --import tsx tests/webhook-events.test.ts
```

## Verificação Final

- ✅ Migration 006 criada
- ✅ Schema Drizzle atualizado
- ✅ Serviço webhook-events criado
- ✅ Meta webhook receiver integrado
- ✅ Idempotência funcionando (duplicatas detectadas e ignoradas)
- ✅ Multi-tenant (tenant_id + provider + event_id unique)
- ✅ Provider evolution preparado (estrutura suporta)
- ✅ Documentação criada
- ✅ Testes criados
