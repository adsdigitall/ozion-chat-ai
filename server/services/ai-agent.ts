// @ts-nocheck
import { getSupabase } from '../db/supabase.js';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

// ─── AI Provider Selection ─────────────────────────────────────
type AIProvider = 'groq' | 'openai' | 'deepseek';

function getProvider(): { provider: AIProvider; apiKey: string; model: string; baseUrl: string } {
  if (GROQ_API_KEY) return { provider: 'groq', apiKey: GROQ_API_KEY, model: 'llama-3.3-70b-versatile', baseUrl: 'https://api.groq.com/openai/v1' };
  if (OPENAI_API_KEY) return { provider: 'openai', apiKey: OPENAI_API_KEY, model: 'gpt-4o-mini', baseUrl: 'https://api.openai.com/v1' };
  if (DEEPSEEK_API_KEY) return { provider: 'deepseek', apiKey: DEEPSEEK_API_KEY, model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com/v1' };
  throw new Error('No AI provider configured');
}

// ─── Tool Definitions ──────────────────────────────────────────
const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'update_contact',
      description: 'Atualiza informações do contato no CRM (nome, tags, stage do pipeline, campos personalizados)',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'ID do contato' },
          name: { type: 'string', description: 'Nome do contato' },
          stage: { type: 'string', enum: ['Novo Lead', 'Qualificado', 'Proposta Enviada', 'Negociação', 'Fechado Ganho', 'Fechado Perdido'], description: 'Stage do pipeline' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags para adicionar ao contato' },
          custom_fields: { type: 'object', description: 'Campos personalizados para atualizar' },
        },
        required: ['contact_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_activity',
      description: 'Cria um registro de atividade/log no CRM',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'ID do contato' },
          action: { type: 'string', description: 'Descrição da ação realizada' },
          type: { type: 'string', enum: ['note', 'call', 'email', 'task', 'meeting'], description: 'Tipo de atividade' },
        },
        required: ['contact_id', 'action'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'transfer_to_human',
      description: 'Transfere a conversa para um atendente humano. Use quando o cliente pedir atendimento humano, demonstrar frustração, ou quando não conseguir resolver o problema.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Motivo da transferência' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Prioridade do atendimento' },
        },
        required: ['reason'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_knowledge',
      description: 'Busca na base de conhecimento da empresa para encontrar informações sobre produtos, serviços, preços, políticas, etc.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Termos de busca' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'schedule_appointment',
      description: 'Cria um agendamento/perfil no sistema',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'ID do contato' },
          title: { type: 'string', description: 'Título do agendamento' },
          date: { type: 'string', description: 'Data no formato YYYY-MM-DD' },
          time: { type: 'string', description: 'Horário no formato HH:MM' },
          notes: { type: 'string', description: 'Observações' },
        },
        required: ['contact_id', 'title', 'date', 'time'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'send_whatsapp_message',
      description: 'Envia uma mensagem de WhatsApp para o contato (útil para follow-ups automáticos)',
      parameters: {
        type: 'object',
        properties: {
          contact_id: { type: 'string', description: 'ID do contato' },
          message: { type: 'string', description: 'Mensagem a enviar' },
          delay_minutes: { type: 'number', description: 'Minutos de atraso antes do envio (0 = imediato)' },
        },
        required: ['contact_id', 'message'],
      },
    },
  },
];

