# Coding Conventions

**Analysis Date:** 2026-06-22

## Project Identity

This is **Ozion** — a WhatsApp CRM with AI agents. Stack: Express.js + TypeScript backend, vanilla JS SPA frontend, Supabase PostgreSQL (production), SQLite (local dev), deployed on Vercel. The `AGENTS.md` file at repo root documents key conventions and boundaries.

## Naming Patterns

**Files:**
- `kebab-case.ts` for server source files: `meta-normalizer.ts`, `webhook-handler.ts`, `message-status-history.ts`
- `index.ts` for barrel/entry re-exports: `server/services/normalizers/index.ts`, `server/services/providers/index.ts`
- `*.test.ts` for test files: `normalizers.test.ts`, `webhook-events.test.ts`
- Client JS uses `kebab-case.js`: `ozion.js`, `inbox.js`
- CSS uses `kebab-case.css`: `ozion.css`, `styles.css`
- SQL migrations use `NNN_name.sql`: `007_message_status_events.sql`
- `.js` extension on imports even for `.ts` source files (ESM convention with `tsx`)

**Functions:**
- `camelCase` for all function names, both server and client:
  - `normalizeMetaMessage()`, `getProviderForTenant()`, `buildContactTimeline()`
  - Client: `loadDashboard()`, `showToast()`, `filterConversations()`
- `camelCase` for route handler functions nested in `router.get/post/...`

**Variables:**
- `camelCase` for all variable names in TypeScript/JavaScript
- `SCREAMING_SNAKE_CASE` for module-level constants and environment variables:
  - `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `GRAPH_API_VERSION`, `FLOWISE_URL`
  - `TOKEN_EXPIRY = '7d'`

**Types/Interfaces:**
- `PascalCase` for interfaces, types, and classes:
  - `NormalizedMessage`, `NormalizedStatusUpdate`, `MessageProvider`, `AuthUser`
  - Classes: `MetaMessageProvider`, `EvolutionMessageProvider`
- Type aliases for discriminated unions: `NormalizedMessageType`, `NormalizedDirection`, `StatusTransition`
- Suffix `Input` / `Params` / `Result` for parameter/return shapes:
  - `ContactTimelineInput`, `SendTextParams`, `ProviderMessageResult`

**Database Columns:**
- `snake_case` in both Supabase and SQLite schemas: `tenant_id`, `external_message_id`, `phone_number_id`, `created_at`
- TypeScript fields use `camelCase` mapped to `snake_case` columns in Drizzle: `tenantId: text('tenant_id')`

**Route files:**
- Router variable name always `router`: `const router = Router();`

## TypeScript Configuration

**Config:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": false,
    "noImplicitAny": false,
    "skipLibCheck": true,
    "noEmit": true
  }
}
```

Key settings:
- **Strict mode OFF** (`strict: false`, `noImplicitAny: false`) — the codebase relies heavily on `any` types
- **`skipLibCheck: true`** — no third-party type validation
- **`noEmit: true`** — transpilation via `tsx` at dev time, not `tsc`
- Path aliases: `@/*` → `./server/*`, `@shared/*` → `./shared/*` (not widely used yet)

## `@ts-nocheck` Usage

25 files carry `// @ts-nocheck` at the top. This is used extensively across:

- **All route files** except `inbox.ts`, `auth.ts`, `deploy.ts`, `tags.ts`, `spa.ts`, `updates.ts`, `logs.ts`, `whatsapp.ts`: `server/routes/webhooks.ts`, `server/routes/flows.ts`, `server/routes/agents.ts`, `server/routes/chat.ts`, `server/routes/contacts.ts`, etc.
- **Service files with heavy API integration**: `server/services/evolution-api.ts`, `server/services/webhook-handler.ts`, `server/services/ai-agent.ts`, `server/services/audio.ts`, `server/services/websocket.ts`
- **4 out of 7 test files**: `normalizers.test.ts`, `provider-abstraction.test.ts`, `webhook-events.test.ts`, `message-status-history.test.ts`

New files should avoid adding additional `@ts-nocheck` annotations. Prefer explicit typing.

## Code Style

**Formatting:**
- No Prettier/ESLint/Biome configuration detected — code is unformatted by tooling
- 2-space indentation used throughout
- Single quotes for strings (inconsistent in some places)
- Semicolons used consistently

**Linting:**
- No ESLint configuration detected
- No lint scripts in `package.json`
- TypeScript is the only type-checking layer (`tsc` via `tsconfig.json`)

## Import Organization

**Order pattern in server files:**
1. Node built-in modules: `import crypto from 'crypto';`, `import { fileURLToPath } from 'url';`
2. Third-party packages: `import express from 'express';`, `import jwt from 'jsonwebtoken';`
3. Internal project modules: `import { getSupabase } from '../db/supabase.js';`
4. Type-only imports: `import type { NormalizedMessage, ... } from './types.js';`

**Path Aliases:**
- `import { decrypt } from '../../lib/encryption.js';` — relative paths with `.js` extension
- Path alias `@/` defined in `tsconfig.json` but not widely used

**ESM Convention:**
- All imports use `.js` extension even for `.ts` source files: `import { foo } from './bar.js'`
- Project uses `"type": "module"` in `package.json`

