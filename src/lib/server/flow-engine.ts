import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAIProvider, type AIMessage } from "@/lib/services/ai-router";
import { ElevenLabsService } from "@/lib/services/elevenlabs";
import { sendMetaPurchaseEvent } from "@/lib/services/meta-ctwa";
import { WhatsAppService } from "@/lib/services/whatsapp";
import { slugifyTag } from "@/lib/server/tags";

type FlowConfig = Record<string, string | number | boolean>;
type FlowNode = {
  id: string;
  data?: {
    blockType?: string;
    config?: FlowConfig;
  };
};
type FlowEdge = {
  source: string;
  target: string;
  sourceHandle?: string | null;
};
type FlowRecord = {
  id: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
};
type ConversationRecord = {
  id: string;
  workspace_id: string;
  contact_id: string;
  phone_number: string | null;
  whatsapp_connection_id: string | null;
  metadata: Record<string, unknown> | null;
};

type SavedMessageType = "text" | "image" | "video" | "audio" | "document" | "template" | "flow";

const providerEnvKeys: Record<string, string | undefined> = {
  openai: process.env.OPENAI_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  claude: process.env.CLAUDE_API_KEY,
  groq: process.env.GROQ_API_KEY,
  deepseek: process.env.DEEPSEEK_API_KEY,
  dify: process.env.DIFY_API_KEY,
};

function interpolate(value: string, variables: Record<string, unknown>) {
  return value.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, key: string) => {
    const normalized = key.trim().replaceAll("-", "_");
    return String(variables[normalized] ?? variables[key.trim()] ?? "");
  });
}

function nextNode(flow: FlowRecord, nodeId: string, output?: string) {
  return flow.edges.find(
    (edge) =>
      edge.source === nodeId &&
      (!output || edge.sourceHandle === output || !edge.sourceHandle),
  )?.target;
}

