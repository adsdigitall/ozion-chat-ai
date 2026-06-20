---
phase: 1
slug: utalk-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-20
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in test (`node --test`) |
| **Config file** | none — `--import tsx` handles TypeScript |
| **Quick run command** | `node --test --import tsx tests/01-utalk-foundation.test.ts` |
| **Full suite command** | `node --test --import tsx "tests/**/*.test.ts"` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test --import tsx tests/01-utalk-foundation.test.ts`
- **After every plan wave:** Run full suite
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 01-01-01 | 01-01 | 1 | UTALK-04 | manual SQL review | `psql -f migrations/004_utalk_integration.sql` | ⬜ pending |
| 01-01-02 | 01-01 | 1 | UTALK-04 | type check | `grep -c "provider" server/db/schema.ts` | ⬜ pending |
| 01-02-01 | 01-02 | 1 | UTALK-07 | unit | `node --test --import tsx tests/01-utalk-foundation.test.ts` | ⬜ pending |
| 01-02-02 | 01-02 | 1 | UTALK-07 | unit | `node --test --import tsx tests/01-utalk-foundation.test.ts` | ⬜ pending |
| 01-03-01 | 01-03 | 2 | UTALK-03 | manual | `tsc --noEmit server/services/utalk-client.ts` | ⬜ pending |
| 01-03-02 | 01-03 | 2 | UTALK-03 | type check | `grep -c "export async function" server/services/utalk-client.ts` | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `tests/01-utalk-foundation.test.ts` — created by plan 01-02
- [ ] Existing infrastructure covers other phase requirements

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration executes | UTALK-04 | SQL migration must run against Supabase/SQLite | Run `psql -f migrations/004_utalk_integration.sql` against Supabase; check `node -e "require('./server/db/schema')"` for local SQLite |
| UTalk client authenticates | UTALK-03 | Requires real UTalk API token not available in CI | Deploy with real token, hit `GET /api/integrations/utalk/test` and verify 200 response |
| Normalizer output shape matches Meta | UTALK-07 | Requires manual inspection of normalized output | Compare normalized message shape with existing Meta webhook handler output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