**Barrel Exports Pattern:**
TypeScript barrel files re-export and re-type:
```typescript
// server/services/normalizers/index.ts
export { normalizeMetaMessage, normalizeMetaStatusUpdate } from './meta-normalizer.js';
export { normalizeEvolutionMessage, normalizeEvolutionStatusUpdate } from './evolution-normalizer.js';
export type { NormalizedMessage, NormalizedMessageType, NormalizedDirection, ... } from './types.js';
```

## Error Handling

**Pattern:** `try/catch` with `e: any` in every route handler and service method.

```typescript
try {
  // ... logic
} catch (e: any) {
  res.status(500).json({ error: e.message });
}
```

**Key conventions:**
- API routes return `{ error: string }` on failure (Portuguese error messages in `auth.ts`)
- Services throw errors up to route handlers; route handlers catch and return HTTP 500
- Provider methods catch errors internally and return `{ success: false, error: string }` rather than throwing
- `console.error()` for server-side error logging, never `throw` in route top-level handlers
- Silent catches with empty blocks used in `auth.ts` for optional DB operations:
  ```typescript
  try {
    await supabase.from('audit_logs').insert({...});
  } catch (e) {}  // silently skip if audit_logs table doesn't exist
  ```

## Logging

**Framework:** Node.js `console` API only. No structured logger (pino, winston, etc.).

**Patterns:**
- `console.log()` — general info, emoji-prefixed status messages:
  - `console.log('✅ Supabase PostgreSQL connected');`
  - `console.log('📨 Message from ${message.from}');`
  - `console.log('⏭️ Duplicate message ${message.id} skipped');`
- `console.error()` — errors:
  - `console.error('❌ Supabase connection failed:', error.message);`
  - `console.error('Webhook error:', error);`
- `console.warn()` — non-fatal configuration issues:
  - `console.warn('⚠️ Evolution API not configured');`
  - `console.warn('SQLite unavailable (Vercel serverless)');`
- Client uses `console.error()` in `public/js/ozion.js` for API errors

## Comments

**JSDoc/TSDoc:** Not used. No JSDoc annotations found in any source files.

**When to Comment:**
- Section dividers with `// ─── Section Name ────────────────────────` in monolith files (`ozion.js`, `meta-api.ts`, `rbac.ts`)
- Clarifying comments for specific logic decisions:
  - `// Legacy admin - accept admin123`
  - `// Meta returns media ID, not URL`
  - `// Proxy that lazily initializes SQLite`
- Inline `// @ts-nocheck` at top of problem files

## Function Design

**Size:** Functions range from small pure helpers (e.g., `inferMetaMessageType` at 11 lines) to large monolith handlers (e.g., `loadChat` at ~80 lines in `ozion.js`).

**Parameters:**
- Named object parameters (destructured) for complex function signatures:
  ```typescript
  export async function recordStatusEvent(params: {
    messageId: string;
    tenantId: string;
    newStatus: StatusTransition;
    previousStatus?: string;
    errorMessage?: string;
    ...
  }): Promise<{ id?: string; error?: string }>
  ```
- Positional for simple functions:
  ```typescript
  export function normalizeMetaMessage(tenantId: string, message: Record<string, any>, contact: Record<string, any> | undefined): NormalizedMessage
  ```

**Return Values:**
- Services return structured objects: `{ event, duplicate, error? }` or `{ success, externalId?, error? }`
- Pure-type normalizer functions return strongly-typed interfaces: `NormalizedMessage`
- Async functions return Promises consistently

**Async/Await:** Used exclusively over raw promises/then. `Promise.race` used once in `server/index.ts` for startup timeout.

## Module Design

**Exports:**
- Route files use `export default router` (Express Router)
- Services use named exports: `export async function`, `export function`
- Types exported both at definition and re-exported through barrel files
- Barrel `index.ts` files re-export both values and types

**Example:**
```typescript
// types.ts — defines interfaces
export interface NormalizedMessage { ... }

// meta-normalizer.ts — exports functions
export function normalizeMetaMessage(...): NormalizedMessage { ... }

// index.ts — barrel re-export
export { normalizeMetaMessage } from './meta-normalizer.js';
export type { NormalizedMessage } from './types.js';
```

## Database Schema Conventions

**Drizzle ORM (SQLite):**
```typescript
export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at').default('datetime("now")').notNull(),
});
```
- Column names in `snake_case` within `text('column_name')`
- JS property names in `camelCase` on the table object
- `sqliteTable` from `drizzle-orm/sqlite-core` for local dev schema
- Supabase production schema managed via raw SQL migrations in `migrations/`

**Migration naming:** `NNN_descriptive_name.sql` in `migrations/` directory.

## Cross-Cutting Patterns

**Middleware chain:**
```typescript
app.use('/api/inbox', authMiddleware, inboxRoutes);
```
- `authMiddleware` applied to all protected routes
- Public routes: `/api/auth/*`, `/api/webhooks/*`, `/api/ping`

**Provider Strategy Pattern:**
- Interface `MessageProvider` in `server/services/providers/types.ts`
- Concrete implementations: `MetaMessageProvider`, `EvolutionMessageProvider`
- Factory: `getProviderForTenant()` resolves tenant credentials to provider instance
- Facade: `sendByProvider(tenantId, fn)` wraps factory + execution

**Idempotency Pattern (webhooks):**
- `createWebhookEvent()` checks for existing events using tenant + provider + event_id composite key
- Duplicates return `{ duplicate: true }`; caller skips processing
- Status lifecycle: `received → processing → processed | failed`

---

*Convention analysis: 2026-06-22*
