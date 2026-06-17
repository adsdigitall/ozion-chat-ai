"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Bot,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Cpu,
  Edit3,
  FileText,
  Globe2,
  LayoutPanelTop,
  Loader2,
  MessageSquare,
  PanelTop,
  Phone,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  UserRound,
  Wand2,
  X,
  Zap,
} from "lucide-react";

type AIAgentRow = {
  id: string;
  workspace_id: string;
  name: string;
  avatar: string | null;
  provider: string;
  model: string | null;
  prompt: string;
  objective: string | null;
  rules: string[] | null;
  knowledge_base: string[] | null;
  memory: boolean | null;
  max_tokens: number | null;
  temperature: number | string | null;
  status: "active" | "inactive" | string;
  conversations_handled: number | null;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type AgentStudioConfig = {
  presentationMode: "humano" | "assistente_virtual";
  tone: "formal" | "informal" | "proximo" | "tecnico";
  responseSize: "curtas" | "medias" | "sem_restricao";
  emojiUsage: "nao_usa" | "moderado" | "frequente";
  attendedPerson: "lead" | "cliente" | "paciente" | "aluno" | "outro";
  attendedPersonCustom: string;
  roleTitle: string;
  primaryResponsibility: string;
  companyName: string;
  companyDescription: string;
  businessType: string;
  serviceArea: string;
  modality: string;
  paymentMethods: string[];
  deliveryDetails: string;
  operatingHours: string;
  contactWhatsApp: string;
  contactEmail: string;
  contactInstagram: string;
  contactSite: string;
  contactFacebook: string;
  policies: string;
  examples: string;
  faqItems: string;
  filesNotes: string;
  offerSummary: string;
};

type AgentFormState = {
  name: string;
  avatar: string;
  provider: string;
  model: string;
  memory: boolean;
  status: "active" | "inactive";
  maxTokens: string;
  temperature: string;
  studio: AgentStudioConfig;
};

type DetailTab = "personality" | "instructions" | "knowledge" | "faq" | "files";

type WizardStepId =
  | "identity"
  | "presentation"
  | "business"
  | "offer"
  | "voice"
  | "operation"
  | "contact"
  | "policies"
  | "review";

type WizardStep = {
  id: WizardStepId;
  title: string;
  description: string;
  icon: typeof Bot;
};

type FAQItem = {
  question: string;
  answer: string;
};

type AgentSnapshot = {
  objective: string;
  prompt: string;
  rules: string[];
  knowledgeBase: string[];
  faqItems: FAQItem[];
  files: string[];
  studio: AgentStudioConfig;
};

const providerOptions = [
  { value: "openrouter", label: "OpenRouter" },
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Gemini" },
  { value: "claude", label: "Claude" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "groq", label: "Groq" },
  { value: "dify", label: "Dify" },
] as const;

const providerColorMap: Record<string, { badge: string; ring: string; dot: string }> = {
  openai: { badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300", ring: "ring-emerald-500/20", dot: "bg-emerald-400" },
  openrouter: { badge: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300", ring: "ring-cyan-500/20", dot: "bg-cyan-400" },
  gemini: { badge: "border-blue-500/20 bg-blue-500/10 text-blue-300", ring: "ring-blue-500/20", dot: "bg-blue-400" },
  claude: { badge: "border-amber-500/20 bg-amber-500/10 text-amber-300", ring: "ring-amber-500/20", dot: "bg-amber-400" },
  deepseek: { badge: "border-violet-500/20 bg-violet-500/10 text-violet-300", ring: "ring-violet-500/20", dot: "bg-violet-400" },
  groq: { badge: "border-sky-500/20 bg-sky-500/10 text-sky-300", ring: "ring-sky-500/20", dot: "bg-sky-400" },
  dify: { badge: "border-rose-500/20 bg-rose-500/10 text-rose-300", ring: "ring-rose-500/20", dot: "bg-rose-400" },
  default: { badge: "border-zinc-700 bg-zinc-800 text-zinc-300", ring: "ring-zinc-500/20", dot: "bg-zinc-400" },
};

const statusLabels: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
};

const statusStyles: Record<string, string> = {
  active: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  inactive: "border-zinc-700 bg-zinc-800 text-zinc-300",
};

const attendedPersonLabels: Record<AgentStudioConfig["attendedPerson"], string> = {
  lead: "Lead",
  cliente: "Cliente",
  paciente: "Paciente",
  aluno: "Aluno",
  outro: "Contato",
};

const toneLabels: Record<AgentStudioConfig["tone"], string> = {
  formal: "Formal",
  informal: "Informal",
  proximo: "Próximo",
  tecnico: "Técnico e objetivo",
};

const responseSizeLabels: Record<AgentStudioConfig["responseSize"], string> = {
  curtas: "Curtas",
  medias: "Médias",
  sem_restricao: "Sem restrição",
};

const emojiLabels: Record<AgentStudioConfig["emojiUsage"], string> = {
  nao_usa: "Não usa",
  moderado: "Usa com moderação",
  frequente: "Usa frequentemente",
};

const wizardSteps: WizardStep[] = [
  { id: "identity", title: "Identidade do agente", description: "Nome, modelo e avatar do agente.", icon: Bot },
  { id: "presentation", title: "Apresentação e papel", description: "Como ele fala e qual papel assume.", icon: UserRound },
  { id: "business", title: "Sua empresa", description: "Quem é a empresa e onde atua.", icon: Globe2 },
  { id: "offer", title: "Oferta e conteúdo", description: "Produtos, serviços, preços e materiais.", icon: BookOpen },
  { id: "voice", title: "Tom de resposta", description: "Tamanho das mensagens, emojis e memória.", icon: MessageSquare },
  { id: "operation", title: "Operação", description: "Entrega, pagamento e funcionamento.", icon: Settings2 },
  { id: "contact", title: "Canais de contato", description: "WhatsApp, e-mail, site e redes.", icon: Phone },
  { id: "policies", title: "Regras e exemplos", description: "Políticas, FAQ e conversas de referência.", icon: ClipboardList },
  { id: "review", title: "Revisão final", description: "Veja o resumo antes de salvar.", icon: Sparkles },
];

const emptyStudioConfig: AgentStudioConfig = {
  presentationMode: "humano",
  tone: "informal",
  responseSize: "medias",
  emojiUsage: "moderado",
  attendedPerson: "lead",
  attendedPersonCustom: "",
  roleTitle: "Especialista de atendimento e qualificação",
  primaryResponsibility: "Responder com clareza, conduzir o contato e levar a conversa para a próxima ação.",
  companyName: "Ozion",
  companyDescription: "",
  businessType: "SaaS / Plataforma digital",
  serviceArea: "Todo o Brasil",
  modality: "Online",
  paymentMethods: ["Pix"],
  deliveryDetails: "",
  operatingHours: "",
  contactWhatsApp: "",
  contactEmail: "",
  contactInstagram: "",
  contactSite: "",
  contactFacebook: "",
  policies: "",
  examples: "",
  faqItems: "",
  filesNotes: "",
  offerSummary: "",
};

const emptyForm: AgentFormState = {
  name: "",
  avatar: "",
  provider: "openrouter",
  model: "deepseek/deepseek-chat-v3-0324",
  memory: true,
  status: "active",
  maxTokens: "4096",
  temperature: "0.7",
  studio: emptyStudioConfig,
};

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "AI"
  );
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function getProviderMeta(provider: string) {
  return providerColorMap[provider] ?? providerColorMap.default;
}

function safeStudioConfig(value: unknown): AgentStudioConfig {
  const config = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    presentationMode: config.presentationMode === "assistente_virtual" ? "assistente_virtual" : "humano",
    tone:
      config.tone === "formal" || config.tone === "proximo" || config.tone === "tecnico" || config.tone === "informal"
        ? config.tone
        : "informal",
    responseSize:
      config.responseSize === "curtas" || config.responseSize === "sem_restricao" || config.responseSize === "medias"
        ? config.responseSize
        : "medias",
    emojiUsage:
      config.emojiUsage === "nao_usa" || config.emojiUsage === "frequente" || config.emojiUsage === "moderado"
        ? config.emojiUsage
        : "moderado",
    attendedPerson:
      config.attendedPerson === "cliente" ||
      config.attendedPerson === "paciente" ||
      config.attendedPerson === "aluno" ||
      config.attendedPerson === "outro" ||
      config.attendedPerson === "lead"
        ? config.attendedPerson
        : "lead",
    attendedPersonCustom: normalizeOptionalText(config.attendedPersonCustom),
    roleTitle: normalizeOptionalText(config.roleTitle),
    primaryResponsibility: normalizeOptionalText(config.primaryResponsibility),
    companyName: normalizeOptionalText(config.companyName),
    companyDescription: normalizeOptionalText(config.companyDescription),
    businessType: normalizeOptionalText(config.businessType),
    serviceArea: normalizeOptionalText(config.serviceArea),
    modality: normalizeOptionalText(config.modality),
    paymentMethods: Array.isArray(config.paymentMethods) ? config.paymentMethods.map((item) => String(item)).filter(Boolean) : [],
    deliveryDetails: normalizeOptionalText(config.deliveryDetails),
    operatingHours: normalizeOptionalText(config.operatingHours),
    contactWhatsApp: normalizeOptionalText(config.contactWhatsApp),
    contactEmail: normalizeOptionalText(config.contactEmail),
    contactInstagram: normalizeOptionalText(config.contactInstagram),
    contactSite: normalizeOptionalText(config.contactSite),
    contactFacebook: normalizeOptionalText(config.contactFacebook),
    policies: normalizeOptionalText(config.policies),
    examples: normalizeOptionalText(config.examples),
    faqItems: normalizeOptionalText(config.faqItems),
    filesNotes: normalizeOptionalText(config.filesNotes),
    offerSummary: normalizeOptionalText(config.offerSummary),
  };
}

