# Codebase Structure

**Analysis Date:** 2026-06-19

## Directory Layout

```
ozion-chat-ai/
├── api/
│   └── index.ts                  # Vercel serverless entry point
├── config/
│   ├── .env.development           # Dev environment overrides
│   ├── .env.production            # Prod environment overrides
│   └── .env.staging               # Staging environment overrides
├── css/
│   └── styles.css                 # Legacy styles (not production SPA)
├── data/
│   ├── ozion.db                   # Local SQLite database
│   ├── ozion.db-shm              # SQLite shared memory
│   └── ozion.db-wal              # SQLite WAL log
├── docs/
│   └── superpowers/mockups/       # UI mockup HTML files
├── js/
│   └── app.js                    # Legacy JS (not production SPA)
├── migrations/
│   ├── 001_initial.sql           # Core schema (PostgreSQL/Supabase)
│   ├── 002_saas_multitenant.sql   # SaaS multi-tenant extensions
│   └── 003_flow_controls.sql      # Flow builder extensions
├── providers/
│   ├── asaas/                    # Asaas payment provider
│   ├── claude/                   # Claude AI provider
│   ├── deepseek/                 # DeepSeek AI provider
│   ├── elevenlabs/               # ElevenLabs voice provider
│   ├── gemini/                   # Gemini AI provider
│   ├── groq/                     # Groq AI provider
│   ├── hotmart/                  # Hotmart payment provider
│   ├── kiwify/                   # Kiwify payment provider
│   ├── mercadopago/              # Mercado Pago payment provider
│   ├── meta/                     # Meta Cloud API provider
│   ├── openai/                   # OpenAI provider
│   ├── perfectpay/               # PerfectPay payment provider
│   ├── stripe/                   # Stripe payment provider
│   ├── utmify/                   # UTMify tracking provider
│   └── webhook/                  # Generic webhook provider
├── public/
│   ├── chat.html                 # Standalone chat page
│   ├── css/
│   │   ├── ozion.css             # SPA styles (production)
│   │   └── styles.css            # Additional styles
│   ├── index.html                # SPA shell (production)
│   └── js/
│       └── ozion.js              # SPA JavaScript (~4,890 lines)
├── scripts/
│   └── run-migration.ts          # Migration runner script
├── server/
│   ├── index.ts                  # Local dev entry point
│   ├── db/
│   │   ├── index.ts              # SQLite + Drizzle initialization
│   │   ├── schema.ts             # Drizzle SQLite schema (all tables)
│   │   ├── schema-deploy.ts      # Deploy/system tables schema
│   │   └── supabase.ts           # Supabase client + query helpers
│   ├── lib/
│   │   └── encryption.ts         # AES/SHA256 encryption utilities
│   ├── middleware/
│   │   ├── auth.ts               # JWT auth middleware + AuthUser type
│   │   └── rbac.ts               # RBAC permissions + role definitions
│   ├── routes/
│   │   ├── admin.ts              # Admin: customers, plans, users, stats
│   │   ├── agents.ts             # AI agents CRUD + test endpoint
│   │   ├── analytics.ts          # Dashboard stats + timeline
│   │   ├── auth.ts               # Login, logout, change password, impersonate
│   │   ├── chat.ts               # Conversations, messages, risk words, transfer
│   │   ├── contacts.ts           # Contacts CRUD (alternate route)
│   │   ├── crm.ts                # CRM: contacts CRUD, import/export
│   │   ├── ctwa.ts               # CTWA campaigns, attributions, Meta CAPI
│   │   ├── deploy.ts             # Deployment management
│   │   ├── evolution.ts          # Evolution API webhook + AI orchestration
│   │   ├── flowise.ts            # Flowise AI integration
│   │   ├── flows.ts              # Flow builder CRUD + blocks + edges
│   │   ├── health.ts             # System health check endpoints
│   │   ├── integrations.ts       # External integration CRUD + providers list
│   │   ├── logs.ts               # System event logs
│   │   ├── messages.ts           # Messages CRUD + conversation endpoints
│   │   ├── plans.ts              # Subscription plan management
│   │   ├── sales.ts              # Sales/pipeline management
│   │   ├── spa.ts                # SPA catch-all route
│   │   ├── tags.ts               # Tags CRUD
│   │   ├── updates.ts            # System updates/changelog
│   │   ├── voice.ts              # Voice profiles CRUD + providers list
│   │   ├── webhooks.ts           # WhatsApp Meta webhook receiver
│   │   └── whatsapp.ts           # WhatsApp credential OAuth flow
│   ├── services/
│   │   ├── ai-agent.ts           # AI agent with function calling
│   │   ├── audio.ts              # Audio download, transcription, TTS
│   │   ├── evolution-api.ts      # Evolution API client (Baileys WhatsApp)
│   │   ├── meta-api.ts           # Meta Graph API client (WhatsApp Business)
│   │   ├── validate-flow.ts      # Flow validation logic
│   │   ├── webhook-handler.ts    # Inbound webhook processing
│   │   └── websocket.ts          # Socket.IO real-time server
│   └── types/                    # (Empty directory - types in-line)
├── .env.example                  # Environment variable template
├── .github/                      # GitHub Actions/workflows
├── .vercel/                      # Vercel project config
├── .worktrees/                   # Git worktrees (ignored)
├── .planning/                    # GSD planning artifacts
├── ctwa.html                     # Click-to-WhatsApp Ads landing page
├── index.html                    # Legacy root HTML (not production)
├── drizzle.config.ts             # Drizzle Kit configuration
├── package.json                  # Dependencies + scripts
├── railway.json                  # Railway deployment config
├── seed.ts                       # Database seed script
├── tsconfig.json                 # TypeScript configuration
├── vercel.json                   # Vercel deployment config
└── WHATSAPP_INTEGRATION_ARCHITECTURE.md  # WhatsApp integration docs
```

