# Codebase Concerns

**Analysis Date:** 2026-06-20

## Security Considerations

### Hardcoded Admin Password Fallback

- **Risk:** Legacy admin users (those with `role === 'admin'` whose `password_hash` does not start with `$2`) authenticate with a hardcoded password `admin123`. This bypasses bcrypt entirely.
- **Files:** `server/routes/auth.ts:37-42` (login), `server/routes/auth.ts:231-235` (change-password)
- **Current mitigation:** Only triggers for users whose password hash does not look like bcrypt (`$2` prefix). The seed migration (`migrations/002_saas_multitenant.sql:138`) shows a placeholder hash `$2b$10$placeholder_hash_will_be_replaced_by_backend` — no real bcrypt hash is seeded.
- **Recommendations:** Remove the hardcoded password path. Ensure all admin users have a proper bcrypt hash. Run a migration to set a real hash for the seed admin user.

### Weak Encryption Key Fallback

- **Risk:** `server/lib/encryption.ts:3` defines `ENCRYPTION_KEY` with a fallback to `'default-key-change-in-production-32!'`. If the env var is not set in production, WhatsApp access tokens and app secrets stored encrypted in the database (`whatsapp_credentials.access_token_encrypted`, `whatsapp_credentials.app_secret_encrypted`) can be decrypted with this known key.
- **Files:** `server/lib/encryption.ts:3`
- **Current mitigation:** None — the fallback is a string literal in source code.
- **Recommendations:** Make `ENCRYPTION_KEY` required at startup (throw if missing). Rotate any credentials encrypted with the default key.

### Helmet Content Security Policy Disabled

- **Risk:** The CSP helmet middleware is explicitly disabled with `contentSecurityPolicy: false` in both `server/index.ts:39` and `api/index.ts:34`. This removes XSS protection that CSP would provide.
- **Files:** `server/index.ts:39`, `api/index.ts:34`
- **Recommendations:** Enable CSP with a restrictive policy tailored to the SPA. If inline scripts are required (ozion.js), use nonces or hashes.

### WebSocket CORS Allows Any Origin

- **Risk:** Socket.io server configured with `origin: '*'` in `server/services/websocket.ts:17`, allowing any website to establish WebSocket connections if they can obtain a valid JWT.
- **Files:** `server/services/websocket.ts:16-19`
- **Recommendations:** Restrict WebSocket CORS to the known deployment origin.

### Long-Lived JWT Tokens (7 Days)

- **Risk:** `server/middleware/auth.ts:6` — `TOKEN_EXPIRY = '7d'`. A leaked token is valid for a full week. The logout endpoint (`server/routes/auth.ts:180-202`) does NOT invalidate the token — it simply logs the action.
- **Files:** `server/middleware/auth.ts:6`, `server/routes/auth.ts:180-202`
- **Current mitigation:** The `authMiddleware` checks that the user is still active in the database on every request (`server/middleware/auth.ts:52-61`).
- **Recommendations:** Reduce token expiry to hours (e.g., 24h). Implement a token blacklist or use short-lived access tokens with refresh tokens. Invalidate tokens on logout.

### Weak Password Policy

- **Risk:** `server/routes/auth.ts:213` — only checks `newPassword.length < 6`. No complexity requirements (uppercase, numbers, special chars).
- **Files:** `server/routes/auth.ts:213`
- **Recommendations:** Enforce a stronger password policy (minimum 8 chars, mixed case, numbers).

### Full User Object Embedded in JWT

- **Risk:** The JWT payload contains the entire `AuthUser` object including `id`, `email`, `name`, `role`, `tenant_id`, `customer_id`, `permissions`, and `is_master`. If the JWT is leaked, an attacker gains complete user context.
- **Files:** `server/middleware/auth.ts:12-21` (type), `server/routes/auth.ts:62-71` (token generation)
- **Recommendations:** Store only `userId`, `tenantId`, and `role` in the JWT. Look up permissions from the database on each request (or cache with short TTL).

### Placeholder App Credentials in Source

- **Risk:** `server/routes/whatsapp.ts:8-9` defaults `FACEBOOK_APP_ID` to `'YOUR_APP_ID'` and `FACEBOOK_APP_SECRET` to `'YOUR_APP_SECRET'`. If the env vars are not set in production, these literal strings are used as actual credentials.
- **Files:** `server/routes/whatsapp.ts:8-9`
- **Recommendations:** Throw at startup if these env vars are missing, same as `JWT_SECRET` is handled in `server/middleware/auth.ts:8-10`.

