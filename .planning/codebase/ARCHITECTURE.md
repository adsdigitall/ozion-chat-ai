<!-- refreshed: 2026-06-22 -->
# Architecture

**Analysis Date:** 2026-06-22

## System Overview

```text
┌──────────────────────────────────────────────────────────────────┐
│                     PUBLIC FRONTEND (SPA)                         │
│           `public/index.html` + `public/js/ozion.js`              │
│           `public/js/inbox.js` + `public/css/ozion.css`           │
├──────────────┬───────────────────────────┬────────────────────────┤
│              │                           │                        │
│  HTTP API    │   WebSocket (socket.io)   │   Static Assets        │
│  /api/*      │   /ws                     │   /css/, /js/          │
└──────┬───────┴──────────────┬────────────┴────────────────────────┘
       │                      │
       ▼                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                     EXPRESS.JS SERVER LAYER                       │
│   `server/index.ts` (local dev, ESM)                             │
│   `api/index.ts` (Vercel serverless entrypoint)                  │
├──────────────────────────────────────────────────────────────────┤
│  MIDDLEWARE              │  ROUTES                    │ SERVICES │
│  `auth.ts` (JWT)         │  25 route files            │ 13 srv   │
│  `rbac.ts` (perms)       │  `/api/{auth,webhooks,     │ files    │
│                          │   crm,chat,messages,...}`  │          │
├──────────────┬───────────────────────────┬────────────────────────┤
│  PROVIDERS   │  NORMALIZERS              │  DB LAYER              │
│  (15 ext)    │  (2 + types)              │  `db/`                 │
│  stripe,     │  meta-normalizer          │  schema.ts (Drizzle)   │
│  claude,     │  evolution-normalizer     │  supabase.ts (client)  │
│  openai,     │                           │  index.ts (SQLite dev) │
│  meta, ...   │                           │                         │
└──────┬───────┴──────────────┬────────────┴────────────────────────┘
       │                      │
       ▼                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                      │
│  Supabase PostgreSQL (production)                                 │
│  SQLite via better-sqlite3 (local dev, `data/ozion.db`)            │
│  Drizzle ORM schema in `server/db/schema.ts`                       │
│  SQL migrations in `migrations/*.sql`                              │
└──────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | Files |
|-----------|----------------|-------|
| **Routes** | HTTP request handling, parameter extraction, response formatting | `server/routes/*.ts` (25 files) |
| **Middleware** | Request pre-processing (auth, permissions, plan limits) | `server/middleware/auth.ts`, `server/middleware/rbac.ts` |
| **Services** | Business logic, external API integration, data processing | `server/services/*.ts` (13 files) |
| **DB Layer** | Database connection, schema definitions, query helpers | `server/db/*.ts` (4 files) |
| **Providers** | WhatsApp messaging abstraction (Meta, Evolution) | `server/services/providers/*.ts` |
| **Normalizers** | Webhook payload normalization to unified types | `server/services/normalizers/*.ts` |
| **External Providers** | Third-party integrations (Stripe, Claude, OpenAI, etc.) | `providers/*/` (15 directories) |
| **Frontend SPA** | Single-page application (vanilla JS, no framework) | `public/index.html`, `public/js/ozion.js`, `public/js/inbox.js`, `public/css/ozion.css` |
| **CI/CD** | GitHub Actions workflows for deploy, backup, versioning | `.github/workflows/*.yml` |

## Pattern Overview

**Overall:** Modular monolith with route-service-database layering. Express.js handles all HTTP, Socket.IO handles real-time. External integrations abstracted behind provider interfaces and normalizer types.

**Key Characteristics:**
- **Thin routes, thick services** — Routes extract request params and delegate to services. Services contain business logic.
- **Fire-and-forget error handling** — Many try/catch blocks silently swallow non-critical errors (especially webhook processing and audit logging).
- **Tenant-scoped data access** — Every query filters by `tenant_id` from JWT or `x-tenant-id` header.
- **Dual data layer** — Drizzle schema written for SQLite (local dev), Supabase JS client used in production. No shared query abstraction between the two.
- **Serverless-compatible** — Both `server/index.ts` (long-running) and `api/index.ts` (Vercel serverless) share the same route imports.

## Layers

**Routes Layer:**
- Purpose: HTTP request handling, parameter extraction, response formatting
- Location: `server/routes/`
- Contains: 25 route modules, each exporting an Express `Router`
- Depends on: `server/db/supabase.js`, `server/middleware/auth.js`, services
- Used by: `server/index.ts` and `api/index.ts`

**Services Layer:**
- Purpose: Business logic, integration orchestration, data transformation
- Location: `server/services/`
- Contains: AI agent, webhook processing, message sending, contact timeline, audio, media library, message status history, WebSocket management
- Depends on: `server/db/supabase.js`, `server/db/index.js` (SQLite), external APIs
- Used by: Routes layer

**Provider Abstraction Layer:**
- Purpose: Unified interface for WhatsApp message providers (Meta Cloud API, Evolution API)
- Location: `server/services/providers/`
- Contains: `MessageProvider` interface, Meta implementation, Evolution implementation, factory (`sendByProvider`)
- Depends on: `server/db/supabase.js` (for credential lookup)
- Used by: Routes (`messages.ts`, `inbox.ts`)

**Normalizer Layer:**
- Purpose: Transform provider-specific webhook payloads into unified types
- Location: `server/services/normalizers/`
- Contains: `NormalizedMessage`, `NormalizedStatusUpdate` types; Meta and Evolution normalizers
- Used by: `server/services/webhook-handler.ts`

**Database Layer:**
- Purpose: Data access, schema definition, connection management
- Location: `server/db/`
- Contains:
  - `schema.ts`: Drizzle ORM schema (SQLite dialect) — 30 tables
  - `schema-deploy.ts`: Additional Drizzle tables for deployment/changelog/backup tracking
  - `supabase.ts`: Supabase JS client with query helper functions
  - `index.ts`: Lazy SQLite initialization via better-sqlite3 proxy
- Used by: Routes, Services

**External Providers Layer:**
- Purpose: Third-party API integrations with standardized file structure
- Location: `providers/*/`
- Contains: Each provider has `config.ts`, `client.ts`, `types.ts`, `testConnection.ts`, `logs.ts`, `webhooks.ts`, `README.md`
- Providers: stripe, claude, asaas, openai, gemini, deepseek, elevenlabs, groq, hotmart, kiwify, mercadopago, meta, perfectpay, utmify, webhook
- Depends on: Environment variables for API keys

## Data Flow

### Primary Request Path (Authenticated API)

1. **Client Request** — SPA (`ozion.js`) makes `fetch()` call with `Authorization: Bearer <token>` header (`public/js/ozion.js`)
2. **Express Router** — `server/index.ts` or `api/index.ts` routes to the matching route module
3. **Auth Middleware** — `server/middleware/auth.ts` verifies JWT, checks user exists and is active, checks customer suspension
4. **Route Handler** — Route file extracts params/body/query, may check RBAC (`server/middleware/rbac.ts`)
5. **Service Call** — Route delegates to a service function or calls Supabase directly
6. **Data Access** — `getSupabase()` returns Supabase client, queries run with tenant_id filter
7. **Response** — Route sends JSON response to client

### Webhook Message Flow (Inbound WhatsApp)

1. **Meta Webhook POST** — `POST /api/webhooks/whatsapp` receives message payload
2. **Signature Verification** — Verifies `x-hub-signature-256` with META_APP_SECRET
3. **Tenant Resolution** — Looks up `whatsapp_credentials` by `phone_number_id`
4. **Idempotency Check** — `server/services/webhook-events.ts` creates event with unique key; skips duplicates
5. **Message Processing** — `processIncomingMessage()` in `webhook-handler.ts`:
   - Upserts contact (creates if new `wa_id`)
   - Extracts CTWA ad data from referral
   - Upserts conversation (creates if no open one exists)
   - Saves message
6. **Status Updates** — `processStatusUpdate()` updates message delivery/read status, records status event
7. **AI Processing** — If Flowise configured, sends message text to Flowise API and replies via WhatsApp

### Message Sending Flow (Outbound)

1. **Client sends message** — `POST /api/inbox/conversations/:id/send`
2. **Route handler** validates input, inserts message record with status `pending`
3. **Provider dispatch** — `sendByProvider()` in `server/services/providers/index.ts`:
   - Looks up `whatsapp_credentials` for tenant
   - Creates appropriate provider instance (Meta or Evolution)
   - Calls `provider.sendText({to, text})`
4. **Message status update** — Updates DB record to `sent` or `failed` based on provider response
5. **Real-time broadcast** — Via Socket.IO to tenant room and conversation room

### State Management

**Backend:** Stateless HTTP — all state in database. JWT contains user identity and permissions. No in-memory session state beyond singleton clients (Supabase, SQLite).

**Frontend:** Module-level singletons in `ozion.js` — global arrays for conversations, contacts, flows, agents, etc. Page rendering clears and re-renders the `#app` element. A `render()` function switches between page modes based on `currentPage`.