// ─── Tool Execution ────────────────────────────────────────────
async function executeTool(toolName: string, args: any, context: { contactId: string; conversationId: string; tenantId: string }): Promise<string> {
  const sb = getSupabase();

  switch (toolName) {
    case 'update_contact': {
      const updates: any = {};
      if (args.name) updates.name = args.name;
      if (args.stage) updates.pipeline_stage = args.stage;
      if (args.tags) {
        const { data: contact } = await sb.from('contacts').select('tags').eq('id', args.contact_id || context.contactId).single();
        const existingTags = contact?.tags || [];
        updates.tags = [...new Set([...existingTags, ...args.tags])];
      }
      if (args.custom_fields) {
        const { data: contact } = await sb.from('contacts').select('custom_fields').eq('id', args.contact_id || context.contactId).single();
        updates.custom_fields = { ...(contact?.custom_fields || {}), ...args.custom_fields };
      }
      await sb.from('contacts').update(updates).eq('id', args.contact_id || context.contactId);
      return `Contato atualizado: ${Object.keys(updates).join(', ')}`;
    }

    case 'create_activity': {
      await sb.from('logs').insert({
        conversation_id: context.conversationId,
        contact_id: args.contact_id || context.contactId,
        action: args.action,
        entity: args.type || 'note',
        tenant_id: context.tenantId,
      });
      return `Atividade registrada: ${args.action}`;
    }

    case 'transfer_to_human': {
      await sb.from('conversations').update({
        status: 'waiting_human',
        assigned_operator: null,
        transfer_reason: args.reason,
      }).eq('id', context.conversationId);

      // Log the transfer
      await sb.from('logs').insert({
        conversation_id: context.conversationId,
        contact_id: context.contactId,
        action: `Transferência para humano: ${args.reason}`,
        entity: 'transfer',
        tenant_id: context.tenantId,
      });

      return `Conversa transferida para humano. Motivo: ${args.reason}. Prioridade: ${args.priority || 'medium'}`;
    }

    case 'search_knowledge': {
      // Simple keyword search in knowledge base
      const { data: kb } = await sb.from('modules')
        .select('*')
        .eq('type', 'knowledge_base')
        .ilike('content', `%${args.query}%`)
        .limit(3);

      if (kb && kb.length > 0) {
        return kb.map((k: any) => k.content?.substring(0, 500)).join('\n---\n');
      }
      return 'Nenhuma informação encontrada na base de conhecimento.';
    }

    case 'schedule_appointment': {
      await sb.from('logs').insert({
        conversation_id: context.conversationId,
        contact_id: args.contact_id || context.contactId,
        action: `Agendamento: ${args.title} em ${args.date} às ${args.time}. ${args.notes || ''}`,
        entity: 'appointment',
        tenant_id: context.tenantId,
      });
      return `Agendamento criado: ${args.title} - ${args.date} ${args.time}`;
    }

    case 'send_whatsapp_message': {
      // Queue the message for sending
      await sb.from('logs').insert({
        conversation_id: context.conversationId,
        contact_id: args.contact_id || context.contactId,
        action: `Mensagem agendada: ${args.message.substring(0, 100)}...`,
        entity: 'scheduled_message',
        tenant_id: context.tenantId,
      });
      return args.delay_minutes
        ? `Mensagem agendada para ${args.delay_minutes} minutos.`
        : `Mensagem enviada.`;
    }

    default:
      return `Ferramenta desconhecida: ${toolName}`;
  }
}

// ─── Main AI Agent ─────────────────────────────────────────────
export interface AgentContext {
  contactId: string;
  conversationId: string;
  tenantId: string;
  contactName: string;
  contactPhone: string;
  pipelineStage: string;
  conversationHistory: Array<{ role: string; content: string; type?: string }>;
  systemPrompt?: string;
  knowledgeBase?: string;
}

export interface AgentResponse {
  text: string;
  actions: Array<{ tool: string; args: any; result: string }>;
  needsAudio: boolean;
  shouldTransfer: boolean;
  transferReason?: string;
  model: string;
  provider: string;
}

