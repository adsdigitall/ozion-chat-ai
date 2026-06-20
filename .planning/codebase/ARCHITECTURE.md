<!-- refreshed: 2026-06-19 -->
# Architecture

**Analysis Date:** 2026-06-19

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│  ┌─────────────────────────┐  ┌──────────────────────────────────┐  │
│  │  Vanilla JS SPA         │  │  Legacy Pages                    │  │
│  │  `public/js/ozion.js`   │  │  `js/app.js`, `index.html`       │  │
│  │  `public/index.html`    │  │  `ctwa.html`, `chat.html`        │  │
│  └───────────┬─────────────┘  └──────────────────────────────────┘  │
│              │                          Socket.IO                    │
│              │                          `/ws` path                    │
└──────────────┼───────────────────────────────────────────────────────┘
               │ HTTP (JSON) + JWT Bearer Token
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      API LAYER  (Express.js)                         │
│                                                                      │
│  Entry Points:                                                       │
│  ┌─────────────────────────┐  ┌──────────────────────────────────┐  │
│  │ Local Dev               │  │ Vercel Production                │  │
│  │ `server/index.ts`       │  │ `api/index.ts`                  │  │
│  │ PORT 3000, serves SPA   │  │ No static serving, serverless    │  │
│  └───────────┬─────────────┘  └───────────┬──────────────────────┘  │
│              │                              │                         │
│              ▼                              ▼                         │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    Middleware Stack                             │  │
│  │  helmet() → cors() → express.json() → static files → routes    │  │
│  │  ┌────────────────────────────────────────────────────────┐     │  │
│  │  │  authMiddleware  (JWT verification)                    │     │  │
│  │  │  requireRole / requirePermission / requireMaster       │     │  │
│  │  │  checkPlanLimit (RBAC + usage limits)                  │     │  │
│  │  └────────────────────────────────────────────────────────┘     │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  24 Route Modules  (Express Router)                             │  │
│  │  `server/routes/*.ts`                                           │  │
│  │                                                                  │  │
│  │  Public:      auth, webhooks (whatsapp + evolution)              │  │
│  │  Protected:   whatsapp, messages, ctwa, analytics, contacts,    │  │
│  │               admin, crm, flows, agents, chat, voice, sales,    │  │
│  │               integrations, health, updates, logs, plans,       │  │
│  │               deploy, flowise, tags, spa                        │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────┬───────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                                    │
│  `server/services/`                                                  │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  AI Agent        │  │  Meta API   │  │  Evolution API          │  │
│  │  `ai-agent.ts`   │  │  `meta-    │  │  `evolution-api.ts`    │  │
│  │  OpenAI/Groq/    │  │  api.ts`    │  │  Baileys-based          │  │
│  │  DeepSeek FC     │  │  Graph v22  │  │  WhatsApp API           │  │
│  └─────────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Audio           │  │  WebSocket  │  │  Webhook Handler        │  │
│  │  `audio.ts`      │  │  `web-     │  │  `webhook-handler.ts`   │  │
│  │  TTS/STT via     │  │  socket.ts` │  │  Process inbound msgs   │  │
│  │  Groq/Eleven-    │  │  Socket.IO  │  │  + status updates       │  │
│  │  Labs/OpenAI     │  │  real-time  │  │                         │  │
│  └─────────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Flow Validator  `validate-flow.ts`                           │  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────────┬───────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                        │
│                                                                      │
│  ┌────────────────────────────┐  ┌──────────────────────────────┐   │
│  │  Production (Supabase)     │  │  Local Dev (SQLite)          │   │
│  │  `server/db/supabase.ts`   │  │  `server/db/index.ts`        │   │
│  │  @supabase/supabase-js     │  │  better-sqlite3 + Drizzle    │   │
│  │  PostgreSQL                │  │  `data/ozion.db`             │   │
│  │  `migrations/001_initial   │  │  `server/db/schema.ts`       │   │
│  │  .sql` schema              │  │  (Drizzle SQLite schema)     │   │
│  └────────────────────────────┘  └──────────────────────────────┘   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Encryption Helper  `server/lib/encryption.ts`                  │  │
│  │  AES encrypt/decrypt + SHA256 hashing for credentials          │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL PROVIDERS                                 │
│  `providers/*/`  (15 providers, each with 7-file pattern)            │
│                                                                      │
│  Payment:     stripe, mercadopago, hotmart, kiwify, perfectpay,     │
│               asaas                                                  │
│  AI:          openai, deepseek, claude, gemini, groq                 │
│  WhatsApp:    meta, webhook, (evolution-api in services)             │
│  Voice:       elevenlabs                                             │
│  Tracking:    utmify                                                  │
└──────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Server Entry (Local) | Mount routes, middleware, serve static SPA, start HTTP server | `server/index.ts` |
| Vercel Entry (Prod) | Mount routes, middleware, export Express app for serverless | `api/index.ts` |
| Auth Middleware | JWT generation, verification, user lookup, customer status check | `server/middleware/auth.ts` |
| RBAC Middleware | Permission definitions, role-based access, plan limit checking | `server/middleware/rbac.ts` |
| Auth Routes | Login, logout, change password, impersonate customers | `server/routes/auth.ts` |
| Webhooks Routes | WhatsApp Meta webhook verify + receive, Flowise AI fallback | `server/routes/webhooks.ts` |
| Chat Routes | Conversations CRUD, message send, AI toggle, transfer, risk word check | `server/routes/chat.ts` |
| CRM Routes | Contact CRUD, import/export CSV, filter/search | `server/routes/crm.ts` |
| Flows Routes | Flow CRUD, blocks, edges, toggle, analytics, import/export JSON, bulk ops | `server/routes/flows.ts` |
| Agents Routes | Agent CRUD, Groq-based test endpoint | `server/routes/agents.ts` |
| Admin Routes | Customers, plans, users, workspaces CRUD + platform stats, revenue, audit logs | `server/routes/admin.ts` |
| CTWA Routes | Campaign/stats, attributions, Meta CAPI conversion events | `server/routes/ctwa.ts` |
| Evolution Routes | Evolution API webhook + AI agent orchestration (transcribe → AI → TTS → reply) | `server/routes/evolution.ts` |
| AI Agent Service | Function-calling AI (Groq/OpenAI/DeepSeek), 6 tools, knowledge base context | `server/services/ai-agent.ts` |
| Meta API Service | WhatsApp Business API client (Graph v22), token exchange, messaging, templates, CAPI | `server/services/meta-api.ts` |
| Evolution API Service | Baileys-based WhatsApp API via external Evolution API instance | `server/services/evolution-api.ts` |
| Webhook Handler | Process inbound WhatsApp messages: upsert contact/conversation, CTWA attribution | `server/services/webhook-handler.ts` |
| WebSocket Service | Socket.IO real-time, rooms per tenant/conversation/user, emit helpers | `server/services/websocket.ts` |
| Audio Service | Audio download, Groq/OpenAI transcription, ElevenLabs TTS | `server/services/audio.ts` |
| Supabase Client | Singleton Supabase client + query/insert/update/delete helpers | `server/db/supabase.ts` |
| SQLite Client | Lazy better-sqlite3 init with Drizzle ORM proxy for local dev | `server/db/index.ts` |
| Drizzle Schema | SQLite table definitions for all 21 entities | `server/db/schema.ts` |
| Encryption Lib | AES encrypt/decrypt, SHA256 hashing for credentials | `server/lib/encryption.ts` |