function compare(actual: unknown, operator: string, expected: string) {
  const left = String(actual ?? "").toLowerCase();
  const right = expected.toLowerCase();
  if (operator === "not_equal") return left !== right;
  if (operator === "contains") return left.includes(right);
  if (operator === "starts_with") return left.startsWith(right);
  if (operator === "greater") return Number(actual) > Number(expected);
  if (operator === "less") return Number(actual) < Number(expected);
  return left === right;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonObject(value: string) {
  if (!value.trim()) return {};
  const parsed = JSON.parse(value) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {};
}

function parseHeaders(value: string) {
  const headers: Record<string, string> = {};
  for (const line of value.split(/\r?\n/)) {
    const [key, ...rest] = line.split(":");
    if (key?.trim() && rest.length) headers[key.trim()] = rest.join(":").trim();
  }
  return headers;
}

function getByPath(value: unknown, path: string) {
  if (!path || path === "$") return value;
  const parts = path.replace(/^\$\./, "").split(".").filter(Boolean);
  return parts.reduce<unknown>((current, key) => {
    if (current && typeof current === "object") {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, value);
}

async function saveOutgoingMessage(
  admin: SupabaseClient,
  conversationId: string,
  content: string,
  senderName: string,
  whatsappMessageId?: string,
  type: SavedMessageType = "text",
  mediaUrl?: string,
) {
  const { error } = await admin.from("messages").insert({
    conversation_id: conversationId,
    content,
    type,
    sender: "ai",
    sender_name: senderName,
    media_url: mediaUrl ?? null,
    read: false,
    whatsapp_message_id: whatsappMessageId ?? null,
  });
  if (error) throw error;
}

async function addContactTag(
  admin: SupabaseClient,
  workspaceId: string,
  customerId: string | null,
  contactId: string,
  tagName: string,
  color = "#f97316",
) {
  const cleanName = tagName.trim();
  if (!cleanName) return;
  const { data: tag, error: tagError } = await admin
    .from("tags")
    .upsert({ workspace_id: workspaceId, customer_id: customerId, name: cleanName, slug: slugifyTag(cleanName), color, category: "Funil", status: "active" }, { onConflict: "workspace_id,slug" })
    .select("id")
    .single();
  if (tagError) throw tagError;
  const { error } = await admin
    .from("contact_tags")
    .upsert({ workspace_id: workspaceId, customer_id: customerId, contact_id: contactId, tag_id: tag.id }, { onConflict: "contact_id,tag_id" });
  if (error) throw error;
}

async function removeContactTag(admin: SupabaseClient, workspaceId: string, contactId: string, tagName: string) {
  const cleanName = tagName.trim();
  if (!cleanName) return;
  const { data: tag, error: tagError } = await admin
    .from("tags")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("slug", slugifyTag(cleanName))
    .maybeSingle();
  if (tagError) throw tagError;
  if (!tag?.id) return;
  const { error } = await admin.from("contact_tags").delete().eq("workspace_id", workspaceId).eq("contact_id", contactId).eq("tag_id", tag.id);
  if (error) throw error;
}

async function contactHasTag(admin: SupabaseClient, workspaceId: string, contactId: string, tagName: string) {
  const { data, error } = await admin
    .from("contact_tags")
    .select("id,tag:tags!inner(slug)")
    .eq("workspace_id", workspaceId)
    .eq("contact_id", contactId)
    .eq("tag.slug", slugifyTag(tagName))
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.id);
}

async function loadAIResponse(
  admin: SupabaseClient,
  workspaceId: string,
  agentName: string,
  messages: AIMessage[],
) {
  let query = admin
    .from("ai_agents")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");
  if (agentName) query = query.ilike("name", agentName);
  const { data: agents, error } = await query.limit(1);
  if (error) throw error;
  const agent = agents?.[0];
  if (!agent) throw new Error("Nenhum agente de IA ativo foi encontrado.");

  const { data: integration } = await admin
    .from("integrations")
    .select("credentials")
    .eq("workspace_id", workspaceId)
    .eq("type", agent.provider)
    .eq("status", "connected")
    .maybeSingle();
  const apiKey =
    integration?.credentials?.apiKey ||
    integration?.credentials?.api_key ||
    providerEnvKeys[agent.provider];
  if (typeof apiKey !== "string" || !apiKey) {
    throw new Error(`Configure ${agent.provider} em Integrações.`);
  }

  const rules = Array.isArray(agent.rules) ? agent.rules.join("\n- ") : "";
  const knowledge = Array.isArray(agent.knowledge_base) ? agent.knowledge_base.join("\n") : "";
  const result = await createAIProvider(agent.provider, apiKey).chat({
    model: agent.model,
    temperature: Number(agent.temperature ?? 0.7),
    max_tokens: Number(agent.max_tokens ?? 1024),
    system: [agent.prompt, agent.objective, rules ? `Regras:\n- ${rules}` : "", knowledge].filter(Boolean).join("\n\n"),
    messages,
  });
  return { content: result.content, agentName: agent.name };
}

export async function executeConversationFlow({
  admin,
  conversationId,
  incomingText,
}: {
  admin: SupabaseClient;
  conversationId: string;
  incomingText: string;
}) {
  const { data: conversation, error: conversationError } = await admin
    .from("conversations")
    .select("id,workspace_id,contact_id,phone_number,whatsapp_connection_id,metadata")
    .eq("id", conversationId)
    .single();
  if (conversationError) throw conversationError;
  const currentConversation = conversation as ConversationRecord;

  const [{ data: contact, error: contactError }, { data: flowData, error: flowError }] =
    await Promise.all([
      admin.from("contacts").select("*").eq("id", currentConversation.contact_id).single(),
      admin
        .from("flows")
        .select("id,nodes,edges")
        .eq("workspace_id", currentConversation.workspace_id)
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
  if (contactError) throw contactError;
  if (flowError) throw flowError;
  if (!flowData) return { executed: false, reason: "no_published_flow" };
  const flow = flowData as FlowRecord;
  if (!flow.nodes.length) return { executed: false, reason: "empty_flow" };

  const metadata = currentConversation.metadata ?? {};
  const state =
    metadata.flow_state && typeof metadata.flow_state === "object"
      ? (metadata.flow_state as Record<string, unknown>)
      : {};
  const variables: Record<string, unknown> = {
    ...(state.variables && typeof state.variables === "object"
      ? (state.variables as Record<string, unknown>)
      : {}),
    ...contact,
    primeiro_nome: String(contact.name ?? "").split(" ")[0],
    resposta: incomingText,
    ultima_mensagem: incomingText,
  };

  let nodeId =
    typeof state.waitingNodeId === "string"
      ? nextNode(flow, state.waitingNodeId, "Respondeu")
      : flow.nodes.find((node) => !flow.edges.some((edge) => edge.target === node.id))?.id;
  if (!nodeId) nodeId = flow.nodes[0]?.id;

  const { data: connection } = currentConversation.whatsapp_connection_id
    ? await admin
        .from("whatsapp_connections")
        .select("*")
        .eq("id", currentConversation.whatsapp_connection_id)
        .maybeSingle()
    : { data: null };
  const whatsapp =
    connection?.access_token && connection?.phone_number_id
      ? new WhatsAppService({
          accessToken: connection.access_token,
          phoneNumberId: connection.phone_number_id,
          wabaId: connection.waba_id ?? "",
          businessId: connection.business_id ?? "",
          verifyToken: "",
          graphApiVersion: connection.config?.graph_api_version,
        })
      : null;
  const phone = currentConversation.phone_number || contact.phone;
  const visited = new Set<string>();
  const executed: string[] = [];
  let waitingNodeId: string | null = null;

  while (nodeId && executed.length < 30 && !visited.has(nodeId)) {
    visited.add(nodeId);
    const node = flow.nodes.find((item) => item.id === nodeId);
    if (!node) break;
    const type = node.data?.blockType ?? "";
    const config = node.data?.config ?? {};
    executed.push(node.id);
    let output: string | undefined;

    if (type === "content") {
      const message = interpolate(String(config.message ?? ""), variables);
      const contentType = String(config.contentType ?? "text");
      const mediaUrl = interpolate(String(config.mediaUrl ?? ""), variables);
      if (whatsapp && phone) {
        if (contentType === "image" && mediaUrl) {
          const result = await whatsapp.sendImage(phone, mediaUrl, message || undefined);
          await saveOutgoingMessage(admin, conversationId, message || "Imagem enviada", "Fluxo Ozion", result.messages?.[0]?.id, "image", mediaUrl);
        } else if (contentType === "audio" && mediaUrl) {
          const result = await whatsapp.sendAudio(phone, mediaUrl);
          await saveOutgoingMessage(admin, conversationId, message || "Áudio enviado", "Fluxo Ozion", result.messages?.[0]?.id, "audio", mediaUrl);
        } else if (contentType === "video" && mediaUrl) {
          const result = await whatsapp.sendVideo(phone, mediaUrl, message || undefined);
          await saveOutgoingMessage(admin, conversationId, message || "Vídeo enviado", "Fluxo Ozion", result.messages?.[0]?.id, "video", mediaUrl);
        } else if (contentType === "document" && mediaUrl) {
          const result = await whatsapp.sendDocument(phone, mediaUrl, message || undefined);
          await saveOutgoingMessage(admin, conversationId, message || "Documento enviado", "Fluxo Ozion", result.messages?.[0]?.id, "document", mediaUrl);
        } else if (message) {
          const result = await whatsapp.sendText(phone, message);
          await saveOutgoingMessage(admin, conversationId, message, "Fluxo Ozion", result.messages?.[0]?.id);
        }
      }
      output = "Próximo";
    } else if (type === "question" || type === "menu") {
      const message = interpolate(String(config.message ?? "Como posso ajudar?"), variables);
      if (whatsapp && phone) {
        const result = await whatsapp.sendText(phone, message);
        await saveOutgoingMessage(admin, conversationId, message, "Fluxo Ozion", result.messages?.[0]?.id);
      }
      waitingNodeId = node.id;
      break;
    } else if (type === "condition") {
      const field = String(config.field ?? "status");
      const source = String(config.source ?? "contact");
      const actual = source === "variable" ? variables[field] : contact[field];
      output = compare(actual, String(config.operator ?? "equal"), String(config.value ?? ""))
        ? "Verdadeiro"
        : "Falso";
    } else if (type === "action") {
      const action = String(config.action ?? "");
      const value = interpolate(String(config.value ?? ""), variables);
      if (action === "set_status") {
        await admin.from("contacts").update({ status: value }).eq("id", contact.id);
      } else if (action === "set_field" && config.field) {
        variables[String(config.field)] = value;
        await admin
          .from("contacts")
          .update({
            custom_fields: {
              ...((contact.custom_fields && typeof contact.custom_fields === "object") ? contact.custom_fields : {}),
              [String(config.field)]: value,
            },
          })
          .eq("id", contact.id);
      } else if (action === "add_tag") {
        await addContactTag(admin, currentConversation.workspace_id, contact.customer_id ?? null, contact.id, value || String(config.tag ?? "Tag"));
      } else if (action === "remove_tag") {
        await removeContactTag(admin, currentConversation.workspace_id, contact.id, value || String(config.tag ?? "Tag"));
      } else if (action === "pause_ai" || action === "handoff") {
        await admin
          .from("conversations")
          .update({
            status: "waiting",
            metadata: {
              ...metadata,
              ai_paused: true,
              handoff_reason: value || "Fluxo solicitou atendimento humano",
            },
          })
          .eq("id", conversationId);
        await saveOutgoingMessage(admin, conversationId, value || "Atendimento transferido para humano.", "Sistema", undefined, "flow");
      } else if (action === "close_conversation") {
        await admin.from("conversations").update({ status: "closed" }).eq("id", conversationId);
      }
      output = "Próximo";
    } else if (type === "add-tag") {
      await addContactTag(admin, currentConversation.workspace_id, contact.customer_id ?? null, contact.id, interpolate(String(config.tag ?? config.value ?? "Tag"), variables));
      output = "Próximo";
    } else if (type === "remove-tag") {
      await removeContactTag(admin, currentConversation.workspace_id, contact.id, interpolate(String(config.tag ?? config.value ?? "Tag"), variables));
      output = "Próximo";
    } else if (type === "has-tag") {
      const hasTag = await contactHasTag(admin, currentConversation.workspace_id, contact.id, interpolate(String(config.tag ?? config.value ?? "Tag"), variables));
      output = hasTag ? "Possui" : "Não possui";
    } else if (type === "delay") {
      const amount = Math.max(0, Number(config.amount ?? 0));
      const unit = String(config.unit ?? "segundos");
      const multiplier = unit.startsWith("min") ? 60_000 : unit.startsWith("hora") ? 3_600_000 : 1_000;
      const delayMs = amount * multiplier;
      if (delayMs > 0 && delayMs <= 15_000) await sleep(delayMs);
      variables.delay_requested_ms = delayMs;
      variables.delay_executed_inline = delayMs <= 15_000;
      output = "Próximo";
    } else if (type === "request") {
      try {
        const url = interpolate(String(config.url ?? ""), variables);
        if (!url) throw new Error("URL da requisição não configurada.");
        const method = String(config.method ?? "POST").toUpperCase();
        const headers = parseHeaders(interpolate(String(config.headers ?? ""), variables));
        const bodyText = interpolate(String(config.body ?? ""), variables);
        const response = await fetch(url, {
          method,
          headers,
          body: method === "GET" || method === "HEAD" ? undefined : bodyText || undefined,
        });
        const text = await response.text();
        let payload: unknown = text;
        try {
          payload = text ? JSON.parse(text) : null;
        } catch {
          payload = text;
        }
        variables.api_status = response.status;
        variables.api_response = payload;
        const responsePath = String(config.responsePath ?? "");
        if (responsePath) variables.api_data = getByPath(payload, responsePath);
        output = response.ok ? "Sucesso" : "Erro";
      } catch (requestError) {
        variables.api_error = requestError instanceof Error ? requestError.message : "Erro na requisição";
        output = "Erro";
      }
    } else if (type === "chatgpt" || type === "agent") {
      const { data: history } = await admin
        .from("messages")
        .select("sender,content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(40);
      const messages: AIMessage[] = (history ?? [])
        .filter((message) => message.content)
        .map((message) => ({
          role: message.sender === "contact" ? "user" : "assistant",
          content: String(message.content),
        }));
      const response = await loadAIResponse(
        admin,
        currentConversation.workspace_id,
        type === "agent" ? String(config.agent ?? "") : "",
        messages,
      );
      if (response.content && whatsapp && phone) {
        const result = await whatsapp.sendText(phone, response.content);
        await saveOutgoingMessage(admin, conversationId, response.content, response.agentName, result.messages?.[0]?.id);
      }
      output = type === "agent" ? "Finalizou" : "Sucesso";
    } else if (type === "meta-whatsapp-template") {
      if (whatsapp && phone) {
        const componentsText = interpolate(String(config.parameters ?? ""), variables);
        const components = componentsText ? Object.values(parseJsonObject(componentsText)) : undefined;
        const result = await whatsapp.sendTemplate(
          phone,
          String(config.template ?? ""),
          String(config.language ?? "pt_BR"),
          components,
        );
        await saveOutgoingMessage(admin, conversationId, String(config.template ?? "Template WhatsApp"), "Fluxo Ozion", result.messages?.[0]?.id, "template");
      }
      output = "Enviado";
    } else if (type === "elevenlabs") {
      try {
        const text = interpolate(String(config.text ?? variables.ultima_resposta_ia ?? ""), variables);
        const voiceId = String(config.voice_id ?? config.voiceId ?? config.voice ?? "");
        if (!text) throw new Error("Texto do bloco de voz não configurado.");
        if (!voiceId) throw new Error("Voice ID da ElevenLabs não configurado.");
        const { data: integration } = await admin
          .from("integrations")
          .select("credentials")
          .eq("workspace_id", currentConversation.workspace_id)
          .eq("type", "elevenlabs")
          .eq("status", "connected")
          .maybeSingle();
        const apiKey = integration?.credentials?.apiKey || integration?.credentials?.api_key || process.env.ELEVENLABS_API_KEY;
        if (typeof apiKey !== "string" || !apiKey) throw new Error("Configure ElevenLabs em Integrações.");
        if (whatsapp && phone) {
          const audio = await new ElevenLabsService(apiKey).generateSpeech(voiceId, text, {
            stability: Number(config.stability ?? 0.5),
            similarity_boost: Number(config.similarity ?? 0.75),
            style: Number(config.accent ?? 0),
          });
          const uploaded = await whatsapp.uploadMedia(audio, "audio/mpeg", "ozion-voice.mp3");
          const result = await whatsapp.sendAudio(phone, uploaded.id, "id");
          await saveOutgoingMessage(admin, conversationId, text, "Voice Studio", result.messages?.[0]?.id, "audio");
        }
        output = "Sucesso";
      } catch (voiceError) {
        variables.voice_error = voiceError instanceof Error ? voiceError.message : "Erro ao gerar voz";
        output = "Erro";
      }
    } else if (type === "ctwa") {
      const { data: integration } = await admin
        .from("integrations")
        .select("credentials,config")
        .eq("workspace_id", currentConversation.workspace_id)
        .eq("type", "meta_ctwa")
        .eq("status", "connected")
        .maybeSingle();
      const valueKey = String(config.value ?? "valor_compra");
      const value = Number(variables[valueKey] ?? config.value ?? 0);
      if (integration && phone && value > 0) {
        await sendMetaPurchaseEvent({
          config: {
            accessToken: String(integration.credentials.accessToken),
            adAccountId: String(integration.config.adAccountId),
            pixelId: String(integration.config.pixelId),
            testEventCode: integration.config.testEventCode || undefined,
          },
          phone,
          value,
          currency: String(config.currency ?? "BRL"),
        });
      }
      output = "Enviado";
    } else if (type === "office-hours") {
      const hour = Number(
        new Intl.DateTimeFormat("pt-BR", {
          hour: "2-digit",
          hour12: false,
          timeZone: String(config.timezone ?? "America/Sao_Paulo"),
        }).format(new Date()),
      );
      output =
        hour >= Number(String(config.start ?? "08:00").split(":")[0]) &&
        hour < Number(String(config.end ?? "18:00").split(":")[0])
          ? "Dentro do horário"
          : "Fora do horário";
    } else if (type === "split") {
      output = Math.random() * 100 < Number(config.branchA ?? 50) ? "Teste A" : "Teste B";
    } else {
      output = node.data?.config ? "Próximo" : undefined;
    }
    nodeId = nextNode(flow, node.id, output);
  }

  await admin
    .from("conversations")
    .update({
      flow_id: flow.id,
      metadata: {
        ...metadata,
        flow_state: {
          flowId: flow.id,
          waitingNodeId,
          variables,
          lastExecutedAt: new Date().toISOString(),
        },
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .eq("workspace_id", currentConversation.workspace_id);

  return { executed: true, flowId: flow.id, nodes: executed, waitingNodeId };
}
