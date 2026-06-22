# Codebase Concerns

**Analysis Date:** 2026-06-22

## Tech Debt

### 1. Multi-Tenant Data Isolation Gap

**Issue:** Most routes rely on `x-tenant-id` header or URL parameters instead of the authenticated user's JWT tenant.

**Files:** `server/routes/chat.ts`, `server/routes/crm.ts`, `server/routes/contacts.ts`, `server/routes/integrations.ts`

**What happens:**
- `chat.ts` line 10: `const tid = (req.headers['x-tenant-id'] as string) || 'default';`
- `crm.ts` line 11: `const tid = (req.headers['x-tenant-id'] as string) || 'default';`
- `contacts.ts` line 10: `const { tenantId } = req.params;` (URL param, not validated)
- `integrations.ts` line 10: `const tid = (req.headers['x-tenant-id'] as string) || 'default';`

These routes ignore `req.user.tenant_id` set by the auth middleware. A user could modify the `x-tenant-id` header to access another tenant's data. The fallback `'default'` means requests without the header access the master tenant.

**Contrast:** `server/routes/inbox.ts` correctly uses `req.user.tenant_id` (lines 11, 86, 162, 237) — this is the pattern all routes should follow.

**Impact:** HIGH — potential cross-tenant data access for contacts, conversations, integrations, and CRM data.

**Fix approach:** Replace all `req.headers['x-tenant-id']` and `req.params.tenantId` usages with `req.user.tenant_id`. Add middleware to enforce tenant isolation at the route level.

### 2. TypeScript Strict Mode Disabled

**Issue:** `tsconfig.json` has `strict: false` and `noImplicitAny: false`, disabling critical type safety.

**Files:** `tsconfig.json` (line 12-13)

```json
"strict": false,
"noImplicitAny": false,
```

**Impact:** Any type errors are silently ignored. Combined with `// @ts-nocheck` (see below), there's effectively no type safety in most of the codebase.

**Fix approach:** Enable `strict: true` incrementally — start with `noImplicitAny: true`, fix errors, then add `strictNullChecks`, `strictFunctionTypes`, etc.

### 3. 21 Files with `// @ts-nocheck`

**Issue:** Critical source files have TypeScript checking completely disabled.

**Files:**
```
server/routes/admin.ts
server/routes/contacts.ts
server/routes/chat.ts
server/routes/crm.ts
server/routes/webhooks.ts
server/routes/evolution.ts
server/routes/flows.ts
server/routes/flowise.ts
server/routes/analytics.ts
server/routes/integrations.ts
server/routes/agents.ts
server/routes/sales.ts
server/routes/voice.ts
server/routes/health.ts
server/routes/plans.ts
server/routes/ctwa.ts
server/services/webhook-handler.ts
server/services/websocket.ts
server/services/evolution-api.ts
server/services/audio.ts
server/services/ai-agent.ts
```

**Impact:** The core business logic and API surface have no type checking. This leads to likely runtime errors, makes refactoring dangerous, and hides bugs.

**Fix approach:** Remove `// @ts-nocheck` incrementally, start with files that have proper type annotations (e.g., `server/routes/health.ts`), then fix type errors in each file.

### 4. Dual-Database Schema Drift

**Issue:** Two separate schema definitions — Drizzle SQLite schema and raw SQL migrations for Supabase PostgreSQL — are maintained separately and have diverged.

**Files:**
- `server/db/schema.ts` — SQLite schema (via `drizzle-orm/sqlite-core`)
- `migrations/001_initial.sql` — PostgreSQL schema for Supabase
- `server/db/schema-deploy.ts` — Additional SQLite tables for deploy system

**Examples of drift:**
- `messages` table in SQLite has `errorCode`, `errorMessage` fields; in Postgres it has `error_code`, `error_message`
- `schema.ts` has `message_status_events` table which is not defined in the SQLite schema at all (referenced by `message-status-history.ts`)
- `db/index.ts` imports `./schema.js` compiled version for SQLite, but the ESM/TypeScript import path is fragile