## Pattern Overview

**Overall:** Route-Layer Architecture with Direct Database Access

The codebase is organized as an Express.js application where each domain (CRM, Chat, Flows, Agents, etc.) maps to a route module. Route files contain both HTTP handling AND database queries — there is no repository/data-access layer abstraction. Services are reserved for external API integrations and complex workflows (AI agent, audio processing, webhook plumbing).

**Key Characteristics:**
- Every domain feature is a self-contained Express `Router` in `server/routes/`
- Route files use `getSupabase()` directly — no dependency injection or service abstraction for data
- Multi-tenancy via `tenant_id` column on all tables, passed through `x-tenant-id` header
- External integrations live in `providers/` with a consistent 7-file structure per provider
- Supabase (PostgreSQL) is the production database; SQLite via Drizzle ORM is the local dev fallback
- Frontend is a vanilla JavaScript SPA (no React/Vue) — single ~4,890-line file with direct DOM manipulation
- Real-time updates via Socket.IO with room-based subscriptions

## Layers

**Client Layer:**
- Purpose: Browser-based single-page application
- Location: `public/`
- Contains: `index.html` (shell), `js/ozion.js` (SPA), `css/ozion.css` (styles)
- Depends on: API (`/api/*`), Socket.IO (`/ws`)
- Used by: End users in browser

**Entry Point Layer:**
- Purpose: Application bootstrap and middleware wiring
- Location: `server/index.ts` (local), `api/index.ts` (Vercel)
- Contains: Middleware stack, route mounting, server start
- Depends on: All route modules, middleware, `server/db/supabase.ts`
- Used by: HTTP clients / Vercel serverless runtime

**Route Layer:**
- Purpose: HTTP request handling per domain
- Location: `server/routes/`
- Contains: 24 Express Router modules
- Depends on: `server/db/supabase.ts` for data, `server/services/*` for complex operations
- Used by: HTTP clients via middleware chain

