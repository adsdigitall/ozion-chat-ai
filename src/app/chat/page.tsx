"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Bot,
  Check,
  CheckCheck,
  CircleUserRound,
  Clock3,
  FileAudio,
  FileImage,
  FileText,
  Filter,
  Inbox,
  Info,
  Loader2,
  Paperclip,
  Phone,
  Play,
  Search,
  Send,
  Smile,
  Sparkles,
  Tag,
  Wifi,
  X,
} from "lucide-react";

type ConversationStatus = "open" | "waiting" | "closed";
type SenderType = "lead" | "human" | "ai" | "system" | "flow";
type MessageType = "text" | "image" | "audio" | "video" | "document" | "template" | "internal_note" | "flow";
type Toast = { type: "success" | "error"; message: string } | null;

type TagRow = { id: string; name: string; color: string; category?: string; status?: string };
type UserRow = { id: string; name: string; email?: string; role?: string; avatar?: string | null };
type FlowRow = { id: string; name: string; status: string };
type QuickReply = { id: string; title: string; message: string; category: string; shortcut: string };
type SavedFilter = { id: string; name: string; filters_json: ChatFilters };

type ChatMessage = {
  id: string;
  senderType: SenderType;
  messageType: MessageType;
  content: string;
  time: string;
  status?: "sent" | "delivered" | "read" | "failed";
  mediaUrl?: string | null;
  senderName?: string | null;
};

type Lead = {
  id?: string;
  name: string;
  phone: string;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  status?: string | null;
  score?: number | null;
  temperature?: string | null;
  source?: string | null;
  channel?: string | null;
  campaign_id?: string | null;
  assigned_user_id?: string | null;
  last_interaction_at?: string | null;
  ai_summary?: string | null;
};

type Conversation = {
  id: string;
  lead: Lead;
  avatar: string;
  numberId: string;
  status: ConversationStatus;
  unread: number;
  updatedAt: string;
  tags: TagRow[];
  aiStatus: "active" | "paused";
  source: string;
  campaignId: string;
  assignedUserId: string | null;
  assignedTo: string;
  channel: string;
  channelLabel: string;
  channelPhone: string;
  notes: string;
  messages: ChatMessage[];
  persisted?: boolean;
};

type ApiMessage = {
  id: string;
  sender?: "contact" | "agent" | "ai" | "system";
  sender_type?: SenderType | null;
  message_type?: MessageType | null;
  type?: string | null;
  content: string | null;
  status?: "sent" | "delivered" | "read" | "failed" | null;
  read?: boolean | null;
  media_url?: string | null;
  sender_name?: string | null;
  created_at: string;
};

type ApiConversation = {
  id: string;
  phone_number: string | null;
  status: ConversationStatus;
  channel?: string | null;
  source?: string | null;
  campaign_id?: string | null;
  ai_status?: "active" | "paused" | null;
  unread_count: number | null;
  assigned_user_id?: string | null;
  assigned_to?: string | null;
  metadata: Record<string, unknown> | null;
  last_message?: string | null;
  last_message_at?: string | null;
  contact: Lead | null;
  assigned_user: { id?: string; name?: string | null } | null;
  connection: { id?: string | null; display_name?: string | null; phone_number?: string | null; type?: string | null } | null;
  messages: ApiMessage[] | null;
  tags?: TagRow[] | null;
};

type ChatFilters = {
  tag: string;
  assigned_user_id: string;
  channel: string;
  whatsapp_connection_id: string;
  source: string;
  campaign_id: string;
  status: string;
  unread: boolean;
  ai_status: string;
  human_active: boolean;
  date_from: string;
  date_to: string;
};

const previewTags: TagRow[] = [
  { id: "preview-novo-lead", name: "Novo Lead", color: "#22c55e" },
  { id: "preview-qualificado", name: "Qualificado", color: "#14b8a6" },
  { id: "preview-suporte", name: "Suporte", color: "#3b82f6" },
  { id: "preview-risco", name: "Risco", color: "#f97316" },
];

const EMPTY_FILTERS: ChatFilters = {
  tag: "all",
  assigned_user_id: "all",
  channel: "all",
  whatsapp_connection_id: "all",
  source: "",
  campaign_id: "",
  status: "all",
  unread: false,
  ai_status: "all",
  human_active: false,
  date_from: "",
  date_to: "",
};

const mockTemplates = [
  { id: "template-pix", name: "pix_enviado", category: "Pagamento", language: "pt_BR", status: "aprovado", text: "Olá {{1}}, seu Pix foi gerado. Clique no link para concluir." },
  { id: "template-boas-vindas", name: "boas_vindas", category: "Atendimento", language: "pt_BR", status: "aprovado", text: "Olá! Recebemos sua mensagem e já vamos te atender." },
  { id: "template-pos", name: "pos_venda", category: "Pós-venda", language: "pt_BR", status: "rascunho", text: "Tudo certo com seu acesso? Posso ajudar em algo?" },
];

