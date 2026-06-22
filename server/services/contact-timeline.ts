export type TimelineKind = 'message' | 'note' | 'task' | 'event';

export type TimelineItem = {
  id: string;
  kind: TimelineKind;
  createdAt: string;
  title: string;
  body?: string;
  meta?: Record<string, unknown>;
};

type MessageInput = {
  id: string;
  sent_at: string;
  direction: string;
  type: string;
  content: string;
};

type NoteInput = {
  id: string;
  created_at: string;
  body: string;
  author_name?: string | null;
};

type TaskInput = {
  id: string;
  created_at: string;
  title: string;
  status: string;
  due_at?: string | null;
};

type EventInput = {
  id: string;
  created_at: string;
  event_type: string;
  title: string;
  body?: string | null;
};

export type ContactTimelineInput = {
  messages?: MessageInput[];
  notes?: NoteInput[];
  tasks?: TaskInput[];
  events?: EventInput[];
};

function sortNewestFirst(a: TimelineItem, b: TimelineItem) {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

export function buildContactTimeline(input: ContactTimelineInput): TimelineItem[] {
  const items: TimelineItem[] = [
    ...(input.messages ?? []).map((message) => ({
      id: message.id,
      kind: 'message' as const,
      createdAt: message.sent_at,
      title: message.direction === 'inbound' ? 'Mensagem recebida' : 'Mensagem enviada',
      body: message.content,
      meta: { direction: message.direction, type: message.type },
    })),
    ...(input.notes ?? []).map((note) => ({
      id: note.id,
      kind: 'note' as const,
      createdAt: note.created_at,
      title: note.author_name ? `Nota de ${note.author_name}` : 'Nota interna',
      body: note.body,
    })),
    ...(input.tasks ?? []).map((task) => ({
      id: task.id,
      kind: 'task' as const,
      createdAt: task.created_at,
      title: task.title,
      body: task.status === 'done'
        ? 'Tarefa concluída'
        : task.due_at
          ? `Vencimento: ${task.due_at}`
          : 'Tarefa aberta',
      meta: { status: task.status, dueAt: task.due_at ?? null },
    })),
    ...(input.events ?? []).map((event) => ({
      id: event.id,
      kind: 'event' as const,
      createdAt: event.created_at,
      title: event.title,
      body: event.body ?? undefined,
      meta: { eventType: event.event_type },
    })),
  ];

  return items.sort(sortNewestFirst);
}