## Key Abstractions

**MessageProvider Interface:**
- Purpose: Unified contract for WhatsApp message sending across different backends
- File: `server/services/providers/types.ts`
- Methods: `sendText`, `sendTemplate`, `sendMedia`, `sendButton?`, `sendList?`
- Implementations: `MetaMessageProvider` (`server/services/providers/meta-provider.ts`), `EvolutionMessageProvider` (`server/services/providers/evolution-provider.ts`)
- Usage: Routes call `sendByProvider(tenantId, fn)` which resolves the provider and calls the function

**NormalizedMessage / NormalizedStatusUpdate:**
- Purpose: Provider-agnostic types for webhook event payloads
- File: `server/services/normalizers/types.ts`
- Normalizers: `normalizeMetaMessage`, `normalizeEvolutionMessage`, `normalizeMetaStatusUpdate`, `normalizeEvolutionStatusUpdate`
- Used by: Webhook processing pipeline for unified event handling

**Webhook Event Idempotency:**
- Purpose: Deduplication of incoming webhook events
- File: `server/services/webhook-events.ts`
- Key function: `getWebhookEventIdempotencyKey(provider, eventType, providerEventId)`
- Pattern: Unique constraint on `(tenant_id, provider, event_id)`; duplicate detection before processing

**Contact Timeline Builder:**
- Purpose: Unify messages, notes, tasks, and system events into a chronological feed
- File: `server/services/contact-timeline.ts`
- Type: Pure function (`buildContactTimeline`) — no DB calls. Accepts categorized inputs, returns sorted `TimelineItem[]`