**Service Layer:**
- Purpose: External API integration, complex business workflows
- Location: `server/services/`
- Contains: AI agent, Meta Graph API, Evolution API, audio processing, validation, websocket, webhook handler
- Depends on: `server/db/supabase.ts`, external HTTP APIs
- Used by: Route handlers

**Data Layer:**
- Purpose: Database access
- Location: `server/db/`
- Contains: Supabase client wrapper, SQLite/Drizzle initialization, Drizzle schema
- Depends on: `@supabase/supabase-js`, `better-sqlite3`, `drizzle-orm`
- Used by: Routes and services

**Providers Layer:**
- Purpose: External SaaS integration configuration and client interfaces
- Location: `providers/*/`
- Contains: 15 provider directories, each with 7 files (config, client, testConnection, types, logs, webhooks, README)
- Depends on: Nothing from `server/` (standalone)
- Used by: Route handlers (imported directly)

## Data Flow

### Primary Request Path (Authenticated API)

1. HTTP request arrives at entry point (`server/index.ts` or `api/index.ts`)
2. Middleware stack processes: `helmet()` → `cors()` → `express.json()` → static files
3. `authMiddleware` extracts and verifies JWT Bearer token, looks up user in Supabase, checks customer status (`server/middleware/auth.ts:39`)
4. `requireRole`/`requirePermission` optionally checks user permissions against the defined `PERMISSIONS` map (`server/middleware/rbac.ts`)
5. Route handler processes the request:
   - Parses `tenant_id` from `x-tenant-id` header (or JWT)
   - Calls `getSupabase()` to get Supabase client
   - Runs CRUD queries directly
   - Optionally calls a service for external integration
6. JSON response returned

### WhatsApp Message Inbound Flow (Webhook)

1. Meta sends POST to `/api/webhooks/whatsapp` (`server/routes/webhooks.ts:29`)
2. Route iterates entries/changes, looks up tenant by `phone_number_id`
3. For each message: calls `processIncomingMessage()` (`server/services/webhook-handler.ts:32`)
   - Upserts contact by `wa_id`
   - Upserts conversation (open status)
   - Saves message record
   - Captures CTWA attribution data from referral
4. For each status: calls `processStatusUpdate()` (`server/services/webhook-handler.ts:158`)
5. Optionally sends to Flowise for AI response (inline in webhook route)

### AI Agent Response Flow (Evolution API Path)

1. Inbound message hits `/api/webhooks/evolution` (`server/routes/evolution.ts:12`)
2. Message parsed via `parseWebhookEvent()` (`server/services/evolution-api.ts:276`)
3. Contact/conversation upserted in Supabase
4. Audio messages downloaded and transcribed via Groq/OpenAI (`server/services/audio.ts:23`)
5. Conversation history fetched, knowledge base context built
6. `processWithAI()` called (`server/services/ai-agent.ts:238`)
   - System prompt built with agent identity + contact context
   - OpenAI-compatible chat completion called with function-calling tools
   - Tool calls executed against Supabase (update_contact, create_activity, transfer_to_human, etc.)
   - Follow-up completion called with tool results for final text
7. AI response saved as outbound message
8. Text sent back via Evolution API; optionally converted to speech via ElevenLabs

**State Management:**
- No server-side state; all data persisted in Supabase/SQLite
- JWT tokens carry auth state, stored in `localStorage` on client
- Socket.IO rooms manage real-time connection state per tenant/user/conversation
- Module-level singletons: `getSupabase()` lazily initializes Supabase client, `getIO()` holds Socket.IO server reference

## Key Abstractions

**AuthUser Interface:**
- Purpose: Standardized user object attached to Express `req.user`
- File: `server/middleware/auth.ts:12`
- Pattern: JWT payload + request decoration

**PERMISSIONS Map:**
- Purpose: String-based permission keys for RBAC (e.g. `contacts:view`, `chat:send`)
- File: `server/middleware/rbac.ts:4`
- Pattern: Enum-like object with `ROLE_PERMISSIONS` maps per role

**Provider 7-File Structure:**
- Purpose: Consistent external integration interface
- Location: `providers/*/`
- Pattern: Each provider has `config.ts`, `client.ts`, `testConnection.ts`, `types.ts`, `logs.ts`, `webhooks.ts`, `README.md`

**AgentResponse Interface:**
- Purpose: Structured output from AI agent processing
- File: `server/services/ai-agent.ts:228`
- Pattern: Contains text response, action results, audio flag, transfer flag

