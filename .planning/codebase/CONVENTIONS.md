# Coding Conventions

**Analysis Date:** 2026-06-19

## Naming Patterns

**Files:**
- Server source: kebab-case with `.ts` extension (e.g., `webhook-handler.ts`, `ai-agent.ts`, `supabase.ts`)
- Frontend: singular filename `ozion.js` in `public/js/`
- Route files: lowercase singular (e.g., `auth.ts`, `contacts.ts`, `flows.ts`)
- Database schemas: `schema.ts` (main), `schema-deploy.ts` (deployment tables)

**Functions:**
- camelCase for all functions and methods
- Async functions use `async function` declaration syntax (not arrow function expressions for top-level)
- Example: `getSupabase()`, `generateToken()`, `processIncomingMessage()`, `processWithAI()`
- Private/helper functions prefixed with underscore: none observed; all are module-scoped

**Variables:**
- camelCase for all variables (e.g., `authHeader`, `existingContact`, `conversationId`, `phoneNumberId`)
- Boolean variables: `isActive`, `isCtwa`, `isFromMe`, `isMaster`, `isAiActive`, `shouldTransfer`
- Destructured parameters common in route handlers: `const { email, password } = req.body`

**Types:**
- PascalCase for interfaces and types (e.g., `AuthUser`, `AgentContext`, `AgentResponse`, `ValidationResult`, `SendMessagePayload`)
- Interfaces preferred over type aliases for object shapes
- Exported interfaces declared with `export interface` keyword
- Inline `any` types are common, especially in route handlers

**Constants:**
- UPPER_SNAKE_CASE for configuration constants (e.g., `JWT_SECRET`, `TOKEN_EXPIRY`, `GRAPH_API_VERSION`, `EVOLUTION_API_URL`, `FLOWISE_URL`)
- Module-level constants at top of files, after imports

## Code Style

**Formatting:**
- No formatting tool configured (no `.prettierrc`, `biome.json`, or `.editorconfig` found)
- Inconsistent formatting observed across files — mixed single-line and multi-line style
- Common pattern: single-line catch handlers — `catch (e: any) { res.status(500).json({ error: e.message }); }`
- No consistent indentation enforcement; uses spaces

**Linting:**
- No linting tool configured (no `.eslintrc*`, `eslint.config.*` found)
- `tsconfig.json` has `strict: false` and `noImplicitAny: false`
- Many files use `// @ts-nocheck` directive at the top to bypass TypeScript checking:
  - `server/routes/health.ts`
  - `server/routes/chat.ts`
  - `server/routes/crm.ts`
  - `server/routes/contacts.ts`
  - `server/routes/admin.ts`
  - `server/routes/flows.ts`
  - `server/routes/webhooks.ts`
  - `server/routes/analytics.ts`
  - `server/services/ai-agent.ts`
  - `server/services/webhook-handler.ts`
  - `server/services/evolution-api.ts`
  - `server/services/validate-flow.ts`
  - `server/services/audio.ts`
  - `server/services/websocket.ts`
- Only `server/index.ts`, `server/routes/auth.ts`, and `server/middleware/auth.ts` do NOT use `@ts-nocheck`

**Semicolons:**
- Always used at end of statements

## Import Organization

**Order:**
1. Standard library imports (e.g., `fs`, `path`, `crypto`, `os`, `url`)
2. Third-party packages (e.g., `express`, `cors`, `jsonwebtoken`, `bcryptjs`)
3. Local modules with `.js` extension (e.g., `'../db/supabase.js'`, `'../middleware/auth.js'`)

**Path Aliases:**
- Defined in `tsconfig.json` but not used in source files:
  - `@/*` maps to `./server/*`
  - `@shared/*` maps to `./shared/*`
- All imports use relative paths instead

**Pattern:**
```typescript
import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import crypto from 'crypto';
```

## Error Handling

