# External Integrations

**Analysis Date:** 2026-06-22

## APIs & External Services

### WhatsApp Messaging (Two Providers)

**Meta Cloud API (WhatsApp Business API):**
- Primary official WhatsApp integration
- SDK/Client: Custom `fetch`-based client at `server/services/meta-api.ts`
- Graph API version: v22.0
- Message endpoints: `/{phone_number_id}/messages`
- OAuth flow: `server/routes/whatsapp.ts` handles token exchange with Meta
- Capabilities: Send text, template, image, audio, document, button, and list messages
- Webhook management: Subscribe/unsubscribe app to WABA via `server/services/meta-api.ts` lines 189-214
- Phone number management: Verification, registration, code requests
- Auth: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, short/long-lived access tokens
- Webhook signature: HMAC-SHA256 verification at `server/routes/webhooks.ts` lines 37-47
- Provider abstraction: `server/services/providers/meta-provider.ts` implements `MessageProvider` interface

**Evolution API (WhatsApp Baileys):**
- Unofficial WhatsApp integration via Baileys library
- SDK/Client: Custom `fetch`-based client at `server/services/evolution-api.ts`
- Auth: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`
- Capabilities: Send text, audio, image, document, button, list messages
- Instance management: Create, connect, disconnect, QR code, connection state
- Webhook receiver: `server/routes/evolution.ts` POST `/api/webhooks/evolution`
- Webhook parsing: `parseWebhookEvent()` at `server/services/evolution-api.ts` line 276
- Provider abstraction: `server/services/providers/evolution-provider.ts` implements `MessageProvider` interface

**Provider Abstraction Layer:**
- Interface: `server/services/providers/types.ts` - `MessageProvider` with `sendText`, `sendTemplate`, `sendMedia`, `sendButton`, `sendList` methods
- Router: `server/services/providers/index.ts` auto-detects provider from `whatsapp_credentials.provider` column
- Normalizers: `server/services/normalizers/` - normalize both Meta and Evolution webhook payloads to common types

**Message Normalizers:**
- `server/services/normalizers/types.ts` - `NormalizedMessage`, `NormalizedStatusUpdate` types
- `server/services/normalizers/meta-normalizer.ts` - Normalizes Meta webhook payloads
- `server/services/normalizers/evolution-normalizer.ts` - Normalizes Evolution webhook payloads

### AI Providers (LLMs)

**Groq:**
- Primary AI provider (tried first)
- SDK: `fetch`-based OpenAI-compatible API calls to `https://api.groq.com/openai/v1`
- Model: `llama-3.3-70b-versatile`
- Imported in: `server/services/ai-agent.ts` (LLM chat), `server/services/audio.ts` (transcription via `whisper-large-v3`)
- Provider package: `providers/groq/` (client, config, types, logs, webhooks, testConnection)

**OpenAI:**
- Fallback AI provider
- SDK: `fetch`-based to `https://api.openai.com/v1`
- Model: `gpt-4o-mini` (default in AI agent)
- Used for: LLM chat, audio transcription (`whisper-1`), image generation (listed in integrations route)
- Provider package: `providers/openai/` (client, config, types, logs, webhooks, testConnection)

**DeepSeek:**
- Third AI provider option (tagged as cheap alternative)
- SDK: `fetch`-based to `https://api.deepseek.com/v1`
- Model: `deepseek-chat`
- Provider package: `providers/deepseek/` (client, config, types, logs, webhooks, testConnection)

**Anthropic Claude (Planned/Scaffolded):**
- Provider package: `providers/claude/` (client, config, types, logs, webhooks, testConnection)
- API version: v1

**Google Gemini (Planned/Scaffolded):**
- Provider package: `providers/gemini/` (client, config, types, logs, webhooks, testConnection)

**Agent System:**
- `server/services/ai-agent.ts`: Dynamic provider selection based on available API keys
- Tools available to agents: `update_contact`, `create_activity`, `transfer_to_human`, `search_knowledge`

### AI Flow Engine

**Flowise:**
- Low-code AI flow platform (self-hosted)
- SDK: `fetch`-based proxy at `server/routes/flowise.ts`
- Auth: `FLOWISE_API_KEY` as Bearer token, or `FLOWISE_URL` as base URL
- Endpoints: POST `/api/v1/prediction/:chatflowId`, GET/POST `/api/v1/chatflows`
- Integrated with: Webhook processing in `server/routes/webhooks.ts` (lines 16-18)

### Voice / Audio