const previewConversations: Conversation[] = [
  {
    id: "preview-ctwa",
    lead: { name: "Lead CTWA", phone: "+55 11 90000-0001", email: "lead@exemplo.com", city: "São Paulo", state: "SP", status: "Novo", score: 82, temperature: "Quente", source: "Facebook Ads", channel: "whatsapp", campaign_id: "Campanha CTWA", ai_summary: "Lead interessado em múltiplos números oficiais e IA." },
    avatar: "LC",
    numberId: "preview-sales",
    status: "open",
    unread: 2,
    updatedAt: "agora",
    tags: [previewTags[0], previewTags[1]],
    aiStatus: "active",
    source: "Facebook Ads",
    campaignId: "Campanha CTWA",
    assignedUserId: null,
    assignedTo: "Não atribuído",
    channel: "whatsapp",
    channelLabel: "Ozion Vendas",
    channelPhone: "+55 11 4002-8922",
    notes: "Preview da caixa de entrada.",
    persisted: false,
    messages: [
      { id: "pv-1", senderType: "system", messageType: "text", content: "Conversa iniciada por anúncio Click-to-WhatsApp", time: "14:22" },
      { id: "pv-2", senderType: "lead", messageType: "text", content: "Oi, vim pelo anúncio e quero saber como funciona.", time: "14:23" },
      { id: "pv-3", senderType: "ai", messageType: "text", content: "Olá! Posso te explicar e também chamar um especialista.", time: "14:23", status: "read" },
    ],
  },
  {
    id: "preview-human",
    lead: { name: "Atendimento Humano", phone: "+55 11 90000-0002", email: "humano@exemplo.com", city: "Rio de Janeiro", state: "RJ", status: "Em atendimento", score: 68, temperature: "Morno", source: "TikTok", channel: "whatsapp", campaign_id: "TikTok", ai_summary: "Pediu atendimento humano." },
    avatar: "AH",
    numberId: "preview-support",
    status: "waiting",
    unread: 1,
    updatedAt: "5 min",
    tags: [previewTags[2]],
    aiStatus: "paused",
    source: "TikTok",
    campaignId: "TikTok",
    assignedUserId: "preview-user",
    assignedTo: "Natan Macedo",
    channel: "whatsapp",
    channelLabel: "Ozion Suporte",
    channelPhone: "+55 11 4002-8933",
    notes: "Conversa transferida para humano.",
    persisted: false,
    messages: [
      { id: "pv-4", senderType: "system", messageType: "text", content: "IA pausada e conversa movida para aguardando", time: "13:55" },
      { id: "pv-5", senderType: "lead", messageType: "audio", content: "Áudio recebido", time: "13:56" },
    ],
  },
  {
    id: "preview-risk",
    lead: { name: "Filtro de Risco", phone: "+55 11 90000-0003", status: "Risco", score: 20, temperature: "Frio", source: "Instagram", channel: "whatsapp", campaign_id: "Remarketing", ai_summary: "Palavra de risco detectada." },
    avatar: "FR",
    numberId: "preview-risk",
    status: "closed",
    unread: 0,
    updatedAt: "12 min",
    tags: [previewTags[3]],
    aiStatus: "paused",
    source: "Instagram",
    campaignId: "Remarketing",
    assignedUserId: null,
    assignedTo: "Não atribuído",
    channel: "whatsapp",
    channelLabel: "Ozion Vendas",
    channelPhone: "+55 11 4002-8922",
    notes: "Atendimento pausado automaticamente.",
    persisted: false,
    messages: [
      { id: "pv-6", senderType: "lead", messageType: "text", content: "Isso parece golpe, quero suporte.", time: "12:40" },
      { id: "pv-7", senderType: "system", messageType: "internal_note", content: "Palavra de risco detectada: golpe", time: "12:40" },
    ],
  },
];

function currentTime() {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function mapSender(message: ApiMessage): SenderType {
  if (message.sender_type) return message.sender_type;
  if (message.sender === "contact") return "lead";
  if (message.sender === "agent") return "human";
  if (message.sender === "ai") return "ai";
  return "system";
}

function formatMessage(message: ApiMessage): ChatMessage {
  return {
    id: message.id,
    senderType: mapSender(message),
    messageType: (message.message_type ?? message.type ?? "text") as MessageType,
    content: message.content || `[${message.message_type ?? message.type ?? "mensagem"}]`,
    time: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.created_at)),
    status: message.status ?? (message.read ? "read" : "sent"),
    mediaUrl: message.media_url,
    senderName: message.sender_name,
  };
}

