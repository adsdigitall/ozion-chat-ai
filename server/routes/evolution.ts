// @ts-nocheck
import { Router, Request, Response } from 'express';
import { getSupabase } from '../db/supabase.js';
import { parseWebhookEvent, sendTextMessage, sendAudioMessage } from '../services/evolution-api.js';
import { transcribeAudio, generateSpeech, downloadAudio, cleanupTempFile } from '../services/audio.js';
import { processWithAI, buildKnowledgeContext } from '../services/ai-agent.js';

const router = Router();

// ─── Evolution API Webhook ─────────────────────────────────────
// POST /api/webhooks/evolution
router.post('/evolution', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const event = parseWebhookEvent(body);

    if (!event || event.isFromMe) {
      return res.sendStatus(200);
    }

    console.log(`📩 Evolution webhook: ${event.type} from ${event.from} (${event.instance})`);

    const sb = getSupabase();

    // Find the WhatsApp credential/instance
    const { data: cred } = await sb.from('whatsapp_credentials')
      .select('*')
      .eq('instance_name', event.instance)
      .limit(1)
      .single();

    const tenantId = cred?.tenant_id || 'default';

    // Find or create contact
    let contactId: string | null = null;
    let pipelineStage = 'Novo Lead';
    const { data: existingContact } = await sb.from('contacts')
      .select('id, pipeline_stage, name')
      .eq('phone', event.from)
      .limit(1)
      .single();

    if (existingContact) {
      contactId = existingContact.id;
      pipelineStage = existingContact.pipeline_stage || 'Novo Lead';
    } else {
      const { data: newContact } = await sb.from('contacts').insert({
        phone: event.from,
        name: event.fromName || event.from,
        pipeline_stage: 'Novo Lead',
        tenant_id: tenantId,
      }).select('id').single();
      contactId = newContact?.id;
    }

    if (!contactId) {
      console.error('Failed to create/find contact');
      return res.sendStatus(200);
    }

    // Find or create conversation
    let conversationId: string | null = null;
    const { data: existingConv } = await sb.from('conversations')
      .select('id, status, is_ai_active')
      .eq('contact_id', contactId)
      .neq('status', 'closed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingConv) {
      conversationId = existingConv.id;

      // Check if AI should respond
      if (existingConv.status === 'waiting_human' || !existingConv.is_ai_active) {
        // Human has taken over or AI is disabled — don't auto-respond
        // Just log the incoming message
        await sb.from('messages').insert({
          conversation_id: conversationId,
          contact_id: contactId,
          direction: 'inbound',
          content: event.content || `[${event.type}]`,
          type: event.type,
          media_url: event.mediaUrl,
          tenant_id: tenantId,
        });
        return res.sendStatus(200);
      }
    } else {
      const { data: newConv } = await sb.from('conversations').insert({
        contact_id: contactId,
        status: 'open',
        is_ai_active: true,
        tenant_id: tenantId,
      }).select('id').single();
      conversationId = newConv?.id;
    }

    if (!conversationId) {
      console.error('Failed to create/find conversation');
      return res.sendStatus(200);
    }

    // Save inbound message
    let transcribedText = event.content;
    if (event.type === 'audio' && event.mediaUrl) {
      try {
        // Download and transcribe audio
        const audioPath = await downloadAudio(event.mediaUrl);
        const transcription = await transcribeAudio(audioPath);
        transcribedText = transcription.text;
        cleanupTempFile(audioPath);

        // Save transcription
        await sb.from('messages').insert({
          conversation_id: conversationId,
          contact_id: contactId,
          direction: 'inbound',
          content: `[Áudio ${transcription.duration.toFixed(1)}s] ${transcription.text}`,
          type: 'audio',
          transcription: transcription.text,
          media_url: event.mediaUrl,
          tenant_id: tenantId,
        });
      } catch (e: any) {
        console.error('Audio transcription error:', e.message);
        transcribedText = '[Áudio não transcrito]';
      }
    } else {
      await sb.from('messages').insert({
        conversation_id: conversationId,
        contact_id: contactId,
        direction: 'inbound',
        content: event.content,
        type: event.type,
        media_url: event.mediaUrl,
        tenant_id: tenantId,
      });
    }

    // Skip AI processing for non-text messages (images, documents) unless they have captions
    if (event.type !== 'text' && event.type !== 'audio' && !event.content) {
      return res.sendStatus(200);
    }

    // Get conversation history
    const { data: messages } = await sb.from('messages')
      .select('content, direction, type')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(50);

    const history = (messages || []).map((m: any) => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.content,
      type: m.direction,
    }));

    // Build knowledge base context
    const knowledgeBase = await buildKnowledgeContext(tenantId, transcribedText || '');

    // Process with AI Agent
    const aiResponse = await processWithAI({
      contactId,
      conversationId,
      tenantId,
      contactName: event.fromName || existingContact?.name || event.from,
      contactPhone: event.from,
      pipelineStage,
      conversationHistory: history,
      knowledgeBase: knowledgeBase || undefined,
    });

    // Save AI response
    await sb.from('messages').insert({
      conversation_id: conversationId,
      contact_id: contactId,
      direction: 'outbound',
      content: aiResponse.text,
      type: 'text',
      sender: 'ai',
      tenant_id: tenantId,
    });

    // Send response via Evolution API
    if (event.instance) {
      if (aiResponse.needsAudio && aiResponse.text) {
        try {
          // Generate audio response with ElevenLabs
          const { audioBuffer } = await generateSpeech(aiResponse.text);
          // In production, upload audio to a URL and send via Evolution
          // For now, send as text
          await sendTextMessage(event.instance, event.from, aiResponse.text);
        } catch {
          // Fallback to text
          await sendTextMessage(event.instance, event.from, aiResponse.text);
        }
      } else {
        await sendTextMessage(event.instance, event.from, aiResponse.text);
      }
    }

    // Update conversation timestamp
    await sb.from('conversations').update({
      last_message_at: new Date().toISOString(),
    }).eq('id', conversationId);

    // If transfer requested, notify (could send internal message)
    if (aiResponse.shouldTransfer) {
      console.log(`🔄 Transfer requested: ${aiResponse.transferReason}`);
      // Could emit WebSocket event here for real-time notification
    }

    res.sendStatus(200);
  } catch (e: any) {
    console.error('Evolution webhook error:', e.message);
    res.sendStatus(200); // Always return 200 to avoid webhook retries
  }
});

// ─── Evolution API Webhook Verification ────────────────────────
router.get('/evolution', (req: Request, res: Response) => {
  res.sendStatus(200);
});

// ─── Send Message via Evolution ────────────────────────────────
// POST /api/webhooks/evolution/send
router.post('/evolution/send', async (req: Request, res: Response) => {
  try {
    const { instance, number, text, type = 'text', mediaUrl } = req.body;
    if (!instance || !number || !text) {
      return res.status(400).json({ error: 'instance, number, and text are required' });
    }

    let result;
    switch (type) {
      case 'audio':
        result = await sendAudioMessage(instance, number, text);
        break;
      case 'image':
        result = await sendTextMessage(instance, number, text); // simplified
        break;
      default:
        result = await sendTextMessage(instance, number, text);
    }

    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
