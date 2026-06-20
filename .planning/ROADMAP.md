# Roadmap: Ozion — WhatsApp CRM com AI Agents

## Overview

Ozion evolves from its current state (Meta + Evolution providers, basic flow builder, SQLite/Supabase dual DB) into a complete WhatsApp CRM platform with multi-provider support. This roadmap adds UTalk as a second WhatsApp provider with full integration UI, delivers a real data-driven Inbox (no more mocks), completes the Flow Engine with provider-agnostic execution, polishes the Flow Builder, and surfaces real analytics — all while maintaining zero mock/fake data across the entire stack. Each phase is a vertical slice delivering an end-to-end capability for admins, agents, or the system itself.

## Phases

- [ ] **Phase 1: UTalk Foundation** - Database migrations, UTalk API client, and message normalizer
- [ ] **Phase 2: UTalk Integration** - Full UTalk provider with config UI, internal APIs, and webhook ingestion
- [ ] **Phase 3: Provider-Agnostic Engine** - Flow Engine abstraction layer supporting Meta, UTalk, and future providers
- [ ] **Phase 4: Real Inbox** - Live inbox with real database conversations, manual message sending, and audio playback
- [ ] **Phase 5: Inbox Operations** - Tags, status management, agent assignment, conversation filters, provider badges
- [ ] **Phase 6: Flow Builder Polish** - Power toggle, animated connections, device management, analytics in-builder
- [ ] **Phase 7: Flow Engine Complete** - Full execution with all block types (AI, audio, logic, handoff, security)
- [ ] **Phase 8: Real Analytics** - Analytics dashboard powered by real execution and conversation data
- [ ] **Phase 9: Quality & Hardening** - Build compiles clean, no mock data, no fake endpoints

## Phase Details

### Phase 1: UTalk Foundation
**Goal**: As a system developer, I want to lay the data and service foundation for UTalk provider integration, so that Ozion can support a second WhatsApp provider without disrupting the existing Meta integration.
**Mode**: mvp
**Depends on**: Nothing (first phase)
**Requirements**: UTALK-03, UTALK-04, UTALK-07
**Success Criteria** (what must be TRUE):
  1. `utalk_integrations`, `utalk_mappings` tables exist with correct columns via migration
  2. Conversations and messages have `provider` and `external_id` columns for provider-agnostic routing
  3. UTalk API client can authenticate and make basic requests to UTalk API
  4. Incoming UTalk messages are normalized to Ozion's internal message format (same shape as Meta messages)
  5. Encrypted storage of UTalk credentials works (reuses existing encryption lib)
**Plans**: 3 plans (2 waves)

Plans:
- [ ] 01-01-PLAN.md — DB migration (004_utalk_integration.sql) + Drizzle schema updates (provider, external_id, raw_provider_data columns + new tables)
- [ ] 01-02-PLAN.md — UTalk message normalizer (server/services/utalk-normalizer.ts) + test coverage
- [ ] 01-03-PLAN.md — UTalk API client (server/services/utalk-client.ts) following evolution-api.ts pattern

### Phase 2: UTalk Integration
**Goal**: Admin can configure, test, and receive messages from UTalk as a fully functional WhatsApp provider
**Mode**: mvp
**Depends on**: Phase 1
**Requirements**: UTALK-01, UTALK-02, UTALK-05, UTALK-06
**Success Criteria** (what must be TRUE):
  1. Admin can open /integrations/utalk page and see the UTalk configuration form
  2. Admin can save UTalk credentials (API key, instance URL, webhook secret) and test the connection
  3. Internal APIs exist for test-connection, sync, save, and webhook registration
  4. UTalk webhook endpoint (POST /api/webhooks/utalk) receives, normalizes, and stores incoming WhatsApp messages as conversations
  5. Incoming UTalk messages appear as new conversations in the database
**Plans**: TBD
**UI hint**: yes

### Phase 3: Provider-Agnostic Engine
**Goal**: Flow Engine executes flows regardless of whether the conversation's provider is Meta or UTalk
**Mode**: mvp
**Depends on**: Phase 2
**Requirements**: UTALK-08
**Success Criteria** (what must be TRUE):
  1. Flow Engine routes outbound messages through the correct provider based on conversation's provider field
  2. Existing Meta-based flows continue working identically after the abstraction layer
  3. New UTalk conversations trigger flow execution automatically on message receipt
  4. Provider metadata (which provider a conversation uses) is available to flow blocks at runtime
  5. A new flow block can be configured to work with any provider without provider-specific code
**Plans**: TBD