### No Input Validation on Most Routes

- **Risk:** The vast majority of routes accept `req.body` directly and pass it to Supabase inserts/updates without any schema validation (e.g., `server/routes/agents.ts:47` — `...req.body` spread directly). A malicious request could set unexpected fields, including SQL injection via Supabase (though parameterized) or overwrite protected fields.
- **Files:** Most route files — representative example: `server/routes/agents.ts:47`, `server/routes/admin.ts:154`, `server/routes/deploy.ts:18`, `server/routes/plans.ts:21`
- **Current mitigation:** `@ts-nocheck` suppresses any type-level protection.
- **Recommendations:** Use Zod schemas to validate request bodies on all mutating endpoints. Never spread `req.body` directly into database operations.

## Technical Debt

### `@ts-nocheck` in 17 of 22 Route Files

- **Issue:** 17 route files disable TypeScript checking entirely via `// @ts-nocheck`. This defeats the purpose of using TypeScript — no type safety, no null checks, no shape validation at the type level.
- **Files:** `server/routes/webhooks.ts`, `server/routes/whatsapp.ts`, `server/routes/chat.ts`, `server/routes/crm.ts`, `server/routes/flows.ts`, `server/routes/agents.ts`, `server/routes/evolution.ts`, `server/routes/voice.ts`, `server/routes/sales.ts`, `server/routes/integrations.ts`, `server/routes/contacts.ts`, `server/routes/plans.ts`, `server/routes/deploy.ts`, `server/routes/ctwa.ts`, `server/routes/analytics.ts`, `server/routes/health.ts`, `server/routes/flowise.ts`. Also: `server/services/webhook-handler.ts`, `server/services/ai-agent.ts`, `server/services/evolution-api.ts`, `server/services/websocket.ts`, `server/services/audio.ts`, `server/services/validate-flow.ts`.
- **Impact:** Zero type safety in ~85% of the server code. Bugs that TypeScript would catch (wrong argument types, null references, missing properties) go straight to production.
- **Fix approach:** Remove `@ts-nocheck` file by file, add proper TypeScript types, fix type errors, and enable strict mode.

### TypeScript Strict Mode Disabled

- **Issue:** `tsconfig.json:8-10` sets `"strict": false` and `"noImplicitAny": false`. Combined with `@ts-nocheck` in most files, the TypeScript compiler provides minimal value.
- **Files:** `tsconfig.json:8-10`
- **Impact:** Any implicit `any` is allowed. Null/undefined safety is not enforced.
- **Fix approach:** Enable `strict: true`, fix resulting errors incrementally by component.

### Dual Database System — Supabase + SQLite

- **Issue:** The codebase uses `better-sqlite3` for local development (via `server/db/index.ts`) and Supabase PostgreSQL for production. The SQLite schema (`server/db/schema.ts`) uses Drizzle ORM with `sqlite-core`, while production migrations (`migrations/001_initial.sql` etc.) are raw PostgreSQL. These are manually kept in sync — there is no single source of truth.
- **Files:** `server/db/schema.ts` (SQLite via drizzle-orm/sqlite-core), `server/db/index.ts` (SQLite init), `migrations/001_initial.sql` (PostgreSQL), `server/db/supabase.ts` (Supabase client)
- **Impact:** Schema drift between local SQLite and production PostgreSQL is inevitable. The Drizzle schema references columns (like `customerId` on `users`) that migration 002 adds via `ALTER TABLE`. Columns exist in PostgreSQL but not in the Drizzle schema, and vice versa.
- **Fix approach:** Either standardize on Supabase (remove SQLite) or use a migration-based tool (like Drizzle Kit) that works with both. Consider using `drizzle-orm/pg-core` instead of `sqlite-core`.

### Silent Error Swallowing

- **Issue:** Many try/catch blocks have empty or near-empty catch clauses, swallowing errors that could indicate bugs, security issues, or data loss.
- **Files (representative examples):** `server/middleware/auth.ts:80` (`} catch (e) {}`), `server/routes/auth.ts:59` (`} catch {}`), `server/routes/auth.ts:95` (`} catch (e) {}`), `server/routes/auth.ts:163` (`} catch (e) {}`), `server/services/webhook-handler.ts:63` (logs `error` but not `Insert contact error:`), `server/services/webhook-handler.ts:131-132` (duplicate check but error is logged only if not duplicate)
- **Impact:** Silent failures in audit logging, customer status checks, and data persistence operations mean data integrity issues go undetected.
- **Fix approach:** At minimum log error details. For audit/critical paths, consider alerting or metrics.

