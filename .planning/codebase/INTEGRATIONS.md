# External Integrations

**Analysis Date:** 2026-06-19

## APIs & External Services

### WhatsApp (Meta Cloud API)
- **Purpose:** Official WhatsApp Business API for sending/receiving messages, template management, webhook subscriptions
- **API Version:** `v22.0` (Graph API), `v19.0` (Conversions API)
- **Base URL:** `https://graph.facebook.com/v22.0`
- **Auth:** OAuth 2.0 (short-lived token exchange → long-lived system user token)
- **Endpoints used:**
  - `/{phone_number_id}/messages` — Send messages (`server/services/meta-api.ts:227`)
  - `/oauth/access_token` — Token exchange (`server/services/meta-api.ts:37`)
  - `/{waba_id}/subscribed_apps` — Webhook subscription (`server/services/meta-api.ts:194`)
  - `/{waba_id}/phone_numbers` — List phone numbers (`server/services/meta-api.ts:100`)
  - `/{waba_id}/message_templates` — Template management (`server/services/meta-api.ts:301`)
  - `/{phone_number_id}/request_code` / `verify_code` / `register` — Phone verification
    - `/{ad_id}` — Ad hierarchy lookup
- **Webhook:** `GET /api/webhooks/whatsapp` (verification), `POST /api/webhooks/whatsapp` (events)
- **Routes:** `server/routes/webhooks.ts`, `server/services/meta-api.ts`
- **Env vars:** `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACBOOK_CONFIG_ID`, `FACEBOOK_SOLUTION_ID`, `WEBHOOK_VERIFY_TOKEN`, `OAUTH_REDIRECT_URI`, `OAUTH_STATE_SECRET`

### WhatsApp (Evolution API)
- **Purpose:** Alternative WhatsApp integration via WhatsApp Baileys (unofficial API) for multi-instance support, QR code connections, voice notes
- **Base URL:** Configured via `EVOLUTION_API_URL` env var
- **Auth:** API key (`EVOLUTION_API_KEY`) passed as `apikey` header
- **Endpoints used:**
  - `/message/sendText/{instance}` — Text messages (`server/services/evolution-api.ts:51`)
  - `/message/sendWhatsAppAudio/{instance}` — Voice/audio messages
  - `/message/sendImage/{instance}` — Images
  - `/message/sendDocument/{instance}` — Documents
  - `/message/sendButtons/{instance}` — Interactive buttons
  - `/message/sendList/{instance}` — List messages
  - `/message/getMediaUrl/{instance}` — Media retrieval
  - `/instance/create` — Instance management
  - `/instance/connectionState/{instance}` — Connection status
  - `/instance/connect/{instance}` — QR code
  - `/instance/delete/{instance}` — Teardown
- **Webhook:** `POST /api/webhooks/evolution` (handled by `server/routes/evolution.ts`)
- **Routes:** `server/services/evolution-api.ts`, `server/routes/evolution.ts`
- **Env vars:** `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`

### Meta Conversions API (CAPI)
- **Purpose:** Send conversion events for Click-to-WhatsApp Ads (CTWA) attribution tracking
- **API Version:** `v19.0`
- **Base URL:** `https://graph.facebook.com/v19.0`
- **Auth:** Access token (`META_CAPI_ACCESS_TOKEN`)
- **Endpoint:** `/{dataset_id}/events` — Send conversion events (`server/services/meta-api.ts:330`)
- **Routes:** `server/services/meta-api.ts`
- **Env vars:** `META_CAPI_DATASET_ID`, `META_CAPI_ACCESS_TOKEN`

### AI Provider: OpenAI
- **Purpose:** Chat completions (GPT-4o-mini) and audio transcription (Whisper-1)
- **API Base:** `https://api.openai.com/v1`
- **Endpoints:** `/chat/completions`, `/audio/transcriptions`
- **Auth:** API key (`OPENAI_API_KEY`)
- **Used in:** `server/services/ai-agent.ts`, `server/services/audio.ts`
- **Provider SDK:** `providers/openai/client.ts` (connection wrapper)

### AI Provider: Groq
- **Purpose:** AI chat completions (Llama 3.3 70B) and audio transcription (Whisper-large-v3)
- **API Base:** `https://api.groq.com/openai/v1`
- **Endpoints:** `/chat/completions`, `/audio/transcriptions`
- **Auth:** API key (`GROQ_API_KEY`)
- **Priority:** Primary AI provider (checked first in `getProvider()`) and transcription provider (checked first in `transcribeAudio()`)
- **Used in:** `server/services/ai-agent.ts`, `server/services/audio.ts`
- **Provider SDK:** `providers/groq/client.ts` (connection wrapper)

