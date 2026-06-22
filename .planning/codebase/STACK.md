# Technology Stack

**Analysis Date:** 2026-06-22

## Languages

**Primary:**
- TypeScript 5.5+ - Entire backend (`server/`, `api/`, `providers/`) written in TypeScript, compiled with `tsc` to `dist/`
- JavaScript (ES6+) - Frontend SPA in `public/js/ozion.js`, vanilla JS with no framework
- SQL - PostgreSQL schema in `migrations/` (Supabase) + Drizzle ORM schema for SQLite (`server/db/schema.ts`)
- Shell/Bash - Deployment and ops scripts in `scripts/`

## Runtime

**Environment:**
- Node.js 20 (specified in GitHub Actions `NODE_VERSION: '20'`)
- TypeScript executed via `tsx` for local dev, compiled to JS for production

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

**Module System:**
- ESM (`"type": "module"` in `package.json`)
- All imports use `.js` extensions even for TypeScript files (e.g., `from './routes/auth.js'`)

## Frameworks

**Core:**
- Express.js 4.21+ - HTTP server framework, both for local dev (`server/index.ts`) and serverless (`api/index.ts`)
- Socket.IO - WebSocket server for real-time messaging (`server/services/websocket.ts`)

**ORM / Database:**
- Drizzle ORM 0.45+ - SQLite schema definitions (`server/db/schema.ts`) via `drizzle-orm/better-sqlite3`
- Drizzle Kit - Migration generation (`drizzle.config.ts`), outputs to `./drizzle/`
- Supabase JS Client 2.108+ - Production database access (`server/db/supabase.ts`)
- better-sqlite3 11.5+ - Local dev database (`server/db/index.ts`), stores in `data/ozion.db`

**Testing:**
- Node.js native test runner (`node --test`) - Tests in `tests/` directory
- tsx as test loader (`--import tsx`)

**Build/Dev:**
- tsx 4.19+ - TypeScript execution for dev and tests (no build step needed in dev)
- TypeScript 5.5+ - Type checking and production build (`tsc` to `dist/`)
- Nixpacks - Build system for Railway deployment (`railway.json`)

## Key Dependencies

**Critical:**
- `express@^4.21.0` - HTTP framework and routing
- `@supabase/supabase-js@^2.108.1` - Production database (PostgreSQL via Supabase)
- `drizzle-orm@^0.45.2` - SQLite ORM for local dev schema
- `socket.io` (inferred, not in package.json but imported in `server/services/websocket.ts`) - Real-time WebSocket
- `jsonwebtoken@^9.0.3` - JWT auth token generation/verification (`server/middleware/auth.ts`)

**Infrastructure:**
- `zod@^3.23.8` - Schema validation (imported in routes)
- `bcryptjs@^2.4.3` - Password hashing
- `crypto-js@^4.2.0` - Token encryption (`server/lib/encryption.ts`) and webhook signature verification
- `cors@^2.8.5` - CORS middleware
- `helmet@^7.1.0` - Security headers
- `dotenv@^16.4.5` - Environment variable loading
- `better-sqlite3@^11.5.0` - Optional local SQLite (conditional dependency)

## Configuration

**Environment:**
- `.env` file (root) - Development environment variables (not committed)
- `config/.env.development` - Dev-specific config
- `config/.env.staging` - Staging-specific config
- `config/.env.production` - Production config template
- All env vars loaded via `dotenv/config` at process start

**Key Configs Required:**
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` - Supabase project
- `JWT_SECRET` - JWT signing (min 32 chars)
- `ENCRYPTION_KEY` - Token encryption (32 chars)
- `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` - Meta OAuth
- `WEBHOOK_VERIFY_TOKEN` - WhatsApp webhook verification
- `GROQ_API_KEY` / `OPENAI_API_KEY` / `DEEPSEEK_API_KEY` - AI providers
- `ELEVENLABS_API_KEY` - Text-to-speech
- `META_CAPI_DATASET_ID` / `META_CAPI_ACCESS_TOKEN` - Conversions API
- `FLOWISE_URL` / `FLOWISE_API_KEY` - Flowise AI flow engine
- `EVOLUTION_API_URL` / `EVOLUTION_API_KEY` - Evolution WhatsApp API
- `DATABASE_URL` - PostgreSQL connection (for Drizzle Kit migrations)
- `BASE_URL` - Application base URL (for OAuth redirects)

**Build:**
- `tsconfig.json` - ES2022 target, ESNext modules, bundler resolution, path aliases `@/*` → `./server/*`
- `vercel.json` - Build config for Vercel serverless deployment
- `railway.json` - Alternative Railway deployment config (Nixpacks builder)

## Platform Requirements

**Development:**
- Node.js 20+
- SQLite (optional, falls back to Supabase)
- Supabase account (for production-like testing)

**Production:**
- Vercel (primary deployment target via `api/index.ts` serverless entrypoint)
- Supabase PostgreSQL (production data layer)
- Railway (alternative deployment, `railway.json`)
- GitHub Actions for CI/CD pipeline

---

*Stack analysis: 2026-06-22*