**ElevenLabs:**
- Text-to-Speech and Voice Cloning
- SDK: `fetch`-based to `https://api.elevenlabs.io/v1`
- Capabilities: TTS (`text-to-speech/:voiceId`), voice cloning (`voices/add`), voice listing (`voices`)
- Default voice: `21m00Tcm4TlvDq8ikWAM` (Rachel)
- Default model: `eleven_multilingual_v2`
- Used in: `server/services/audio.ts` lines 109-213
- Provider package: `providers/elevenlabs/` (client, config, types, logs, webhooks, testConnection)

### Data Storage

**Databases:**
- **Supabase PostgreSQL** (Production):
  - Connection: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
  - Client: `@supabase/supabase-js` through `server/db/supabase.ts`
  - Helper functions: `query()`, `insert()`, `update()`, `remove()`, `rpc()` in `server/db/supabase.ts`
  - Drizzle Kit configured for PostgreSQL dialect (`drizzle.config.ts`)
  - Migrations: SQL files in `migrations/` directory
  - Tables: tenants, users, customers, workspaces, contacts, conversations, messages, flows, agents, voices, whatsapp_credentials, integrations, webhook_events, message_status_events, plans, sessions, audit_logs, saas_revenue, modules_enabled, contact_notes, contact_tasks, contact_events, tags, custom_fields, media_files, knowledge_base, and more

- **SQLite** (Local Dev):
  - Implementation: `better-sqlite3` at `server/db/index.ts`
  - Location: `data/ozion.db`
  - ORM: Drizzle ORM with `drizzle-orm/better-sqlite3`
  - WAL mode enabled, foreign keys enforced
  - Fallback: If SQLite unavailable (Vercel serverless), system uses Supabase exclusively

**File Storage:**
- Local filesystem only (temporary file download for audio processing, `os.tmpdir()`)
- Media metadata tracked in `media_files` Supabase table (`server/services/media-library.ts`)

**Caching:**
- None detected (no Redis, no in-memory cache layer)

### Authentication & Identity

**Custom JWT-based auth:**
- Implementation: `server/middleware/auth.ts`
- Token generation: `jwt.sign()` with 7-day expiry, `JWT_SECRET`
- Token verification: `jwt.verify()` on every request
- User verification: Additional Supabase lookup to verify user exists and is active (`users` table)
- Customer suspension check: Customer `status` field (suspended/cancelled)
- Role-based access control: `requireRole()` and `requireMaster()` middleware
- Permission system: `server/middleware/rbac.ts` with granular permission definitions (CONTACTS_*, CHAT_*, FLOWS_*, AGENTS_*, SALES_*, CRM_*, etc.)
- Auth header: Bearer token in `Authorization` header

### Payment Gateways

**Stripe (Scaffolded):**
- Provider package: `providers/stripe/` (client, config, types, logs, webhooks, testConnection)
- Not yet connected to actual Stripe API

**Mercado Pago (Scaffolded):**
- Provider package: `providers/mercadopago/` (client, config, types, logs, webhooks, testConnection)

**Asaas (Scaffolded):**
- Provider package: `providers/asaas/` (client, config, types, logs, webhooks, testConnection)

**Hotmart (Scaffolded):**
- Provider package: `providers/hotmart/` (client, config, types, logs, webhooks, testConnection)

**Kiwify (Scaffolded):**
- Provider package: `providers/kiwify/` (client, config, types, logs, webhooks, testConnection)

**Perfect Pay (Scaffolded):**
- Provider package: `providers/perfectpay/` (client, config, types, logs, webhooks, testConnection)

**UTMify (Scaffolded):**
- Provider package: `providers/utmify/` (client, config, types, logs, webhooks, testConnection)

### Meta Conversions API
- Endpoints for tracking ad conversions from WhatsApp interactions
- Auth: `META_CAPI_DATASET_ID`, `META_CAPI_ACCESS_TOKEN`
- API version: v19.0
- Defined in `server/services/meta-api.ts` (BASE_URL: `https://graph.facebook.com/v19.0`)

### Webhook Forwarding
- Generic webhook provider: `providers/webhook/` (client, config, types, logs, webhooks, testConnection)

### Meta / Facebook OAuth
- OAuth flow for WhatsApp Business API connection
- `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_CONFIG_ID`, `FACEBOOK_SOLUTION_ID`
- Redirect URI: `BASE_URL/api/whatsapp/oauth/callback`
- State secret: `OAUTH_STATE_SECRET`
- Token exchange: Authorization code → short-lived token → long-lived system user token
- Business discovery: Get businesses → WABAs → phone numbers (cascading API calls)
- Flow handled in: `server/routes/whatsapp.ts` + `server/services/meta-api.ts`

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, DataDog, etc.)

