# Codebase Structure

**Analysis Date:** 2026-06-22

## Directory Layout

```
ozion-chat-ai/
├── api/                    # Vercel serverless entrypoint
│   └── index.ts            # Express app for Vercel (no app.listen)
│
├── server/                 # Core backend application
│   ├── index.ts            # Local dev Express server (app.listen)
│   ├── db/                 # Database layer
│   │   ├── index.ts        # SQLite lazy init & proxy
│   │   ├── schema.ts       # Drizzle ORM schema (30 SQLite tables)
│   │   ├── schema-deploy.ts# Drizzle schema for deploy/changelog/backup
│   │   └── supabase.ts     # Supabase JS client + query helpers
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts         # JWT verification + role middleware
│   │   └── rbac.ts         # Permission definitions + check middleware
│   ├── routes/             # HTTP route handlers (25 files)
│   │   ├── auth.ts         # Login/logout/me/impersonate
│   │   ├── admin.ts        # Admin panel operations
│   │   ├── agents.ts       # AI agent CRUD
│   │   ├── analytics.ts    # Analytics events
│   │   ├── chat.ts         # Conversations + messages + toggle
│   │   ├── contacts.ts     # Contact CRUD
│   │   ├── crm.ts          # CRM-specific endpoints
│   │   ├── ctwa.ts         # Click-to-WhatsApp Ads
│   │   ├── deploy.ts       # Deployment management
│   │   ├── evolution.ts    # Evolution API integration
│   │   ├── flowise.ts      # Flowise API integration
│   │   ├── flows.ts        # Flow builder CRUD
│   │   ├── health.ts       # System health checks
│   │   ├── inbox.ts        # Inbox conversations + messages
│   │   ├── integrations.ts # External integration CRUD
│   │   ├── logs.ts         # System logs
│   │   ├── messages.ts     # Message send/list/status
│   │   ├── plans.ts        # Subscription plans CRUD
│   │   ├── sales.ts        # Sales tracking
│   │   ├── spa.ts          # SPA fallback
│   │   ├── tags.ts         # Tag management
│   │   ├── updates.ts      # Changelog/updates
│   │   ├── voice.ts        # Voice settings
│   │   ├── webhooks.ts     # WhatsApp webhook receiver
│   │   └── whatsapp.ts     # WhatsApp OAuth/setup
│   ├── services/           # Business logic layer
│   │   ├── ai-agent.ts     # AI agent with function calling
│   │   ├── audio.ts        # Audio processing
│   │   ├── contact-events.ts# Contact event tracking
│   │   ├── contact-timeline.ts# Unified timeline builder
│   │   ├── evolution-api.ts# Evolution API client
│   │   ├── media-library.ts# Media file management
│   │   ├── message-status-history.ts# Status transition logging
│   │   ├── meta-api.ts     # Meta Cloud API client (422 lines)
│   │   ├── normalizers/    # Webhook payload normalizers
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── meta-normalizer.ts
│   │   │   └── evolution-normalizer.ts
│   │   ├── providers/      # WhatsApp message provider abstraction
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── meta-provider.ts
│   │   │   └── evolution-provider.ts
│   │   ├── webhook-events.ts# Idempotency + event tracking
│   │   ├── webhook-handler.ts# Inbound message processing
│   │   └── websocket.ts    # Socket.IO server + emit helpers
│   └── lib/
│       └── encryption.ts   # AES encrypt/decrypt, SHA256 hash
│
├── providers/              # External service integrations (15 dirs)
│   ├── stripe/             # Payment processing
│   ├── asaas/              # Brazilian billing
│   ├── mercadopago/        # Brazilian payments
│   ├── hotmart/            # Digital products
│   ├── kiwify/             # Digital products
│   ├── perfectpay/         # Payment gateway
│   ├── utmify/             # UTM tracking
│   ├── openai/             # AI API client
│   ├── claude/             # Anthropic API client
│   ├── gemini/             # Google AI client
│   ├── deepseek/           # Deepseek API client
│   ├── groq/               # Groq API client
│   ├── elevenlabs/         # Text-to-speech
│   ├── meta/               # Meta/Facebook Graph API
│   └── webhook/            # Custom webhook sender
│   └── (each has: config.ts, client.ts, types.ts, testConnection.ts, logs.ts, webhooks.ts, README.md)
│
├── public/                 # Frontend SPA (deployed to Vercel)
│   ├── index.html          # App shell (17 lines)
│   ├── chat.html           # Standalone chat page
│   ├── js/
│   │   ├── ozion.js        # Main SPA (~4890 lines) — all views, auth, routing
│   │   └── inbox.js        # Inbox module (~276 lines)
│   └── css/
│       ├── ozion.css       # Dark SaaS theme (~549 lines)
│       └── styles.css
│
├── migrations/             # SQL migration files (6 files)
│   ├── 001_initial.sql
│   ├── 002_saas_multitenant.sql
│   ├── 003_contact_timeline.sql
│   ├── 005_add_provider_to_credentials.sql
│   ├── 006_webhook_events.sql
│   └── 007_message_status_events.sql
│
├── tests/                  # Test files (7 files)
│   ├── contact-timeline.test.ts
│   ├── extract-media-info.test.ts
│   ├── inbox.test.ts
│   ├── message-status-history.test.ts
│   ├── normalizers.test.ts
│   ├── provider-abstraction.test.ts
│   └── webhook-events.test.ts
│
├── scripts/                # Operational scripts
│   ├── deploy.sh           # Deploy to Railway/Vercel
│   ├── rollback.sh         # Rollback deployment
│   ├── backup.sh           # Database backup
│   ├── changelog.sh        # Changelog generator
│   └── run-migration.ts    # Manual migration runner
│
├── config/                 # Environment config files
│   ├── .env.development
│   ├── .env.staging
│   └── .env.production
│
├── docs/                   # Project documentation
│   └── superpowers/specs/  # Design specs
│
├── data/                   # Local SQLite database files
│   ├── ozion.db
│   ├── ozion.db-wal
│   └── ozion.db-shm
│
├── .github/workflows/      # CI/CD pipelines
│   ├── deploy.yml
│   ├── backup.yml
│   └── version.yml
│
├── .planning/              # GSD planning artifacts
│   ├── PROJECT.md
│   ├── ROADMAP.md
│   ├── STATE.md
│   ├── config.json
│   └── phases/
│       └── 01-utalk-foundation/
│
├── root files:
│   ├── package.json        # Dependencies + scripts
│   ├── tsconfig.json       # TypeScript config (ESNext, bundler)
│   ├── vercel.json         # Vercel deployment config
│   ├── drizzle.config.ts   # Drizzle Kit config (points to schema.ts)
│   ├── railway.json        # Railway deployment config
│   ├── seed.ts             # DB seed script
│   ├── .env.example        # Environment variable template
│   └── index.html          # Legacy root index (not production app)
│
├── LEGACY ROOT (not primary app):
│   ├── index.html          # Legacy homepage
│   ├── js/app.js           # Legacy JS
│   └── css/styles.css      # Legacy CSS
│
└── LEGACY DOCS:
    ├── ctwa.html           # Click-to-WhatsApp Ads doc
    ├── WHATSAPP_INTEGRATION_ARCHITECTURE.md
    ├── WEBHOOK_EVENTS_IDEMPOTENCY_PHASE_3.md
    ├── WEBHOOK_EVENTS_IDEMPOTENCY_PHASE_3_VERIFICATION.md
    └── NORMALIZERS_STATUS_HISTORY_PHASE_4_VERIFICATION.md
```