### Mock Data Masquerading as Real

- **Issue:** Several endpoints generate fake data that appears authentic:
  - `server/routes/deploy.ts:75-80` — Backup "completion" is simulated with `setTimeout` and `Math.floor(Math.random() * 5000000)` as the file size.
  - `server/routes/deploy.ts:164-168` — Deploy pipeline stages are simulated with chained `setTimeout` calls.
  - `server/routes/updates.ts:50-60` — Version check endpoint uses hardcoded `MOCK_VERSIONS`.
  - `server/routes/updates.ts:84` — Provider test latency is random: `Math.floor(Math.random() * 300) + 100`.
- **Files:** `server/routes/deploy.ts`, `server/routes/updates.ts`
- **Impact:** These endpoints give the illusion of functionality. A user can "create a backup" and see "completed" status, but no actual data is backed up. The deploy system simulates CI/CD without actually deploying.
- **Fix approach:** Either implement real backup/deploy functionality or label these as mock/demo endpoints. Never return realistic-looking success for fake operations.

### Duplicate Route Registration Code

- **Issue:** `server/index.ts` (local dev) and `api/index.ts` (Vercel production) are nearly identical files (93 lines vs 65 lines). Every route addition must be duplicated in both.
- **Files:** `server/index.ts`, `api/index.ts`
- **Impact:** Route registration drift between environments. The local dev `server/index.ts` has a Supabase connection check on startup (`server/index.ts:75-84`) that `api/index.ts` lacks.
- **Fix approach:** Extract route registration into a shared function that both `server/index.ts` and `api/index.ts` import.

### In-Memory Client-Side Filtering

- **Issue:** Several routes load all records from the database, then filter/process in memory:
  - `server/routes/crm.ts:13-28` — Loads all contacts, then filters by `search`, `tag`, `status`, `source`, `stage` in JavaScript.
  - `server/routes/chat.ts:13-25` — Loads all conversations, then filters by `status`, `assigned`, `search` in memory.
  - `server/routes/analytics.ts:12-15` — Loads entire tables to compute dashboard counts.
- **Impact:** Performance degrades as data grows. A tenant with 100K contacts will load all of them into memory and iterate in Node.js for a filtered search.
- **Fix approach:** Push filtering to the database layer using Supabase query filters (`.eq()`, `.ilike()`, `.in()`, etc.) before executing the query.

### Duplicate CRUD Patterns

- **Issue:** Multiple routes implement identical CRUD boilerplate (list, create, update, delete) with minor variations — e.g., `server/routes/voice.ts`, `server/routes/sales.ts`, `server/routes/integrations.ts`, `server/routes/agents.ts`. Each has the same `crypto.randomUUID()` + `sb.from('table').insert()` + error handling pattern.
- **Files:** `server/routes/voice.ts`, `server/routes/sales.ts`, `server/routes/integrations.ts`, `server/routes/agents.ts`, `server/routes/plans.ts`
- **Impact:** Massive code duplication (estimated 70%+ of route code is boilerplate). Changes to error handling or response format must be replicated across all files.
- **Fix approach:** Create generic CRUD route factory or base class that handles list/create/update/delete for any table with column configuration.

### No View Layer Abstraction

- **Issue:** All routes directly embed Supabase query logic inline. There is no service/repository layer separating HTTP handling from data access.
- **Files:** All route files under `server/routes/`
- **Impact:** Routes are hard to unit test (need HTTP server), impossible to reuse query logic, and mix concerns (HTTP parsing + auth + data access + business logic + response formatting).
- **Fix approach:** Introduce a repository/service layer between routes and Supabase for data access logic.

### Aggressive Cookie Notice in HTML

- **Issue:** `public/index.html` contains a cookie consent banner that automatically accepts and hides after 3 seconds (`setTimeout(acceptCookies, 3000)`). The `acceptCookies` function sets localStorage but never actually configures any cookie tracking.
- **Files:** `public/index.html`: cookie banner section
- **Impact:** The cookie banner is cosmetic only — no actual cookie management or consent mechanism. It auto-accepts for the user, which may violate GDPR/ePrivacy requirements.

## Performance Bottlenecks

### No Cursor-Based Pagination