**Logs:**
- `console.log`/`console.error` throughout the codebase
- API route for logs: `server/routes/logs.ts`
- System health monitoring in `seed.ts` (healthComponents)

## CI/CD & Deployment

**Hosting:**
- **Vercel** (Primary): Serverless deployment via `api/index.ts` entrypoint
  - `vercel.json` rewrites: `/api/*` → `api/index.ts`, all else → `public/index.html`
- **Railway** (Alternative): Full Node server via `npm run start`
  - `railway.json` with Nixpacks builder, healthcheck at `/api/health`

**CI Pipeline:**
- GitHub Actions: `.github/workflows/deploy.yml`
  - Test job: `npm ci` + `npm run build` on push/PR to main, staging, development
  - Deploy Staging: Auto-deploy to Vercel staging on push to `staging` branch
  - Deploy Production: Auto-deploy to Vercel production on push to `main`, creates GitHub Release + tag
- Manual deploy scripts: `scripts/deploy.sh` (tag, push, branch-based)
- Database backup: `.github/workflows/backup.yml`
- Version management: `.github/workflows/version.yml`

## Environment Configuration

**Required env vars:**
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` - Supabase project credentials
- `JWT_SECRET` - JWT signing key
- `ENCRYPTION_KEY` - Token encryption key (AES)
- `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` - Meta OAuth
- `WEBHOOK_VERIFY_TOKEN` - WhatsApp webhook challenge
- `WEBHOOK_APP_SECRET` - Webhook payload HMAC validation

**Optional (feature-based) env vars:**
- `GROQ_API_KEY` - AI agent + transcription
- `OPENAI_API_KEY` - AI fallback + transcription fallback
- `DEEPSEEK_API_KEY` - AI agent alternative
- `ELEVENLABS_API_KEY` - Text-to-speech + voice cloning
- `EVOLUTION_API_URL` / `EVOLUTION_API_KEY` - Evolution WhatsApp API
- `FLOWISE_URL` / `FLOWISE_API_KEY` - Flowise AI flows
- `META_CAPI_DATASET_ID` / `META_CAPI_ACCESS_TOKEN` - Conversions API
- `BASE_URL` - OAuth redirect base URL
- `OAUTH_REDIRECT_URI` - Full OAuth callback URL
- `OAUTH_STATE_SECRET` - OAuth CSRF protection
- `FACEBOOK_CONFIG_ID` / `FACEBOOK_SOLUTION_ID` - Meta app config
- `DATABASE_URL` - PostgreSQL connection for Drizzle Kit
- `PORT` - HTTP server port (default 3000)

**Secrets location:**
- Vercel Environment Variables dashboard (production secrets)
- `.env` file (local development, gitignored)
- GitHub Actions Secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`)

## Webhooks & Callbacks

**Incoming:**
- `GET/POST /api/webhooks/whatsapp` - Meta WhatsApp Business API webhook
  - GET: Verification challenge (`hub.challenge`, `hub.verify_token`)
  - POST: Incoming messages, status updates, template message events
  - Idempotency: `webhook_events` table with `(tenant_id, provider, event_id)` unique index
  - Signature validation: HMAC-SHA256 with `META_APP_SECRET`
- `POST /api/webhooks/evolution` - Evolution API webhook
  - Incoming messages from Evolution/Baileys instances
  - Audio, text, image, document message types

**Outgoing:**
- None detected (no outgoing webhook calls registered)

## Provider Packages (Integration Scaffolding)

The `providers/` directory contains scaffolded integration packages, each with a standard structure:
- `config.ts` - Provider metadata (name, base URL, timeout, retry config)
- `client.ts` - `ProviderClient` class with `connect()`, `disconnect()`, `isConnected()`, `getConfig()`
- `types.ts` - TypeScript types for `ConnectionStatus`, `TestResult`, `LogEntry`, `ProviderConfig`
- `testConnection.ts` - Connection testing utility
- `logs.ts` - Log entry types
- `webhooks.ts` - Webhook event types

Complete scaffolds: `meta/`, `openai/`, `groq/`, `deepseek/`, `claude/`, `gemini/`, `elevenlabs/`, `stripe/`, `mercadopago/`, `asaas/`, `hotmart/`, `kiwify/`, `perfectpay/`, `utmify/`, `webhook/`

---

*Integration audit: 2026-06-22*
