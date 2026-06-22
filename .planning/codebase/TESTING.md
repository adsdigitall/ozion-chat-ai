# Testing Patterns

**Analysis Date:** 2026-06-22

## Test Framework

**Runner:** Node.js built-in test runner (`node:test`)

**Assertion Library:** `node:assert/strict`

**Config File:** None. No jest.config.ts or vitest.config.ts. Tests run directly with `node --test`.

**Dependencies:** No test-related packages in `devDependencies` or `optionalDependencies`. Testing relies entirely on Node.js built-in APIs.

**Run Commands:**
```bash
node --test --import tsx tests/<file>.test.ts              # Run a single test file
node --test --import tsx tests/                             # Run all test files in tests/
```

From the project `AGENTS.md`:
```bash
node --test --import tsx tests/normalizers.test.ts         # Single test file
```

There is no `npm test` script in `package.json`. Tests must be run manually with `node --test`.

## Test File Organization

**Location:** All tests live in `/Users/natanmacedo/Documents/opencode/ozion-chat-ai/tests/` — separate `tests/` directory at repo root, not co-located with source files.

**Naming:**
- `*.test.ts` pattern only: `normalizers.test.ts`, `provider-abstraction.test.ts`, `webhook-events.test.ts`
- No `.spec.ts` files found

**Structure:**
```
tests/
├── contact-timeline.test.ts            # 1 test, pure function
├── extract-media-info.test.ts          # 5 tests, self-contained function
├── inbox.test.ts                       # 11 tests, file-analysis based
├── message-status-history.test.ts      # 4 tests, file-analysis based
├── normalizers.test.ts                 # 9 tests, import + call
├── provider-abstraction.test.ts        # 7 tests, ESM mocks + integration
└── webhook-events.test.ts              # 10 tests, ESM mocks + in-memory DB
```

## Test Structure

**Suite Organization (node:test style):**
```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Feature Name', () => {
  it('should do something specific', () => {
    const result = someFunction(params);
    assert.equal(result, expectedValue);
  });
});
```

**Top-level `test()`** is used as an alternative to `describe/it`:
```typescript
import test from 'node:test';
import assert from 'node:assert/strict';

test('buildContactTimeline merges messages, notes, tasks and events newest-first', () => {
  const timeline = buildContactTimeline(input);
  assert.deepEqual(timeline.map((item) => item.kind), ['event', 'task', 'note', 'message']);
});
```

**Imports used across tests:**
- `describe, it` from `node:test`
- `mock, before` from `node:test` (for ESM module mocking)
- `test` standalone from `node:test`
- `assert` from `node:assert/strict`
- `fs` from `fs` (for file-analysis tests)

**Patterns:**
- `describe` groups for logical test suites
- `it` blocks for individual test cases with descriptive strings
- `before` for async setup (dynamic imports after mock registration)
- All tests are synchronous within the `it` callback (await used inside, but the callback itself returns a promise implicitly)

## Mocking

**Framework:** Node.js `mock.module()` from `node:test` (ESM module mocking via the Node.js loader hook).

**Patterns:**

1. **Module-level mutable state + mock.module (preferred pattern):**
```typescript
// Shared mutable state closed over by mock factories
let mockCredentials = null;
let metaSendTextImpl = (...args) => Promise.resolve({ messages: [] });

// Register mocks at top level BEFORE dynamic imports
mock.module('../server/lib/encryption.js', {
  namedExports: {
    decrypt: () => 'decrypted-token',
  },
});

mock.module('../server/db/supabase.js', {
  namedExports: {
    getSupabase: () => ({
      from: () => ({ select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: () => ... })})})}),
    }),
  },
});

// Dynamic imports after mocks are registered
const { getProviderForTenant } = await import('../server/services/providers/index.js');
```

2. **In-memory store for DB-like operations (webhook-events.test.ts):**
```typescript
const store: Array<Record<string, unknown>> = [];
let idCounter = 0;

const mockSupabase = {
  from: mock.fn(() => ({
    insert: mock.fn((data) => {
      const id = `evt-${++idCounter}`;
      const record = { ...data, id };
      store.push(record);
      return { select: mock.fn(() => ({ single: mock.fn(() => Promise.resolve({ data: record })) })) };
    }),
    select: mock.fn(() => selectBuilder([...store])),
  })),
};
```

3. **File analysis tests (no mocking) — inbox.test.ts, message-status-history.test.ts:**
```typescript
import fs from 'fs';

it('inbox.ts file exports a router', () => {
  const content = fs.readFileSync('./server/routes/inbox.ts', 'utf-8');
  assert.ok(content.includes('export default router'));
});
```