## Directory Purposes

**`server/routes/`:**
- Purpose: HTTP request handlers — one file per domain feature
- Contains: 24 Express Router modules, each exporting a `Router` as default
- Key files: `auth.ts` (authentication), `webhooks.ts` (WhatsApp inbound), `flows.ts` (flow builder), `admin.ts` (platform admin), `ctwa.ts` (ad tracking), `chat.ts` (conversations), `crm.ts` (contacts)
- Pattern: Each route file follows the same structure — `Router()`, handler functions, `export default router`

**`server/services/`:**
- Purpose: External API integration clients and complex business logic
- Contains: 7 service modules for AI, audio, WhatsApp APIs, websocket, webhook processing, validation
- Key files: `ai-agent.ts` (AI function-calling engine), `meta-api.ts` (WhatsApp Business API wrapper), `websocket.ts` (Socket.IO server)
- Note: Not a service layer for business logic — routes do database work directly

**`server/db/`:**
- Purpose: Database clients, schema definitions, connection management
- Contains: Supabase client wrapper (`supabase.ts`), SQLite lazy init (`index.ts`), Drizzle schema (`schema.ts`, `schema-deploy.ts`)
- Key files: `schema.ts` (21 table definitions), `supabase.ts` (query helpers: `query`, `insert`, `update`, `remove`, `rpc`)

**`server/middleware/`:**
- Purpose: Request processing pipeline
- Contains: Auth middleware (JWT), RBAC middleware (permissions, roles, plan limits)
- Key files: `auth.ts` (3 middleware functions + `generateToken`/`verifyToken`), `rbac.ts` (83 permission keys, 5 role definitions)

**`providers/`:**
- Purpose: External SaaS integration definitions
- Contains: 15 provider directories, each with a consistent 7-file structure
- Structure per provider:
  - `config.ts` — Provider settings, base URL, version
  - `client.ts` — HTTP client implementation
  - `testConnection.ts` — Connection test utility
  - `types.ts` — TypeScript type definitions
  - `logs.ts` — Logging utilities
  - `webhooks.ts` — Webhook event handlers
  - `README.md` — Provider documentation