### Phase 4: Real Inbox
**Goal**: Support agents see real conversations from the database, send messages, and play audio
**Mode**: mvp
**Depends on**: Phase 2
**Requirements**: INBOX-01, INBOX-02, INBOX-03
**Success Criteria** (what must be TRUE):
  1. Inbox loads conversations from the database (no mock data) — agent sees real contacts and messages
  2. Agent can click a conversation and see its full chronological message history
  3. Agent can type a message in the input bar, send it, and see it persist in the database and UI
  4. Audio messages (voice notes) are playable inline within the conversation view
  5. Sent messages arrive at the WhatsApp contact via the correct provider (Meta or UTalk)
**Plans**: TBD
**UI hint**: yes

### Phase 5: Inbox Operations
**Goal**: Agents can organize conversations with tags, statuses, assignments, and filters
**Mode**: mvp
**Depends on**: Phase 4
**Requirements**: INBOX-04, INBOX-05
**Success Criteria** (what must be TRUE):
  1. Agent can add and remove tags on any conversation, with tags persisting across sessions
  2. Agent can change conversation status (open/closed/pending) and see status visually
  3. Agent can assign a conversation to themselves or another agent from the workspace
  4. Agent can filter the inbox by status, tags, assigned agent, and provider
  5. Each conversation card shows which provider (Meta/UTalk) it belongs to via a badge or icon
**Plans**: TBD
**UI hint**: yes

### Phase 6: Flow Builder Polish
**Goal**: Final flow builder UX with power control, animated connections, device visibility, and in-builder analytics
**Mode**: mvp
**Depends on**: Phase 2
**Requirements**: FLOW-01, FLOW-02
**Success Criteria** (what must be TRUE):
  1. User can navigate back from the Flow Builder to the flow list without losing state
  2. User can toggle a flow on/off with the power button and see immediate visual confirmation
  3. Connected WhatsApp devices/numbers for a flow are visible and manageable from the builder
  4. Flow connection lines animate with a running effect when flow is active, stop when inactive
  5. Per-node execution counters are visible from the builder interface
**Plans**: TBD
**UI hint**: yes

### Phase 7: Flow Engine Complete
**Goal**: Full flow execution with all block types and both providers
**Mode**: mvp
**Depends on**: Phase 3, Phase 6
**Requirements**: FLOW-03, FLOW-04
**Success Criteria** (what must be TRUE):
  1. Flow Engine executes flows triggered by both Meta and UTalk incoming messages
  2. AI response block works: flow can call Groq/OpenAI/DeepSeek and send the response
  3. Audio block works: flow can send/receive audio messages with transcription
  4. Logic block works: flow can branch based on conditions (keywords, time, contact data)
  5. Handoff block works: flow can transfer conversation to a human agent
**Plans**: TBD

### Phase 8: Real Analytics
**Goal**: Analytics dashboard shows real metrics computed from actual database records
**Mode**: mvp
**Depends on**: Phase 4, Phase 7
**Requirements**: ANALYTICS-01
**Success Criteria** (what must be TRUE):
  1. Dashboard shows conversation counts computed from the database (no hardcoded numbers)
  2. Message volume metrics (sent, received, by provider) come from actual message records
  3. Flow execution metrics (total runs, completions, errors by node) come from flow_executions tables
  4. Analytics page loads without any mock or fake data paths
  5. Time-range filtering works and recomputes from live data
**Plans**: TBD
**UI hint**: yes

### Phase 9: Quality & Hardening
**Goal**: Codebase quality gate — build passes, no mocks/fakes, no regressions
**Mode**: mvp
**Depends on**: Phase 8
**Requirements**: QA-01
**Success Criteria** (what must be TRUE):
  1. `npm run build` completes with zero TypeScript errors
  2. No mock/simulated data paths remain in deploy.ts, updates.ts, or analytics routes
  3. All `// @ts-nocheck` annotations removed from files modified during this milestone
  4. Server starts successfully and all API endpoints respond correctly
  5. Local dev (SQLite) and production (Supabase) paths both verified working
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. UTalk Foundation | 0/3 | Not started | - |
| 2. UTalk Integration | 0/TBD | Not started | - |
| 3. Provider-Agnostic Engine | 0/TBD | Not started | - |
| 4. Real Inbox | 0/TBD | Not started | - |
| 5. Inbox Operations | 0/TBD | Not started | - |
| 6. Flow Builder Polish | 0/TBD | Not started | - |
| 7. Flow Engine Complete | 0/TBD | Not started | - |
| 8. Real Analytics | 0/TBD | Not started | - |
| 9. Quality & Hardening | 0/TBD | Not started | - |