**Impact:** MEDIUM — local dev uses SQLite, production uses PostgreSQL. Changes to one don't propagate to the other, causing bugs that only surface in production.

**Fix approach:** Unify to a single source of truth — either use Drizzle with PostgreSQL dialect everywhere, or generate SQLite schema from Postgres migrations.

### 5. Drizzle Config Schema/Dialect Mismatch

**Issue:** `drizzle.config.ts` specifies PostgreSQL dialect but the schema uses `drizzle-orm/sqlite-core`.

**Files:** `drizzle.config.ts`, `server/db/schema.ts`

```typescript
// drizzle.config.ts
dialect: 'postgresql',
schema: './server/db/schema.ts'
```

But `server/db/schema.ts` imports `sqliteTable` from `drizzle-orm/sqlite-core`.

**Impact:** `drizzle-kit` commands (push, generate, migrate) will fail or produce incorrect output because the schema imports are incompatible with the configured dialect.

**Fix approach:** Either switch schema to `drizzle-orm/pg-core` or change config dialect to `sqlite`. The production target is PostgreSQL (Supabase), so the schema should be migrated to `pg-core`.

### 6. Mixed Module System in Database Layer

**Issue:** `server/db/index.ts` uses CommonJS `require()` calls inside an ESM module.

**Files:** `server/db/index.ts` (lines 8-10, 22-23)

```typescript
const Database = require('better-sqlite3');
const { join, dirname } = require('path');
const { fileURLToPath } = require('url');
const { mkdirSync } = require('fs');
```

**Impact:** Fragile — relies on Node.js interop between ESM and CJS. The path to `./schema.js` (compiled JS) may break depending on build setup. The schema is imported dynamically via `require()` before Drizzle is initialized.

**Fix approach:** Use ESM `import` syntax consistently. Since `better-sqlite3` is optional, wrap in a try/catch import.

### 7. Monolithic 4890-Line Frontend

**Issue:** The main SPA (`public/js/ozion.js`) is a single 4890-line vanilla JavaScript file with no modules, no types, and no build step.

**Files:** `public/js/ozion.js` (4890 lines)

**Impact:**
- Impossible to tree-shake or code-split
- Global mutable state (line 6-29: `let conversations = []; let selectedConv = null;` etc.)
- No dependency management
- Inline HTML strings throughout for rendering
- Every feature and admin panel is in this one file

**Fix approach:** Break into separate modules by feature (inbox, admin, crm, settings, flows). Consider adopting a lightweight framework or at minimum ES modules with type checking via JSDoc.

## Security Considerations

### 1. Hardcoded Encryption Key

**Issue:** Encryption module has a hardcoded fallback key for safeguarding WhatsApp credentials.

**Files:** `server/lib/encryption.ts` (line 3)

```typescript
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32!';
```

**Impact:** If the `ENCRYPTION_KEY` environment variable is not set (e.g., in some deployment environments), encrypted data (WhatsApp access tokens, app secrets stored in `whatsapp_credentials` table) can be decrypted by anyone who knows the hardcoded key. Since the code is in a public (or team-accessible) repository, this compromises all encrypted credentials.

**Fix approach:** Make the encryption key a required environment variable — remove the hardcoded default, throw if not set. Rotate any credentials encrypted with the default key.

### 2. Hardcoded Admin Password

**Issue:** Legacy admin users without bcrypt hashed passwords authenticate with a hardcoded password.

**Files:** `server/routes/auth.ts` (lines 37-39, 234)

```typescript
// Legacy admin - accept admin123
passwordValid = password === 'admin123';
```

**Impact:** If an admin user record has a non-bcrypt `password_hash` (e.g., plain text or missing), they can authenticate with the well-known password `admin123`. This bypass is also present in the change-password flow (line 234).

**Fix approach:** Remove the legacy admin password fallback. Ensure all admin users have bcrypt-hashed passwords. Run a migration to hash any legacy admin passwords.

### 3. Hardcoded Default User Passwords

**Issue:** Admin route creates users with a hardcoded default password `'123456'`.

**Files:** `server/routes/admin.ts` (lines 89, 341)