- Categories: Payment (7), AI (5), WhatsApp (2), Voice (1), Tracking (1)

**`public/`:**
- Purpose: Production frontend (SPA)
- Contains: `index.html` shell, `js/ozion.js` application code, `css/ozion.css` styles
- Key files: `index.html` (16 lines — minimal shell loading Font Awesome + Socket.IO CDN), `js/ozion.js` (~4,890 lines — all SPA logic in one file)
- Architecture: Vanilla JS SPA with manual DOM manipulation, no framework

**`migrations/`:**
- Purpose: PostgreSQL schema for Supabase production deployment
- Contains: 3 SQL migration files
- Key files: `001_initial.sql` (583 lines — creates 21 tables + indexes + seed data), `002_saas_multitenant.sql`, `003_flow_controls.sql`

**`api/`:**
- Purpose: Vercel serverless entry point
- Contains: `index.ts` — duplicates `server/index.ts` without static serving or server start
- Pattern: Exports Express `app` as default for Vercel's serverless runtime

## Key File Locations

**Entry Points:**
- `server/index.ts`: Local development server (npm run dev)
- `api/index.ts`: Vercel production serverless function
- `public/index.html`: SPA shell for client-side rendering

**Configuration:**
- `package.json`: Dependencies, scripts, project metadata
- `tsconfig.json`: TypeScript compiler options (ES2022, ESNext modules, bundler resolution)
- `vercel.json`: Vercel routing (API rewrites, SPA fallback)
- `drizzle.config.ts`: Drizzle Kit config (dialect, schema path)
- `.env.example`: Required environment variables template
- `config/.env.development` / `.env.production` / `.env.staging`: Environment-specific config

**Database:**
- `server/db/schema.ts`: Drizzle SQLite schema (21 tables)
- `server/db/schema-deploy.ts`: Deploy-specific tables (changelogs, backups, modules, deployments)
- `server/db/supabase.ts`: Supabase client with CRUD helpers
- `server/db/index.ts`: SQLite lazy initialization with Drizzle proxy
- `migrations/001_initial.sql`: PostgreSQL production schema
- `drizzle.config.ts`: Drizzle Kit configuration

**Core Logic:**
- `server/middleware/auth.ts`: JWT auth + user lookup
- `server/middleware/rbac.ts`: Permission definitions + role checks
- `server/services/ai-agent.ts`: AI function-calling engine
- `server/services/meta-api.ts`: WhatsApp Business API client
- `server/services/evolution-api.ts`: Baileys-based WhatsApp client
- `server/services/webhook-handler.ts`: Inbound message processing
- `server/services/websocket.ts`: Real-time event system
- `server/lib/encryption.ts`: Credential encryption utilities

**Auth:**
- `server/routes/auth.ts`: Login, logout, change password, impersonate
- `server/middleware/auth.ts`: JWT token generation and verification
- `server/middleware/rbac.ts`: Role-based permission checking

**Testing:**
- No test directory or test files detected. `vitest.config.ts`, `jest.config.*`, and `*.test.ts`/`*.spec.ts` files are absent.

## Naming Conventions

**Files:**
- `kebab-case.ts` for all source files: `webhook-handler.ts`, `meta-api.ts`, `validation-flow.ts`, `ai-agent.ts`
- Routes use singular nouns: `auth.ts`, `chat.ts`, `crm.ts`, `flows.ts`, `agents.ts`, `sales.ts`
- Database files: `schema.ts`, `supabase.ts`, `index.ts`
- Migration files: `NNN_descriptive_name.sql` (e.g., `001_initial.sql`)

**Functions:**
- `camelCase` for all function names: `getSupabase()`, `generateToken()`, `processIncomingMessage()`, `sendTextMessage()`
- Verb-noun pattern: `processWithAI()`, `buildKnowledgeContext()`, `exchangeCodeForToken()`, `validateFlow()`
- Export functions named descriptively: `requireMaster`, `requirePermission`, `checkPlanLimit`

