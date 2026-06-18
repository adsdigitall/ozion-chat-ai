import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { parseWebhookMessage } from "@/lib/services/whatsapp";
import { executeConversationFlow } from "@/lib/server/flow-engine";
import { slugifyTag } from "@/lib/server/tags";

type WebhookEnvelope = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: { metadata?: { phone_number_id?: string } };
    }>;
  }>;
};

export const maxDuration = 60;

function isValidSignature(rawBody: string, signature: string | null) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return true;
  if (!signature?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const received = signature.slice("sha256=".length);
  if (received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

function supportedMessageType(type: string) {
  const supported = new Set([
    "text",
    "image",
    "video",
    "audio",
    "document",
    "sticker",
    "location",
    "contact",
  ]);
  return supported.has(type) ? type : "text";
}

function riskReason(content: string) {
  const normalized = content.toLowerCase();
  const keywords = (process.env.SAFETY_KEYWORDS || "golpe,fraude,procon,reclamação,reclamacao,processo,advogado,spam")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return keywords.find((keyword) => normalized.includes(keyword)) ?? null;
}

async function tagRiskContact(admin: ReturnType<typeof getSupabaseAdmin>, workspaceId: string, contactId: string) {
  const { data: contact, error: contactError } = await admin
    .from("contacts")
    .select("customer_id")
    .eq("id", contactId)
    .maybeSingle();
  if (contactError) throw contactError;

  const { data: tag, error: tagError } = await admin
    .from("tags")
    .upsert({ workspace_id: workspaceId, customer_id: contact?.customer_id ?? null, name: "Risco", slug: slugifyTag("Risco"), color: "#f97316", category: "Risco", status: "active" }, { onConflict: "workspace_id,slug" })
    .select("id")
    .single();
  if (tagError) throw tagError;
  const { error } = await admin
    .from("contact_tags")
    .upsert({ workspace_id: workspaceId, customer_id: contact?.customer_id ?? null, contact_id: contactId, tag_id: tag.id }, { onConflict: "contact_id,tag_id" });
  if (error) throw error;
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  if (mode !== "subscribe" || !token || !challenge) {
    return new NextResponse("Parâmetros de verificação inválidos.", { status: 400 });
  }

  let verified = token === process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verified) {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("integrations")
      .select("config")
      .eq("type", "whatsapp")
      .eq("status", "connected");
    if (error) {
      console.error("[WhatsApp webhook] Falha ao consultar token:", error);
    } else {
      verified = (data ?? []).some(
        (integration) =>
          integration.config &&
          typeof integration.config.verify_token === "string" &&
          integration.config.verify_token === token,
      );
    }
  }

  return verified
    ? new NextResponse(challenge, { status: 200 })
    : new NextResponse("Token inválido.", { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    if (!isValidSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
      return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as WebhookEnvelope;
    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ status: "ignored" });
    }

    const parsed = parseWebhookMessage(body);
    if (!parsed) return NextResponse.json({ status: "ok" });
    const admin = getSupabaseAdmin();

    if (parsed.type === "status") {
      if (parsed.messageId) {
        const updates: Record<string, unknown> = {
          metadata: {
            whatsapp_status: parsed.status,
            whatsapp_status_at: parsed.timestamp,
          },
        };
        if (parsed.status === "read") updates.read = true;
        const { error } = await admin
          .from("messages")
          .update(updates)
          .eq("whatsapp_message_id", parsed.messageId);
        if (error) throw error;
      }
      return NextResponse.json({ status: "ok" });
    }

    const phoneNumberId = body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    if (!phoneNumberId) return NextResponse.json({ status: "ignored" });

    const { data: connection, error: connectionError } = await admin
      .from("whatsapp_connections")
      .select("id,workspace_id")
      .eq("phone_number_id", phoneNumberId)
      .eq("status", "connected")
      .limit(1)
      .maybeSingle();
    if (connectionError) throw connectionError;
    if (!connection) {
      console.warn("[WhatsApp webhook] Número não conectado:", phoneNumberId);
      return NextResponse.json({ status: "ignored" });
    }

    if (parsed.messageId) {
      const { data: duplicate, error: duplicateError } = await admin
        .from("messages")
        .select("id")
        .eq("whatsapp_message_id", parsed.messageId)
        .limit(1)
        .maybeSingle();
      if (duplicateError) throw duplicateError;
      if (duplicate) return NextResponse.json({ status: "duplicate" });
    }

    const { data: existingContact, error: contactLookupError } = await admin
      .from("contacts")
      .select("id,name")
      .eq("workspace_id", connection.workspace_id)
      .eq("phone", parsed.from)
      .limit(1)
      .maybeSingle();
    if (contactLookupError) throw contactLookupError;

    let contactId = existingContact?.id;
    const referral =
      parsed.type === "message" && parsed.referral && typeof parsed.referral === "object"
        ? (parsed.referral as Record<string, unknown>)
        : null;

    if (!contactId) {
      const { data: contact, error } = await admin
        .from("contacts")
        .insert({
          workspace_id: connection.workspace_id,
          name: parsed.contactName || parsed.from,
          phone: parsed.from,
          status: "new",
          origin: referral ? "ctwa" : "whatsapp",
          campaign: typeof referral?.source_id === "string" ? referral.source_id : null,
          score: 0,
          temperature: "cold",
          custom_fields: referral ? { ctwa_referral: referral } : {},
        })
        .select("id")
        .single();
      if (error) throw error;
      contactId = contact.id;
    } else if (parsed.contactName && existingContact?.name !== parsed.contactName) {
      const { error } = await admin
        .from("contacts")
        .update({ name: parsed.contactName, updated_at: new Date().toISOString() })
        .eq("id", contactId)
        .eq("workspace_id", connection.workspace_id);
      if (error) throw error;
    }

    const { data: existingConversation, error: conversationLookupError } = await admin
      .from("conversations")
      .select("id,unread_count")
      .eq("workspace_id", connection.workspace_id)
      .eq("contact_id", contactId)
      .neq("status", "closed")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (conversationLookupError) throw conversationLookupError;

    let conversationId = existingConversation?.id;
    const existingUnreadCount = Number(existingConversation?.unread_count ?? 0);
    if (!conversationId) {
      const { data: conversation, error } = await admin
        .from("conversations")
        .insert({
          workspace_id: connection.workspace_id,
          contact_id: contactId,
          channel: "whatsapp",
          phone_number: parsed.from,
          whatsapp_connection_id: connection.id,
          status: "open",
          unread_count: 1,
        })
        .select("id")
        .single();
      if (error) throw error;
      conversationId = conversation.id;
    } else {
      const { error } = await admin
        .from("conversations")
        .update({
          unread_count: existingUnreadCount + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId)
        .eq("workspace_id", connection.workspace_id);
      if (error) throw error;
    }

    const content =
      parsed.content ||
      (parsed.mediaId ? `Mídia recebida (${parsed.messageType})` : "Mensagem recebida");
    const risk = riskReason(content);
    const { error: messageError } = await admin.from("messages").insert({
      conversation_id: conversationId,
      content,
      type: supportedMessageType(parsed.messageType ?? "text"),
      sender: "contact",
      sender_name: parsed.contactName,
      read: false,
      whatsapp_message_id: parsed.messageId || null,
      metadata: {
        media_id: parsed.mediaId,
        whatsapp_timestamp: parsed.timestamp,
        context: parsed.context,
        referral,
        risk_keyword: risk,
      },
    });
    if (messageError) throw messageError;

    if (risk) {
      await Promise.all([
        admin
          .from("contacts")
          .update({ status: "risk", updated_at: new Date().toISOString() })
          .eq("id", contactId)
          .eq("workspace_id", connection.workspace_id),
        admin
          .from("conversations")
          .update({
            status: "waiting",
            metadata: {
              ai_paused: true,
              risk_keyword: risk,
              handoff_reason: `Palavra de risco detectada: ${risk}`,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversationId)
          .eq("workspace_id", connection.workspace_id),
        admin.from("messages").insert({
          conversation_id: conversationId,
          content: `Atendimento pausado automaticamente. Palavra de risco detectada: ${risk}`,
          type: "flow",
          sender: "system",
          sender_name: "Sistema Ozion",
          read: false,
        }),
        tagRiskContact(admin, connection.workspace_id, contactId),
      ]);
    } else {
      try {
        await executeConversationFlow({
          admin,
          conversationId,
          incomingText: content,
        });
      } catch (flowError) {
        console.error("[WhatsApp flow]", flowError);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[WhatsApp webhook]", error);
    return NextResponse.json({ error: "Falha ao processar o webhook." }, { status: 500 });
  }
}