```typescript
const passwordHash = await bcrypt.hash('123456', 10);
```

**Impact:** Every new user created via the admin panel has the same predictable default password. If users don't change it, accounts are vulnerable to credential stuffing.

**Fix approach:** Generate random passwords for new users and force password change on first login. Or send a password set link via email.

### 4. Hardcoded Webhook Verify Token

**Issue:** Webhook verification has a predictable fallback token.

**Files:** `server/routes/webhooks.ts` (line 19)

```typescript
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'ozion-verify-token-123';
```

**Impact:** If the `WEBHOOK_VERIFY_TOKEN` env var is not set, anyone who knows this code can subscribe to the webhook and receive all incoming WhatsApp messages.

**Fix approach:** Make the verify token a required environment variable. Remove the hardcoded fallback.

### 5. Weak Encryption Implementation

**Issue:** CryptoJS uses AES-ECB mode by default, which is not suitable for encrypting credentials.

**Files:** `server/lib/encryption.ts`

```typescript
import CryptoJS from 'crypto-js';
// ...
return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
```

**Impact:** CryptoJS's `AES.encrypt` with a passphrase (not a proper key/IV) uses an unspecified derivation function and ECB mode. ECB mode encrypts identical blocks identically, leaking information about the plaintext. For credential storage, a proper AEAD scheme (like AES-256-GCM) should be used.

**Fix approach:** Use Node.js built-in `crypto` module with `createCipheriv` (AES-256-GCM) or `crypto-js` with explicit CBC mode and random IV. Store IV alongside ciphertext.

### 6. PII Leakage to External AI Providers

**Issue:** Contact phone numbers are sent to third-party AI APIs (Groq, OpenAI, DeepSeek) as part of the system prompt.

**Files:** `server/services/ai-agent.ts` (line 269)

```typescript
content: systemMessage + kbContext + `\n\nContexto do contato:\n- Nome: ${context.contactName}\n- Telefone: ${context.contactPhone}\n- Stage atual: ${context.pipelineStage}`
```

**Impact:** Personal phone numbers (PII) are transmitted to third-party AI API providers for every AI agent interaction. This may violate LGPD/GPDR compliance depending on the data processing agreement with each provider.

**Fix approach:** Strip or mask phone numbers in AI context prompts. Use identifier references instead of raw PII.

### 7. Weak WebSocket CORS and Auth

**Issue:** WebSocket endpoint allows all origins and has a broken auth implementation.

**Files:** `server/services/websocket.ts` (lines 16-18, 30-31)

```typescript
cors: { origin: '*', methods: ['GET', 'POST'] },
// ...
const decoded = jwt.verify(token as string, JWT_SECRET) as any;
(socket as any).userId = decoded.userId;      // WRONG: should be decoded.id
(socket as any).tenantId = decoded.tenantId;  // WRONG: should be decoded.tenant_id
```

**Impact:** The JWT payload created by `generateToken()` in `auth.ts` uses `id` and `tenant_id` (snake_case) as field names, but the WebSocket handler reads `userId` and `tenantId` (camelCase). This means WebSocket authentication always fails — the decoded values will be `undefined`, so `userId` and `tenantId` are never set. 

**Fix approach:** Match field names between auth token generation and WebSocket verification. Restrict CORS origin in production.

### 8. Cross-Tenant Contact Access via URL

**Issue:** `contacts.ts` routes accept `tenantId` as a URL parameter without validation.

**Files:** `server/routes/contacts.ts` (lines 8, 21, 35, 47)

**Impact:** A user authenticated for tenant A can call `GET /api/contacts/tenant-b/contact-id` to access tenant B's contact data. The auth middleware sets `req.user.tenant_id` but it's never checked against the URL parameter.

**Fix approach:** Remove `:tenantId` from URLs and use `req.user.tenant_id` exclusively.

### 9. Missing Input Validation in Admin Routes

**Issue:** Admin CRUD routes accept `req.body` directly without schema validation.

**Files:** `server/routes/admin.ts` (lines 154, 281, 292, 380)

```typescript
// Line 281: Direct spread of request body
const plan = { id, ...req.body, is_active: 1, ... };
```

