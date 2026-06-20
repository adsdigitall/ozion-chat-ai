# Technology Stack

**Analysis Date:** 2026-06-19

## Languages

**Primary:**
- TypeScript 5.5 (ES2022 target, ESNext modules, bundler module resolution)
  - Source: `server/`, `api/`, `providers/`, `seed.ts`, `drizzle.config.ts`
  - Strict mode disabled, `noImplicitAny` disabled

**Client-side:**
- JavaScript (vanilla) — SPA frontend
  - Source: `public/js/ozion.js`, `css/`

## Runtime

**Environment:**
- Node.js (version specified via `.nvmrc` or project default)
- Package manager: npm (lockfile: `package-lock.json` present)

**Package Manager:**
- npm
- Lockfile: present

## Frameworks

**Core:**
- Express.js ^4.21.0 — HTTP server, routing, middleware (`server/index.ts`, `api/index.ts`)
- socket.io — Real-time WebSocket communication (`server/services/websocket.ts`)

**Database ORM:**
- Drizzle ORM ^0.45.2 — Schema definition and migration tooling
  - **Production:** `drizzle-orm/postgresql` with Supabase client
  - **Local dev:** `drizzle-orm/better-sqlite3` with `better-sqlite3 ^11.5.0` (optional dependency)

**Validation:**
- Zod ^3.23.8 — Schema validation

**Build/Dev:**
- tsx ^4.19.0 — TypeScript execution for development (`npm run dev` uses `tsx watch`)
- TypeScript ^5.5.0 — Compilation (`npm run build` uses `tsc`)
- No test runner detected in devDependencies

## Key Dependencies

**Critical:**
- `@supabase/supabase-js ^2.108.1` — Supabase client for PostgreSQL database access
- `express ^4.21.0` — Web server framework
- `jsonwebtoken ^9.0.3` — JWT authentication for API
- `bcryptjs ^2.4.3` — Password hashing

**Infrastructure:**
- `cors ^2.8.5` — Cross-origin resource sharing
- `helmet ^7.1.0` — Security headers (CSP disabled)
- `crypto-js ^4.2.0` — AES encryption, SHA-256 hashing for token storage and data hashing
- `dotenv ^16.4.5` — Environment variable loading
- `socket.io` — Real-time messaging (loaded from CDN in frontend: `https://cdn.socket.io/4.7.5/socket.io.min.js`)
- Font Awesome 6.5.1 — Icon library (loaded from CDN)

## Configuration

**Environment:**
- `.env.example` — Template with required variables
- `config/` — Environment-specific config files (`.env.development`, `.env.production`, `.env.staging`)
- `dotenv/config` imported at entry points for local development

**Required env vars:**
- `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` — Database
- `JWT_SECRET` — Authentication
- `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` — Meta/WhatsApp integration
- `WEBHOOK_VERIFY_TOKEN`, `WEBHOOK_APP_SECRET` — Webhook validation
- `ENCRYPTION_KEY` — Token encryption
- `BASE_URL` — Public-facing server URL

**Build:**
- `tsconfig.json` — Target ES2022, module ESNext, bundler resolution, noEmit for dev, outDir `dist/` for production
- `drizzle.config.ts` — PostgreSQL dialect, schema at `server/db/schema.ts`
- `vercel.json` — Vercel deployment: framework null, output `public/`, SPA rewrites
- `railway.json` — Railway deployment: Nixpacks builder, `npm run start`

## Platform Requirements

**Development:**
- Node.js
- npm
- SQLite (optional, for local dev without Supabase)
- Environment variables configured via `.env` or `config/`

**Production:**
- **Primary:** Vercel (serverless, entrypoint `api/index.ts`)
- **Alternative:** Railway (Node process, `npm run start` → `node dist/server/index.js`)
- Supabase PostgreSQL (managed)
- Supporting services: ElevenLabs, OpenAI/Groq/DeepSeek API keys

---

*Stack analysis: 2026-06-19*
