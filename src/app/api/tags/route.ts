import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getRequestContext, publicServerError, requireActiveCustomer, writeAuditLog } from "@/lib/server/supabase-admin";
import { requirePlanModule } from "@/lib/server/plan-guards";
import { ensureWorkspaceDefaultTags, slugifyTag } from "@/lib/server/tags";

const tagInput = z.object({
  name: z.string().trim().min(2).max(80),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).default("#10b981"),
  category: z.enum(["Funil", "Origem", "Pagamento", "Atendimento", "Risco", "Produto", "Campanha"]).default("Funil"),
  description: z.string().trim().max(280).nullable().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

async function tagUsage(admin: SupabaseClient, workspaceId: string) {
  const [contactLinks, conversationLinks] = await Promise.all([
    admin.from("contact_tags").select("tag_id,contact:contacts!inner(workspace_id)").eq("workspace_id", workspaceId),
    admin.from("conversation_tags").select("tag_id,conversation:conversations!inner(workspace_id)").eq("workspace_id", workspaceId),
  ]);
  if (contactLinks.error) throw contactLinks.error;
  if (conversationLinks.error) throw conversationLinks.error;

  const contacts = new Map<string, number>();
  const conversations = new Map<string, number>();
  for (const item of contactLinks.data ?? []) contacts.set(item.tag_id, (contacts.get(item.tag_id) ?? 0) + 1);
  for (const item of conversationLinks.data ?? []) conversations.set(item.tag_id, (conversations.get(item.tag_id) ?? 0) + 1);
  return { contacts, conversations };
}

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    await ensureWorkspaceDefaultTags(context);
    const { admin, workspaceId } = context;
    const search = request.nextUrl.searchParams.get("search")?.trim();
    const status = request.nextUrl.searchParams.get("status");
    const category = request.nextUrl.searchParams.get("category");

    let query = admin
      .from("tags")
      .select("id,customer_id,workspace_id,name,slug,color,category,description,status,created_by,updated_by,created_at,updated_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (search) query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%,description.ilike.%${search}%`);
    if (status && status !== "all") query = query.eq("status", status);
    if (category && category !== "all") query = query.eq("category", category);

    const { data, error } = await query;
    if (error) throw error;
    const usage = await tagUsage(admin, workspaceId);

    return NextResponse.json({
      tags: (data ?? []).map((tag) => ({
        ...tag,
        contacts_count: usage.contacts.get(tag.id) ?? 0,
        conversations_count: usage.conversations.get(tag.id) ?? 0,
      })),
    });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    await requirePlanModule({ context, request, module: "crm" });
    const { admin, workspaceId, customerId, profileId } = context;
    const body = await request.json();

    if (body?.action === "seed-defaults") {
      await ensureWorkspaceDefaultTags(context);
      await writeAuditLog({ admin, workspaceId, userId: profileId, request, action: "tag.defaults_created", targetType: "tag" });
      return NextResponse.json({ ok: true });
    }

    if (body?.action === "duplicate") {
      const id = z.string().uuid().parse(body.id);
      const { data: original, error: originalError } = await admin
        .from("tags")
        .select("name,color,category,description,status")
        .eq("workspace_id", workspaceId)
        .eq("id", id)
        .single();
      if (originalError) throw originalError;

      const name = `Cópia de ${original.name}`.slice(0, 80);
      const { data, error } = await admin
        .from("tags")
        .insert({
          ...original,
          name,
          slug: `${slugifyTag(name)}-${Date.now().toString(36)}`,
          customer_id: customerId,
          workspace_id: workspaceId,
          created_by: profileId,
          updated_by: profileId,
        })
        .select("id,name,slug,color,category,description,status,created_at,updated_at")
        .single();
      if (error) throw error;
      await writeAuditLog({ admin, workspaceId, userId: profileId, request, action: "tag.duplicated", targetType: "tag", targetId: data.id, details: { original_id: id } });
      return NextResponse.json({ tag: data }, { status: 201 });
    }

    const parsed = tagInput.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Tag inválida." }, { status: 400 });

    const { data, error } = await admin
      .from("tags")
      .insert({
        ...parsed.data,
        slug: slugifyTag(parsed.data.name),
        customer_id: customerId,
        workspace_id: workspaceId,
        created_by: profileId,
        updated_by: profileId,
      })
      .select("id,name,slug,color,category,description,status,created_at,updated_at")
      .single();
    if (error) throw error;
    await writeAuditLog({ admin, workspaceId, userId: profileId, request, action: "tag.created", targetType: "tag", targetId: data.id, details: { name: data.name } });
    return NextResponse.json({ tag: data }, { status: 201 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "O ID da tag é obrigatório." }, { status: 400 });
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    await requirePlanModule({ context, request, module: "crm" });
    const { admin, workspaceId, profileId } = context;
    const parsed = tagInput.partial().safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Tag inválida." }, { status: 400 });

    const update = {
      ...parsed.data,
      ...(parsed.data.name ? { slug: slugifyTag(parsed.data.name) } : {}),
      updated_by: profileId,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await admin
      .from("tags")
      .update(update)
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .select("id,name,slug,color,category,description,status,created_at,updated_at")
      .single();
    if (error) throw error;
    await writeAuditLog({ admin, workspaceId, userId: profileId, request, action: "tag.updated", targetType: "tag", targetId: id, details: { name: data.name } });
    return NextResponse.json({ tag: data });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "O ID da tag é obrigatório." }, { status: 400 });
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    await requirePlanModule({ context, request, module: "crm" });
    const { admin, workspaceId, profileId } = context;

    const usage = await tagUsage(admin, workspaceId);
    const contactCount = usage.contacts.get(id) ?? 0;
    const conversationCount = usage.conversations.get(id) ?? 0;

    await admin.from("contact_tags").delete().eq("workspace_id", workspaceId).eq("tag_id", id);
    await admin.from("conversation_tags").delete().eq("workspace_id", workspaceId).eq("tag_id", id);
    const { error } = await admin.from("tags").delete().eq("workspace_id", workspaceId).eq("id", id);
    if (error) throw error;

    await writeAuditLog({
      admin,
      workspaceId,
      userId: profileId,
      request,
      action: "tag.deleted",
      targetType: "tag",
      targetId: id,
      details: { contacts_removed: contactCount, conversations_removed: conversationCount },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
