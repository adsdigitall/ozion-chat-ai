"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  addEdge,
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  Edge,
  Handle,
  MarkerType,
  MiniMap,
  Node,
  NodeProps,
  Position,
  ReactFlowInstance,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  BellRing,
  Bot,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  Copy,
  FileText,
  Menu,
  MessageCircleQuestion,
  MessageSquareText,
  Mic2,
  Play,
  Plus,
  Save,
  Send,
  Settings2,
  Sparkles,
  Split,
  Tag,
  Trash2,
  UsersRound,
  Webhook,
  X,
  Zap,
} from "lucide-react";

type FlowBlockType =
  | "menu"
  | "content"
  | "question"
  | "action"
  | "add-tag"
  | "remove-tag"
  | "has-tag"
  | "delay"
  | "office-hours"
  | "condition"
  | "notify-member"
  | "split"
  | "attendant-distribution"
  | "request"
  | "chatgpt"
  | "agent"
  | "elevenlabs"
  | "note"
  | "meta-whatsapp-template"
  | "ctwa";

type FlowNodeData = {
  blockType: FlowBlockType;
  label: string;
  description: string;
  color: string;
  outputs: string[];
  config: Record<string, string | number | boolean>;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
};

type FlowDocument = {
  id?: string;
  name: string;
  status: "draft" | "published";
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  updatedAt: string;
};

type BlockDefinition = {
  type: FlowBlockType;
  label: string;
  description: string;
  color: string;
  icon: typeof Menu;
  outputs: string[];
  defaults: Record<string, string | number | boolean>;
};

const STORAGE_KEY = "ozion.flow-builder.v1";

