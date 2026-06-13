// @ts-nocheck
import { getSupabase } from '../db/supabase.js';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

interface EvolutionMessage {
  instanceName: string;
  number: string;
  text?: string;
  media?: string;
  mediatype?: 'image' | 'video' | 'audio' | 'document';
  caption?: string;
  buttons?: Array<{ id: string; text: string }>;
  list?: Array<{ title: string; description: string; rowId: string }>;
}

interface EvolutionWebhookEvent {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
      imageMessage?: { caption?: string; mimetype?: string; url?: string };
      audioMessage?: { mimetype?: string; url?: string; seconds?: number; ptt?: boolean };
      documentMessage?: { fileName?: string; mimetype?: string; url?: string };
      buttonsResponseMessage?: { selectedButtonId?: string };
      listResponseMessage?: { singleSelectReply?: { selectedRowId?: string } };
    };
    messageType?: string;
    messageTimestamp?: number;
    status?: string;
  };
}

// ─── Send Messages via Evolution API ───────────────────────────
export async function sendTextMessage(instanceName: string, number: string, text: string): Promise<any> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.warn('⚠️ Evolution API not configured');
    return { ok: false, error: 'Evolution API not configured' };
  }

  try {
    const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: number.replace(/\D/g, ''),
        text,
      }),
    });
    return await res.json();
  } catch (e: any) {
    console.error('Evolution sendText error:', e.message);
    return { ok: false, error: e.message };
  }
}

export async function sendAudioMessage(instanceName: string, number: string, audioUrl: string, ptt = true): Promise<any> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) return { ok: false, error: 'Evolution API not configured' };

  try {
    const res = await fetch(`${EVOLUTION_API_URL}/message/sendWhatsAppAudio/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: number.replace(/\D/g, ''),
        audio: audioUrl,
        ptt, // push-to-talk = true means voice note
      }),
    });
    return await res.json();
  } catch (e: any) {
    console.error('Evolution sendAudio error:', e.message);
    return { ok: false, error: e.message };
  }
}

export async function sendImageMessage(instanceName: string, number: string, imageUrl: string, caption?: string): Promise<any> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) return { ok: false, error: 'Evolution API not configured' };

  try {
    const res = await fetch(`${EVOLUTION_API_URL}/message/sendImage/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: number.replace(/\D/g, ''),
        image: imageUrl,
        caption: caption || '',
      }),
    });
    return await res.json();
  } catch (e: any) {
    console.error('Evolution sendImage error:', e.message);
    return { ok: false, error: e.message };
  }
}

export async function sendDocumentMessage(instanceName: string, number: string, docUrl: string, fileName: string): Promise<any> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) return { ok: false, error: 'Evolution API not configured' };

  try {
    const res = await fetch(`${EVOLUTION_API_URL}/message/sendDocument/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: number.replace(/\D/g, ''),
        document: docUrl,
        fileName,
      }),
    });
    return await res.json();
  } catch (e: any) {
    console.error('Evolution sendDocument error:', e.message);
    return { ok: false, error: e.message };
  }
}

export async function sendButtonMessage(instanceName: string, number: string, text: string, buttons: Array<{ id: string; text: string }>): Promise<any> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) return { ok: false, error: 'Evolution API not configured' };

  try {
    const res = await fetch(`${EVOLUTION_API_URL}/message/sendButtons/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: number.replace(/\D/g, ''),
        title: '',
        description: text,
        buttons: buttons.map(b => ({ buttonId: b.id, buttonText: { displayText: b.text }, type: 1 })),
      }),
    });
    return await res.json();
  } catch (e: any) {
    console.error('Evolution sendButtons error:', e.message);
    return { ok: false, error: e.message };
  }
}