**Variables:**
- `camelCase` for all variables: `existingContact`, `phoneNumberId`, `allContacts`, `selectedConv`
- Constants in `UPPER_CASE` for environment variables: `SUPABASE_URL`, `JWT_SECRET`, `GROQ_API_KEY`
- Boolean prefixes: `is_active`, `is_ctwa`, `is_ai_active`, `is_master` (database columns use snake_case; JS variables use camelCase)

**Types:**
- Inline interfaces with PascalCase: `AuthUser`, `AgentContext`, `AgentResponse`, `ValidationResult`, `SendMessagePayload`
- Type definitions in `server/services/*.ts` and `server/routes/*.ts` — not in a separate types directory
- Provider types in `providers/*/types.ts`

**Database Columns:**
- `snake_case` for column names in both Drizzle schema and migrations: `tenant_id`, `phone_number_id`, `is_ai_active`, `max_contacts`, `last_message_at`
- `id` is `text` (UUID) across all tables
- Timestamp columns: `created_at`, `updated_at` on most tables

## Where to Add New Code

**New API Endpoint (new domain):**
- Create new route file at `server/routes/{name}.ts`
- Follow existing pattern: `@ts-nocheck`, `Router()`, try/catch handlers, `getSupabase()`
- Register in both `server/index.ts` and `api/index.ts` with `app.use('/api/{name}', authMiddleware, {name}Routes)`

**New API Endpoint (existing domain):**
- Add handler to existing route file in `server/routes/{domain}.ts`
- Follow CRUD pattern: `router.get('/')`, `router.post('/')`, `router.put('/:id')`, `router.delete('/:id')`

**New External Integration:**
- Create new provider directory at `providers/{name}/`
- Include all 7 files: `config.ts`, `client.ts`, `testConnection.ts`, `types.ts`, `logs.ts`, `webhooks.ts`, `README.md`
- If the integration has backend API calls, add a service in `server/services/`

**New Database Table:**
- Add Drizzle table definition in `server/db/schema.ts`
- Add SQL migration in `migrations/` for Supabase
- Both must be in sync

**New Frontend Feature:**
- Add code to `public/js/ozion.js`
- Follow existing patterns: `api()` function for HTTP calls, DOM manipulation for rendering
- Use `h()` for HTML escaping, `showToast()` for notifications

**New Service:**
- Create file at `server/services/{name}.ts`
- Export named functions, import `getSupabase()` from `server/db/supabase.js` for data access
- Start with `// @ts-nocheck` if types are complex

**New Middleware:**
- Add to `server/middleware/` as a standalone file
- Export middleware function following Express `(req, res, next)` signature

**Tests:**
- Create test file as `tests/{name}.test.ts`
- Run with: `node --test --import tsx tests/<file>.test.ts`
- No test framework config file found — uses Node.js built-in test runner (`node --test`)

## Special Directories

**`node_modules/`:**
- Purpose: Dependencies installed by npm
- Generated: Yes
- Committed: No

**`data/`:**
- Purpose: Local SQLite database file for development
- Generated: Yes (runtime)
- Committed: No (gitignored? — check .gitignore)

**`dist/`:**
- Purpose: TypeScript compilation output
- Generated: Yes (`npm run build`)
- Committed: No

**`.vercel/`:**
- Purpose: Vercel project configuration
- Generated: Yes (by Vercel CLI)
- Committed: Yes (project config)

**`.worktrees/`:**
- Purpose: Git worktrees for isolated feature development
- Generated: Yes
- Committed: No (gitignored)

**`migrations/`:**
- Purpose: PostgreSQL schema SQL files for Supabase production
- Generated: No (hand-written)
- Committed: Yes

**`providers/`:**
- Purpose: External integration definitions (payment, AI, tracking providers)
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-06-19*
