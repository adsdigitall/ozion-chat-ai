import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContactTimeline } from '../server/services/contact-timeline.js';

test('buildContactTimeline merges messages, notes, tasks and events newest-first', () => {
  const timeline = buildContactTimeline({
    messages: [
      { id: 'm1', sent_at: '2026-06-13T10:00:00.000Z', direction: 'inbound', type: 'text', content: 'oi' },
    ],
    notes: [
      { id: 'n1', created_at: '2026-06-13T10:05:00.000Z', body: 'ligar depois', author_name: 'Ana' },
    ],
    tasks: [
      { id: 't1', created_at: '2026-06-13T10:10:00.000Z', title: 'Follow-up', status: 'open' },
    ],
    events: [
      { id: 'e1', created_at: '2026-06-13T10:15:00.000Z', event_type: 'status_changed', title: 'Status alterado' },
    ],
  });

  assert.deepEqual(timeline.map((item) => item.kind), ['event', 'task', 'note', 'message']);
  assert.equal(timeline[0].title, 'Status alterado');
  assert.equal(timeline[1].body, 'Tarefa aberta');
  assert.equal(timeline[3].body, 'oi');
});