**What to Mock:**
- External HTTP/API calls (`meta-api.js`, `evolution-api.js`)
- Database layer (`server/db/supabase.js`)
- Encryption/decryption (`server/lib/encryption.js`)

**What NOT to Mock:**
- Pure functions (normalizers, transformers, type utils)
- File system reads for static analysis

**CRITICAL REQUIREMENTS for mock.module:**
- `mock.module()` MUST be called at **top level** before any dynamic `import()` of the modules being mocked
- Imports of the system-under-test must use **dynamic `await import()`** inside `before()` or inside tests after mocks are registered
- Static `import` at the top of the test file will trigger the real module before mocks take effect

## Fixtures and Factories

**Test Data:** Inline plain objects in each test file. No shared fixture files or factory functions.

```typescript
const msg = {
  from: '5511999999999',
  id: 'wamid.ABC123',
  timestamp: '1718000000',
  type: 'text',
  text: { body: 'Hello from Meta' },
};
```

**Location:** Data is defined directly in each `it()` block. No `tests/fixtures/` directory.

## Coverage

**Requirements:** None enforced. No coverage tool configured. No coverage thresholds defined.

**View Coverage:** Not possible with current setup (no `c8`, `istanbul`, or `nyc` configured).

## Test Types

**Unit Tests (pure function):**
- `normalizers.test.ts` — tests `normalizeMetaMessage()`, `normalizeMetaStatusUpdate()`, `normalizeEvolutionMessage()` with inline test data. No mocking needed.
- `contact-timeline.test.ts` — tests `buildContactTimeline()` with inline data. No mocking needed.
- `extract-media-info.test.ts` — self-contained `extractMediaInfo()` function with full type coverage (image, audio, document, text, fallback cases).

**Unit Tests (mocked dependencies):**
- `provider-abstraction.test.ts` — tests `getProviderForTenant()`, `sendByProvider()`, provider classes with `mock.module()` for encryption, supabase, and API modules.
- `webhook-events.test.ts` — tests `createWebhookEvent()`, duplicate detection, status transitions with an in-memory supabase mock.

**File Analysis Tests (static code inspection):**
- `inbox.test.ts` — reads source files with `fs.readFileSync()` and asserts on string content (export names, function signatures, query patterns). Validates both backend routes and frontend files.
- `message-status-history.test.ts` — similar approach, validates function signatures and SQL migration structure via string matching.

**Integration Tests:** Not explicitly present. The `provider-abstraction.test.ts` comes closest, but it mocks all external dependencies so it's a unit test with mocks.

**E2E Tests:** Not used.

## Common Patterns

**Async Testing:**
```typescript
it('should return MetaMessageProvider for meta credentials', async () => {
  mockCredentials = { provider: 'meta', phone_number_id: '123', access_token_encrypted: 'abc' };
  const result = await getProviderForTenant('tenant-meta');
  assert.ok(result.provider instanceof MetaMessageProvider);
});
```

**Error Testing:**
```typescript
it('should return error for missing credentials', async () => {
  mockCredentials = null;
  const result = await getProviderForTenant('tenant-none');
  assert.equal(result.provider, null);
  assert.ok(result.error);
  assert.ok(result.error.includes('No credentials found'));
});
```

**assert.deepEqual Usage:**
```typescript
assert.deepEqual(timeline.map((item) => item.kind), ['event', 'task', 'note', 'message']);

assert.deepEqual(result, {
  externalMediaId: 'media-img-1',
  mediaType: 'image',
  mimeType: 'image/jpeg',
  caption: 'Foto do produto',
});
```

**`assert.ok()` for truthiness and string inclusion:**
```typescript
assert.ok(result);  // truthy check
assert.ok(result.error.includes('Unknown provider type'));  // string inclusion
assert.ok(source.includes('export async function recordStatusEvent'));  // file analysis
```

**`assert.equal()` for strict equality:**
```typescript
assert.equal(result.provider, 'meta');
assert.equal(result.direction, 'inbound');
assert.equal(result.messageType, 'text');
```

**`assert.notEqual()` for inequality:**
```typescript
assert.notEqual(hash1, hash2);
```

## Additions Needed

The test suite would benefit from:

1. **A test run script** in `package.json`: `"test": "node --test --import tsx tests/"`
2. **Coverage reporting** — consider `c8` for code coverage instrumentation
3. **Shared fixtures** — `tests/fixtures/` directory for reusable webhook payloads and message shapes
4. **Integration tests** with a real or containerized Supabase/test DB
5. **Continuous Integration** in `.github/` — no CI workflow detected
6. **Co-located tests** for new modules, or a consistent `tests/` mirror structure

---

*Testing analysis: 2026-06-22*