**Impact:** Clients can set arbitrary fields on database records. For example, creating a plan with `is_master: true` or setting arbitrary permissions.

**Fix approach:** Validate request bodies with Zod schemas. Whitelist allowed fields.

## Known Bugs

### 1. WebSocket Authentication Broken

**Symptoms:** WebSocket connections always fail authentication because the JWT field names don't match between `auth.ts` (generates `{ id, tenant_id, ... }`) and `websocket.ts` (reads `decoded.userId`, `decoded.tenantId`). The socket connects but `userId` and `tenantId` are `undefined`, so real-time features (room joins, message broadcasts) don't work correctly.

**Files:** `server/middleware/auth.ts` (JWT payload), `server/services/websocket.ts` (JWT verification)

**Trigger:** Any WebSocket connection attempt.

### 2. Audio Conversion Functions are No-Ops

**Symptoms:** `convertOggToMp3()` and `convertToOpusOgg()` in `server/services/audio.ts` just copy files instead of converting them. The resulting files have incorrect extensions/content types, causing downstream errors in transcription and playback.

**Files:** `server/services/audio.ts` (lines 216-231)

```typescript
// Line 219: Just copies the file, doesn't convert
fs.copyFileSync(oggPath, mp3Path);
// Line 229: Same issue
fs.copyFileSync(inputPath, outputPath);
```

**Trigger:** Sending or receiving voice messages triggers futile format conversion.

### 3. Backup and Deploy Systems Are Simulated

**Symptoms:** The deploy and backup systems use `setTimeout` with random data to simulate operations. They don't actually create backups, trigger deployments, or perform rollbacks.

**Files:** `server/routes/deploy.ts` (lines 75-81, 164-168, 194)

```typescript
// Line 77-78: Fake backup size
size: Math.floor(Math.random() * 5000000) + 100000,
// Line 164-168: Fake deploy state machine
setTimeout(async () => { ... }, 3000);
setTimeout(async () => { ... }, 6000);
```

**Trigger:** Triggering a backup or deploy from the admin panel.

### 4. checkPlanLimit Silently Bypasses on Error

**Symptoms:** When `checkPlanLimit` throws an error, the middleware silently calls `next()` instead of returning an error response, allowing the operation to proceed without limit checking.

**Files:** `server/middleware/rbac.ts` (lines 206-208)

```typescript
try {
  const { allowed, current, limit } = await limitCheck(req);
  // ...
} catch (error) {
  next();  // Silent bypass on error
}
```

**Trigger:** Any error during limit checking (e.g., database timeout, missing relation).

### 5. Schema-Dialect Mismatch Blocks Drizzle CLI

**Symptoms:** Running `drizzle-kit` commands (generate, push, migrate) fails because the schema uses `sqlite-core` imports but the config specifies `postgresql` dialect.

**Files:** `drizzle.config.ts`, `server/db/schema.ts`

**Trigger:** Any attempt to use Drizzle Kit CLI for schema management.

## Performance Bottlenecks

### 1. Database Query on Every Authenticated Request

**Problem:** The auth middleware makes a Supabase query on every request to verify user status.

**Files:** `server/middleware/auth.ts` (lines 53-58)

```typescript
const { data: dbUser, error } = await supabase
  .from('users')
  .select('id, is_active')
  .eq('id', user.id)
  .single();
```

**Impact:** Adds ~20-50ms latency to every API request. For high-traffic WhatsApp webhooks, this can add significant overhead.

**Improvement path:** Cache token blacklist in memory, rely on JWT signature verification alone, and only verify user status periodically or on sensitive operations.

### 2. Inefficient In-Memory Filtering

**Problem:** Several routes fetch all records and filter in-memory instead of using database queries.

**Files:** `server/routes/crm.ts` (lines 22-29), `server/routes/chat.ts` (lines 22-25)

```typescript
// crm.ts: Fetches ALL contacts for tenant, then filters in-memory
const { data: rows } = await sb.from('contacts').select('*').eq('tenant_id', tid);
let enriched = (rows || []).map(...);
const { search, tag, status, source, stage } = req.query;
if (search) enriched = enriched.filter(c => ...);  // Client-side filter
```