**Authentication System:**
- JWT-based with custom `AuthUser` type attached to Express `Request.user`
- Roles: `admin`, `owner`, `manager`, `agent`, `financial`
- Permission strings: `resource:action` format (e.g., `contacts:view`, `chat:send`)
- RBAC middleware: `requirePermission()`, `checkPlanLimit()`
- File: `server/middleware/auth.ts`, `server/middleware/rbac.ts`

## Entry Points

**Local Dev Server:**
- Location: `server/index.ts`
- Triggers: `npm run dev` (via `tsx watch`)
- Responsibilities: Starts Express on PORT, registers all routes + middleware + static file serving, initializes Supabase connection check, exports `app` for testing

**Vercel Production:**
- Location: `api/index.ts`
- Triggers: Vercel serverless invocation via `api/(.*)` rewrite
- Responsibilities: Same route registration as local server but without `app.listen()`. Exports Express app as default for Vercel's serverless runtime
- Build: `vercel.json` rewrites `/api/(.*)` → `api/index.ts` and SPA routes → `/index.html`

**SPA Bootstrap:**
- Location: `public/js/ozion.js`
- Triggers: `public/index.html` page load
- Responsibilities: Handles routing (hash-based pages via `currentPage`), auth state, API calls, rendering all management views

## Architectural Constraints

- **Threading:** Single-threaded Node.js event loop. WebSocket connections via Socket.IO. No worker threads or clustering used.
- **Global state:** 
  - `server/db/supabase.ts` — `let supabase` singleton client
  - `server/db/index.ts` — `let sqlite` and `let _db` singletons for SQLite
  - `server/services/websocket.ts` — `let io` singleton Socket.IO server
  - `public/js/ozion.js` — All state in module-level mutable globals (arrays, objects)
