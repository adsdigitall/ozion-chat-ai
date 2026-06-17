import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAIProvider, type AIMessage } from "@/lib/services/ai-router";
import { getRequestContext, publicServerError } from "@/lib/server/supabase-admin";

const chatInput = z.object({
  agentId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().min(1).max(30000),
  })).max(100).default([]),
  userMessage: z.string().trim().min(1).max(30000).optional(),
});

const providerEnvKeys: Record<string, string | undefined> = {
  openai: process.env.OPENAI_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  claude: process.env.CLAUDE_API_KEY,
  groq: process.env.GROQ_API_KEY,
  deepseek: process.env.DEEPSEEK_API_KEY,
  dify: process.env.DIFY_API_KEY,
};

function buildSystemPrompt(agent: {
  prompt: string;
  objective: string | null;
  rules: unknown;
  knowledge_base: unknown;
}) {
  const rules = Array.isArray(agent.rules) ? agent.rules.filter((item): item is string => typeof item === "string") : [];
  const knowledge = Array.isArray(agent.knowledge_base)
    ? agent.knowledge_base.filter((item): item is string => typeof item === "string")
    : [];
  return [
    agent.prompt,
    agent.objective ? `Objetivo: ${agent.objective}` : "",
    rules.length ? `Regras:\n${rules.map((rule) => `- ${rule}`).join("\n")}` : "",
    knowledge.length ? `Base de Conhecimento:\n${knowledge.join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
}

export async function POST(request: NextRequest) {
  try {
    const parsed = chatInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid AI request." }, { status: 400 });
    }

    const { admin, workspaceId } = await getRequestContext(request);
    const { data: agent, error: agentError } = await admin
      .from("ai_agents")
      .select("*")
      .eq("id", parsed.data.agentId)
      .eq("workspace_id", workspaceId)
      .single();
    if (agentError || !agent) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }
    if (agent.status !== "active") {
      return NextResponse.json({ error: "This agent is inactive." }, { status: 409 });
    }

    let apiKey = providerEnvKeys[agent.provider];
    const { data: integration } = await admin
      .from("integrations")
      .select("credentials,config")
      .eq("workspace_id", workspaceId)
      .eq("type", agent.provider)
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();
    const credentials = integration?.credentials && typeof integration.credentials === "object"
      ? integration.credentials as Record<string, unknown>
      : {};
    const config = integration?.config && typeof integration.config === "object"
      ? integration.config as Record<string, unknown>
      : {};
    if (typeof credentials.apiKey === "string") apiKey = credentials.apiKey;
    else if (typeof credentials.api_key === "string") apiKey = credentials.api_key;
    else if (typeof config.api_key === "string") apiKey = config.api_key;

    if (!apiKey) {
      return NextResponse.json({ error: `Configure a chave do provedor ${agent.provider} em Integrações.` }, { status: 409 });
    }

    let messages: AIMessage[] = parsed.data.messages;
    if (parsed.data.conversationId && messages.length === 0) {
      const { data: history, error: historyError } = await admin
        .from("messages")
        .select("sender,content")
        .eq("conversation_id", parsed.data.conversationId)
        .order("created_at", { ascending: true })
        .limit(50);
      if (historyError) throw historyError;
      messages = (history ?? [])
        .filter((message) => Boolean(message.content))
        .map((message) => ({
          role: message.sender === "contact" ? "user" : "assistant",
          content: message.content as string,
        }));
    }
    if (parsed.data.userMessage) messages = [...messages, { role: "user", content: parsed.data.userMessage }];
    if (!messages.length) return NextResponse.json({ error: "No messages provided." }, { status: 400 });

    const ai = createAIProvider(agent.provider, apiKey);
    const result = await ai.chat({
      system: buildSystemPrompt(agent),
      messages,
      temperature: Number(agent.temperature ?? 0.7),
      max_tokens: agent.max_tokens ?? 4096,
      model: agent.model ?? undefined,
    });

    if (parsed.data.conversationId && result.content) {
      const { data: conversation } = await admin
        .from("conversations")
        .select("id")
        .eq("id", parsed.data.conversationId)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (conversation) {
        await admin.from("messages").insert({
          conversation_id: conversation.id,
          content: result.content,
          type: "text",
          sender: "ai",
          sender_name: agent.name,
          read: false,
        });
        await admin.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversation.id);
      }
    }

    await admin
      .from("ai_agents")
      .update({ conversations_handled: (agent.conversations_handled ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", agent.id)
      .eq("workspace_id", workspaceId);

    return NextResponse.json(result);
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