## Directory Purposes

**`api/`:**
- Purpose: Vercel serverless entrypoint. Express app without `app.listen()`.
- Contains: Single `index.ts` file that imports all routes identically to `server/index.ts`.
- Key files: `api/index.ts`
- Important: This is the PRODUCTION entrypoint. `server/index.ts` is the LOCAL DEV entrypoint.

**`server/`:**
- Purpose: All backend TypeScript code — routes, services, middleware, database.
- Contains: 6 subdirectories, ~30 source files.
- Key files: `server/index.ts` (dev entrypoint), `server/db/schema.ts` (data model).

**`server/routes/`:**
- Purpose: HTTP route handlers — one file per domain (auth, chat, crm, webhooks, etc.).
- Contains: 25 route files. Each exports a `Router` with Express route definitions.
- Pattern: `Router()` → define routes → `export default router;`

**`server/services/`:**
- Purpose: Business logic and external integrations.
- Contains: 13 service files + 2 subdirectories (`normalizers/`, `providers/`).
- Key files: `webhook-handler.ts`, `ai-agent.ts`, `meta-api.ts`, `websocket.ts`.

**`server/db/`:**
- Purpose: Database connection management and schema definitions.
- Contains: Schema definitions (`schema.ts`, `schema-deploy.ts`), Supabase client (`supabase.ts`), SQLite initialization (`index.ts`).
- Key files: `schema.ts` (30 Drizzle tables), `supabase.ts` (production client + helpers).

