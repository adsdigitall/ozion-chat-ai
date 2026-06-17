"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Bot,
  Check,
  CheckCheck,
  ChevronDown,
  CircleUserRound,
  Clock3,
  FileText,
  Filter,
  Inbox,
  Info,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Send,
  Smile,
  Sparkles,
  Tag,
  UserRoundCheck,
  UsersRound,
  Wifi,
  X,
} from "lucide-react";

type ConversationStatus = "open" | "waiting" | "closed";
type MessageSender = "contact" | "agent" | "ai" | "system";

type ChatMessage = {
  id: string;
  sender: MessageSender;
  content: string;
  time: string;
  status?: "sent" | "delivered" | "read";
};

type Conversation = {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  numberId: string;
  queue: string;
  assignedTo: string;
  status: ConversationStatus;
  unread: number;
  updatedAt: string;
  tags: string[];
  aiEnabled: boolean;
  lastSeen: string;
  notes: string;
  messages: ChatMessage[];
  channelLabel: string;
  channelPhone: string;
  persisted?: boolean;
};

type ApiMessage = {
  id: string;
  sender: MessageSender;
  content: string | null;
  type: string;
  read: boolean;
  created_at: string;
};

type ApiConversation = {
  id: string;
  phone_number: string | null;
  status: ConversationStatus;
  unread_count: number | null;
  metadata: Record<string, unknown> | null;
  contact: { name?: string | null; phone?: string | null } | null;
  assigned_user: { name?: string | null } | null;
  connection: {
    id?: string | null;
    display_name?: string | null;
    phone_number?: string | null;
    type?: string | null;
  } | null;
  messages: ApiMessage[] | null;
};

const agents = ["Natan Macedo", "Ana Souza", "Carlos Lima", "Agente IA"];
const queues = ["Vendas", "Suporte", "Financeiro", "Recuperação"];
const availableTags = ["Novo lead", "Qualificado", "Suporte", "Proposta", "Cliente", "Urgente"];

const previewConversations: Conversation[] = [
  {
    id: "preview-ctwa",
    name: "Lead CTWA",
    phone: "+55 11 90000-0001",
    avatar: "LC",
    numberId: "preview-sales",
    queue: "Vendas",
    assignedTo: "Agente IA",
    status: "open",
    unread: 2,
    updatedAt: "agora",
    tags: ["Novo lead", "Qualificado"],
    aiEnabled: true,
    lastSeen: "online agora",
    notes: "Preview da caixa de entrada. Quando chegar mensagem real via webhook, ela aparece neste mesmo layout.",
    channelLabel: "Ozion Vendas",
    channelPhone: "+55 11 4002-8922",
    persisted: false,
    messages: [
      { id: "pv-1", sender: "system", content: "Conversa iniciada por anúncio Click-to-WhatsApp", time: "14:22" },
      { id: "pv-2", sender: "contact", content: "Oi, vim pelo anúncio e quero saber como funciona.", time: "14:23" },
      { id: "pv-3", sender: "ai", content: "Olá! Posso te explicar e também chamar um especialista. Você quer atendimento para vendas ou suporte?", time: "14:23", status: "read" },
      { id: "pv-4", sender: "contact", content: "Quero conectar vários números oficiais e usar IA.", time: "14:24" },
    ],
  },
  {
    id: "preview-human",
    name: "Atendimento Humano",
    phone: "+55 11 90000-0002",
    avatar: "AH",
    numberId: "preview-support",
    queue: "Suporte",
    assignedTo: "Natan Macedo",
    status: "waiting",
    unread: 1,
    updatedAt: "5 min",
    tags: ["Suporte", "Urgente"],
    aiEnabled: false,
    lastSeen: "há 3 min",
    notes: "Exemplo de conversa transferida para humano após handoff.",
    channelLabel: "Ozion Suporte",
    channelPhone: "+55 11 4002-8933",
    persisted: false,
    messages: [
      { id: "pv-5", sender: "system", content: "IA pausada e conversa movida para aguardando", time: "13:55" },
      { id: "pv-6", sender: "contact", content: "Preciso falar com uma pessoa.", time: "13:56" },
    ],
  },
  {
    id: "preview-risk",
    name: "Filtro de Risco",
    phone: "+55 11 90000-0003",
    avatar: "FR",
    numberId: "preview-sales",
    queue: "Recuperação",
    assignedTo: "Não atribuído",
    status: "open",
    unread: 0,
    updatedAt: "12 min",
    tags: ["Risco"],
    aiEnabled: false,
    lastSeen: "WhatsApp",
    notes: "Preview do filtro anti-spam/anti-risco: tag aplicada, IA pausada e agente avisado.",
    channelLabel: "Ozion Vendas",
    channelPhone: "+55 11 4002-8922",
    persisted: false,
    messages: [
      { id: "pv-7", sender: "contact", content: "Isso parece golpe, quero suporte.", time: "12:40" },
      { id: "pv-8", sender: "system", content: "Atendimento pausado automaticamente. Palavra de risco detectada: golpe", time: "12:40" },
    ],
  },
];