### AI Provider: DeepSeek
- **Purpose:** AI chat completions (DeepSeek Chat) as alternative provider
- **API Base:** `https://api.deepseek.com/v1`
- **Endpoint:** `/chat/completions`
- **Auth:** API key (`DEEPSEEK_API_KEY`)
- **Priority:** Fallback after Groq/OpenAI in `getProvider()`
- **Used in:** `server/services/ai-agent.ts`
- **Provider SDK:** `providers/deepseek/client.ts` (connection wrapper)

### AI Provider: Claude (Anthropic)
- **Purpose:** Reserved AI provider integration
- **Provider SDK:** `providers/claude/client.ts` (connection wrapper only, no runtime usage detected)

### AI Provider: Gemini (Google)
- **Purpose:** Reserved AI provider integration
- **Provider SDK:** `providers/gemini/client.ts` (connection wrapper only, no runtime usage detected)

### ElevenLabs
- **Purpose:** Text-to-Speech (eleven_multilingual_v2) and voice cloning
- **API Base:** `https://api.elevenlabs.io/v1`
- **Endpoints:** `/text-to-speech/{voice_id}`, `/voices`, `/voices/add`
- **Default voice:** `21m00Tcm4TlvDq8ikWAM` (Rachel)
- **Auth:** API key via `xi-api-key` header (`ELEVENLABS_API_KEY`)
- **Used in:** `server/services/audio.ts`
- **Provider SDK:** `providers/elevenlabs/client.ts` (connection wrapper)

### Flowise
- **Purpose:** Low-code AI flow engine integration for automated message processing — routes webhook messages to Flowise chatflows for AI responses
- **Auth:** Bearer token via `FLOWISE_API_KEY` (optional)
- **Endpoints (proxied):**
  - `POST /api/flowise/predict/:chatflowId` — Run prediction
  - `GET /api/flowise/chatflows` — List flows
  - `POST /api/flowise/chatflows` — Create flow
  - `PUT /api/flowise/chatflows/:id` — Update flow
  - `DELETE /api/flowise/chatflows/:id` — Delete flow
  - `GET /api/flowise/status` — Health check
- **Used in:** `server/routes/webhooks.ts:102` (incoming WhatsApp → Flowise), `server/routes/flowise.ts` (full CRUD proxy)
- **Env vars:** `FLOWISE_URL`, `FLOWISE_API_KEY`, `FLOWISE_CHATFLOW_ID`

## Payment Gateways

**All payment provider integrations follow a standard pattern** (connection wrapper with connect/disconnect/isConnected):

| Provider | SDK Path | Status |
|----------|----------|--------|
| Stripe | `providers/stripe/client.ts` | Connection wrapper ready |
| Mercado Pago | `providers/mercadopago/client.ts` | Connection wrapper ready |
| Asaas | `providers/asaas/client.ts` | Connection wrapper ready |
| Hotmart | `providers/hotmart/client.ts` | Connection wrapper ready |
| Kiwify | `providers/kiwify/client.ts` | Connection wrapper ready |
| PerfectPay | `providers/perfectpay/client.ts` | Connection wrapper ready |
| UTMify | `providers/utmify/client.ts` | Connection wrapper ready |

**Sales tracking:** `server/routes/sales.ts`, `server/db/schema.ts` (`sales` table has `provider`, `provider_sale_id` columns)

## Data Storage

**Databases:**
- **Primary (Production):** Supabase PostgreSQL
  - Client: `@supabase/supabase-js` — `server/db/supabase.ts`
  - Connection: `SUPABASE_URL` + `SUPABASE_ANON_KEY` env vars
  - Drizzle ORM for PostgreSQL (`drizzle.config.ts`)
  - Schema defined in `server/db/schema.ts` (SQLite-compatible but applied to Postgres via `migrations/`)
  - Migrations: `migrations/001_initial.sql`, `002_saas_multitenant.sql`, `003_flow_controls.sql`

- **Local Dev (optional):** SQLite via `better-sqlite3`
  - File: `data/ozion.db`
  - ORM: Drizzle + `drizzle-orm/better-sqlite3`
  - Initialization: `server/db/index.ts` — lazy-loaded, graceful fallback when unavailable (e.g., Vercel serverless)
  - WAL mode + foreign keys enabled

**File Storage:**
- No dedicated file storage service detected (Vercel ephemeral filesystem only)
- Audio files downloaded to OS temp directory for processing (`server/services/audio.ts`)