function mapConversation(conversation: ApiConversation): Conversation {
  const contact = conversation.contact ?? { name: "Contato", phone: conversation.phone_number ?? "" };
  const metadata = conversation.metadata ?? {};
  const name = contact.name || conversation.phone_number || "Contato";
  return {
    id: conversation.id,
    lead: { ...contact, phone: contact.phone || conversation.phone_number || "", source: contact.source ?? conversation.source, campaign_id: contact.campaign_id ?? conversation.campaign_id },
    avatar: initials(name),
    numberId: conversation.connection?.id || "all",
    status: conversation.status,
    unread: conversation.unread_count || 0,
    updatedAt: conversation.last_message_at ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(conversation.last_message_at)) : "agora",
    tags: conversation.tags ?? [],
    aiStatus: conversation.ai_status ?? (metadata.aiEnabled ? "active" : "paused"),
    source: conversation.source || contact.source || "",
    campaignId: conversation.campaign_id || contact.campaign_id || "",
    assignedUserId: conversation.assigned_user_id ?? conversation.assigned_to ?? null,
    assignedTo: conversation.assigned_user?.name || "Não atribuído",
    channel: conversation.channel || contact.channel || "whatsapp",
    channelLabel: conversation.connection?.display_name || "WhatsApp oficial",
    channelPhone: conversation.connection?.phone_number || conversation.phone_number || "",
    notes: typeof metadata.notes === "string" ? metadata.notes : "",
    messages: (conversation.messages ?? []).map(formatMessage),
    persisted: true,
  };
}

function lastMessage(conversation: Conversation) {
  return conversation.messages.at(-1)?.content ?? "Nenhuma mensagem";
}

function StatusIcon({ status }: { status?: ChatMessage["status"] }) {
  if (status === "read") return <CheckCheck className="h-3.5 w-3.5 text-sky-400" />;
  if (status === "delivered") return <CheckCheck className="h-3.5 w-3.5 text-zinc-500" />;
  if (status === "failed") return <X className="h-3.5 w-3.5 text-red-400" />;
  return <Check className="h-3.5 w-3.5 text-zinc-500" />;
}