const BLOCKS: BlockDefinition[] = [
  { type: "menu", label: "Menu", description: "Opções em texto ou botões oficiais", color: "#0d9488", icon: Menu, outputs: ["Opção 1", "Opção 2", "Inválida", "Expirou"], defaults: { message: "Escolha uma opção", mode: "interactive_buttons", options: "Opção 1, Opção 2", expiresIn: "1 hora" } },
  { type: "content", label: "Conteúdo", description: "Texto, imagem, áudio, vídeo ou documento", color: "#7c3aed", icon: MessageSquareText, outputs: ["Próximo"], defaults: { contentType: "text", message: "Digite sua mensagem", delay: 0, mediaUrl: "" } },
  { type: "question", label: "Pergunta", description: "Pergunta e armazenamento da resposta", color: "#ea580c", icon: MessageCircleQuestion, outputs: ["Respondeu", "Expirou"], defaults: { message: "Qual é o seu nome?", saveAs: "resposta", expiresIn: "1 hora" } },
  { type: "action", label: "Ação", description: "Contato, etiqueta, conversa ou outro fluxo", color: "#4f46e5", icon: Zap, outputs: ["Próximo"], defaults: { action: "add_label", value: "", field: "" } },
  { type: "add-tag", label: "Adicionar Tag", description: "Aplicar etiqueta no contato atual", color: "#10b981", icon: Tag, outputs: ["Próximo"], defaults: { tag: "Novo Lead" } },
  { type: "remove-tag", label: "Remover Tag", description: "Remover etiqueta do contato atual", color: "#ef4444", icon: Tag, outputs: ["Próximo"], defaults: { tag: "Risco" } },
  { type: "has-tag", label: "Verificar Tag", description: "Direcionar fluxo se o contato possui etiqueta", color: "#06b6d4", icon: Tag, outputs: ["Possui", "Não possui"], defaults: { tag: "Qualificado" } },
  { type: "delay", label: "Delay", description: "Aguardar período fixo ou inteligente", color: "#64748b", icon: Clock3, outputs: ["Próximo"], defaults: { amount: 10, unit: "segundos", presence: "typing" } },
  { type: "office-hours", label: "Expediente", description: "Dias, horários e fuso de atendimento", color: "#ca8a04", icon: Clock3, outputs: ["Dentro do horário", "Fora do horário"], defaults: { timezone: "America/Sao_Paulo", days: "Seg-Sex", start: "08:00", end: "18:00" } },
  { type: "condition", label: "Condição", description: "Regras sobre contato, campos e horário", color: "#dc2626", icon: CheckCircle2, outputs: ["Verdadeiro", "Falso"], defaults: { match: "all", source: "contact", field: "status", operator: "equal", value: "qualified" } },
  { type: "notify-member", label: "Notificar Atendente", description: "Enviar dados para um atendente", color: "#2563eb", icon: BellRing, outputs: ["Próximo"], defaults: { mode: "automatic", member: "Todos disponíveis", message: "Novo contato aguardando atendimento." } },
  { type: "split", label: "Divisão", description: "Teste A/B e distribuição percentual", color: "#db2777", icon: Split, outputs: ["Teste A", "Teste B"], defaults: { branchA: 50, branchB: 50, responseMode: "typing" } },
  { type: "attendant-distribution", label: "Divisão de Atendentes", description: "Distribuição entre atendentes disponíveis", color: "#0284c7", icon: UsersRound, outputs: ["Distribuído", "Ninguém disponível"], defaults: { strategy: "round_robin", members: "Todos disponíveis", fallback: "continuar_fluxo" } },
  { type: "request", label: "API Request", description: "Requisição externa e mapeamento JSONPath", color: "#059669", icon: Webhook, outputs: ["Sucesso", "Erro"], defaults: { method: "POST", url: "https://api.exemplo.com/webhook", headers: "Content-Type: application/json", body: "{}", responsePath: "$.data" } },
  { type: "chatgpt", label: "GPT", description: "Prompt, contexto, imagem e resultado", color: "#16a34a", icon: Sparkles, outputs: ["Sucesso", "Erro"], defaults: { model: "gpt-4o-mini", prompt: "Responda ao contato de forma objetiva.", temperature: 0.2, maxTokens: 256, context: true, readImage: false, saveAs: "resposta_gpt" } },
  { type: "agent", label: "Agente IA", description: "Agente com conhecimento e rotas", color: "#9333ea", icon: Bot, outputs: ["Finalizou", "Sem resposta", "Erro"], defaults: { agent: "Agente comercial", model: "gpt-4o", searchWeb: false, searchFiles: true, readImage: true, delay: "Sem atraso", expiresIn: "1 hora" } },
  { type: "elevenlabs", label: "Voice Studio", description: "Transformar texto em áudio natural", color: "#db2777", icon: Mic2, outputs: ["Sucesso", "Erro"], defaults: { text: "Olá, {{primeiro-nome}}!", voice: "Voz principal", stability: 0.5, similarity: 0.7, accent: 0.5, speed: 1 } },
  { type: "note", label: "Anotação", description: "Documentação visual sem execução", color: "#475569", icon: FileText, outputs: [], defaults: { text: "Escreva uma anotação para sua equipe." } },
  { type: "meta-whatsapp-template", label: "Template WhatsApp", description: "Template oficial aprovado pela Meta", color: "#128c7e", icon: Send, outputs: ["Enviado"], defaults: { connection: "Número oficial", template: "Selecione um template", language: "pt_BR", parameters: "", expiresIn: "24 horas" } },
  { type: "ctwa", label: "CTWA", description: "Comunicar compra realizada à Meta", color: "#1877f2", icon: CircleDollarSign, outputs: ["Enviado"], defaults: { valueSource: "flow_field", value: "valor_compra", currency: "BRL", markWaitingPayment: false } },
];

