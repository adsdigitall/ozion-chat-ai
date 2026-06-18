import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import type { RequestContext } from "@/lib/server/supabase-admin";
import { writeAuditLog } from "@/lib/server/supabase-admin";

export const DEFAULT_TAGS = [
  { name: "Novo Lead", color: "#22c55e", category: "Funil", description: "Lead recém criado no workspace." },
  { name: "Interessado", color: "#84cc16", category: "Funil", description: "Lead demonstrou interesse." },
  { name: "Qualificado", color: "#14b8a6", category: "Funil", description: "Lead validado para avanço comercial." },
  { name: "Pix Enviado", color: "#06b6d4", category: "Pagamento", description: "Pix ou oferta enviada." },
  { name: "Aguardando Pagamento", color: "#f59e0b", category: "Pagamento", description: "Lead aguardando confirmação de pagamento." },
  { name: "Pagou", color: "#10b981", category: "Pagamento", description: "Pagamento confirmado." },
  { name: "Perdido", color: "#ef4444", category: "Funil", description: "Lead perdido ou sem interesse." },
  { name: "Risco", color: "#f97316", category: "Risco", description: "Lead com sinal de risco ou palavra sensível." },
  { name: "Bloqueado", color: "#71717a", category: "Atendimento", description: "Contato bloqueado ou não acionável." },
  { name: "Suporte", color: "#3b82f6", category: "Atendimento", description: "Contato de suporte." },
  { name: "Pós-venda", color: "#a855f7", category: "Produto", description: "Relacionamento depois da venda." },
] as const;

export function slugifyTag(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function ensureWorkspaceDefaultTags(context: RequestContext) {
  const rows = DEFAULT_TAGS.map((tag) => ({
    workspace_id: context.workspaceId,
    customer_id: context.customerId,
    name: tag.name,
    slug: slugifyTag(tag.name),
    color: tag.color,
    category: tag.category,
    description: tag.description,
    status: "active",
    created_by: context.profileId,
    updated_by: context.profileId,
  }));

  const { error } = await context.admin.from("tags").upsert(rows, { onConflict: "workspace_id,slug" });
  if (error) throw error;
}

export async function ensureTag({
  admin,
  workspaceId,
  customerId,
  userId,
  name,
  color = "#10b981",
  category = "Funil",
  description = null,
}: {
  admin: SupabaseClient;
  workspaceId: string;
  customerId: string | null;
  userId: string | null;
  name: string;
  color?: string;
  category?: string;
  description?: string | null;
}) {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Nome da tag é obrigatório.");
  const slug = slugifyTag(cleanName);

  const { data, error } = await admin
    .from("tags")
    .upsert({
      workspace_id: workspaceId,
      customer_id: customerId,
      name: cleanName,
      slug,
      color,
      category,
      description,
      status: "active",
      updated_by: userId,
    }, { onConflict: "workspace_id,slug" })
    .select("id,name,slug,color,category,description,status,created_at,updated_at")
    .single();
  if (error) throw error;
  return data;
}

export async function applyTagToContact({
  context,
  contactId,
  tagId,
  request,
  source = "manual",
}: {
  context: RequestContext;
  contactId: string;
  tagId: string;
  request?: NextRequest;
  source?: string;
}) {
  const { error } = await context.admin
    .from("contact_tags")
    .upsert({
      customer_id: context.customerId,
      workspace_id: context.workspaceId,
      contact_id: contactId,
      tag_id: tagId,
      created_by: context.profileId,
    }, { onConflict: "contact_id,tag_id" });
  if (error) throw error;

  if (request) {
    await writeAuditLog({
      admin: context.admin,
      workspaceId: context.workspaceId,
      userId: context.profileId,
      request,
      action: source === "flow" ? "tag.applied_by_flow_contact" : source === "automatic" ? "tag.applied_automatic_contact" : "tag.applied_contact",
      targetType: "contact",
      targetId: contactId,
      details: { tag_id: tagId, source },
    });
  }
}

export async function removeTagFromContact({
  context,
  contactId,
  tagId,
  request,
}: {
  context: RequestContext;
  contactId: string;
  tagId: string;
  request?: NextRequest;
}) {
  const { error } = await context.admin
    .from("contact_tags")
    .delete()
    .eq("workspace_id", context.workspaceId)
    .eq("contact_id", contactId)
    .eq("tag_id", tagId);
  if (error) throw error;

  if (request) {
    await writeAuditLog({
      admin: context.admin,
      workspaceId: context.workspaceId,
      userId: context.profileId,
      request,
      action: "tag.removed_contact",
      targetType: "contact",
      targetId: contactId,
      details: { tag_id: tagId },
    });
  }
}

export async function applyTagToConversation({
  context,
  conversationId,
  tagId,
  request,
  source = "manual",
}: {
  context: RequestContext;
  conversationId: string;
  tagId: string;
  request?: NextRequest;
  source?: string;
}) {
  const { error } = await context.admin
    .from("conversation_tags")
    .upsert({
      customer_id: context.customerId,
      workspace_id: context.workspaceId,
      conversation_id: conversationId,
      tag_id: tagId,
      created_by: context.profileId,
    }, { onConflict: "conversation_id,tag_id" });
  if (error) throw error;

  if (request) {
    await writeAuditLog({
      admin: context.admin,
      workspaceId: context.workspaceId,
      userId: context.profileId,
      request,
      action: source === "flow" ? "tag.applied_by_flow_conversation" : source === "automatic" ? "tag.applied_automatic_conversation" : "tag.applied_conversation",
      targetType: "conversation",
      targetId: conversationId,
      details: { tag_id: tagId, source },
    });
  }
}

export async function removeTagFromConversation({
  context,
  conversationId,
  tagId,
  request,
}: {
  context: RequestContext;
  conversationId: string;
  tagId: string;
  request?: NextRequest;
}) {
  const { error } = await context.admin
    .from("conversation_tags")
    .delete()
    .eq("workspace_id", context.workspaceId)
    .eq("conversation_id", conversationId)
    .eq("tag_id", tagId);
  if (error) throw error;

  if (request) {
    await writeAuditLog({
      admin: context.admin,
      workspaceId: context.workspaceId,
      userId: context.profileId,
      request,
      action: "tag.removed_conversation",
      targetType: "conversation",
      targetId: conversationId,
      details: { tag_id: tagId },
    });
  }
}