- **Issue:** All pagination uses `limit` + `offset` pattern, e.g., `server/routes/contacts.ts:14` (`limit(limit)`), `server/routes/ctwa.ts:97-98` (`limit(limit)`), `server/routes/admin.ts:543` (`.range()`). As offset increases, database performance degrades.
- **Files:** `server/routes/contacts.ts:14`, `server/routes/ctwa.ts:97-98`, `server/routes/admin.ts:543`, `server/routes/logs.ts:16`
- **Impact:** Page load times increase linearly with data volume. Large tenants (>100K records) will see slow responses for deep pages.
- **Fix approach:** Implement cursor-based pagination using `created_at` or `id` as the cursor for list endpoints.

### No Rate Limiting

- **Issue:** No rate limiting middleware anywhere. Authentication endpoints (`POST /api/auth/login`) and webhook endpoints (`POST /api/webhooks/whatsapp`) are completely unthrottled.
- **Files:** `server/index.ts`, `api/index.ts` — no rate limiting middleware present
- **Impact:** Vulnerable to brute-force attacks on login, DoS on webhook endpoints, and API abuse by compromised tokens.
- **Fix approach:** Add `express-rate-limit` middleware with strict limits on auth routes and reasonable limits on API routes.

### No Response Caching

- **Issue:** No caching headers or mechanisms for any endpoints, including analytics dashboard (`server/routes/analytics.ts:7`), system health (`server/routes/health.ts:8`), and provider versions (`server/routes/updates.ts:23`).
- **Files:** All routes
- **Impact:** Repeated requests for the same data hit the database every time. Analytics dashboards that load entire tables recompute on every page refresh.
- **Fix approach:** Add `Cache-Control` headers for read-heavy endpoints. Consider in-memory cache (e.g., `node-cache`) for frequently accessed, rarely changing data.

### Analytics Loads All Records

- **Issue:** `server/routes/analytics.ts:12-15` fires 5 parallel Supabase queries, each loading all records for contacts, conversations, messages, sales, and CTWA attributions — then counts/filters in JavaScript.
- **Files:** `server/routes/analytics.ts:12-34`
- **Impact:** Dashboard load time and memory usage scale linearly with total data volume. For a tenant with 500K messages, all 500K records are loaded into memory.
- **Fix approach:** Use Supabase aggregation queries (`.select('*', { count: 'exact', head: true })`) or database-level aggregation to get counts without transferring rows.

## Fragile Areas

### Webhook Handler — `webhook-handler.ts`

- **Files:** `server/services/webhook-handler.ts`
- **Why fragile:** The webhook handler directly constructs DB operations from raw webhook payloads. The message content is serialized with `JSON.stringify(message.text || message.image || message.interactive || {})` — if `message.text` is `undefined`, it falls through to `message.image`, then `message.interactive`, then `{}`. Any unrecognized message type (e.g., new WhatsApp message types) would result in an empty `{}` content string. The `@ts-nocheck` at line 1 suppresses any type mismatch warnings.
- **Test coverage:** No tests found.
- **Safe modification:** Always add new message type branches explicitly. Never rely on the `||` fallback chain for unknown types.

### Evolution API Webhook — `server/routes/evolution.ts`

- **Files:** `server/routes/evolution.ts`
- **Why fragile:** This monolithic 253-line handler manages the entire lifecycle: contact creation, conversation management, audio downloading/transcription, AI processing, and message sending. If any step fails (audio download, transcription, AI call), the entire webhook response may still return 200, but side effects are partially applied. The `@ts-nocheck` means schema changes (e.g., column renames) silently break queries.
- **Test coverage:** No tests found.
- **Safe modification:** Break this handler into smaller, focused functions. Each stage (contact resolve, message save, AI process, response send) should be independently testable.

### AI Agent — `server/services/ai-agent.ts`

- **Files:** `server/services/ai-agent.ts`
- **Why fragile:** Direct API calls to Groq/OpenAI/DeepSeek with no response validation, no retry logic, no circuit breaker. The tool execution (`executeTool`, line 120) directly mutates the database from AI-generated tool calls — if the AI hallucinates tool arguments, it writes bad data. The `@ts-nocheck` at line 1 removes all safety.
- **Test coverage:** No tests found.
- **Safe modification:** Validate AI tool call arguments against a schema before executing. Add response validation for AI provider responses. Add idempotency keys for tool executions.

### Encryption Layer — `server/lib/encryption.ts`