**Impact:** For tenants with thousands of contacts, this fetches all records into memory and filters client-side, wasting bandwidth and memory.

**Improvement path:** Push filters to the database query (`.ilike()`, `.eq()`, `.in()`) with proper pagination.

### 3. Sequential Webhook Message Processing

**Problem:** Incoming webhooks with multiple messages process each message sequentially within a serial loop.

**Files:** `server/routes/webhooks.ts` (lines 95-143)

**Impact:** A webhook with 20 messages processes them one by one, each making multiple Supabase queries. This can cause timeouts under load.

**Improvement path:** Process messages in parallel with Promise.all, or queue them for background processing.

## Fragile Areas

### 1. Runtime Error Handling via Empty Catches

**Files with `catch (e) {}` pattern:**
- `server/middleware/auth.ts` line 81
- `server/routes/auth.ts` lines 82, 95, 163, 195, 328
- `server/services/audio.ts` line 237

**Why fragile:** Silent empty catches suppress errors without logging, making debugging nearly impossible. This pattern appears in auth middleware, login, impersonation, and logout flows — masking failures in critical security operations.

**Safe modification:** Replace all empty catches with at minimum `console.error(e)`. Better: log structured error data and track in monitoring.

### 2. AI Agent Tool Execution Without Tenant Validation

**Files:** `server/services/ai-agent.ts` (lines 120-212)

**Why fragile:** The `executeTool` function receives `contactId` and `conversationId` from AI-generated tool arguments. There's no validation that these IDs belong to the requesting tenant. A compromised or hallucinating AI could access or modify data across tenants.

**Safe modification:** Validate that `contact_id` and `conversation_id` belong to the specified `tenantId` before executing any tool.

### 3. Unrestricted Changelog and Backup Mutations

**Files:** `server/routes/deploy.ts` (lines 15-47, 58-134)

**Why fragile:** The deploy routes allow unauthenticated (or poorly scoped) creation, update, and deletion of changelogs, backups, and modules. The routes import `Router` and `getSupabase` but `deploy.ts` properly has auth through `server/index.ts` — but `api/index.ts` also has `authMiddleware` applied. However, the routes don't check tenant ownership.

**Safe modification:** Add tenant-specific scoping to all deploy/backup/changelog operations.

### 4. Raw Body Capture Reliability

**Files:** `server/index.ts` (lines 42-46), `api/index.ts` (lines 37-41)

```typescript
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString('utf8');
  },
}));
```

**Why fragile:** The raw body is captured by overriding a property on the Express request. The `verify` callback runs before body parsing, but if body parsing fails (malformed JSON), the raw body may not be available, breaking webhook signature verification.

**Safe modification:** Add explicit middleware to capture raw body before JSON parsing, and handle JSON parse errors gracefully.

### 5. OAuth2 Redirect Parameter Injection

**Files:** `server/routes/ctwa.ts` (likely) — but looking at `server/routes/webhooks.ts` line 193-214

**Why fragile:** Redirect URIs and callback URLs are passed as query parameters in OAuth flows. Without validation that the redirect URI matches a whitelist, attackers could use open redirect patterns.

**Safe modification:** Validate all callback/redirect URLs against a whitelist of allowed domains.

## Dependencies at Risk

### 1. `better-sqlite3` as Optional Dependency

**Risk:** Listed as `optionalDependencies` — if installation fails (e.g., due to native compilation issues), local development breaks silently.

**Impact:** The `db/index.ts` wraps SQLite init in try/catch, so it fails silently and falls back to Supabase queries which may not work locally.

### 2. `drizzle-orm` Version Mismatch Concern

**Risk:** `drizzle-orm@^0.45.2` is installed but the schema imports `drizzle-orm/sqlite-core` while the config expects `postgresql`. This dual-target approach is not well-supported by Drizzle.

**Impact:** Any Drizzle CLI operation will fail. Manual SQL migrations must be crafted instead.

### 3. CryptoJS Maintenance