function MessageIcon({ type }: { type: MessageType }) {
  if (type === "image") return <FileImage className="h-4 w-4" />;
  if (type === "audio") return <FileAudio className="h-4 w-4" />;
  if (type === "video") return <Play className="h-4 w-4" />;
  if (type === "document" || type === "template" || type === "flow") return <FileText className="h-4 w-4" />;
  return null;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>(previewConversations);
  const [selectedId, setSelectedId] = useState(previewConversations[0].id);
  const [activeStatus, setActiveStatus] = useState<"all" | ConversationStatus>("open");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ChatFilters>(EMPTY_FILTERS);
  const [filterDraft, setFilterDraft] = useState<ChatFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [availableTags, setAvailableTags] = useState<TagRow[]>(previewTags);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [flows, setFlows] = useState<FlowRow[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [filterName, setFilterName] = useState("");
  const [modal, setModal] = useState<"quick" | "templates" | "flows" | "transfer" | "note" | null>(null);
  const [showTags, setShowTags] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  }

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0];
  const previewMode = conversations.every((conversation) => !conversation.persisted);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("status", activeStatus);
        if (search.trim()) params.set("search", search.trim());
        Object.entries(filters).forEach(([key, value]) => {
          if (typeof value === "boolean") {
            if (value) params.set(key, "true");
          } else if (value && value !== "all") {
            params.set(key, value);
          }
        });

        const [conversationsResponse, tagsResponse, usersResponse, quickResponse, savedResponse, flowsResponse] = await Promise.all([
          fetch(`/api/conversations?${params.toString()}`, { cache: "no-store", signal: controller.signal }),
          fetch("/api/tags?status=active", { cache: "no-store", signal: controller.signal }),
          fetch("/api/users?scope=customer", { cache: "no-store", signal: controller.signal }),
          fetch("/api/chat/quick-replies", { cache: "no-store", signal: controller.signal }),
          fetch("/api/chat/saved-filters", { cache: "no-store", signal: controller.signal }),
          fetch("/api/flows", { cache: "no-store", signal: controller.signal }),
        ]);
        const conversationsPayload = await conversationsResponse.json();
        const tagsPayload = await tagsResponse.json();
        const usersPayload = await usersResponse.json();
        const quickPayload = await quickResponse.json();
        const savedPayload = await savedResponse.json();
        const flowsPayload = await flowsResponse.json();
        if (!conversationsResponse.ok) throw new Error(conversationsPayload.error || "Falha ao carregar conversas.");

        const loaded = (conversationsPayload.conversations ?? []).map(mapConversation);
        setConversations(loaded.length ? loaded : previewConversations);
        setSelectedId((current) => loaded.find((item: Conversation) => item.id === current)?.id ?? loaded[0]?.id ?? previewConversations[0].id);
        if (tagsResponse.ok) setAvailableTags(tagsPayload.tags ?? previewTags);
        if (usersResponse.ok) setUsers(usersPayload.users ?? []);
        if (quickResponse.ok) setQuickReplies(quickPayload.quick_replies ?? []);
        if (savedResponse.ok) setSavedFilters(savedPayload.saved_filters ?? []);
        if (flowsResponse.ok) setFlows(flowsPayload.flows ?? []);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setConversations(previewConversations);
        setSelectedId(previewConversations[0].id);
        showToast("error", error instanceof Error ? error.message : "Falha ao sincronizar conversas.");
      } finally {
        setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [activeStatus, filters, search]);

  const counts = useMemo(() => ({
    open: conversations.filter((conversation) => conversation.status === "open").length,
    waiting: conversations.filter((conversation) => conversation.status === "waiting").length,
    closed: conversations.filter((conversation) => conversation.status === "closed").length,
  }), [conversations]);

  const numbers = useMemo(() => {
    const map = new Map<string, { id: string; label: string; phone: string }>();
    conversations.forEach((conversation) => map.set(conversation.numberId, { id: conversation.numberId, label: conversation.channelLabel, phone: conversation.channelPhone }));
    return [...map.values()];
  }, [conversations]);

  function updateSelected(update: Partial<Conversation>) {
    setConversations((current) => current.map((conversation) => conversation.id === selected.id ? { ...conversation, ...update } : conversation));
  }

  async function patchConversation(action: "assume" | "transfer" | "close" | "reopen" | "activate_ai" | "pause_ai", extra: Record<string, unknown> = {}) {
    if (!selected.persisted) {
      if (action === "assume") updateSelected({ assignedTo: "Você", status: "waiting" });
      if (action === "transfer") updateSelected({ assignedTo: users.find((user) => user.id === extra.assigned_user_id)?.name ?? "Atendente", status: "waiting" });
      if (action === "close") updateSelected({ status: "closed" });
      if (action === "reopen") updateSelected({ status: "waiting" });
      if (action === "activate_ai") updateSelected({ aiStatus: "active" });
      if (action === "pause_ai") updateSelected({ aiStatus: "paused" });
      showToast("success", "Ação mock executada.");
      return;
    }
    const response = await fetch(`/api/conversations?id=${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Falha ao atualizar conversa.");
    showToast("success", "Conversa atualizada.");
    setFilters((current) => ({ ...current }));
  }

  async function sendLocalMessage(input: { content: string; message_type?: MessageType; sender_type?: SenderType; media_url?: string | null }) {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      senderType: input.sender_type ?? "human",
      messageType: input.message_type ?? "text",
      content: input.content,
      mediaUrl: input.media_url,
      time: currentTime(),
      status: "sent",
    };
    updateSelected({ messages: [...selected.messages, message], updatedAt: "agora" });
    if (!selected.persisted) return;
    const response = await fetch(`/api/conversations/${selected.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Mensagem não enviada.");
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const content = messageInput.trim();
    if (!content || selected.status === "closed") return;
    setMessageInput("");
    try {
      await sendLocalMessage({ content, message_type: "text", sender_type: "human" });
      showToast("success", "Mensagem enviada.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Falha ao enviar mensagem.");
    }
  }

  async function addMockAttachment(type: MessageType) {
    const labels: Record<string, string> = { image: "Imagem anexada", audio: "Áudio anexado", document: "Documento anexado", video: "Vídeo anexado" };
    await sendLocalMessage({ content: labels[type] ?? "Arquivo anexado", message_type: type, sender_type: "human", media_url: "https://example.com/mock" });
    showToast("success", `${labels[type]} em modo mock.`);
  }

  async function saveFilter() {
    if (!filterName.trim()) {
      showToast("error", "Informe um nome para o filtro.");
      return;
    }
    const response = await fetch("/api/chat/saved-filters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: filterName, filters_json: filterDraft }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Falha ao salvar filtro.");
    setSavedFilters((current) => [payload.saved_filter, ...current]);
    setFilterName("");
    showToast("success", "Filtro salvo.");
  }

  async function toggleTag(tag: TagRow) {
    const hasTag = selected.tags.some((item) => item.id === tag.id);
    updateSelected({ tags: hasTag ? selected.tags.filter((item) => item.id !== tag.id) : [...selected.tags, tag] });
    if (!selected.persisted) return showToast("success", hasTag ? "Tag removida." : "Tag aplicada.");
    const endpoint = hasTag
      ? `/api/tags/apply?target_type=conversation&target_id=${selected.id}&tag_id=${tag.id}`
      : "/api/tags/apply";
    const response = await fetch(endpoint, {
      method: hasTag ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: hasTag ? undefined : JSON.stringify({ target_type: "conversation", target_id: selected.id, tag_id: tag.id }),
    });
    if (!response.ok) throw new Error("Falha ao alterar tag.");
    showToast("success", hasTag ? "Tag removida." : "Tag aplicada.");
  }

  async function addInternalNote() {
    if (!noteInput.trim()) return;
    const content = noteInput.trim();
    setNoteInput("");
    setModal(null);
    await sendLocalMessage({ content, message_type: "internal_note", sender_type: "system" });
    showToast("success", "Nota interna criada.");
  }

  function insertQuickReply(reply: QuickReply) {
    setMessageInput(reply.message);
    setModal(null);
    showToast("success", "Resposta rápida inserida.");
  }

  async function sendTemplate(template: typeof mockTemplates[number]) {
    setModal(null);
    await sendLocalMessage({ content: template.text, message_type: "template", sender_type: "human" });
    showToast("success", "Template mock enviado.");
  }

  async function triggerFlow(flow: FlowRow) {
    setModal(null);
    await sendLocalMessage({ content: `Fluxo rápido disparado: ${flow.name}`, message_type: "flow", sender_type: "flow" });
    showToast("success", "Fluxo rápido registrado.");
  }

  async function aiMock(action: "suggest" | "summary" | "objection") {
    const content = action === "suggest"
      ? "Sugestão IA: responda com uma pergunta curta e ofereça ajuda para concluir o próximo passo."
      : action === "summary"
        ? `Resumo IA: ${selected.lead.name} veio de ${selected.source || "origem não informada"} e está em ${selected.status}.`
        : "Objeção IA: possível dúvida sobre confiança, preço ou prazo.";
    await sendLocalMessage({ content, message_type: "internal_note", sender_type: "ai" });
    showToast("success", "IA mock executada.");
  }

  const tabs = [
    { id: "open", label: "Entrada", icon: Inbox, count: counts.open },
    { id: "waiting", label: "Esperando", icon: Clock3, count: counts.waiting },
    { id: "closed", label: "Finalizados", icon: Archive, count: counts.closed },
  ] as const;

  return (
    <div className="relative flex h-[calc(100vh-64px)] min-h-[640px] overflow-hidden bg-[#050807]">
      {toast && (
        <div className={`fixed right-4 top-4 z-[90] rounded-xl border px-4 py-3 text-sm font-bold shadow-2xl ${toast.type === "success" ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-100" : "border-red-500/30 bg-red-500/15 text-red-100"}`}>
          {toast.message}
        </div>
      )}

      <section className="flex w-[370px] shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
        <div className="border-b border-zinc-800 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-base font-black text-white">Chat Ao Vivo</h1>
              <p className="text-xs text-zinc-500">Inbox de atendimento WhatsApp</p>
            </div>
            {previewMode && <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-300">Preview</span>}
          </div>
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, telefone, campanha ou tag" className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-500/60" />
          </label>
          <div className="mt-3 flex gap-2">
            <select value={filters.tag} onChange={(event) => setFilters((current) => ({ ...current, tag: event.target.value }))} className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-300 outline-none">
              <option value="all">Todas tags</option>
              {availableTags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
            </select>
            <button onClick={() => { setFilterDraft(filters); setShowFilters(true); }} className="flex h-9 items-center gap-2 rounded-lg border border-zinc-800 px-3 text-xs font-bold text-zinc-400 transition hover:bg-zinc-900 hover:text-white">
              <Filter className="h-4 w-4" />Filtros
            </button>
          </div>
          {savedFilters.length > 0 && (
            <div className="mt-3 flex gap-1.5 overflow-x-auto">
              {savedFilters.slice(0, 6).map((filter) => (
                <button key={filter.id} onClick={() => setFilters({ ...EMPTY_FILTERS, ...filter.filters_json })} className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300">{filter.name}</button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 border-b border-zinc-800">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveStatus(tab.id)} className={`relative flex flex-col items-center gap-1 py-3 text-[11px] transition ${activeStatus === tab.id ? "bg-emerald-500/5 text-emerald-400" : "text-zinc-600 hover:text-zinc-300"}`}>
              <span className="flex items-center gap-1"><tab.icon className="h-3.5 w-3.5" />{tab.label}</span>
              <span className="font-bold">{tab.count}</span>
              {activeStatus === tab.id && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-500" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-400" /></div>
          ) : conversations.length === 0 ? (
            <div className="px-8 py-16 text-center text-sm text-zinc-500">Nenhuma conversa encontrada.</div>
          ) : conversations.map((conversation) => (
            <button key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={`flex w-full gap-3 border-b border-zinc-900 p-4 text-left transition ${selected.id === conversation.id ? "bg-emerald-500/10" : "hover:bg-zinc-900/70"}`}>
              <div className="relative shrink-0">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 text-xs font-black text-zinc-300">{conversation.avatar}</div>
                <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-zinc-950 ${conversation.aiStatus === "active" ? "bg-violet-400" : "bg-emerald-500"}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-white">{conversation.lead.name}</p>
                  <span className="text-[10px] text-zinc-600">{conversation.updatedAt}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-zinc-500">{lastMessage(conversation)}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-500">{conversation.channel}</span>
                  {conversation.aiStatus === "active" && <Bot className="h-3 w-3 text-violet-400" />}
                  {conversation.tags.slice(0, 2).map((tag) => <span key={tag.id} className="max-w-20 truncate rounded px-1.5 py-0.5 text-[9px] font-bold text-zinc-950" style={{ backgroundColor: tag.color }}>{tag.name}</span>)}
                </div>
              </div>
              {conversation.unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-black text-zinc-950">{conversation.unread}</span>}
            </button>
          ))}
        </div>
      </section>

      <main className="flex min-w-0 flex-1 flex-col bg-[radial-gradient(circle_at_top,#11231b_0%,#050807_42%)]">
        {!selected ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">Conversa não encontrada.</div>
        ) : (
          <>
            <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-black text-zinc-300">{selected.avatar}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-black text-white">{selected.lead.name}</h2>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${selected.aiStatus === "active" ? "bg-violet-500/10 text-violet-300" : "bg-zinc-800 text-zinc-400"}`}>{selected.aiStatus === "active" ? "IA ativa" : "IA pausada"}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                    <span>{selected.lead.phone}</span><span>•</span><span>{selected.channelLabel}</span><span>•</span><span>{selected.assignedTo}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => patchConversation("assume").catch((error) => showToast("error", error.message))} className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-900">Assumir</button>
                <button onClick={() => setModal("transfer")} className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-900">Transferir</button>
                {selected.status === "closed" ? (
                  <button onClick={() => patchConversation("reopen").catch((error) => showToast("error", error.message))} className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-black text-zinc-950">Reabrir</button>
                ) : (
                  <button onClick={() => patchConversation("close").catch((error) => showToast("error", error.message))} className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-900">Finalizar</button>
                )}
                <button onClick={() => setShowDetails((current) => !current)} className="rounded-lg border border-zinc-800 p-2 text-zinc-500 hover:bg-zinc-900"><Info className="h-4 w-4" /></button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-6">
              <div className="mx-auto flex max-w-3xl flex-col gap-3">
                <div className="mb-2 flex items-center gap-3"><div className="h-px flex-1 bg-zinc-800" /><span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Histórico</span><div className="h-px flex-1 bg-zinc-800" /></div>
                {selected.messages.map((message) => {
                  if (message.senderType === "system" || message.messageType === "internal_note" || message.senderType === "flow") {
                    return <div key={message.id} className="my-1 flex justify-center"><span className="rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-[10px] text-zinc-500">{message.content} • {message.time}</span></div>;
                  }
                  const outbound = message.senderType === "human" || message.senderType === "ai";
                  return (
                    <div key={message.id} className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[72%] rounded-2xl px-4 py-3 shadow-sm ${message.senderType === "lead" ? "rounded-tl-md border border-zinc-800 bg-zinc-900 text-zinc-200" : message.senderType === "ai" ? "rounded-tr-md border border-violet-500/20 bg-violet-500/10 text-zinc-100" : "rounded-tr-md bg-emerald-600 text-white"}`}>
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] opacity-75">{message.senderType === "ai" ? <Sparkles className="h-3 w-3" /> : <MessageIcon type={message.messageType} />}{message.senderType === "lead" ? "Lead" : message.senderType === "ai" ? "IA" : "Humano"}</div>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                        <div className="mt-1.5 flex items-center justify-end gap-1 text-[10px] opacity-70"><span>{message.time}</span>{outbound && <StatusIcon status={message.status} />}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <footer className="shrink-0 border-t border-zinc-800 bg-zinc-950 p-4">
              {selected.status === "closed" ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center text-sm text-zinc-500">Esta conversa foi finalizada.</div>
              ) : (
                <form onSubmit={sendMessage} className="mx-auto max-w-4xl rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl focus-within:border-emerald-500/40">
                  <textarea value={messageInput} onChange={(event) => setMessageInput(event.target.value)} rows={2} placeholder={`Responder por ${selected.channelLabel}...`} className="block w-full resize-none bg-transparent px-4 pt-3 text-sm text-white outline-none placeholder:text-zinc-600" />
                  <div className="flex items-center justify-between px-2 pb-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <button type="button" onClick={() => addMockAttachment("document")} className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-800 hover:text-white"><Paperclip className="h-4 w-4" /></button>
                      <button type="button" onClick={() => addMockAttachment("image")} className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-800 hover:text-white"><FileImage className="h-4 w-4" /></button>
                      <button type="button" onClick={() => addMockAttachment("audio")} className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-800 hover:text-white"><FileAudio className="h-4 w-4" /></button>
                      <button type="button" onClick={() => showToast("success", "Emoji mock aberto.")} className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-800 hover:text-white"><Smile className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setModal("quick")} className="rounded-lg px-2 py-2 text-xs font-bold text-zinc-500 hover:bg-zinc-800 hover:text-white">Respostas rápidas</button>
                      <button type="button" onClick={() => setModal("templates")} className="rounded-lg px-2 py-2 text-xs font-bold text-zinc-500 hover:bg-zinc-800 hover:text-white">Templates</button>
                      <button type="button" onClick={() => setModal("flows")} className="rounded-lg px-2 py-2 text-xs font-bold text-zinc-500 hover:bg-zinc-800 hover:text-white">Fluxos rápidos</button>
                    </div>
                    <button type="submit" disabled={!messageInput.trim()} className="flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-xs font-black text-zinc-950 disabled:opacity-40"><Send className="h-4 w-4" />Enviar</button>
                  </div>
                </form>
              )}
            </footer>
          </>
        )}
      </main>

      {showDetails && selected && (
        <aside className="w-[330px] shrink-0 overflow-y-auto border-l border-zinc-800 bg-zinc-950">
          <div className="border-b border-zinc-800 p-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 text-lg font-black text-white">{selected.avatar}</div>
            <h3 className="mt-3 text-sm font-black text-white">{selected.lead.name}</h3>
            <p className="mt-1 text-xs text-zinc-500">{selected.lead.phone}</p>
            <div className="mt-3 flex justify-center gap-2">
              <button onClick={() => setModal("note")} className="rounded-lg border border-zinc-800 p-2 text-zinc-500 hover:bg-zinc-900 hover:text-white"><FileText className="h-4 w-4" /></button>
              <a href="/crm" className="rounded-lg border border-zinc-800 p-2 text-zinc-500 hover:bg-zinc-900 hover:text-white"><CircleUserRound className="h-4 w-4" /></a>
              <button onClick={() => setShowTags((current) => !current)} className="rounded-lg border border-zinc-800 p-2 text-zinc-500 hover:bg-zinc-900 hover:text-white"><Tag className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="space-y-5 p-4">
            <InfoBlock title="Canal" icon={Wifi}><p className="text-xs text-zinc-300">{selected.channelLabel}</p><p className="text-[10px] text-zinc-600">{selected.channelPhone}</p></InfoBlock>
            <div className="grid grid-cols-2 gap-2">
              <InfoBox label="Status" value={selected.lead.status || selected.status} />
              <InfoBox label="Score" value={String(selected.lead.score ?? "-")} />
              <InfoBox label="Temperatura" value={selected.lead.temperature || "-"} />
              <InfoBox label="Origem" value={selected.source || "-"} />
              <InfoBox label="Campanha" value={selected.campaignId || "-"} />
              <InfoBox label="Cidade" value={[selected.lead.city, selected.lead.state].filter(Boolean).join(" / ") || "-"} />
            </div>
            <InfoBlock title="Tags" icon={Tag}>
              <div className="flex flex-wrap gap-1.5">
                {selected.tags.map((tag) => <button key={tag.id} onClick={() => toggleTag(tag).catch((error) => showToast("error", error.message))} className="rounded-full border px-2 py-1 text-[10px] font-bold" style={{ borderColor: `${tag.color}55`, backgroundColor: `${tag.color}18`, color: tag.color }}>{tag.name} ×</button>)}
              </div>
              {showTags && <div className="mt-2 grid gap-1">{availableTags.map((tag) => <button key={tag.id} onClick={() => toggleTag(tag).catch((error) => showToast("error", error.message))} className="rounded-lg px-2 py-1.5 text-left text-xs text-zinc-400 hover:bg-zinc-900"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />{tag.name}</button>)}</div>}
            </InfoBlock>
            <InfoBlock title="IA" icon={Bot}>
              <div className="grid gap-2">
                <button onClick={() => patchConversation(selected.aiStatus === "active" ? "pause_ai" : "activate_ai").catch((error) => showToast("error", error.message))} className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-900">{selected.aiStatus === "active" ? "Pausar IA" : "Ativar IA"}</button>
                <button onClick={() => aiMock("suggest")} className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-900">Sugerir resposta com IA</button>
                <button onClick={() => aiMock("summary")} className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-900">Resumir conversa</button>
                <button onClick={() => aiMock("objection")} className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-zinc-900">Identificar objeção</button>
              </div>
            </InfoBlock>
            <InfoBlock title="Resumo IA" icon={Sparkles}><p className="text-xs leading-5 text-zinc-500">{selected.lead.ai_summary || "Sem resumo IA."}</p></InfoBlock>
            <InfoBlock title="Histórico de vendas" icon={Phone}><p className="text-xs text-zinc-500">Nenhuma venda vinculada ainda.</p></InfoBlock>
          </div>
        </aside>
      )}

      {showFilters && (
        <div className="fixed inset-y-0 right-0 z-[70] w-full max-w-md border-l border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
          <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-black text-white">Filtros</h2><button onClick={() => setShowFilters(false)} className="text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button></div>
          <div className="grid gap-3">
            <FilterSelect label="Tag" value={filterDraft.tag} onChange={(value) => setFilterDraft((current) => ({ ...current, tag: value }))}>{availableTags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}</FilterSelect>
            <FilterSelect label="Atendente" value={filterDraft.assigned_user_id} onChange={(value) => setFilterDraft((current) => ({ ...current, assigned_user_id: value }))}>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</FilterSelect>
            <FilterSelect label="Canal" value={filterDraft.channel} onChange={(value) => setFilterDraft((current) => ({ ...current, channel: value }))}><option value="whatsapp">WhatsApp</option><option value="web">Web</option><option value="instagram">Instagram</option></FilterSelect>
            <FilterSelect label="Número WhatsApp" value={filterDraft.whatsapp_connection_id} onChange={(value) => setFilterDraft((current) => ({ ...current, whatsapp_connection_id: value }))}>{numbers.map((number) => <option key={number.id} value={number.id}>{number.label}</option>)}</FilterSelect>
            <FilterInput label="Origem" value={filterDraft.source} onChange={(value) => setFilterDraft((current) => ({ ...current, source: value }))} />
            <FilterInput label="Campanha" value={filterDraft.campaign_id} onChange={(value) => setFilterDraft((current) => ({ ...current, campaign_id: value }))} />
            <FilterSelect label="Status" value={filterDraft.status} onChange={(value) => setFilterDraft((current) => ({ ...current, status: value }))}><option value="open">Entrada</option><option value="waiting">Esperando</option><option value="closed">Finalizado</option></FilterSelect>
            <FilterSelect label="IA" value={filterDraft.ai_status} onChange={(value) => setFilterDraft((current) => ({ ...current, ai_status: value }))}><option value="active">IA ativa</option><option value="paused">IA pausada</option></FilterSelect>
            <label className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-300">Não lidas<input type="checkbox" checked={filterDraft.unread} onChange={(event) => setFilterDraft((current) => ({ ...current, unread: event.target.checked }))} className="accent-emerald-500" /></label>
            <label className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-300">Humano ativo<input type="checkbox" checked={filterDraft.human_active} onChange={(event) => setFilterDraft((current) => ({ ...current, human_active: event.target.checked, ai_status: event.target.checked ? "paused" : current.ai_status }))} className="accent-emerald-500" /></label>
            <FilterInput label="Data inicial" type="date" value={filterDraft.date_from} onChange={(value) => setFilterDraft((current) => ({ ...current, date_from: value }))} />
            <FilterInput label="Data final" type="date" value={filterDraft.date_to} onChange={(value) => setFilterDraft((current) => ({ ...current, date_to: value }))} />
            <div className="mt-2 flex gap-2"><button onClick={() => { setFilters(filterDraft); setShowFilters(false); }} className="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-black text-zinc-950">Aplicar filtros</button><button onClick={() => { setFilterDraft(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); }} className="rounded-lg border border-zinc-800 px-3 py-2 text-sm font-bold text-zinc-300">Limpar</button></div>
            <div className="mt-2 flex gap-2"><input value={filterName} onChange={(event) => setFilterName(event.target.value)} placeholder="Nome do filtro" className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none" /><button onClick={() => saveFilter().catch((error) => showToast("error", error.message))} className="rounded-lg border border-emerald-500/30 px-3 py-2 text-sm font-bold text-emerald-300">Salvar filtro</button></div>
          </div>
        </div>
      )}

      {modal && (
        <ModalShell title={modal === "quick" ? "Respostas rápidas" : modal === "templates" ? "Templates" : modal === "flows" ? "Fluxos rápidos" : modal === "transfer" ? "Transferir atendimento" : "Nota interna"} onClose={() => setModal(null)}>
          {modal === "quick" && <div className="grid gap-2">{quickReplies.map((reply) => <button key={reply.id} onClick={() => insertQuickReply(reply)} className="rounded-lg border border-zinc-800 p-3 text-left hover:bg-zinc-900"><p className="text-sm font-bold text-white">{reply.title}</p><p className="mt-1 text-xs text-zinc-500">{reply.message}</p><span className="mt-2 inline-block text-[10px] text-emerald-300">{reply.shortcut || reply.category}</span></button>)}</div>}
          {modal === "templates" && <div className="grid gap-2">{mockTemplates.map((template) => <button key={template.id} onClick={() => sendTemplate(template)} className="rounded-lg border border-zinc-800 p-3 text-left hover:bg-zinc-900"><p className="text-sm font-bold text-white">{template.name}</p><p className="mt-1 text-xs text-zinc-500">{template.text}</p><span className="mt-2 inline-block text-[10px] text-emerald-300">{template.category} • {template.language} • {template.status}</span></button>)}</div>}
          {modal === "flows" && <div className="grid gap-2">{flows.length ? flows.map((flow) => <button key={flow.id} onClick={() => triggerFlow(flow)} className="rounded-lg border border-zinc-800 p-3 text-left hover:bg-zinc-900"><p className="text-sm font-bold text-white">{flow.name}</p><span className="mt-2 inline-block text-[10px] text-emerald-300">{flow.status}</span></button>) : <p className="text-sm text-zinc-500">Nenhum fluxo encontrado.</p>}</div>}
          {modal === "transfer" && <div className="grid gap-2">{users.map((user) => <button key={user.id} onClick={() => patchConversation("transfer", { assigned_user_id: user.id }).then(() => setModal(null)).catch((error) => showToast("error", error.message))} className="rounded-lg border border-zinc-800 p-3 text-left hover:bg-zinc-900"><p className="text-sm font-bold text-white">{user.name}</p><p className="text-xs text-zinc-500">{user.email}</p></button>)}</div>}
          {modal === "note" && <div className="grid gap-3"><textarea value={noteInput} onChange={(event) => setNoteInput(event.target.value)} rows={5} placeholder="Nota visível apenas para a equipe" className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm text-white outline-none" /><button onClick={() => addInternalNote().catch((error) => showToast("error", error.message))} className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-black text-zinc-950">Adicionar nota interna</button></div>}
        </ModalShell>
      )}
    </div>
  );
}

function InfoBlock({ title, icon: Icon, children }: { title: string; icon: typeof Tag; children: React.ReactNode }) {
  return <div><p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600"><Icon className="h-3.5 w-3.5" />{title}</p><div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">{children}</div></div>;
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">{label}</p><p className="mt-1 truncate text-xs font-bold text-zinc-300">{value}</p></div>;
}

function FilterInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-600">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none" /></label>;
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <label><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-600">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none"><option value="all">Todos</option>{children}</select></label>;
}

function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"><div className="flex items-center justify-between border-b border-zinc-800 p-5"><h2 className="text-lg font-black text-white">{title}</h2><button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button></div><div className="max-h-[70vh] overflow-y-auto p-5">{children}</div></div></div>;
}