**Patterns:**
- Every route handler wrapped in `try/catch` block
- Standard error response format: `res.status(500).json({ error: error.message })`
- Common condensed pattern:
```typescript
try {
  // ...handler logic
} catch (e: any) { res.status(500).json({ error: e.message }); }
```
- Some error responses in Portuguese: `'Credenciais inválidas'`, `'Token não fornecido'`, `'Acesso negado'`
- Some error responses in English: `'Conversation not found'`, `'No contacts'`
- API errors from external services (Meta, Groq, ElevenLabs) thrown as: `throw new Error(...)`
- Silent error swallowing pattern used for non-critical operations:
```typescript
try {
  // optional operation
} catch (e) {}
// or
} catch (_) { /* audit table may not exist */ }
```

**Validation:**
- Manual validation at the start of handlers with early returns
- No schema validation library beyond zod being installed (but unused in source)
- Example pattern:
```typescript
if (!email || !password) {
  return res.status(400).json({ error: 'Email e senha são obrigatórios' });
}
```

## Logging

**Framework:** `console.log`, `console.error`, `console.warn` only

**Patterns:**
- Emoji prefixes for key lifecycle events: `✅ Supabase PostgreSQL connected`, `🚀 Ozion Chat AI: http://...`, `❌ Supabase connection failed`
- `console.error('Error context:', error)` for errors in catch blocks
- `console.warn()` for non-fatal warnings
- `console.log()` with meaningful prefixes: `📨 Message from ...`, `📊 Status: ... → ...`
- No structured logging library (no pino, winston, etc.)

## Comments

**When to Comment:**
- Section headers for organizing large files using comment blocks:
```typescript
// ─── AI Provider Selection ─────────────────────────────────────
// ─── Tool Definitions ──────────────────────────────────────────
```
- `// @ts-nocheck` at the top of files to disable type checking
- Occasional inline comments explaining logic
- Minimal JSDoc usage; only interfaces have description comments

**JSDoc/TSDoc:**
- Rarely used; interfaces occasionally have inline comments on properties
- No formal JSDoc on function signatures

## Function Design

**Size:**
- Route handler functions: 10-40 lines typically
- Service functions: 20-80 lines (e.g., `processWithAI` in `ai-agent.ts` is ~140 lines)
- Functions tend to be monolithically structured with inline Supabase queries

**Parameters:**
- Named parameters via destructured object pattern for service functions:
```typescript
export async function processWithAI(context: AgentContext): Promise<AgentResponse>
export async function processIncomingMessage(
  tenantId: string,
  metadata: { phone_number_id: string },
  message: WebhookMessage,
  contact: { profile: { name: string }; wa_id: string }
)
```

**Return Values:**
- JSON responses for routes: `res.json(data)` or `res.status(500).json({ error })`
- Service functions return typed objects or `Promise<Type>`
- Some functions return `{ ok: false, error: '...' }` objects for graceful degradation

## Module Design

**Exports:**
- Route files: `export default router` (Express Router instance)
- Service files: named exports of individual async functions
- DB files: mixed — both named exports and `export default getSupabase`
- Middleware: named exports of middleware functions and helpers

**Barrel Files:**
- `server/db/index.ts` acts as a barrel for database initialization (`getDb`, `db`, `initDatabase`, `testConnection`)
- No other barrel files observed

## TypeScript Usage

**Strictness:** Minimal. `strict: false`, `noImplicitAny: false` in `tsconfig.json`. Most files disable checking with `// @ts-nocheck`.

**Type Annotations:**
- Typed in middleware and some services (full interfaces)
- Loose typing in routes: `(c: any)`, `(e: any)`, `async (req, res)` without parameter types, or typed as `Request, Response`
- Files that use proper types: `server/middleware/auth.ts`, `server/middleware/rbac.ts`, `server/routes/messages.ts`
- Files that use `any` extensively: most route and service files

## Environmental Configuration

**Pattern:**
- `process.env.VARIABLE_NAME` accessed directly
- Module-level validation only for critical variables:
```typescript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('Missing required environment variable: JWT_SECRET');
}
```
- `.env.example` documents all required variables
- `dotenv/config` loaded at entry points (`server/index.ts`, `api/index.ts`)

---

*Convention analysis: 2026-06-19*