- **Circular imports:** Not detected in current structure (services import DB, routes import services, no reverse dependency)
- **Tenant isolation:** Enforced via `tenant_id` filter on all queries. No row-level security or database-level tenant enforcement — purely application-level.
- **Database duality:** Schema written for Drizzle/SQLite dialect, but production uses raw Supabase JS client. Local SQLite schema may drift from production PostgreSQL schema.

## Anti-Patterns

### Try-Catch Swallowing

**What happens:** Many catch blocks silently ignore errors, especially in non-critical paths (audit logging, analytics, CTWA attribution). Comments like `// ignore if audit_logs table doesn't exist` and blank `catch (e) {}` blocks are common.
**Why it's wrong:** Silently swallowed errors make debugging production issues difficult and hide schema drift between environments.
**Do this instead:** Log the error with `console.warn()` at minimum, and check table existence upfront or handle gracefully with logging. See `server/routes/auth.ts` lines 85-95, 180-195, 317-328.

### Dual Database Access Patterns

**What happens:** The Drizzle schema (`server/db/schema.ts`) is defined for SQLite and kept in sync manually, but production code uses `supabase.from(table).select(...)` directly without Drizzle. There is no shared ORM layer — raw string table names are used in production queries.
**Why it's wrong:** Schema changes require updating both the Drizzle SQLite schema and the Supabase PostgreSQL tables (via SQL migrations). They can drift apart silently.
**Do this instead:** Use a single ORM/SDK for both environments, or auto-generate migrations from the Drizzle schema. See `server/db/schema.ts` vs `server/routes/*.ts` (raw `sb.from('table_name')` calls).

### Legacy Route Patterns

**What happens:** Several route files use `// @ts-nocheck` at the top (e.g., `server/routes/crm.ts`, `webhooks.ts`, `chat.ts`), bypassing TypeScript type checking. Some routes (crm.ts, chat.ts) use `x-tenant-id` header instead of the JWT-based `req.user.tenant_id` for tenant resolution.
**Why it's wrong:** `@ts-nocheck` hides real type errors and makes refactoring riskier. Header-based tenant resolution bypasses the auth middleware pattern.
**Do this instead:** Remove `@ts-nocheck` and fix type issues. Use `req.user.tenant_id` consistently.

### Inline Provider API Calls in Routes

**What happens:** The webhook route (`server/routes/webhooks.ts`) contains inline functions for calling Flowise API and sending WhatsApp messages, rather than delegating to service modules.
**Why it's wrong:** The route file is 240+ lines, mixing HTTP handling with integration logic. The same WhatsApp sending logic exists in both `webhooks.ts` and `messages.ts`.
**Do this instead:** Move Flowise and WhatsApp sending functions to appropriate service files.

## Error Handling

**Strategy:** Try-catch at route handler level with `500` JSON error response. Non-critical failures are silently swallowed.

**Patterns:**
- Route handlers: `try { ... } catch (e: any) { res.status(500).json({ error: e.message }) }`
- Service functions: Return error strings in result objects rather than throwing
- Webhook processing: Non-fatal errors logged with `console.warn()` but do not prevent `200 OK` response
- Auth failures: Specific HTTP status codes (401 for invalid token, 403 for insufficient permissions)
- `@ts-nocheck` files: Many errors suppressed entirely

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.error` throughout — no structured logging library. Server startup, webhook events, message send/recv, and errors are logged.

**Validation:** No centralized validation layer. Route handlers validate required fields manually with early returns. Zod is in `package.json` dependencies but is not used in routes or services.

**Authentication:** JWT-based with Bearer token header. `authMiddleware` runs before protected routes. Token contains `id, email, name, role, tenant_id, customer_id, permissions, is_master`. Expires in 7 days.

**Authorization:** Two-layer RBAC system:
1. Role-based: `requireRole('admin', 'owner')` checks role string
2. Permission-based: `requirePermission('contacts:view')` checks against `ROLE_PERMISSIONS` map
3. Plan limits: `checkPlanLimit()` middleware checks resource usage vs plan caps

**CORS:** Wide open — `cors()` with no origin restriction.

**Static Files:** Served from `public/` directory on `/` path in production (Vercel) and local dev.

---

*Architecture analysis: 2026-06-22*