**`providers/`:**
- Purpose: External third-party API integrations with standardized structure.
- Contains: 15 provider directories, each with 6 standard files + README.
- Pattern: Each provider has `config.ts` (env config), `client.ts` (API client), `types.ts` (types), `testConnection.ts`, `logs.ts`, `webhooks.ts`.

**`public/`:**
- Purpose: Frontend SPA served as static files.
- Contains: HTML shell, ~5,166 lines of vanilla JS across 2 files, CSS theme.
- Key files: `index.html` (app shell), `js/ozion.js` (main SPA), `js/inbox.js` (inbox UI module), `css/ozion.css` (design system).

**`migrations/`:**
- Purpose: SQL migration files for Supabase PostgreSQL schema changes.
- Contains: 6 numbered migration files. Run manually or via deploy process.

**`tests/`:**
- Purpose: Unit and integration tests.
- Contains: 7 test files. Run with `node --test --import tsx tests/<file>.test.ts`.

**`scripts/`:**
- Purpose: Operational and deployment shell scripts.
- Contains: 5 scripts. Used for deploy, rollback, backup, changelog generation.

**`config/`:**
- Purpose: Environment-specific configuration.
- Contains: `.env.development`, `.env.staging`, `.env.production` (not committed to git — tracked via `.gitignore`).

**`.github/workflows/`:**
- Purpose: GitHub Actions CI/CD pipelines.
- Contains: 3 workflows — deploy (on push to main), backup (scheduled), version (tag management).

## Key File Locations

**Entry Points:**
- `server/index.ts`: Local development server (Express + Socket.IO)
- `api/index.ts`: Vercel production serverless entrypoint
- `public/index.html`: SPA HTML shell
- `public/js/ozion.js`: SPA JavaScript bootstrap (function `render()` and `api()`)

**Configuration:**
- `package.json`: Dependencies and npm scripts
- `tsconfig.json`: TypeScript compiler options
- `vercel.json`: Vercel deployment routing (rewrites SPA paths)
- `drizzle.config.ts`: Drizzle Kit config for schema management
- `.env.example`: Template for required environment variables

**Database:**
- `server/db/schema.ts`: All Drizzle table definitions
- `server/db/supabase.ts`: Supabase client with CRUD helpers (query, insert, update, remove, rpc)
- `server/db/index.ts`: SQLite lazy initialization (dev only)

**Core Business Logic:**
- `server/services/webhook-handler.ts`: Inbound WhatsApp message processing pipeline
- `server/services/webhook-events.ts`: Webhook idempotency tracking
- `server/services/ai-agent.ts`: AI agent with OpenAI-compatible API + function calling
- `server/services/meta-api.ts`: Meta Cloud API client (token exchange, message send, phone number management)
- `server/services/websocket.ts`: Socket.IO server + broadcast helpers

**Testing:**
- `tests/`: 7 test files using Node.js native test runner with `tsx`

## Naming Conventions

