# Testing Patterns

**Analysis Date:** 2026-06-19

## Test Framework

**Runner:**
- No test framework installed (jest, vitest, mocha, ava, tap — none in `package.json` dependencies)
- No test configuration files found (`jest.config.*`, `vitest.config.*`, `.mocharc.*`, `.taprc`)

**Assertion Library:**
- Not detected — no assertion library installed

**Run Commands:**
```bash
# Node built-in test runner (mentioned in AGENTS.md, but tests/ directory does not exist)
node --test --import tsx tests/<file>.test.ts              # Intended pattern (not yet usable)
```

## Test File Organization

**Location:**
- No test files exist anywhere in the repository
- No `tests/`, `__tests__/`, `test/`, or `spec/` directories found
- No `*.test.ts`, `*.test.js`, `*.spec.ts`, or `*.spec.js` files found

**Naming:**
- Not applicable — no tests exist

**Structure:**
- Not applicable — no test files exist

## Test Structure

**Suite Organization:**
- Not applicable — no tests exist

**Patterns:**
- Not applicable — no tests exist

## Mocking

**Framework:**
- No mocking library installed (no sinon, jest.mock, vitest, testdouble, or similar)

**Patterns:**
- Not applicable — no tests exist

## Fixtures and Factories

**Test Data:**
- Not detected — no test fixtures or factories exist

**Location:**
- Not applicable — no fixture files found

## Coverage

**Requirements:**
- None — no coverage tooling configured

**View Coverage:**
```bash
# No coverage command configured
```

## Test Types

**Unit Tests:**
- None exist. No unit tests for any module (`server/routes/*`, `server/services/*`, `server/middleware/*`, `server/db/*`, `server/lib/*`)

**Integration Tests:**
- None exist. No integration tests for database access, API endpoints, or external service calls

**E2E Tests:**
- None exist. No E2E/Browser tests

## Testing Infrastructure: Gaps

**Test Dependencies:** The following packages would need to be installed to write tests:
- Test runner: `vitest` or `jest`
- TypeScript support: `tsx` is already present (used in `dev` script)
- Mocking: `vitest` includes built-in mocking, or `sinon` for standalone
- HTTP testing: `supertest` for Express route testing
- Database testing: test Supabase client or SQLite test helpers

**Why Testing is Absent:**
- The project is focused on rapid feature development and has not yet established test infrastructure
- AGENTS.md references `node --test --import tsx tests/<file>.test.ts` indicating intent to use Node.js built-in test runner, but the `tests/` directory has not been created
- The codebase has several characteristics that make testing non-trivial:
  - Inline Supabase client calls in route handlers (tight coupling)
  - Module-level state via `getSupabase()` singleton pattern in `server/db/supabase.ts`
  - `// @ts-nocheck` in most service and route files bypasses type safety
  - Dynamic imports (e.g., `const { validateFlow } = await import(...)`) in some files

## Recommended Approach

**For new tests, follow these patterns based on the existing codebase structure:**

1. **Test Runner:** Use Node.js built-in `node:test` + `node:assert` (as hinted in AGENTS.md) or `vitest` (faster, better DX)
2. **Test Location:** `tests/` directory mirroring `server/` structure:
   ```
   tests/
   ├── routes/
   │   ├── auth.test.ts
   │   ├── chat.test.ts
   │   └── ...
   ├── services/
   │   ├── ai-agent.test.ts
   │   ├── meta-api.test.ts
   │   └── ...
   ├── middleware/
   │   └── auth.test.ts
   └── db/
       └── supabase.test.ts
   ```
3. **Mocking Pattern:** Wrap `getSupabase()` in a testable abstraction, or use dependency injection for the Supabase client
4. **HTTP Testing:** Use `supertest` with the Express app exported from `server/index.ts` or `api/index.ts`
5. **Configuration:** Add `vitest.config.ts` or rely on Node.js `--test` runner

---

*Testing analysis: 2026-06-19*