**WebSocket Room Namespacing:**
- Purpose: Targeted real-time event delivery
- File: `server/services/websocket.ts`
- Pattern: `tenant:{id}`, `user:{id}`, `conv:{id}` room naming with typed emit helpers

## Entry Points

**Local Development Server:**
- Location: `server/index.ts`
- Triggers: `npm run dev` (uses `tsx watch`)
- Responsibilities: Mount all routes, serve static files from `public/`, start HTTP server on PORT 3000, verify Supabase connection on startup

**Vercel Serverless Function:**
- Location: `api/index.ts`
- Triggers: HTTP requests to `/api/*` on Vercel
- Responsibilities: Mount all routes, export Express app as default (no static serving, no server start)

## Architectural Constraints

- **Threading:** Single-threaded Node.js event loop. Worker threads not used.
- **Global state:** Module-level singletons: Supabase client (`getSupabase()`), SQLite instance (`initSqlite()`), Socket.IO server (`io` variable in `server/services/websocket.ts`).
- **Circular imports:** No known circular dependency chains — route files import services and db modules directionally.
- **Dual data layer:** Schema in `server/db/schema.ts` is Drizzle SQLite (`sqlite-core`). The Supabase Postgres schema is maintained separately in `migrations/001_initial.sql`. Both must be kept in sync manually.
- **No dependency injection:** All modules use static imports and direct function calls. No IoC container or DI framework.
- **No ORM for production:** Supabase client uses raw table/query strings. Drizzle ORM is used only for local SQLite dev.

## Anti-Patterns

### Direct DB from Routes

**What happens:** Route handlers call `getSupabase()` and run queries inline rather than through a data-access layer. For example, `server/routes/crm.ts:13` queries Supabase directly inside the route handler.
**Why it's wrong:** Mixes HTTP concerns with data access, making it hard to unit test business logic without HTTP. No separation of concerns.
**Do this instead:** Extract query logic into service/repository modules. See only `server/services/ai-agent.ts` for the pattern where database operations are isolated from HTTP.

### @ts-nocheck Pervasive Usage

**What happens:** 18 out of 24 route files and 5 out of 7 service files begin with `// @ts-nocheck`. This disables TypeScript type checking entirely.
**Why it's wrong:** Nullifies the value of TypeScript — type errors, undefined access, and API mismatches go undetected at compile time.
**Do this instead:** Remove `@ts-nocheck` and add proper type annotations. Routes like `server/routes/admin.ts` demonstrate proper typing can be maintained.

### JSON.parse/stringify for Structured Fields

**What happens:** Many tables store arrays and objects as JSON strings (tags, custom_fields, settings, faq, knowledge_base). Routes parse these repeatedly with try/catch guards.
**Files:** `server/routes/agents.ts:34`, `server/routes/crm.ts:18`, `server/routes/integrations.ts:14`
**Why it's wrong:** Adds boilerplate, hides schema errors as silent fallbacks, prevents database-level validation.
**Do this instead:** Use PostgreSQL JSONB columns or Drizzle JSON column types for native JSON support.

### Dual Schema Maintenance

**What happens:** Database schema is defined in two places: `server/db/schema.ts` (Drizzle SQLite) and `migrations/001_initial.sql` (PostgreSQL for Supabase). The SQLite schema in `schema.ts` also imports `drizzle-orm/sqlite-core` while `drizzle.config.ts` targets PostgreSQL.
**Why it's wrong:** Schemas can diverge. Adding a column to one but not the other causes runtime errors depending on environment.
**Do this instead:** Use a single source of truth — either Drizzle migrations for both environments or keep separate files but enforce sync via automated checks.

## Error Handling

**Strategy:** try/catch in every route handler, returning `res.status(500).json({ error: e.message })`. This is consistent across all 24 route files.

**Patterns:**
- Every route handler wrapped in try/catch with `e: any` type
- Error response format: `{ error: string }` (Portuguese error messages)
- Silent try/catch for non-critical operations (audit logs, fallback queries)
- Webhooks always return 200 (even on error) to prevent Meta retries
- No centralized error handler middleware; each route self-handles

## Cross-Cutting Concerns

**Logging:** `console.log`/`console.error` throughout. No structured logging library. Log messages use emoji prefixes (📨, 🤖, 🔌, ✅, ❌).
**Validation:** Minimal request validation — routes check for required fields in `req.body` with early returns. No Zod/schema validation on requests (Zod is a dependency but unused).
**Authentication:** JWT-based with `authMiddleware` on all protected routes. Public routes: `/api/auth/*`, `/api/webhooks/*`, `/api/ping`.
**Rate Limiting:** Not implemented.
**Caching:** Not implemented.
**CORS:** Wide open (`cors()` with no origin restriction).

---

*Architecture analysis: 2026-06-19*