export async function processWithAI(context: AgentContext): Promise<AgentResponse> {
  const { provider, apiKey, model, baseUrl } = getProvider();
  const sb = getSupabase();

  // Build system prompt
  const defaultPrompt = `Você é Ozion, atendente virtual inteligente da empresa dentro da plataforma Ozionchat.ia.

Personalidade: calorosa, profissional, paciente, proativa e humana. Use linguagem natural do dia a dia brasileiro. Evite soar robótica.

Você tem acesso a ferramentas via function calling para:
- Atualizar informações do contato (update_contact)
- Criar registros de atividade (create_activity)
- Transferir para humano (transfer_to_human)
- Buscar na base de conhecimento (search_knowledge)
- Criar agendamentos (schedule_appointment)
- Enviar mensagens de follow-up (send_whatsapp_message)

Regras:
- Sempre confirme dados sensíveis antes de executar ações
- Mantenha o contexto completo da conversa
- Responda em português do Brasil
- Se o cliente demonstrar frustração ou pedir humano, transfira imediatamente
- Use as ferramentas quando apropriado (atualizar CRM, criar atividades, etc.)
- Seja concisa mas completa nas respostas
- Máximo de 2 frases por resposta para WhatsApp`;

  const systemMessage = context.systemPrompt || defaultPrompt;
  const kbContext = context.knowledgeBase ? `\n\nBase de conhecimento da empresa:\n${context.knowledgeBase}` : '';

  // Build messages array
  const messages: any[] = [
    { role: 'system', content: systemMessage + kbContext + `\n\nContexto do contato:\n- Nome: ${context.contactName}\n- Telefone: ${context.contactPhone}\n- Stage atual: ${context.pipelineStage}` },
  ];

  // Add conversation history (last 20 messages)
  const history = context.conversationHistory.slice(-20);
  for (const msg of history) {
    if (msg.role === 'inbound' || msg.type === 'inbound') {
      messages.push({ role: 'user', content: msg.content });
    } else {
      messages.push({ role: 'assistant', content: msg.content });
    }
  }

  // Call AI
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error: ${err}`);
  }

  const data = await response.json() as any;
  const choice = data.choices?.[0];
  const assistantMessage = choice?.message;

  if (!assistantMessage) throw new Error('No response from AI');

  const result: AgentResponse = {
    text: assistantMessage.content || '',
    actions: [],
    needsAudio: false,
    shouldTransfer: false,
    model,
    provider,
  };

  // Process tool calls
  if (assistantMessage.tool_calls?.length) {
    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name;
      let toolArgs = {};
      try {
        toolArgs = JSON.parse(toolCall.function.arguments);
      } catch {}

      const toolResult = await executeTool(toolName, toolArgs, {
        contactId: context.contactId,
        conversationId: context.conversationId,
        tenantId: context.tenantId,
      });

      result.actions.push({ tool: toolName, args: toolArgs, result: toolResult });

      if (toolName === 'transfer_to_human') {
        result.shouldTransfer = true;
        result.transferReason = toolArgs.reason;
      }

      // Add tool result to messages for follow-up
      messages.push({ role: 'assistant', content: null, tool_calls: [toolCall] });
      messages.push({ role: 'tool', tool_call_id: toolCall.id, content: toolResult });
    }

    // Get final response after tool execution
    const followUp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (followUp.ok) {
      const followData = await followUp.json() as any;
      const followChoice = followData.choices?.[0];
      if (followChoice?.message?.content) {
        result.text = followChoice.message.content;
      }
    }
  }

  // Detect if audio response would be better
  // (short responses, confirmations, greetings → audio)
  const wordCount = result.text.split(/\s+/).length;
  if (wordCount <= 30 && result.text.length > 0) {
    result.needsAudio = true;
  }

  return result;
}

// ─── Build Knowledge Base Context ──────────────────────────────
export async function buildKnowledgeContext(tenantId: string, query: string): Promise<string> {
  const sb = getSupabase();

  // Search knowledge base
  const { data: kb } = await sb.from('modules')
    .select('content, name')
    .eq('type', 'knowledge_base')
    .eq('tenant_id', tenantId)
    .limit(5);

  if (!kb || kb.length === 0) return '';

  return kb.map((k: any) => `${k.name}: ${k.content?.substring(0, 1000)}`).join('\n\n');
}