export async function sendListMessage(instanceName: string, number: string, title: string, description: string, sections: any[]): Promise<any> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) return { ok: false, error: 'Evolution API not configured' };

  try {
    const res = await fetch(`${EVOLUTION_API_URL}/message/sendList/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: number.replace(/\D/g, ''),
        title,
        description,
        buttonText: 'Ver opções',
        sections,
      }),
    });
    return await res.json();
  } catch (e: any) {
    console.error('Evolution sendList error:', e.message);
    return { ok: false, error: e.message };
  }
}

// ─── Instance Management ───────────────────────────────────────
export async function createInstance(instanceName: string, number: string, qrcode = true): Promise<any> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) return { ok: false, error: 'Evolution API not configured' };

  try {
    const res = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        instanceName,
        number: number.replace(/\D/g, ''),
        integration: 'WHATSAPP-BAILEYS',
        qrcode,
        reject_call: false,
        always_online: true,
        read_messages: true,
        read_status: true,
        sync_full_history: false,
      }),
    });
    return await res.json();
  } catch (e: any) {
    console.error('Evolution createInstance error:', e.message);
    return { ok: false, error: e.message };
  }
}

export async function getInstanceState(instanceName: string): Promise<any> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) return { ok: false, error: 'Evolution API not configured' };

  try {
    const res = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
      headers: { 'apikey': EVOLUTION_API_KEY },
    });
    return await res.json();
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function getQRCode(instanceName: string): Promise<any> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) return { ok: false, error: 'Evolution API not configured' };

  try {
    const res = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      headers: { 'apikey': EVOLUTION_API_KEY },
    });
    return await res.json();
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function deleteInstance(instanceName: string): Promise<any> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) return { ok: false, error: 'Evolution API not configured' };

  try {
    const res = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': EVOLUTION_API_KEY },
    });
    return await res.json();
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function fetchMediaUrl(instanceName: string, mediaKey: string): Promise<any> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) return { ok: false, error: 'Evolution API not configured' };

  try {
    const res = await fetch(`${EVOLUTION_API_URL}/message/getMediaUrl/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({ mediaKey }),
    });
    return await res.json();
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ─── Parse Evolution Webhook ───────────────────────────────────
export function parseWebhookEvent(body: EvolutionWebhookEvent): {
  instance: string;
  from: string;
  fromName: string;
  messageId: string;
  type: 'text' | 'audio' | 'image' | 'document' | 'button' | 'list' | 'unknown';
  content: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  duration?: number;
  isFromMe: boolean;
  timestamp: number;
  raw: any;
} | null {
  if (!body?.data?.key) return null;

  const { key, pushName, message, messageType, messageTimestamp } = body.data;
  const from = key.remoteJid?.replace('@s.whatsapp.net', '').replace('@lid', '') || '';
  const fromName = pushName || from;
  const isFromMe = key.fromMe;
  const messageId = key.id || '';

  let type: 'text' | 'audio' | 'image' | 'document' | 'button' | 'list' | 'unknown' = 'unknown';
  let content = '';
  let mediaUrl: string | undefined;
  let mediaMimeType: string | undefined;
  let duration: number | undefined;

  if (message?.conversation) {
    type = 'text';
    content = message.conversation;
  } else if (message?.extendedTextMessage?.text) {
    type = 'text';
    content = message.extendedTextMessage.text;
  } else if (message?.imageMessage) {
    type = 'image';
    content = message.imageMessage.caption || '';
    mediaUrl = message.imageMessage.url;
    mediaMimeType = message.imageMessage.mimetype;
  } else if (message?.audioMessage) {
    type = 'audio';
    mediaUrl = message.audioMessage.url;
    mediaMimeType = message.audioMessage.mimetype;
    duration = message.audioMessage.seconds;
  } else if (message?.documentMessage) {
    type = 'document';
    content = message.documentMessage.fileName || '';
    mediaUrl = message.documentMessage.url;
    mediaMimeType = message.documentMessage.mimetype;
  } else if (message?.buttonsResponseMessage) {
    type = 'button';
    content = message.buttonsResponseMessage.selectedButtonId || '';
  } else if (message?.listResponseMessage) {
    type = 'list';
    content = message.listResponseMessage.singleSelectReply?.selectedRowId || '';
  }

  return {
    instance: body.instance,
    from,
    fromName,
    messageId,
    type,
    content,
    mediaUrl,
    mediaMimeType,
    duration,
    isFromMe,
    timestamp: messageTimestamp || Math.floor(Date.now() / 1000),
    raw: body,
  };
}