- **Files:** `server/lib/encryption.ts`
- **Why fragile:** Uses `CryptoJS.AES.encrypt` which uses ECB mode by default (insecure). The encryption key has a hardcoded fallback. There's no IV (initialization vector), making the encryption deterministic. If the same plaintext is encrypted twice, the ciphertext is identical.
- **Test coverage:** No tests found.
- **Safe modification:** Replace with Node.js native `crypto` module using AES-256-GCM with a random IV. Never use ECB mode for any purpose.

### Tags Route Hardcodes Tenant

- **Files:** `server/routes/tags.ts:28`
- **Why fragile:** The create tag endpoint hardcodes `tenant_id: 'default'` instead of using the authenticated user's tenant or the `x-tenant-id` header. All tags are created under the master tenant regardless of which tenant the user belongs to.
- **Test coverage:** No tests found.
- **Safe modification:** Use `req.headers['x-tenant-id']` or `req.user!.tenant_id` like every other route does.

## Scaling Limits

### Column-Type Limitations

- **Issue:** All timestamps are stored as TEXT (`created_at`, `updated_at`, `sent_at`, etc.) in both the Drizzle schema and PostgreSQL migrations. JSON fields (tags, permissions, settings, config) are stored as TEXT with manual `JSON.parse()` on read.
- **Files:** `server/db/schema.ts` (all columns), `migrations/001_initial.sql` (all columns using `TEXT DEFAULT (now())::text`)
- **Impact:** No time-based indexing, no native JSON querying (PostgreSQL `->>` operators), no date arithmetic at the database level. Manual JSON.parse on every read adds overhead. Filtering by date requires string comparison.
- **Fix approach:** Use `TIMESTAMPTZ` for dates and `JSONB` for JSON data in PostgreSQL. Update the Drizzle schema to match.

### Single `customer_id` per User

- **Issue:** Users can only belong to one customer (single `customer_id` column on `users`). This prevents scenarios where a user manages multiple client accounts.
- **Files:** `server/db/schema.ts:17`, `migrations/002_saas_multitenant.sql:83`
- **Impact:** Cannot support multi-account users or cross-tenant admin workflows without workarounds like impersonation.
- **Fix approach:** Use a user-customer join table for many-to-many relationships.

## Dependencies at Risk

### `better-sqlite3` as Optional Dependency

- **Risk:** `better-sqlite3` is listed under `optionalDependencies` in `package.json:33`. It requires native compilation and may fail on non-standard architectures or serverless environments. The code handles this gracefully (throws warnings), but the dual-database approach means developers may not catch PostgreSQL-specific issues during local development.
- **Files:** `package.json:33`, `server/db/index.ts:25-27`
- **Migration plan:** Remove SQLite dependency entirely. Use Supabase local development or Drizzle Kit push for schema development.

## Missing Critical Features

### No Test Suite

- **Problem:** The codebase has zero tests. No test directory, no test files, no test configuration. The `package.json` has no test script.
- **Files:** N/A — no test files found
- **Blocks:** Cannot safely refactor the massive duplicated code (routes, CRUD patterns, mock/simulated systems). Changes require manual QA. The `@ts-nocheck` + no strict mode + no tests triple-threat means bugs are guaranteed on any non-trivial change.
- **Priority:** High

### No Input Validation Library

- **Problem:** Zod is listed in `package.json:30` as a dependency but is not used anywhere in the route code. No request body validation exists.
- **Files:** `package.json:30` (Zod present but unused)
- **Blocks:** Request body injection vulnerabilities, inability to provide structured error messages.
- **Priority:** Medium

### No Logging Framework

- **Problem:** All logging uses `console.log`, `console.error`, `console.warn`. No structured logging, no log levels, no log transport, no correlation IDs.
- **Files:** All server files use `console.*`
- **Blocks:** Debugging production issues requires correlating multiple console output lines. No searchable structured logs.
- **Priority:** Medium

### No Health Check Route Auth Bypass

- **Issue:** `server/index.ts:71` mounts `GET /api/ping` without authentication, which is correct. However, `server/index.ts:46` mounts `GET /api/health` WITH `authMiddleware`. The `/api/health/system` endpoint (`server/routes/health.ts:8`) queries `system_health` table. This means monitoring systems that need to check health must authenticate.
- **Files:** `server/index.ts:46`, `server/routes/health.ts:8`
- **Priority:** Low

## Test Coverage Gaps

- **What's not tested:** Everything. No test files exist anywhere in the codebase.
- **Files:** All
- **Risk:** Any refactor, dependency update, or change to shared patterns risks regression across the entire application.
- **Priority:** High

---

*Concerns audit: 2026-06-20*