**Files:**
- `kebab-case.ts` for all TypeScript files (e.g., `contact-timeline.ts`, `message-status-history.ts`, `webhook-handler.ts`)
- Standard names within providers: `config.ts`, `client.ts`, `types.ts`, `testConnection.ts`, `logs.ts`, `webhooks.ts`, `README.md`

**Directories:**
- `kebab-case` throughout (e.g., `server/routes/`, `server/services/`, `providers/stripe/`, `.github/workflows/`)
- Route files are singular nouns matching the domain (e.g., `auth.ts`, `chat.ts`, `sales.ts`, `tags.ts`)

**Routes:**
- Pattern: `router.get('/resource', handler)` and `router.post('/resource', handler)`
- Nested resources: `GET /:id`, `POST /:id/action`

**Services:**
- Functions named with verb prefixes: `processIncomingMessage`, `processStatusUpdate`, `processWithAI`, `sendByProvider`, `getProviderForTenant`
- Exported types use PascalCase: `AgentContext`, `AgentResponse`, `TimelineItem`, `NormalizedMessage`

**Database Schema:**
- Table names: `snake_case` plural (e.g., `whatsapp_credentials`, `contact_events`, `flow_blocks`)
- Column names: `snake_case` (e.g., `tenant_id`, `phone_number_id`, `last_message_at`)
- Drizzle field names: `camelCase` mapped to `snake_case` (e.g., `tenantId: text('tenant_id')`)

**Environment Variables:**
- `SCREAMING_SNAKE_CASE` (e.g., `SUPABASE_URL`, `JWT_SECRET`, `META_APP_SECRET`)

## Where to Add New Code

**New Feature:**
- Primary code: Create new route in `server/routes/<name>.ts` and register it in both `server/index.ts` and `api/index.ts`
- Business logic: Add service function in `server/services/` if logic is non-trivial
- Frontend: Add view rendering function in `public/js/ozion.js` and hook into the `render()` switch-case

**New External Integration:**
- Create directory in `providers/<name>/` with the 6 standard files (`config.ts`, `client.ts`, `types.ts`, `testConnection.ts`, `logs.ts`, `webhooks.ts`, `README.md`)
- If it needs a webhook receiver, add route in `server/routes/webhooks.ts` or create a new webhook route

**New WhatsApp Provider:**
- Create provider class implementing `MessageProvider` interface in `server/services/providers/<name>-provider.ts`
- Add normalizer functions in `server/services/normalizers/`
- Register in `server/services/providers/index.ts` factory function

**New Database Table:**
- Add Drizzle table definition in `server/db/schema.ts`
- Create corresponding migration in `migrations/<number>_<name>.sql` for Supabase
- Note: Schema changes must be applied to both SQLite (via code) and PostgreSQL (via migration)

**New Test:**
- Add to `tests/<name>.test.ts`
- Run with: `node --test --import tsx tests/<name>.test.ts`

**New UI View:**
- Write render function in `public/js/ozion.js` or create new JS module in `public/js/`
- Add CSS in `public/css/ozion.css`
- Register navigation in the sidebar render section of `ozion.js`

## Special Directories

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes
- Committed: No

**`.planning/`:**
- Purpose: GSD workflow artifacts — project plan, roadmap, phase plans
- Generated: Yes (by GSD system)
- Committed: Yes

**`.vercel/`:**
- Purpose: Vercel project configuration cache
- Generated: Yes
- Committed: No

**`.worktrees/`:**
- Purpose: Isolated git worktrees for feature development
- Generated: Yes
- Committed: No (gitignored)

**`data/`:**
- Purpose: Local SQLite database for development
- Contains: `ozion.db`, WAL, SHM files
- Generated: Yes (on dev server start)
- Committed: No

**`dist/`:**
- Purpose: Compiled TypeScript output (`tsc` build)
- Generated: Yes
- Committed: No

**`drizzle/`:**
- Purpose: Generated migration files from Drizzle Kit (not currently present — configured in `drizzle.config.ts`)
- Generated: Yes
- Committed: TBD

---

*Structure analysis: 2026-06-22*