**Caching:**
- None detected (no Redis, Memcached, or in-memory cache)

## Authentication & Identity

**Auth Provider:**
- **Custom JWT-based authentication**
  - Implementation: `server/middleware/auth.ts`
  - Token generation: `jwt.sign()` with `JWT_SECRET`, 7-day expiry
  - Token verification: `jwt.verify()` at middleware, user existence + active status checked against Supabase
  - Customer status check (suspended/cancelled) performed on each request
- **Password hashing:** `bcryptjs` with salt rounds 10
- **RBAC:** Role-based access in `server/middleware/rbac.ts` (`requireRole()`, `requireMaster()`)
- **Master admin impersonation:** Endpoint `POST /api/auth/impersonate/:customerId`

**Webhook Verification:**
- WhatsApp webhook: `hub.verify_token` challenge-response (GET)
- Evolution API: Simple GET 200 (no challenge)

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, LogRocket, or similar)
- Errors logged via `console.error` throughout the application

**Logs:**
- Application logs: `console.log`/`console.error` (stdout)
- Audit logs: `audit_logs` table in Supabase (`server/db/schema.ts:446`)
- System logs: `logs` table in Supabase (`server/db/schema.ts:373`)
- Log routes: `server/routes/logs.ts`

**Health Monitoring:**
- `system_health` table in Supabase (`server/db/schema.ts:390`)
- Health endpoint: `GET /api/health` (authenticated)
- Ping endpoint: `GET /api/ping` (public)
- Seed data includes health components for: meta-cloud-api, webhooks-whatsapp, openai, elevenlabs, utmify, kiwify, hotmart, asaas, mercadopago, stripe, database, storage, queues

## CI/CD & Deployment

**Hosting:**
- **Vercel (Primary):** Serverless deployment via `vercel.json`
  - API entrypoint: `api/index.ts` (rewrite `/api/(.*)`)
  - SPA frontend served from `public/`
  - Build command: `echo 'Build complete'` (no build step — TypeScript executed directly via tsx)
- **Railway (Alternative):** Full Node process via `railway.json`
  - Start command: `npm run start` → `node dist/server/index.js`
  - Health check at `/api/health`

**CI Pipeline:**
- `.github/` directory present — GitHub Actions
- Scripts in `scripts/`:
  - `scripts/deploy.sh` — Deploy to Vercel with staging/production environments
  - `scripts/backup.sh` — Full/database backup
  - `scripts/rollback.sh` — Rollback deployment
  - `scripts/changelog.sh` — Changelog generation

## Environment Configuration

**Critical env vars:**
| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Database connection |
| `JWT_SECRET` | Auth token signing |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | Meta OAuth |
| `WEBHOOK_VERIFY_TOKEN`, `WEBHOOK_APP_SECRET` | Webhook security |
| `ENCRYPTION_KEY` | Token/crypto operations |
| `BASE_URL`, `OAUTH_REDIRECT_URI` | Callback URLs |
| `GROQ_API_KEY` / `OPENAI_API_KEY` / `DEEPSEEK_API_KEY` | AI inference |
| `ELEVENLABS_API_KEY` | Text-to-speech |
| `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` | Evolution WhatsApp |
| `META_CAPI_DATASET_ID`, `META_CAPI_ACCESS_TOKEN` | Conversion tracking |
| `FLOWISE_URL`, `FLOWISE_API_KEY`, `FLOWISE_CHATFLOW_ID` | AI flow engine |

**Secrets location:**
- Local: `.env` (gitignored)
- Production: Vercel Environment Variables (project settings)
- Config files: `config/.env.development`, `config/.env.production`, `config/.env.staging`

## Webhooks & Callbacks

**Incoming:**
- WhatsApp Cloud API: `POST /api/webhooks/whatsapp` (`server/routes/webhooks.ts`)
  - Verification: `GET /api/webhooks/whatsapp?hub.challenge`
  - Events: Inbound messages, status updates (delivered/read)
- Evolution API: `POST /api/webhooks/evolution` (`server/routes/evolution.ts`)
  - Events: Text, audio, image, document, button, list messages
- Custom webhooks: Stored in `webhooks` table, managed via `server/routes/webhooks.ts` (CRUD)

**Outgoing:**
- Custom outgoing webhooks: Tenant-configurable via integrations system
- Webhook events filterable by type, HMAC secret support
- Outgoing webhook log is stored (last trigger, last error tracking)

---

*Integration audit: 2026-06-19*