const INITIAL_NODES: Node<FlowNodeData>[] = [
  {
    id: "trigger-1",
    type: "flowBlock",
    position: { x: 80, y: 220 },
    data: {
      blockType: "content",
      label: "Mensagem recebida",
      description: "Ao receber qualquer mensagem",
      color: "#22c55e",
      outputs: ["Iniciar"],
      config: { trigger: "any_message" },
    },
  },
  {
    id: "condition-1",
    type: "flowBlock",
    position: { x: 430, y: 180 },
    data: {
      ...BLOCKS.find((block) => block.type === "condition")!,
      blockType: "condition",
      config: { match: "all", source: "contact", field: "label", operator: "equal", value: "NOVO LEAD" },
    },
  },
  {
    id: "content-1",
    type: "flowBlock",
    position: { x: 800, y: 80 },
    data: {
      ...BLOCKS.find((block) => block.type === "content")!,
      blockType: "content",
      config: { contentType: "text", message: "Olá, {{primeiro-nome}}! Como posso ajudar?", delay: 2, mediaUrl: "" },
    },
  },
  {
    id: "agent-1",
    type: "flowBlock",
    position: { x: 800, y: 360 },
    data: {
      ...BLOCKS.find((block) => block.type === "agent")!,
      blockType: "agent",
      config: { agent: "Agente comercial", model: "gpt-4o", searchWeb: false, searchFiles: true, readImage: true, delay: "Sem atraso", expiresIn: "1 hora" },
    },
  },
];

const INITIAL_EDGES: Edge[] = [
  { id: "e-trigger-condition", source: "trigger-1", target: "condition-1", sourceHandle: "Iniciar", animated: true },
  { id: "e-condition-content", source: "condition-1", target: "content-1", sourceHandle: "Verdadeiro", label: "Verdadeiro" },
  { id: "e-condition-agent", source: "condition-1", target: "agent-1", sourceHandle: "Falso", label: "Falso" },
];

function FlowBlockNode({ id, data, selected }: NodeProps<FlowNodeData>) {
  const Icon = BLOCKS.find((block) => block.type === data.blockType)?.icon ?? Zap;

  return (
    <div className={`min-w-[250px] overflow-hidden rounded-xl border bg-zinc-950 shadow-xl ${selected ? "ring-2 ring-emerald-400" : "border-zinc-700"}`}>
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-zinc-950 !bg-zinc-300" />
      <div className="flex items-center justify-between px-3 py-2 text-white" style={{ backgroundColor: data.color }}>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="text-sm font-semibold">{data.label}</span>
        </div>
        <div className="nodrag flex items-center gap-1">
          <button aria-label="Duplicar bloco" onClick={() => data.onDuplicate?.(id)} className="rounded p-1 hover:bg-black/20"><Copy className="h-3.5 w-3.5" /></button>
          <button aria-label="Editar bloco" onClick={() => data.onEdit?.(id)} className="rounded p-1 hover:bg-black/20"><Settings2 className="h-3.5 w-3.5" /></button>
          {id !== "trigger-1" && <button aria-label="Excluir bloco" onClick={() => data.onDelete?.(id)} className="rounded p-1 hover:bg-black/20"><Trash2 className="h-3.5 w-3.5" /></button>}
        </div>
      </div>
      <div className="px-3 py-3">
        <p className="text-xs text-zinc-400">{data.description}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Object.entries(data.config).slice(0, 3).map(([key, value]) => (
            <span key={key} className="max-w-[210px] truncate rounded-full bg-zinc-800 px-2 py-1 text-[10px] text-zinc-300">
              {String(value)}
            </span>
          ))}
        </div>
      </div>
      {data.outputs.map((output, index) => (
        <div key={output} className="relative border-t border-zinc-800 px-3 py-2 text-[11px] text-zinc-400">
          {output}
          <Handle
            id={output}
            type="source"
            position={Position.Right}
            style={{ top: 86 + index * 33 }}
            className="!h-3 !w-3 !border-2 !border-zinc-950"
            title={output}
          />
        </div>
      ))}
    </div>
  );
}

const NODE_TYPES = { flowBlock: FlowBlockNode };

function FieldEditor({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string | number | boolean;
  onChange: (value: string | number | boolean) => void;
}) {
  const label = name.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());

  if (typeof value === "boolean") {
    return (
      <label className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300">
        {label}
        <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-emerald-500" />
      </label>
    );
  }

  const multiline = ["message", "prompt", "text", "body", "headers", "parameters", "options"].includes(name);
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</span>
      {multiline ? (
        <textarea value={String(value)} onChange={(event) => onChange(event.target.value)} rows={4} className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />
      ) : (
        <input type={typeof value === "number" ? "number" : "text"} value={String(value)} onChange={(event) => onChange(typeof value === "number" ? Number(event.target.value) : event.target.value)} className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-emerald-500" />
      )}
    </label>
  );
}