function currentTime() {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

function lastMessage(conversation: Conversation) {
  return conversation.messages.at(-1)?.content ?? "Nenhuma mensagem";
}

function StatusIcon({ status }: { status?: ChatMessage["status"] }) {
  if (status === "read") return <CheckCheck className="h-3.5 w-3.5 text-sky-400" />;
  if (status === "delivered") return <CheckCheck className="h-3.5 w-3.5 text-zinc-500" />;
  return <Check className="h-3.5 w-3.5 text-zinc-500" />;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>(previewConversations);
  const [selectedId, setSelectedId] = useState(previewConversations[0].id);
  const [activeStatus, setActiveStatus] = useState<"all" | ConversationStatus>("open");
  const [numberFilter, setNumberFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/conversations", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Falha ao carregar conversas.");
        if (result.conversations?.length) {
          const loaded = (result.conversations as ApiConversation[]).map((conversation) => {
            const contact = conversation.contact ?? {};
            const metadata = conversation.metadata ?? {};
            const metadataTags = metadata.tags;
            return {
              id: conversation.id,
              name: contact.name || conversation.phone_number || "Contato",
              phone: contact.phone || conversation.phone_number || "",
              avatar: (contact.name || "Contato").split(" ").map((part: string) => part[0]).join("").slice(0, 2).toUpperCase(),
              numberId: conversation.connection?.id || "sales",
              queue: typeof metadata.queue === "string" ? metadata.queue : "Atendimento",
              assignedTo: conversation.assigned_user?.name || "Não atribuído",
              status: conversation.status,
              unread: conversation.unread_count || 0,
              updatedAt: "agora",
              tags: Array.isArray(metadataTags) ? metadataTags.filter((tag): tag is string => typeof tag === "string") : [],
              aiEnabled: Boolean(metadata.aiEnabled),
              lastSeen: "WhatsApp",
              notes: typeof metadata.notes === "string" ? metadata.notes : "",
              channelLabel: conversation.connection?.display_name || "WhatsApp oficial",
              channelPhone: conversation.connection?.phone_number || "",
              persisted: true,
              messages: (conversation.messages || []).map((message) => ({
                id: message.id,
                sender: message.sender,
                content: message.content || `[${message.type}]`,
                time: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.created_at)),
                status: message.read ? "read" : "sent",
              })),
            } satisfies Conversation;
          });
          setConversations(loaded);
          setSelectedId(loaded[0].id);
        } else {
          setConversations(previewConversations);
          setSelectedId(previewConversations[0].id);
        }
      } catch (error) {
        setConversations(previewConversations);
        setSelectedId(previewConversations[0].id);
        setSyncError(error instanceof Error ? error.message : "Falha ao sincronizar conversas.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0];

  const filteredConversations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const matchesStatus = activeStatus === "all" || conversation.status === activeStatus;
      const matchesNumber = numberFilter === "all" || conversation.numberId === numberFilter;
      const matchesSearch =
        !normalizedSearch ||
        conversation.name.toLowerCase().includes(normalizedSearch) ||
        conversation.phone.includes(normalizedSearch) ||
        conversation.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch));
      return matchesStatus && matchesNumber && matchesSearch;
    });
  }, [activeStatus, conversations, numberFilter, search]);

  const counts = useMemo(
    () => ({
      all: conversations.length,
      open: conversations.filter((conversation) => conversation.status === "open").length,
      waiting: conversations.filter((conversation) => conversation.status === "waiting").length,
      closed: conversations.filter((conversation) => conversation.status === "closed").length,
    }),
    [conversations]
  );
  const officialNumbers = useMemo(() => {
    const unique = new Map<string, { id: string; label: string; phone: string; color: string; connected: boolean }>();
    for (const conversation of conversations) {
      if (!unique.has(conversation.numberId)) {
        unique.set(conversation.numberId, {
          id: conversation.numberId,
          label: conversation.channelLabel,
          phone: conversation.channelPhone,
          color: "bg-emerald-500",
          connected: true,
        });
      }
    }
    return Array.from(unique.values());
  }, [conversations]);

  const previewMode = conversations.every((conversation) => !conversation.persisted);

  function updateSelected(update: Partial<Conversation>) {
    setConversations((current) =>
      current.map((conversation) => (conversation.id === selected.id ? { ...conversation, ...update } : conversation))
    );
  }

  function addSystemMessage(content: string) {
    const message: ChatMessage = { id: crypto.randomUUID(), sender: "system", content, time: currentTime() };
    updateSelected({ messages: [...selected.messages, message], updatedAt: "agora" });
  }

  function chooseConversation(id: string) {
    setSelectedId(id);
    setShowTemplates(false);
    setShowTags(false);
    setConversations((current) =>
      current.map((conversation) => (conversation.id === id ? { ...conversation, unread: 0 } : conversation))
    );
  }

  function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const content = messageInput.trim();
    if (!content || selected.status === "closed") return;

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "agent",
      content,
      time: currentTime(),
      status: "sent",
    };

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === selected.id
          ? { ...conversation, messages: [...conversation.messages, message], unread: 0, updatedAt: "agora" }
          : conversation
      )
    );
    setMessageInput("");
    setShowTemplates(false);

    if (selected.persisted) {
      const endpoint = selected.numberId && selected.numberId !== "sales"
        ? "/api/whatsapp/send"
        : `/api/conversations/${selected.id}/messages`;
      const payload = endpoint === "/api/whatsapp/send"
        ? {
            to: selected.phone,
            type: "text",
            content,
            connectionId: selected.numberId,
            conversationId: selected.id,
          }
        : { content, sender: "agent", type: "text" };
      void fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (response) => {
        if (!response.ok) {
          const result = await response.json();
          setSyncError(result.error || "A mensagem não foi salva.");
        }
      });
    }
  }

  function changeStatus(status: ConversationStatus) {
    updateSelected({ status });
    addSystemMessage(
      status === "closed"
        ? `Conversa finalizada por ${selected.assignedTo}`
        : status === "waiting"
          ? "Conversa movida para aguardando"
          : "Conversa reaberta"
    );
    if (selected.persisted) {
      void fetch(`/api/conversations?id=${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then(async (response) => {
        if (!response.ok) {
          const result = await response.json();
          setSyncError(result.error || "O status não foi salvo.");
        }
      });
    }
  }

  function changeAssignment(assignedTo: string) {
    updateSelected({ assignedTo, aiEnabled: assignedTo === "Agente IA" });
    addSystemMessage(`Atendimento atribuído para ${assignedTo}`);
  }

  function toggleTag(tag: string) {
    const hasTag = selected.tags.includes(tag);
    updateSelected({ tags: hasTag ? selected.tags.filter((item) => item !== tag) : [...selected.tags, tag] });
  }

  const selectedNumber = officialNumbers.find((number) => number.id === selected.numberId) ?? {
    id: selected.numberId,
    label: selected.channelLabel,
    phone: selected.channelPhone,
    color: "bg-emerald-500",
    connected: true,
  };

  return (
    <div className="flex h-[calc(100vh-64px)] min-h-[620px] overflow-hidden bg-zinc-950">
      <section className="flex w-[350px] shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
        <div className="border-b border-zinc-800 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-white">Chat ao vivo</h1>
              <p className="text-xs text-zinc-500">Central estilo Umbler com múltiplos números</p>
            </div>
            {previewMode && <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-300">Preview</span>}
          </div>

          {previewMode && (
            <div className="mb-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-[11px] leading-relaxed text-emerald-200">
              Assim que o webhook receber mensagens reais, este preview some e entram os atendimentos oficiais.
            </div>
          )}

          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome, telefone ou etiqueta"
              className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-500/60"
            />
          </label>

          <div className="mt-3 flex gap-2">
            <label className="relative min-w-0 flex-1">
              <MessageCircle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
              <select
                value={numberFilter}
                onChange={(event) => setNumberFilter(event.target.value)}
                className="h-9 w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-900 pl-9 pr-8 text-xs text-zinc-300 outline-none"
              >
                <option value="all">Todos os números</option>
                {officialNumbers.map((number) => <option key={number.id} value={number.id}>{number.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            </label>
            <button className="rounded-lg border border-zinc-800 px-3 text-zinc-500 transition hover:bg-zinc-900 hover:text-white">
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 border-b border-zinc-800">
          {([
            ["all", "Todos", Inbox],
            ["open", "Entrada", MessageCircle],
            ["waiting", "Espera", Clock3],
            ["closed", "Fechados", Archive],
          ] as const).map(([status, label, Icon]) => (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className={`relative flex flex-col items-center gap-1 py-3 text-[11px] transition ${
                activeStatus === status ? "bg-emerald-500/5 text-emerald-400" : "text-zinc-600 hover:text-zinc-300"
              }`}
            >
              <span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" />{label}</span>
              <span className="font-semibold">{counts[status]}</span>
              {activeStatus === status && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => {
            const number = officialNumbers.find((item) => item.id === conversation.numberId);
            return (
              <button
                key={conversation.id}
                onClick={() => chooseConversation(conversation.id)}
                className={`flex w-full gap-3 border-b border-zinc-900 p-4 text-left transition ${
                  selected.id === conversation.id ? "bg-emerald-500/10" : "hover:bg-zinc-900/70"
                }`}
              >
                <div className="relative shrink-0">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">
                    {conversation.avatar}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-zinc-950 ${number?.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-white">{conversation.name}</p>
                    <span className="shrink-0 text-[10px] text-zinc-600">{conversation.updatedAt}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">{lastMessage(conversation)}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-500">{conversation.queue}</span>
                    {conversation.aiEnabled && <Bot className="h-3 w-3 text-violet-400" />}
                    {conversation.tags.slice(0, 1).map((tag) => (
                      <span key={tag} className="max-w-20 truncate rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-400">{tag}</span>
                    ))}
                  </div>
                </div>
                {conversation.unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-zinc-950">
                    {conversation.unread}
                  </span>
                )}
              </button>
            );
          })}
          {filteredConversations.length === 0 && (
            <div className="px-8 py-16 text-center">
              <Search className="mx-auto h-6 w-6 text-zinc-700" />
              <p className="mt-3 text-sm text-zinc-500">Nenhuma conversa encontrada</p>
            </div>
          )}
        </div>
      </section>

      <main className="flex min-w-0 flex-1 flex-col bg-[radial-gradient(circle_at_top,#18201d_0%,#09090b_35%)]">
        {syncError && (
          <button
            onClick={() => setSyncError(null)}
            className="absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-300 shadow-xl"
          >
            {syncError}
          </button>
        )}
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">{selected.avatar}</div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-sm font-semibold text-white">{selected.name}</h2>
                {selected.aiEnabled && <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-400">IA ativa</span>}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-500">
                <span>{selected.phone}</span>
                <span>•</span>
                <span className="text-emerald-500">{selected.lastSeen}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                const next = !selected.aiEnabled;
                updateSelected({ aiEnabled: next, assignedTo: next ? "Agente IA" : "Natan Macedo" });
                addSystemMessage(next ? "Agente de IA ativado" : "Atendimento assumido por Natan Macedo");
              }}
              className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-xs transition ${
                selected.aiEnabled
                  ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
                  : "border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <Bot className="h-4 w-4" />
              {selected.aiEnabled ? "IA atendendo" : "Ativar IA"}
            </button>
            {selected.status === "closed" ? (
              <button onClick={() => changeStatus("open")} className="flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-3 text-xs font-medium text-zinc-950">
                <RotateCcw className="h-4 w-4" />Reabrir
              </button>
            ) : (
              <button onClick={() => changeStatus("closed")} className="flex h-9 items-center gap-2 rounded-lg border border-zinc-800 px-3 text-xs text-zinc-400 transition hover:bg-zinc-900 hover:text-white">
                <CheckCircleButton />Finalizar
              </button>
            )}
            <button onClick={() => setShowDetails((current) => !current)} className="rounded-lg border border-zinc-800 p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-white">
              <Info className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            <div className="mb-2 flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-800" />
              <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">Hoje</span>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>

            {selected.messages.map((message) => {
              if (message.sender === "system") {
                return (
                  <div key={message.id} className="my-1 flex justify-center">
                    <span className="rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-[10px] text-zinc-500">{message.content} • {message.time}</span>
                  </div>
                );
              }

              const outbound = message.sender === "agent" || message.sender === "ai";
              return (
                <div key={message.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[72%] rounded-2xl px-4 py-3 shadow-sm ${
                    message.sender === "contact"
                      ? "rounded-tl-md border border-zinc-800 bg-zinc-900 text-zinc-200"
                      : message.sender === "ai"
                        ? "rounded-tr-md border border-violet-500/20 bg-violet-500/10 text-zinc-100"
                        : "rounded-tr-md bg-emerald-600 text-white"
                  }`}>
                    {message.sender === "ai" && (
                      <div className="mb-1.5 flex items-center gap-1 text-[10px] font-medium text-violet-400"><Sparkles className="h-3 w-3" />Agente IA</div>
                    )}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                    <div className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] ${message.sender === "agent" ? "text-emerald-100/70" : "text-zinc-600"}`}>
                      <span>{message.time}</span>
                      {outbound && <StatusIcon status={message.status} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="relative shrink-0 border-t border-zinc-800 bg-zinc-950 p-4">
          {showTemplates && (
            <div className="absolute bottom-full left-4 mb-2 w-[420px] rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-2xl">
              <div className="flex items-center justify-between px-2 py-1.5">
                <p className="text-xs font-medium text-white">Respostas rápidas e templates</p>
                <button onClick={() => setShowTemplates(false)} className="text-zinc-600 hover:text-white"><X className="h-4 w-4" /></button>
              </div>
              {[
                "Olá! Como posso ajudar você hoje?",
                "Vou encaminhar seu atendimento para um especialista.",
                "Obrigado pelo contato. Seu protocolo é #OZ-2026.",
              ].map((template) => (
                <button key={template} onClick={() => { setMessageInput(template); setShowTemplates(false); }} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-white">
                  {template}
                </button>
              ))}
            </div>
          )}

          <div className="mx-auto max-w-4xl">
            {selected.status === "closed" ? (
              <div className="flex items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-500">
                <Archive className="h-4 w-4" />Esta conversa foi finalizada.
                <button onClick={() => changeStatus("open")} className="font-medium text-emerald-400 hover:text-emerald-300">Reabrir atendimento</button>
              </div>
            ) : (
              <form onSubmit={sendMessage} className="rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl focus-within:border-emerald-500/40">
                <textarea
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={`Responder por ${selectedNumber.label}...`}
                  rows={2}
                  className="block w-full resize-none bg-transparent px-4 pt-3 text-sm text-white outline-none placeholder:text-zinc-600"
                />
                <div className="flex items-center justify-between px-2 pb-2">
                  <div className="flex items-center gap-0.5">
                    <button type="button" className="rounded-lg p-2 text-zinc-600 transition hover:bg-zinc-800 hover:text-white"><Paperclip className="h-4 w-4" /></button>
                    <button type="button" className="rounded-lg p-2 text-zinc-600 transition hover:bg-zinc-800 hover:text-white"><Smile className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setShowTemplates((current) => !current)} className="flex items-center gap-1.5 rounded-lg p-2 text-xs text-zinc-600 transition hover:bg-zinc-800 hover:text-white">
                      <FileText className="h-4 w-4" />Templates
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="hidden text-[10px] text-zinc-700 xl:inline">Enter envia • Shift + Enter quebra linha</span>
                    <button
                      type="submit"
                      disabled={!messageInput.trim()}
                      className="flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Send className="h-4 w-4" />Enviar
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </footer>
      </main>

      {showDetails && (
        <aside className="w-[300px] shrink-0 overflow-y-auto border-l border-zinc-800 bg-zinc-950">
          <div className="border-b border-zinc-800 p-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 text-lg font-semibold text-white">{selected.avatar}</div>
            <h3 className="mt-3 text-sm font-semibold text-white">{selected.name}</h3>
            <p className="mt-1 text-xs text-zinc-500">{selected.phone}</p>
            <div className="mt-3 flex justify-center gap-2">
              <button className="rounded-lg border border-zinc-800 p-2 text-zinc-500 hover:bg-zinc-900 hover:text-white"><Phone className="h-4 w-4" /></button>
              <button className="rounded-lg border border-zinc-800 p-2 text-zinc-500 hover:bg-zinc-900 hover:text-white"><CircleUserRound className="h-4 w-4" /></button>
              <button className="rounded-lg border border-zinc-800 p-2 text-zinc-500 hover:bg-zinc-900 hover:text-white"><MoreHorizontal className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="space-y-5 p-4">
            <div>
              <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600"><Wifi className="h-3.5 w-3.5" />Canal oficial</p>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${selectedNumber.color}`} />
                  <p className="text-xs font-medium text-zinc-300">{selectedNumber.label}</p>
                  <span className="ml-auto text-[9px] text-emerald-400">Conectado</span>
                </div>
                <p className="mt-1 pl-4 text-[10px] text-zinc-600">{selectedNumber.phone} • Cloud API</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className="mb-1.5 flex items-center gap-1.5 text-[10px] text-zinc-600"><UsersRound className="h-3 w-3" />Fila</span>
                <select
                  value={selected.queue}
                  onChange={(event) => updateSelected({ queue: event.target.value })}
                  className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-300 outline-none"
                >
                  {queues.map((queue) => <option key={queue}>{queue}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1.5 flex items-center gap-1.5 text-[10px] text-zinc-600"><UserRoundCheck className="h-3 w-3" />Responsável</span>
                <select
                  value={selected.assignedTo}
                  onChange={(event) => changeAssignment(event.target.value)}
                  className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-300 outline-none"
                >
                  {agents.map((agent) => <option key={agent}>{agent}</option>)}
                </select>
              </label>
            </div>

            <div className="relative">
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600"><Tag className="h-3.5 w-3.5" />Etiquetas</p>
                <button onClick={() => setShowTags((current) => !current)} className="text-zinc-600 hover:text-white"><Plus className="h-4 w-4" /></button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selected.tags.map((tag) => (
                  <button key={tag} onClick={() => toggleTag(tag)} className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-400">{tag} ×</button>
                ))}
              </div>
              {showTags && (
                <div className="absolute right-0 top-7 z-10 w-44 rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 shadow-xl">
                  {availableTags.map((tag) => (
                    <button key={tag} onClick={() => toggleTag(tag)} className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white">
                      {tag}{selected.tags.includes(tag) && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600"><FileText className="h-3.5 w-3.5" />Notas internas</span>
              <textarea
                value={selected.notes}
                onChange={(event) => updateSelected({ notes: event.target.value })}
                rows={4}
                className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-xs leading-relaxed text-zinc-400 outline-none focus:border-emerald-500/40"
              />
            </label>

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Ações do atendimento</p>
              <div className="grid gap-2">
                {selected.status !== "waiting" && selected.status !== "closed" && (
                  <button onClick={() => changeStatus("waiting")} className="flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2.5 text-xs text-zinc-400 transition hover:bg-zinc-900 hover:text-white">
                    <Clock3 className="h-4 w-4 text-amber-400" />Mover para aguardando
                  </button>
                )}
                {selected.status !== "closed" && (
                  <button onClick={() => changeStatus("closed")} className="flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2.5 text-xs text-zinc-400 transition hover:bg-zinc-900 hover:text-white">
                    <Archive className="h-4 w-4 text-emerald-400" />Finalizar conversa
                  </button>
                )}
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

function CheckCircleButton() {
  return <Check className="h-4 w-4 text-emerald-400" />;
}