**Risk:** `crypto-js` is a community-maintained library with known concerns about its default AES mode (ECB). The project may be better served by Node's built-in `crypto` module.

**Impact:** Credential encryption uses a questionable cipher mode with no authentication tag (integrity check). Encrypted data could be tampered with undetected.

## Test Coverage Gaps

### 1. Multi-Tenant Security Not Tested

**What's not tested:** The critical vulnerability of tenant isolation (routes using `x-tenant-id` vs `req.user.tenant_id`) has zero test coverage.

**Files at risk:** `server/routes/chat.ts`, `server/routes/crm.ts`, `server/routes/contacts.ts`, `server/routes/integrations.ts`

**Risk:** Cross-tenant data leaks go unnoticed until a security incident occurs.

**Priority:** HIGH

### 2. WebSocket Functionality Not Tested

**What's not tested:** The WebSocket endpoint (`server/services/websocket.ts`) has no tests covering authentication, room joining, or event broadcasting.

**Files:** `server/services/websocket.ts`

**Risk:** The broken JWT field mapping bug (`userId` vs `id`) was not caught. Real-time features silently malfunction.

**Priority:** MEDIUM

### 3. AI Agent Tool Execution Not Tested

**What's not tested:** The `server/services/ai-agent.ts` tool execution logic — especially the tool calling, follow-up response, and side effects.

**Files:** `server/services/ai-agent.ts`

**Risk:** AI agent tools can modify CRM data without validation. Costly AI API calls are made without guardrails.

**Priority:** MEDIUM

### 4. No End-to-End or Integration Tests

**What's not tested:** There are no integration tests that exercise the full request lifecycle (auth → route → database). Tests use mocked Supabase with limited fidelity.

**Files in test suite:** All test files mock Supabase completely.

**Risk:** Route-level bugs (like broken auth in middleware or wrong field names) are invisible to unit tests.

**Priority:** MEDIUM

## Known Issues Summary

| Severity | Issue | File(s) |
|----------|-------|---------|
| CRITICAL | Multi-tenant data isolation via `x-tenant-id` header | `routes/chat.ts`, `routes/crm.ts`, `routes/contacts.ts`, `routes/integrations.ts` |
| CRITICAL | WebSocket auth broken (wrong JWT field names) | `services/websocket.ts` |
| CRITICAL | Hardcoded encryption key fallback | `lib/encryption.ts` |
| HIGH | Hardcoded admin password `admin123` | `routes/auth.ts` |
| HIGH | Hardcoded default password `123456` for new users | `routes/admin.ts` |
| HIGH | 21 files with `@ts-nocheck` | Various |
| HIGH | Hardcoded webhook verify token | `routes/webhooks.ts` |
| HIGH | Weak encryption (CryptoJS, ECB mode) | `lib/encryption.ts` |
| HIGH | PII sent to third-party AI APIs | `services/ai-agent.ts` |
| HIGH | Drizzle schema/dialect mismatch | `drizzle.config.ts`, `db/schema.ts` |
| MEDIUM | TypeScript strict mode disabled | `tsconfig.json` |
| MEDIUM | Audio conversion functions are no-ops | `services/audio.ts` |
| MEDIUM | Backup/deploy systems are simulated | `routes/deploy.ts` |
| MEDIUM | Empty catch blocks suppress errors | Multiple files |
| MEDIUM | WebSocket permissive CORS `origin: *` | `services/websocket.ts` |
| MEDIUM | Inefficient in-memory filtering | `routes/crm.ts`, `routes/chat.ts` |
| MEDIUM | AI tool execution lacks tenant validation | `services/ai-agent.ts` |
| MEDIUM | Sequential webhook processing | `routes/webhooks.ts` |
| MEDIUM | Monolithic 4890-line frontend | `public/js/ozion.js` |
| LOW | Database round-trip on every authenticated request | `middleware/auth.ts` |
| LOW | Mixed module system (require in ESM) | `db/index.ts` |
| LOW | Duplicate API entry points | `api/index.ts`, `server/index.ts` |

---

*Concerns audit: 2026-06-22*