function FlowBuilder() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const nextNodeIdRef = useRef(1);
  const [instance, setInstance] = useState<ReactFlowInstance<Node<FlowNodeData>, Edge> | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(true);
  const [flowName, setFlowName] = useState("Funil principal WhatsApp");
  const [flowId, setFlowId] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [savedMessage, setSavedMessage] = useState("Alterações locais");
  const [testOpen, setTestOpen] = useState(false);
  const [testMessage, setTestMessage] = useState("Olá, quero saber mais.");
  const [testConversationId, setTestConversationId] = useState("");
  const [testConversations, setTestConversations] = useState<Array<{ id: string; contact?: { name?: string; phone?: string } }>>([]);
  const [testResult, setTestResult] = useState("");

  const decorateNodes = useCallback(
    (items: Node<FlowNodeData>[]) =>
      items.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onEdit: setSelectedNodeId,
          onDuplicate: (id: string) => {
            setNodes((current) => {
              const source = current.find((item) => item.id === id);
              if (!source) return current;
              const cloneId = `${source.data.blockType}-${Date.now()}`;
              return [...current, { ...source, id: cloneId, selected: false, position: { x: source.position.x + 50, y: source.position.y + 70 }, data: { ...source.data, config: { ...source.data.config } } }];
            });
          },
          onDelete: (id: string) => {
            setNodes((current) => current.filter((item) => item.id !== id));
            setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id));
            setSelectedNodeId((current) => (current === id ? null : current));
          },
        },
      })),
    [setEdges, setNodes]
  );

  useEffect(() => {
    const hydrationId = window.setTimeout(async () => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const document = JSON.parse(saved) as FlowDocument;
          setFlowId(document.id ?? null);
          setFlowName(document.name);
          setStatus(document.status);
          setNodes(decorateNodes(document.nodes));
          setEdges(document.edges);
          setSavedMessage(`Salvo em ${new Date(document.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`);
        } catch {
          setNodes((current) => decorateNodes(current));
        }
      } else {
        setNodes((current) => decorateNodes(current));
      }

      try {
        const response = await fetch("/api/flows", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Falha ao carregar fluxos.");
        const remote = result.flows?.[0];
        if (remote) {
          setFlowId(remote.id);
          setFlowName(remote.name);
          setStatus(remote.status);
          setNodes(decorateNodes(remote.nodes?.length ? remote.nodes : INITIAL_NODES));
          setEdges(remote.edges?.length ? remote.edges : INITIAL_EDGES);
          setSavedMessage("Sincronizado com o banco");
        }
      } catch {
        setSavedMessage(saved ? "Usando rascunho local" : "Modo local");
      }
    }, 0);

    return () => window.clearTimeout(hydrationId);
  }, [decorateNodes, setEdges, setNodes]);

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            id: `edge-${Date.now()}`,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: "#10b981", strokeWidth: 2 },
            label: connection.sourceHandle ?? undefined,
          },
          current
        )
      ),
    [setEdges]
  );

  function createNode(block: BlockDefinition, position?: { x: number; y: number }) {
      const sequence = nodes.length + nextNodeIdRef.current++;
    const id = `${block.type}-${sequence}`;
    const nextNode: Node<FlowNodeData> = {
      id,
      type: "flowBlock",
      position: position ?? { x: 300 + (sequence % 4) * 70, y: 180 + (sequence % 5) * 65 },
      data: {
        blockType: block.type,
        label: block.label,
        description: block.description,
        color: block.color,
        outputs: block.outputs,
        config: { ...block.defaults },
      },
    };
    setNodes((current) => decorateNodes([...current, nextNode]));
    setSelectedNodeId(id);
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/ozion-flow-block") as FlowBlockType;
    const block = BLOCKS.find((item) => item.type === type);
    if (!block || !instance || !wrapperRef.current) return;
    const bounds = wrapperRef.current.getBoundingClientRect();
    const position = instance.project({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
    createNode(block, position);
  }

  function updateSelectedConfig(key: string, value: string | number | boolean) {
    if (!selectedNodeId) return;
    setNodes((current) =>
      decorateNodes(
        current.map((node) =>
          node.id === selectedNodeId
            ? { ...node, data: { ...node.data, config: { ...node.data.config, [key]: value } } }
            : node
        )
      )
    );
  }

  async function saveFlow(nextStatus: "draft" | "published" = status) {
    const document: FlowDocument = {
      id: flowId ?? undefined,
      name: flowName,
      status: nextStatus,
      nodes: nodes.map((node) => ({ ...node, data: { ...node.data, onEdit: undefined, onDuplicate: undefined, onDelete: undefined } })),
      edges,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
    setStatus(nextStatus);
    setSavedMessage("Salvando...");

    try {
      const response = await fetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: flowId ?? undefined,
          name: document.name,
          status: document.status,
          nodes: document.nodes,
          edges: document.edges,
          trigger_type: "flow",
          trigger_config: {},
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha ao salvar fluxo.");
      setFlowId(result.flow.id);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...document, id: result.flow.id }));
      setSavedMessage(nextStatus === "published" ? "Fluxo publicado" : "Rascunho salvo no banco");
    } catch {
      setSavedMessage(nextStatus === "published" ? "Publicado apenas localmente" : "Rascunho salvo localmente");
    }
  }

  async function openTest() {
    setTestOpen(true);
    setTestResult("");
    try {
      const response = await fetch("/api/conversations", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Falha ao carregar conversas.");
      setTestConversations(payload.conversations ?? []);
      setTestConversationId(payload.conversations?.[0]?.id ?? "");
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : "Falha ao carregar conversas.");
    }
  }

  async function runTest() {
    if (!testConversationId) {
      setTestResult("Crie ou receba uma conversa antes de testar o fluxo.");
      return;
    }
    setTestResult("Executando...");
    const response = await fetch("/api/flows/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: testConversationId, message: testMessage }),
    });
    const payload = await response.json();
    setTestResult(
      response.ok
        ? `Fluxo executado: ${payload.nodes?.length ?? 0} blocos${payload.waitingNodeId ? " e aguardando resposta" : ""}.`
        : payload.error ?? "Falha ao executar.",
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] min-h-[680px] flex-col bg-zinc-950">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => { window.location.href = "/dashboard"; }} className="rounded-lg border border-zinc-800 p-2 text-zinc-400 hover:bg-zinc-800"><ChevronLeft className="h-4 w-4" /></button>
          <div className="min-w-0">
            <input value={flowName} onChange={(event) => setFlowName(event.target.value)} className="w-full min-w-[240px] border-0 bg-transparent text-base font-semibold text-white outline-none" />
            <p className="text-xs text-zinc-500">{savedMessage} · {nodes.length} blocos · {edges.length} conexões</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs ${status === "published" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-300"}`}>
            {status === "published" ? "Publicado" : "Rascunho"}
          </span>
          <button onClick={() => void openTest()} className="flex h-9 items-center gap-2 rounded-lg border border-zinc-700 px-3 text-sm text-zinc-300 hover:bg-zinc-800"><Play className="h-4 w-4" /> Testar</button>
          <button onClick={() => saveFlow("draft")} className="flex h-9 items-center gap-2 rounded-lg border border-zinc-700 px-3 text-sm text-zinc-300 hover:bg-zinc-800"><Save className="h-4 w-4" /> Salvar</button>
          <button onClick={() => saveFlow("published")} className="flex h-9 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-medium text-white hover:bg-emerald-600"><Zap className="h-4 w-4" /> Publicar</button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className={`${catalogOpen ? "w-[310px]" : "w-16"} shrink-0 overflow-hidden border-r border-zinc-800 bg-zinc-950 transition-all`}>
          <div className="flex items-center justify-between border-b border-zinc-800 p-3">
            {catalogOpen && <div><h2 className="text-sm font-semibold text-white">Blocos</h2><p className="text-xs text-zinc-500">Arraste ou clique para adicionar</p></div>}
            <button onClick={() => setCatalogOpen((open) => !open)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800">{catalogOpen ? <X className="h-4 w-4" /> : <Plus className="h-5 w-5" />}</button>
          </div>
          {catalogOpen && (
            <div className="h-full space-y-2 overflow-y-auto p-3 pb-24">
              {BLOCKS.map((block) => (
                <button
                  key={block.type}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/ozion-flow-block", block.type);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => createNode(block)}
                  className="group flex w-full cursor-grab items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-left hover:border-zinc-600 hover:bg-zinc-900 active:cursor-grabbing"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: block.color }}><block.icon className="h-4 w-4" /></span>
                  <span className="min-w-0"><span className="block text-sm font-medium text-zinc-200">{block.label}</span><span className="block truncate text-xs text-zinc-500">{block.description}</span></span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <div ref={wrapperRef} className="relative min-w-0 flex-1" onDrop={onDrop} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setInstance}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            fitView
            minZoom={0.2}
            maxZoom={1.6}
            defaultEdgeOptions={{ markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: "#10b981", strokeWidth: 2 } }}
            deleteKeyCode={["Backspace", "Delete"]}
          >
            <Background variant={BackgroundVariant.Dots} color="#3f3f46" gap={22} size={1} />
            <Controls className="!border-zinc-700 !bg-zinc-900 !fill-white" />
            <MiniMap nodeColor={(node) => (node.data as FlowNodeData).color} className="!border !border-zinc-800 !bg-zinc-950" maskColor="rgba(9,9,11,.65)" />
          </ReactFlow>
        </div>

        {selectedNode && (
          <aside className="w-[360px] shrink-0 overflow-y-auto border-l border-zinc-800 bg-zinc-900 p-4">
            <div className="mb-5 flex items-start justify-between">
              <div><p className="text-xs font-medium uppercase tracking-wider text-emerald-400">Configuração</p><h2 className="mt-1 text-lg font-semibold text-white">{selectedNode.data.label}</h2><p className="mt-1 text-xs text-zinc-500">{selectedNode.data.description}</p></div>
              <button onClick={() => setSelectedNodeId(null)} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              {Object.entries(selectedNode.data.config).map(([key, value]) => <FieldEditor key={key} name={key} value={value} onChange={(nextValue) => updateSelectedConfig(key, nextValue)} />)}
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <p className="text-xs font-medium text-zinc-300">Saídas do bloco</p>
                <div className="mt-2 space-y-2">
                  {selectedNode.data.outputs.length ? selectedNode.data.outputs.map((output) => <div key={output} className="flex items-center gap-2 text-xs text-zinc-500"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedNode.data.color }} />{output}</div>) : <p className="text-xs text-zinc-600">Este bloco não participa da execução.</p>}
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
      {testOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="mb-5 flex items-start justify-between">
              <div><h2 className="text-lg font-semibold text-white">Testar fluxo publicado</h2><p className="mt-1 text-sm text-zinc-500">O teste usa uma conversa real e pode enviar mensagem pelo número oficial conectado.</p></div>
              <button onClick={() => setTestOpen(false)}><X className="h-5 w-5 text-zinc-500" /></button>
            </div>
            <div className="space-y-4">
              <label className="block"><span className="mb-2 block text-sm text-zinc-300">Conversa</span><select value={testConversationId} onChange={(event) => setTestConversationId(event.target.value)} className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white"><option value="">Selecione uma conversa</option>{testConversations.map((conversation) => <option key={conversation.id} value={conversation.id}>{conversation.contact?.name ?? conversation.contact?.phone ?? conversation.id}</option>)}</select></label>
              <label className="block"><span className="mb-2 block text-sm text-zinc-300">Mensagem de entrada</span><textarea rows={3} value={testMessage} onChange={(event) => setTestMessage(event.target.value)} className="w-full rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm text-white" /></label>
              {testResult && <p className="text-sm text-zinc-300">{testResult}</p>}
              <button onClick={() => void runTest()} className="h-10 w-full rounded-lg bg-emerald-500 text-sm font-medium text-white">Executar agora</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FlowsPage() {
  return <ReactFlowProvider><FlowBuilder /></ReactFlowProvider>;
}