function mergeStudioConfig(agent?: AIAgentRow | null) {
  const existing = safeStudioConfig(agent?.config ?? {});

  return {
    ...emptyStudioConfig,
    ...existing,
    roleTitle: existing.roleTitle || "Especialista de atendimento e qualificação",
    primaryResponsibility: existing.primaryResponsibility || agent?.objective || emptyStudioConfig.primaryResponsibility,
    companyName: existing.companyName || "Ozion",
    companyDescription: existing.companyDescription || normalizeOptionalText(agent?.objective),
    offerSummary: existing.offerSummary || normalizeList(agent?.knowledge_base).join("\n"),
    filesNotes: existing.filesNotes || normalizeList(agent?.knowledge_base).join("\n"),
  };
}

function getAttendedPersonLabel(config: AgentStudioConfig) {
  if (config.attendedPerson === "outro" && config.attendedPersonCustom.trim()) {
    return config.attendedPersonCustom.trim();
  }

  return attendedPersonLabels[config.attendedPerson];
}

function parseFaqItems(value: string): FAQItem[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [question, ...answerParts] = line.split("::");
      const answer = answerParts.join("::").trim();
      return {
        question: question?.trim() || "Pergunta",
        answer: answer || "Resposta ainda não preenchida.",
      };
    });
}

function buildDerivedPayload(form: AgentFormState) {
  const personLabel = getAttendedPersonLabel(form.studio);
  const payments = form.studio.paymentMethods.length > 0 ? form.studio.paymentMethods.join(", ") : "Não informado";
  const channels = [
    form.studio.contactWhatsApp ? `WhatsApp: ${form.studio.contactWhatsApp}` : null,
    form.studio.contactEmail ? `E-mail: ${form.studio.contactEmail}` : null,
    form.studio.contactInstagram ? `Instagram: ${form.studio.contactInstagram}` : null,
    form.studio.contactSite ? `Site: ${form.studio.contactSite}` : null,
    form.studio.contactFacebook ? `Facebook: ${form.studio.contactFacebook}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const objective =
    form.studio.primaryResponsibility.trim() ||
    `Atender ${personLabel.toLowerCase()} com foco em ${form.studio.businessType.toLowerCase()} e conduzir a conversa com clareza.`;

  const rules = [
    `Assuma o papel de ${form.studio.roleTitle || "especialista de atendimento"}.`,
    `Apresente-se de forma ${form.studio.presentationMode === "humano" ? "humana" : "como assistente virtual quando necessário"}.`,
    `Use tom ${toneLabels[form.studio.tone].toLowerCase()}.`,
    `Prefira respostas ${responseSizeLabels[form.studio.responseSize].toLowerCase()}.`,
    `Emoji: ${emojiLabels[form.studio.emojiUsage].toLowerCase()}.`,
    form.memory ? "Considere memória ativa para manter contexto da conversa." : "Trabalhe sem memória persistente.",
    form.studio.operatingHours ? `Respeite o horário de atendimento: ${form.studio.operatingHours}.` : null,
    form.studio.policies ? `Siga as políticas: ${form.studio.policies}.` : null,
  ].filter(Boolean) as string[];

  const knowledgeBase = [
    form.studio.companyDescription ? `Empresa: ${form.studio.companyDescription}` : null,
    form.studio.offerSummary ? `Oferta: ${form.studio.offerSummary}` : null,
    form.studio.businessType ? `Tipo de negócio: ${form.studio.businessType}` : null,
    form.studio.serviceArea ? `Área de atuação: ${form.studio.serviceArea}` : null,
    form.studio.modality ? `Modalidade: ${form.studio.modality}` : null,
    form.studio.deliveryDetails ? `Entrega/atendimento: ${form.studio.deliveryDetails}` : null,
    `Pagamentos aceitos: ${payments}`,
    channels ? `Canais: ${channels}` : null,
    form.studio.examples ? `Exemplos reais: ${form.studio.examples}` : null,
    form.studio.filesNotes ? `Materiais e arquivos: ${form.studio.filesNotes}` : null,
  ].filter(Boolean) as string[];

  const prompt = [
    `Você é ${form.name.trim() || "o agente Ozion"} e atua como ${form.studio.roleTitle || "especialista de atendimento"}.`,
    `Sua empresa é ${form.studio.companyName || "Ozion"}. ${form.studio.companyDescription || ""}`.trim(),
    `Seu foco principal é: ${objective}`,
    `A pessoa atendida deve ser tratada como ${personLabel}.`,
    `Use um tom ${toneLabels[form.studio.tone].toLowerCase()}, com respostas ${responseSizeLabels[form.studio.responseSize].toLowerCase()}.`,
    `Sobre o negócio: tipo ${form.studio.businessType || "não informado"}, atuação em ${form.studio.serviceArea || "não informado"} e modalidade ${form.studio.modality || "não informada"}.`,
    `Produtos, serviços e preços: ${form.studio.offerSummary || "não informado"}.`,
    `Formas de pagamento: ${payments}.`,
    form.studio.deliveryDetails ? `Entrega ou atendimento: ${form.studio.deliveryDetails}.` : null,
    form.studio.operatingHours ? `Funcionamento: ${form.studio.operatingHours}.` : null,
    channels ? `Canais oficiais: ${channels}.` : null,
    form.studio.policies ? `Regras e políticas: ${form.studio.policies}.` : null,
    form.studio.examples ? `Use estes exemplos como referência de atendimento: ${form.studio.examples}.` : null,
    form.studio.faqItems ? `FAQ base:\n${form.studio.faqItems}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { objective, prompt, rules, knowledgeBase };
}

function hydrateForm(agent: AIAgentRow): AgentFormState {
  return {
    name: agent.name ?? "",
    avatar: agent.avatar ?? "",
    provider: agent.provider ?? "openai",
    model: agent.model ?? "gpt-4o",
    memory: Boolean(agent.memory ?? true),
    status: agent.status === "inactive" ? "inactive" : "active",
    maxTokens: String(agent.max_tokens ?? 4096),
    temperature: String(typeof agent.temperature === "number" ? agent.temperature : Number(agent.temperature ?? 0.7)),
    studio: mergeStudioConfig(agent),
  };
}

function buildPayload(form: AgentFormState) {
  const derived = buildDerivedPayload(form);

  return {
    name: form.name.trim(),
    avatar: form.avatar.trim() || null,
    provider: form.provider.trim() || "openai",
    model: form.model.trim() || "gpt-4o",
    objective: derived.objective,
    prompt: derived.prompt,
    rules: derived.rules,
    knowledge_base: derived.knowledgeBase,
    memory: form.memory,
    status: form.status,
    max_tokens: toNumber(form.maxTokens, 4096),
    temperature: toNumber(form.temperature, 0.7),
    config: {
      ...form.studio,
    },
  };
}

function snapshotAgent(agent: AIAgentRow | null): AgentSnapshot | null {
  if (!agent) return null;

  const studio = mergeStudioConfig(agent);

  return {
    objective: agent.objective || studio.primaryResponsibility || "Sem objetivo definido.",
    prompt: agent.prompt || "Sem prompt configurado.",
    rules: normalizeList(agent.rules),
    knowledgeBase: normalizeList(agent.knowledge_base),
    faqItems: parseFaqItems(studio.faqItems),
    files: normalizeList(studio.filesNotes || studio.offerSummary || normalizeList(agent.knowledge_base).join("\n")),
    studio,
  };
}

function metricAccent(accent: string) {
  if (accent === "emerald") return "bg-emerald-500/10 text-emerald-300";
  if (accent === "blue") return "bg-cyan-500/10 text-cyan-300";
  if (accent === "amber") return "bg-amber-500/10 text-amber-300";
  return "bg-violet-500/10 text-violet-300";
}

function stepAvailable(stepId: WizardStepId, form: AgentFormState) {
  switch (stepId) {
    case "identity":
      return Boolean(form.name.trim() && form.model.trim());
    case "presentation":
      return Boolean(form.studio.roleTitle.trim() && form.studio.primaryResponsibility.trim());
    case "business":
      return Boolean(form.studio.companyName.trim() && form.studio.businessType.trim());
    default:
      return true;
  }
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AIAgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgentRow | null>(null);
  const [form, setForm] = useState<AgentFormState>(emptyForm);
  const [detailTab, setDetailTab] = useState<DetailTab>("personality");
  const [wizardStep, setWizardStep] = useState(0);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) ?? agents[0] ?? null,
    [agents, selectedAgentId]
  );

  const selectedSnapshot = useMemo(() => snapshotAgent(selectedAgent), [selectedAgent]);

  const filteredAgents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return [...agents]
      .filter((agent) => {
        const searchable = [
          agent.name,
          agent.objective,
          agent.prompt,
          agent.provider,
          agent.model,
          ...normalizeList(agent.rules),
          ...normalizeList(agent.knowledge_base),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch = !query || searchable.includes(query);
        const matchesStatus = statusFilter === "all" || agent.status === statusFilter;
        const matchesProvider = providerFilter === "all" || agent.provider === providerFilter;

        return matchesSearch && matchesStatus && matchesProvider;
      })
      .sort((a, b) => {
        const activeDelta = Number(b.status === "active") - Number(a.status === "active");
        if (activeDelta !== 0) return activeDelta;
        return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
      });
  }, [agents, providerFilter, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = agents.length;
    const active = agents.filter((agent) => agent.status === "active").length;
    const memoryEnabled = agents.filter((agent) => agent.memory).length;
    const handled = agents.reduce((sum, agent) => sum + (agent.conversations_handled ?? 0), 0);

    return [
      {
        label: "Agentes no workspace",
        value: formatCompactNumber(total),
        hint: "central Ozion",
        icon: Bot,
        accent: "emerald",
      },
      {
        label: "Agentes ativos",
        value: formatCompactNumber(active),
        hint: total > 0 ? `${Math.round((active / total) * 100)}% operando` : "sem dados",
        icon: Zap,
        accent: "blue",
      },
      {
        label: "Conversas atendidas",
        value: formatCompactNumber(handled),
        hint: "volume acumulado",
        icon: MessageSquare,
        accent: "violet",
      },
      {
        label: "Memória ligada",
        value: formatCompactNumber(memoryEnabled),
        hint: "continuidade ativa",
        icon: Brain,
        accent: "amber",
      },
    ];
  }, [agents]);

  const fetchAgents = useCallback(async (preferredSelectedId?: string | null) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/agents", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha ao carregar agentes.");

      const nextAgents = (result.agents ?? []) as AIAgentRow[];
      setAgents(nextAgents);
      const nextSelectedId =
        preferredSelectedId && nextAgents.some((agent) => agent.id === preferredSelectedId)
          ? preferredSelectedId
          : nextAgents[0]?.id ?? null;
      setSelectedAgentId(nextSelectedId);
    } catch (fetchError) {
      setAgents([]);
      setSelectedAgentId(null);
      setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar agentes.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchAgents();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchAgents]);

  function openCreateModal() {
    setEditingAgent(null);
    setForm(emptyForm);
    setWizardStep(0);
    setShowWizard(true);
  }

  function openEditModal(agent: AIAgentRow) {
    setEditingAgent(agent);
    setForm(hydrateForm(agent));
    setWizardStep(0);
    setShowWizard(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Defina um nome para o agente.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = buildPayload(form);
    const response = await fetch(`/api/agents${editingAgent ? `?id=${editingAgent.id}` : ""}`, {
      method: editingAgent ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || "Falha ao salvar agente.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowWizard(false);
    setEditingAgent(null);
    setForm(emptyForm);
    await fetchAgents(result.agent?.id ?? selectedAgentId ?? null);
  }

  async function handleDelete(agent: AIAgentRow) {
    const confirmed = window.confirm(`Excluir o agente "${agent.name}"? Essa ação não pode ser desfeita.`);
    if (!confirmed) return;

    setSaving(true);
    setError(null);

    const response = await fetch(`/api/agents?id=${agent.id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setError(result?.error || "Falha ao excluir agente.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowWizard(false);
    setEditingAgent(null);
    setForm(emptyForm);
    await fetchAgents(null);
  }

  async function handleToggleStatus(agent: AIAgentRow) {
    setError(null);
    const nextStatus = agent.status === "active" ? "inactive" : "active";
    const response = await fetch(`/api/agents?id=${agent.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => null);
      setError(result?.error || "Falha ao atualizar status.");
      return;
    }

    await fetchAgents(agent.id);
  }

  const selectedProvider = getProviderMeta(selectedAgent?.provider ?? "default");
  const wizardCurrent = wizardSteps[wizardStep];
  const generatedPreview = useMemo(() => buildDerivedPayload(form), [form]);
  const canAdvance = stepAvailable(wizardCurrent.id, form);
  const availableTabs: { id: DetailTab; label: string; icon: typeof UserRound }[] = [
    { id: "personality", label: "Personalidade", icon: UserRound },
    { id: "instructions", label: "Instruções", icon: LayoutPanelTop },
    { id: "knowledge", label: "Base de informações", icon: BookOpen },
    { id: "faq", label: "Perguntas e respostas", icon: CircleHelp },
    { id: "files", label: "Arquivos", icon: FileText },
  ];

  return (
    <div className="space-y-6 p-6">
      <section className="overflow-hidden rounded-[28px] border border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_32%),linear-gradient(180deg,rgba(24,24,27,0.96),rgba(10,10,10,0.98))]">
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between lg:p-7">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              Studio de agentes Ozion
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Agente IA com cara de produto premium</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Estruture agentes com visual mais refinado, fluxo guiado de criação e um painel de configuração pronto para
              WhatsApp, CRM e automações.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void fetchAgents(selectedAgentId)}
              disabled={loading}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900/80 px-5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Atualizar agentes
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:from-emerald-400 hover:to-emerald-500"
            >
              <Plus className="h-4 w-4" />
              Criar novo agente
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold text-red-200">Algo travou nessa ação</p>
            <p className="mt-0.5 text-red-100/80">{error}</p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div key={stat.label} className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <div className="mb-4 flex items-center justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${metricAccent(stat.accent)}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{stat.hint}</span>
              </div>
              <p className="text-3xl font-black text-white">{stat.value}</p>
              <p className="mt-1 text-sm text-zinc-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.9fr)]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="relative w-full xl:max-w-2xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar por nome, objetivo, regra ou base de conhecimento..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-zinc-800 bg-zinc-900 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="bg-transparent text-sm text-zinc-200 focus:outline-none"
                  >
                    <option value="all">Todos</option>
                    <option value="active">Ativos</option>
                    <option value="inactive">Inativos</option>
                  </select>
                </label>

                <label className="relative flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 pr-8">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Provider</span>
                  <select
                    value={providerFilter}
                    onChange={(event) => setProviderFilter(event.target.value)}
                    className="appearance-none bg-transparent text-sm text-zinc-200 focus:outline-none"
                  >
                    <option value="all">Todos</option>
                    {providerOptions.map((provider) => (
                      <option key={provider.value} value={provider.value}>
                        {provider.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                </label>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-950/70">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            </div>
          ) : filteredAgents.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredAgents.map((agent) => {
                const meta = getProviderMeta(agent.provider);
                const active = selectedAgentId === agent.id;
                const snapshot = snapshotAgent(agent);

                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`group rounded-[28px] border p-5 text-left transition duration-200 ${
                      active
                        ? "border-emerald-500/40 bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(24,24,27,0.92))] shadow-[0_0_0_1px_rgba(16,185,129,0.06)]"
                        : "border-zinc-800 bg-zinc-950/80 hover:border-zinc-700 hover:bg-zinc-950"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`relative flex h-16 w-16 items-center justify-center rounded-[22px] border border-zinc-800 bg-zinc-900 ${active ? "ring-1 ring-emerald-500/30" : ""}`}>
                          <span className="text-lg font-bold text-white">{agent.avatar?.trim() || initials(agent.name)}</span>
                          <span className={`absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-zinc-950 ${agent.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-xl font-black text-white">{agent.name}</h3>
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[agent.status] ?? statusStyles.inactive}`}>
                              {statusLabels[agent.status] ?? agent.status}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                            {snapshot?.studio.roleTitle || snapshot?.objective || "Agente pronto para atendimento inteligente."}
                          </p>
                        </div>
                      </div>

                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                        {agent.provider}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Conversas</p>
                        <p className="mt-1 text-lg font-bold text-white">{formatCompactNumber(agent.conversations_handled ?? 0)}</p>
                      </div>
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Pessoa atendida</p>
                        <p className="mt-1 text-lg font-bold text-white">{getAttendedPersonLabel(snapshot?.studio ?? emptyStudioConfig)}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[11px] font-semibold text-zinc-300">
                        {toneLabels[snapshot?.studio.tone ?? "informal"]}
                      </span>
                      <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[11px] font-semibold text-zinc-300">
                        {responseSizeLabels[snapshot?.studio.responseSize ?? "medias"]}
                      </span>
                      <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-[11px] font-semibold text-zinc-300">
                        {agent.memory ? "Memória ativa" : "Memória desligada"}
                      </span>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-zinc-800 pt-4">
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">
                        Gerenciar agente
                        <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditModal(agent);
                          }}
                          className="rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                          aria-label={`Editar ${agent.name}`}
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleToggleStatus(agent);
                          }}
                          className={`rounded-xl p-2 transition ${
                            agent.status === "active" ? "text-emerald-400 hover:bg-emerald-500/10" : "text-zinc-500 hover:bg-zinc-800"
                          }`}
                          aria-label={`Alternar status de ${agent.name}`}
                        >
                          {agent.status === "active" ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDelete(agent);
                          }}
                          className="rounded-xl p-2 text-zinc-400 transition hover:bg-red-500/10 hover:text-red-300"
                          aria-label={`Excluir ${agent.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={openCreateModal}
                className="flex min-h-[332px] flex-col items-center justify-center gap-4 rounded-[28px] border border-dashed border-zinc-700 bg-zinc-950/60 p-6 text-center transition hover:border-emerald-500/40 hover:bg-emerald-500/5"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-zinc-700 bg-zinc-900">
                  <Plus className="h-7 w-7 text-zinc-400" />
                </div>
                <div>
                  <p className="text-lg font-black text-white">Criar novo agente</p>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-zinc-500">
                    Abra o assistente guiado, monte a personalidade, as regras e salve tudo no mesmo fluxo.
                  </p>
                </div>
              </button>
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-zinc-700 bg-zinc-950/60 p-10 text-center">
              <Bot className="mx-auto h-12 w-12 text-zinc-500" />
              <h3 className="mt-4 text-xl font-black text-white">Nenhum agente encontrado</h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500">
                Ajuste os filtros ou crie um novo agente nessa área para deixar seu atendimento pronto para operar.
              </p>
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-2xl bg-emerald-500 px-5 text-sm font-bold text-white transition hover:bg-emerald-400"
              >
                <Plus className="h-4 w-4" />
                Criar agente agora
              </button>
            </div>
          )}
        </div>

        <aside className="sticky top-6 space-y-4 self-start">
          <div className="overflow-hidden rounded-[30px] border border-zinc-800 bg-zinc-950/90">
            <div className="border-b border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_35%)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-zinc-800 bg-zinc-900">
                    <span className="text-xl font-black text-white">
                      {selectedAgent?.avatar?.trim() || initials(selectedAgent?.name || "AI")}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-2xl font-black text-white">{selectedAgent?.name || "Selecione um agente"}</h2>
                      {selectedAgent ? (
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[selectedAgent.status] ?? statusStyles.inactive}`}>
                          {statusLabels[selectedAgent.status] ?? selectedAgent.status}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      {selectedSnapshot?.studio.roleTitle || "Abra um agente para ver a configuração refinada."}
                    </p>
                  </div>
                </div>

                {selectedAgent ? (
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${selectedProvider.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${selectedProvider.dot}`} />
                    {selectedAgent.provider}
                  </span>
                ) : null}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Conversas</p>
                  <p className="mt-1 text-lg font-bold text-white">{formatCompactNumber(selectedAgent?.conversations_handled ?? 0)}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Tom</p>
                  <p className="mt-1 text-lg font-bold text-white">{toneLabels[selectedSnapshot?.studio.tone ?? "informal"]}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Modelo</p>
                  <p className="mt-1 truncate text-lg font-bold text-white">{selectedAgent?.model || "—"}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => (selectedAgent ? openEditModal(selectedAgent) : openCreateModal())}
                  className="flex h-11 items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 text-sm font-bold text-emerald-300 transition hover:bg-emerald-500/15"
                >
                  <Wand2 className="h-4 w-4" />
                  Preenchimento automático
                </button>
                <button
                  type="button"
                  onClick={() => (selectedAgent ? openEditModal(selectedAgent) : openCreateModal())}
                  className="flex h-11 items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800"
                >
                  <Edit3 className="h-4 w-4" />
                  Editar agente
                </button>
                {selectedAgent ? (
                  <button
                    type="button"
                    onClick={() => void handleToggleStatus(selectedAgent)}
                    className="flex h-11 items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800"
                  >
                    {selectedAgent.status === "active" ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    {selectedAgent.status === "active" ? "Desativar" : "Ativar"}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="border-b border-zinc-800 px-3 py-3">
              <div className="grid grid-cols-2 gap-2">
                {availableTabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = detailTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setDetailTab(tab.id)}
                      className={`flex items-center gap-2 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition ${
                        active
                          ? "bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-500/20"
                          : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5">
              {!selectedAgent || !selectedSnapshot ? (
                <div className="rounded-[24px] border border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-center">
                  <Bot className="mx-auto h-10 w-10 text-zinc-500" />
                  <h3 className="mt-4 text-lg font-black text-white">Nada selecionado ainda</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    Clique em um cartão para abrir o estúdio do agente, ou crie o primeiro do zero.
                  </p>
                </div>
              ) : null}

              {selectedAgent && selectedSnapshot && detailTab === "personality" ? (
                <div className="space-y-4">
                  <DetailCard
                    icon={UserRound}
                    title="Identidade"
                    content={[
                      `Apresentação: ${selectedSnapshot.studio.presentationMode === "humano" ? "Humano" : "Assistente virtual"}`,
                      `Pessoa atendida: ${getAttendedPersonLabel(selectedSnapshot.studio)}`,
                      `Papel: ${selectedSnapshot.studio.roleTitle || "Não definido"}`,
                    ]}
                  />
                  <DetailCard
                    icon={MessageSquare}
                    title="Estilo de resposta"
                    content={[
                      `Tom: ${toneLabels[selectedSnapshot.studio.tone]}`,
                      `Tamanho: ${responseSizeLabels[selectedSnapshot.studio.responseSize]}`,
                      `Emojis: ${emojiLabels[selectedSnapshot.studio.emojiUsage]}`,
                    ]}
                  />
                  <DetailCard
                    icon={Cpu}
                    title="Capacidade"
                    content={[
                      `Modelo: ${selectedAgent.model || "Não informado"}`,
                      `Tokens: ${formatCompactNumber(selectedAgent.max_tokens ?? 0)}`,
                      `Temperatura: ${selectedAgent.temperature ?? "—"}`,
                    ]}
                  />
                </div>
              ) : null}

              {selectedAgent && selectedSnapshot && detailTab === "instructions" ? (
                <div className="space-y-4">
                  <DetailBlock
                    title="Objetivo principal"
                    subtitle={selectedSnapshot.objective}
                    icon={<Sparkles className="h-4 w-4 text-emerald-400" />}
                  />
                  <DetailBlock
                    title="Prompt do agente"
                    subtitle={selectedSnapshot.prompt}
                    icon={<PanelTop className="h-4 w-4 text-emerald-400" />}
                    multiline
                  />
                  <div className="rounded-[24px] border border-zinc-800 bg-zinc-900/70 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      Regras principais
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedSnapshot.rules.length > 0 ? (
                        selectedSnapshot.rules.map((rule) => (
                          <span key={rule} className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-300">
                            {rule}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-zinc-500">Nenhuma regra registrada ainda.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {selectedAgent && selectedSnapshot && detailTab === "knowledge" ? (
                <div className="space-y-3">
                  {selectedSnapshot.knowledgeBase.length > 0 ? (
                    selectedSnapshot.knowledgeBase.map((item) => (
                      <div key={item} className="rounded-[22px] border border-zinc-800 bg-zinc-900/70 p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <p className="text-sm leading-6 text-zinc-300">{item}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-zinc-700 bg-zinc-900/40 p-6 text-sm text-zinc-500">
                      A base de informações ainda está vazia. Abra o assistente e preencha empresa, oferta e arquivos.
                    </div>
                  )}
                </div>
              ) : null}

              {selectedAgent && selectedSnapshot && detailTab === "faq" ? (
                <div className="space-y-3">
                  {selectedSnapshot.faqItems.length > 0 ? (
                    selectedSnapshot.faqItems.map((item, index) => (
                      <div key={`${item.question}-${index}`} className="rounded-[24px] border border-zinc-800 bg-zinc-900/70 p-4">
                        <p className="text-sm font-bold text-white">{item.question}</p>
                        <p className="mt-2 text-sm leading-6 text-zinc-400">{item.answer}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-zinc-700 bg-zinc-900/40 p-6 text-sm text-zinc-500">
                      Nenhum FAQ montado ainda. No assistente você pode cadastrar perguntas e respostas na mesma estrutura.
                    </div>
                  )}
                </div>
              ) : null}

              {selectedAgent && selectedSnapshot && detailTab === "files" ? (
                <div className="space-y-3">
                  {selectedSnapshot.files.length > 0 ? (
                    selectedSnapshot.files.map((item, index) => (
                      <div key={`${item}-${index}`} className="flex items-start justify-between gap-3 rounded-[22px] border border-zinc-800 bg-zinc-900/70 p-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-zinc-300">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">Material de apoio {index + 1}</p>
                            <p className="mt-1 text-sm leading-6 text-zinc-400">{item}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openEditModal(selectedAgent)}
                          className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-emerald-500/40 hover:text-emerald-300"
                        >
                          Atualizar
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-zinc-700 bg-zinc-900/40 p-6 text-sm text-zinc-500">
                      Nenhum arquivo ou anotação de material foi registrado para esse agente.
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>

      {showWizard ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[96vh] w-full max-w-6xl overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40">
            <div className="border-b border-zinc-800 bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-white/90">Assistente de criação</p>
                  <h2 className="mt-2 text-3xl font-black text-white">
                    {editingAgent ? `Refinar agente ${editingAgent.name}` : "Criar instruções do agente"}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-white/85">
                    Monte personalidade, operação e conteúdo do agente em um fluxo guiado, já na modelagem da Ozion.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWizard(false)}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-zinc-900 transition hover:scale-[1.03]"
                  aria-label="Fechar assistente"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="grid max-h-[calc(96vh-106px)] grid-cols-1 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="border-r border-zinc-800 bg-zinc-950/95 p-5">
                <div className="mb-5 rounded-[26px] border border-zinc-800 bg-zinc-900/80 p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Progresso</p>
                  <p className="mt-2 text-xl font-black text-white">
                    Etapa {wizardStep + 1} de {wizardSteps.length}
                  </p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400" style={{ width: `${((wizardStep + 1) / wizardSteps.length) * 100}%` }} />
                  </div>
                </div>

                <div className="space-y-2">
                  {wizardSteps.map((step, index) => {
                    const Icon = step.icon;
                    const active = index === wizardStep;
                    const done = index < wizardStep;

                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setWizardStep(index)}
                        className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                          active
                            ? "border border-emerald-500/20 bg-emerald-500/10"
                            : done
                              ? "bg-zinc-900/80 hover:bg-zinc-900"
                              : "hover:bg-zinc-900/70"
                        }`}
                      >
                        <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                          active ? "bg-emerald-500 text-white" : done ? "bg-emerald-500/10 text-emerald-300" : "bg-zinc-900 text-zinc-400"
                        }`}>
                          {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-bold ${active ? "text-white" : "text-zinc-200"}`}>{step.title}</p>
                          <p className="mt-1 text-xs leading-5 text-zinc-500">{step.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <div className="flex max-h-[calc(96vh-106px)] flex-col overflow-hidden">
                <div className="border-b border-zinc-800 px-6 py-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">
                    {wizardCurrent.title}
                  </p>
                  <h3 className="mt-2 text-3xl font-black text-white">{wizardCurrent.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{wizardCurrent.description}</p>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                  {wizardCurrent.id === "identity" ? (
                    <div className="grid gap-5 lg:grid-cols-2">
                      <WizardField label="Nome do agente" required>
                        <input
                          value={form.name}
                          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                          className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          placeholder="Ex: Safira Astral"
                        />
                      </WizardField>

                      <WizardField label="Avatar / iniciais">
                        <input
                          value={form.avatar}
                          onChange={(event) => setForm((current) => ({ ...current, avatar: event.target.value }))}
                          className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          placeholder="Ex: SA"
                        />
                      </WizardField>

                      <WizardField label="Provider">
                        <div className="relative">
                          <select
                            value={form.provider}
                            onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value }))}
                            className="h-14 w-full appearance-none rounded-2xl border border-zinc-800 bg-zinc-900 px-4 pr-10 text-base text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          >
                            {providerOptions.map((provider) => (
                              <option key={provider.value} value={provider.value}>
                                {provider.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        </div>
                      </WizardField>

                      <WizardField label="Modelo" required>
                        <input
                          value={form.model}
                          onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))}
                          className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          placeholder="Ex: gpt-4o ou deepseek-chat"
                        />
                      </WizardField>
                    </div>
                  ) : null}

                  {wizardCurrent.id === "presentation" ? (
                    <div className="space-y-6">
                      <OptionGrid
                        title="Como o agente deve se apresentar?"
                        options={[
                          { value: "humano", label: "Humano", description: "Nunca puxa um tom robótico na conversa." },
                          { value: "assistente_virtual", label: "Assistente virtual", description: "Assume ser IA se isso for relevante para o contexto." },
                        ]}
                        current={form.studio.presentationMode}
                        onSelect={(value) =>
                          setForm((current) => ({
                            ...current,
                            studio: { ...current.studio, presentationMode: value as AgentStudioConfig["presentationMode"] },
                          }))
                        }
                      />

                      <div className="grid gap-5 lg:grid-cols-2">
                        <WizardField label="Cargo ou papel do agente" required>
                          <input
                            value={form.studio.roleTitle}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                studio: { ...current.studio, roleTitle: event.target.value },
                              }))
                            }
                            className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                            placeholder="Ex: Especialista em atendimento comercial"
                          />
                        </WizardField>

                        <WizardField label="Quem ele atende">
                          <div className="relative">
                            <select
                              value={form.studio.attendedPerson}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  studio: { ...current.studio, attendedPerson: event.target.value as AgentStudioConfig["attendedPerson"] },
                                }))
                              }
                              className="h-14 w-full appearance-none rounded-2xl border border-zinc-800 bg-zinc-900 px-4 pr-10 text-base text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                            >
                              <option value="lead">Lead</option>
                              <option value="cliente">Cliente</option>
                              <option value="paciente">Paciente</option>
                              <option value="aluno">Aluno</option>
                              <option value="outro">Outro</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                          </div>
                        </WizardField>
                      </div>

                      {form.studio.attendedPerson === "outro" ? (
                        <WizardField label="Nome personalizado para a pessoa atendida">
                          <input
                            value={form.studio.attendedPersonCustom}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                studio: { ...current.studio, attendedPersonCustom: event.target.value },
                              }))
                            }
                            className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                            placeholder="Ex: aluno premium"
                          />
                        </WizardField>
                      ) : null}

                      <WizardField label="Responsabilidade principal" required>
                        <textarea
                          value={form.studio.primaryResponsibility}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              studio: { ...current.studio, primaryResponsibility: event.target.value },
                            }))
                          }
                          rows={5}
                          className="w-full rounded-[24px] border border-zinc-800 bg-zinc-900 px-4 py-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          placeholder="Explique o que esse agente precisa fazer bem."
                        />
                      </WizardField>
                    </div>
                  ) : null}

                  {wizardCurrent.id === "business" ? (
                    <div className="space-y-6">
                      <div className="grid gap-5 lg:grid-cols-2">
                        <WizardField label="Nome da empresa" required>
                          <input
                            value={form.studio.companyName}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                studio: { ...current.studio, companyName: event.target.value },
                              }))
                            }
                            className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                            placeholder="Ex: Ozion"
                          />
                        </WizardField>

                        <WizardField label="Tipo de negócio" required>
                          <input
                            value={form.studio.businessType}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                studio: { ...current.studio, businessType: event.target.value },
                              }))
                            }
                            className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                            placeholder="Ex: SaaS / Plataforma digital"
                          />
                        </WizardField>
                      </div>

                      <WizardField label="Descrição da empresa">
                        <textarea
                          value={form.studio.companyDescription}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              studio: { ...current.studio, companyDescription: event.target.value },
                            }))
                          }
                          rows={6}
                          className="w-full rounded-[24px] border border-zinc-800 bg-zinc-900 px-4 py-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          placeholder="Conte o que a empresa faz, para quem atende e qual o diferencial."
                        />
                      </WizardField>

                      <div className="grid gap-5 lg:grid-cols-2">
                        <WizardField label="Área de atuação">
                          <input
                            value={form.studio.serviceArea}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                studio: { ...current.studio, serviceArea: event.target.value },
                              }))
                            }
                            className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                            placeholder="Ex: Todo o Brasil"
                          />
                        </WizardField>

                        <WizardField label="Modalidade de atendimento">
                          <input
                            value={form.studio.modality}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                studio: { ...current.studio, modality: event.target.value },
                              }))
                            }
                            className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                            placeholder="Ex: Online"
                          />
                        </WizardField>
                      </div>
                    </div>
                  ) : null}

                  {wizardCurrent.id === "offer" ? (
                    <div className="space-y-6">
                      <WizardField label="Produtos, serviços e preços">
                        <textarea
                          value={form.studio.offerSummary}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              studio: { ...current.studio, offerSummary: event.target.value },
                            }))
                          }
                          rows={7}
                          className="w-full rounded-[24px] border border-zinc-800 bg-zinc-900 px-4 py-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          placeholder="Liste os produtos, serviços, planos, bônus e condições."
                        />
                      </WizardField>

                      <WizardField label="Arquivos, links e materiais que o agente deve considerar">
                        <textarea
                          value={form.studio.filesNotes}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              studio: { ...current.studio, filesNotes: event.target.value },
                            }))
                          }
                          rows={5}
                          className="w-full rounded-[24px] border border-zinc-800 bg-zinc-900 px-4 py-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          placeholder="Ex: PDF de vendas, apresentação institucional, FAQ do produto..."
                        />
                      </WizardField>
                    </div>
                  ) : null}

                  {wizardCurrent.id === "voice" ? (
                    <div className="space-y-6">
                      <OptionGrid
                        title="Tom de voz"
                        options={[
                          { value: "formal", label: "Formal", description: "Profissional, polido e mais institucional." },
                          { value: "informal", label: "Informal", description: "Leve, natural e sem excesso de formalidade." },
                          { value: "proximo", label: "Próximo", description: "Tom de conversa, estilo WhatsApp bem humano." },
                          { value: "tecnico", label: "Técnico e objetivo", description: "Direto, claro e orientado a solução." },
                        ]}
                        current={form.studio.tone}
                        onSelect={(value) =>
                          setForm((current) => ({
                            ...current,
                            studio: { ...current.studio, tone: value as AgentStudioConfig["tone"] },
                          }))
                        }
                      />

                      <div className="grid gap-5 lg:grid-cols-2">
                        <OptionGrid
                          title="Tamanho das mensagens"
                          options={[
                            { value: "curtas", label: "Curtas", description: "Máximo de 2 linhas por resposta." },
                            { value: "medias", label: "Médias", description: "Mais contexto sem ficar pesado." },
                            { value: "sem_restricao", label: "Sem restrição", description: "Pode responder com mais profundidade." },
                          ]}
                          current={form.studio.responseSize}
                          onSelect={(value) =>
                            setForm((current) => ({
                              ...current,
                              studio: { ...current.studio, responseSize: value as AgentStudioConfig["responseSize"] },
                            }))
                          }
                        />

                        <OptionGrid
                          title="Uso de emojis"
                          options={[
                            { value: "nao_usa", label: "Não usa", description: "Postura mais limpa e séria." },
                            { value: "moderado", label: "Usa com moderação", description: "Equilíbrio entre humano e profissional." },
                            { value: "frequente", label: "Usa frequentemente", description: "Mais calor e proximidade na conversa." },
                          ]}
                          current={form.studio.emojiUsage}
                          onSelect={(value) =>
                            setForm((current) => ({
                              ...current,
                              studio: { ...current.studio, emojiUsage: value as AgentStudioConfig["emojiUsage"] },
                            }))
                          }
                        />
                      </div>

                      <div className="grid gap-5 lg:grid-cols-3">
                        <WizardField label="Memória ativa">
                          <button
                            type="button"
                            onClick={() => setForm((current) => ({ ...current, memory: !current.memory }))}
                            className={`flex h-14 w-full items-center justify-between rounded-2xl border px-4 text-left transition ${
                              form.memory
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                : "border-zinc-800 bg-zinc-900 text-zinc-300"
                            }`}
                          >
                            <span className="font-semibold">{form.memory ? "Memória ligada" : "Memória desligada"}</span>
                            <Brain className="h-4 w-4" />
                          </button>
                        </WizardField>

                        <WizardField label="Tokens máximos">
                          <input
                            type="number"
                            min={256}
                            step={64}
                            value={form.maxTokens}
                            onChange={(event) => setForm((current) => ({ ...current, maxTokens: event.target.value }))}
                            className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-base text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          />
                        </WizardField>

                        <WizardField label="Temperatura">
                          <input
                            type="number"
                            min={0}
                            max={2}
                            step={0.1}
                            value={form.temperature}
                            onChange={(event) => setForm((current) => ({ ...current, temperature: event.target.value }))}
                            className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-base text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          />
                        </WizardField>
                      </div>
                    </div>
                  ) : null}

                  {wizardCurrent.id === "operation" ? (
                    <div className="space-y-6">
                      <WizardField label="Formas de pagamento aceitas">
                        <div className="flex flex-wrap gap-3">
                          {["Pix", "Cartão de crédito", "Cartão de débito", "Boleto", "Transferência", "Dinheiro", "Mercado Pago"].map((method) => {
                            const active = form.studio.paymentMethods.includes(method);

                            return (
                              <button
                                key={method}
                                type="button"
                                onClick={() =>
                                  setForm((current) => ({
                                    ...current,
                                    studio: {
                                      ...current.studio,
                                      paymentMethods: active
                                        ? current.studio.paymentMethods.filter((item) => item !== method)
                                        : [...current.studio.paymentMethods, method],
                                    },
                                  }))
                                }
                                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                                  active
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                    : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700"
                                }`}
                              >
                                {method}
                              </button>
                            );
                          })}
                        </div>
                      </WizardField>

                      <div className="grid gap-5 lg:grid-cols-2">
                        <WizardField label="Entrega ou atendimento">
                          <textarea
                            value={form.studio.deliveryDetails}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                studio: { ...current.studio, deliveryDetails: event.target.value },
                              }))
                            }
                            rows={6}
                            className="w-full rounded-[24px] border border-zinc-800 bg-zinc-900 px-4 py-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                            placeholder="Explique retirada, entrega, prazo, taxas ou formato do atendimento."
                          />
                        </WizardField>

                        <WizardField label="Funcionamento">
                          <textarea
                            value={form.studio.operatingHours}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                studio: { ...current.studio, operatingHours: event.target.value },
                              }))
                            }
                            rows={6}
                            className="w-full rounded-[24px] border border-zinc-800 bg-zinc-900 px-4 py-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                            placeholder="Ex: Seg a Sex das 08h às 18h. Sábado até 12h. Domingo fechado."
                          />
                        </WizardField>
                      </div>

                      <div className="grid gap-5 lg:grid-cols-2">
                        <WizardField label="Status do agente">
                          <div className="relative">
                            <select
                              value={form.status}
                              onChange={(event) =>
                                setForm((current) => ({ ...current, status: event.target.value as AgentFormState["status"] }))
                              }
                              className="h-14 w-full appearance-none rounded-2xl border border-zinc-800 bg-zinc-900 px-4 pr-10 text-base text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                            >
                              <option value="active">Ativo</option>
                              <option value="inactive">Inativo</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                          </div>
                        </WizardField>
                      </div>
                    </div>
                  ) : null}

                  {wizardCurrent.id === "contact" ? (
                    <div className="grid gap-5 lg:grid-cols-2">
                      <WizardField label="WhatsApp">
                        <input
                          value={form.studio.contactWhatsApp}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              studio: { ...current.studio, contactWhatsApp: event.target.value },
                            }))
                          }
                          className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          placeholder="(11) 99999-9999"
                        />
                      </WizardField>

                      <WizardField label="E-mail">
                        <input
                          value={form.studio.contactEmail}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              studio: { ...current.studio, contactEmail: event.target.value },
                            }))
                          }
                          className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          placeholder="contato@empresa.com"
                        />
                      </WizardField>

                      <WizardField label="Instagram">
                        <input
                          value={form.studio.contactInstagram}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              studio: { ...current.studio, contactInstagram: event.target.value },
                            }))
                          }
                          className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          placeholder="@suaempresa"
                        />
                      </WizardField>

                      <WizardField label="Site">
                        <input
                          value={form.studio.contactSite}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              studio: { ...current.studio, contactSite: event.target.value },
                            }))
                          }
                          className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          placeholder="www.suaempresa.com.br"
                        />
                      </WizardField>

                      <WizardField label="Facebook">
                        <input
                          value={form.studio.contactFacebook}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              studio: { ...current.studio, contactFacebook: event.target.value },
                            }))
                          }
                          className="h-14 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          placeholder="/suaempresa"
                        />
                      </WizardField>
                    </div>
                  ) : null}

                  {wizardCurrent.id === "policies" ? (
                    <div className="space-y-6">
                      <WizardField label="Regras e políticas">
                        <textarea
                          value={form.studio.policies}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              studio: { ...current.studio, policies: event.target.value },
                            }))
                          }
                          rows={5}
                          className="w-full rounded-[24px] border border-zinc-800 bg-zinc-900 px-4 py-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          placeholder="Informe trocas, observações legais, cancelamentos ou regras importantes."
                        />
                      </WizardField>

                      <WizardField label="FAQ do agente">
                        <textarea
                          value={form.studio.faqItems}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              studio: { ...current.studio, faqItems: event.target.value },
                            }))
                          }
                          rows={6}
                          className="w-full rounded-[24px] border border-zinc-800 bg-zinc-900 px-4 py-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          placeholder={"Pergunta 1 :: Resposta 1\nPergunta 2 :: Resposta 2"}
                        />
                      </WizardField>

                      <WizardField label="Exemplos reais de conversas">
                        <textarea
                          value={form.studio.examples}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              studio: { ...current.studio, examples: event.target.value },
                            }))
                          }
                          rows={6}
                          className="w-full rounded-[24px] border border-zinc-800 bg-zinc-900 px-4 py-4 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          placeholder="Cole trechos de atendimentos que esse agente deve usar como referência."
                        />
                      </WizardField>
                    </div>
                  ) : null}

                  {wizardCurrent.id === "review" ? (
                    <div className="space-y-5">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <SummaryCard title="Nome">{form.name || "Sem nome"}</SummaryCard>
                        <SummaryCard title="Apresentação">{form.studio.presentationMode === "humano" ? "Humano" : "Assistente virtual"}</SummaryCard>
                        <SummaryCard title="Tom de voz">{toneLabels[form.studio.tone]}</SummaryCard>
                        <SummaryCard title="Pessoa atendida">{getAttendedPersonLabel(form.studio)}</SummaryCard>
                        <SummaryCard title="Empresa">{form.studio.companyName || "Não informada"}</SummaryCard>
                        <SummaryCard title="Forma de pagamento">{form.studio.paymentMethods.join(", ") || "Não informada"}</SummaryCard>
                      </div>

                      <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
                        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                          <PanelTop className="h-4 w-4 text-emerald-400" />
                          Prompt final gerado
                        </div>
                        <pre className="overflow-x-auto whitespace-pre-wrap text-sm leading-6 text-zinc-300">{generatedPreview.prompt}</pre>
                      </div>

                      <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5">
                        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                          <BookOpen className="h-4 w-4 text-emerald-400" />
                          Base de conhecimento embutida
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {generatedPreview.knowledgeBase.map((item) => (
                            <span key={item} className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-300">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-zinc-800 px-6 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <p className="text-sm text-zinc-500">
                      {wizardCurrent.id === "review"
                        ? "Revise esse resumo antes de salvar. Tudo será enviado para o Supabase."
                        : "Preencha o essencial e avance. Depois você pode refinar qualquer etapa."}
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      {editingAgent ? (
                        <button
                          type="button"
                          onClick={() => void handleDelete(editingAgent)}
                          disabled={saving}
                          className="flex h-11 items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => setShowWizard(false)}
                        className="flex h-11 items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
                      >
                        Cancelar
                      </button>

                      {wizardStep > 0 ? (
                        <button
                          type="button"
                          onClick={() => setWizardStep((current) => current - 1)}
                          className="flex h-11 items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-semibold text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
                        >
                          Voltar
                        </button>
                      ) : null}

                      {wizardCurrent.id === "review" ? (
                        <button
                          type="button"
                          onClick={() => void handleSave()}
                          disabled={saving}
                          className="flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:from-emerald-400 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          {saving ? "Salvando..." : "Salvar agente"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setWizardStep((current) => Math.min(current + 1, wizardSteps.length - 1))}
                          disabled={!canAdvance}
                          className="flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:from-emerald-400 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Avançar
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WizardField({
  label,
  children,
  required = false,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-white">
        {label}
        {required ? <span className="ml-1 text-emerald-300">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function OptionGrid({
  title,
  options,
  current,
  onSelect,
}: {
  title: string;
  options: { value: string; label: string; description: string }[];
  current: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-bold text-white">{title}</p>
      <div className="grid gap-3 lg:grid-cols-2">
        {options.map((option) => {
          const active = option.value === current;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={`rounded-[24px] border p-4 text-left transition ${
                active
                  ? "border-emerald-500/30 bg-emerald-500/10 ring-1 ring-emerald-500/20"
                  : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-base font-black ${active ? "text-white" : "text-zinc-200"}`}>{option.label}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">{option.description}</p>
                </div>
                <span className={`mt-1 h-4 w-4 rounded-full border ${active ? "border-emerald-400 bg-emerald-400" : "border-zinc-600"}`} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DetailCard({
  icon: Icon,
  title,
  content,
}: {
  icon: typeof Bot;
  title: string;
  content: string[];
}) {
  return (
    <div className="rounded-[24px] border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
        <Icon className="h-4 w-4 text-emerald-400" />
        {title}
      </div>
      <div className="space-y-2">
        {content.map((item) => (
          <p key={item} className="text-sm leading-6 text-zinc-400">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function DetailBlock({
  title,
  subtitle,
  icon,
  multiline = false,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-zinc-800 bg-zinc-900/70 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
        {icon}
        {title}
      </div>
      <p className={`text-sm leading-6 text-zinc-400 ${multiline ? "whitespace-pre-wrap" : ""}`}>{subtitle}</p>
    </div>
  );
}

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-zinc-800 bg-zinc-900/80 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">{title}</p>
      <div className="mt-2 text-lg font-bold text-white">{children}</div>
    </div>
  );
}
