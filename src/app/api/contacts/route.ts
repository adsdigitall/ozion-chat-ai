import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, requireActiveCustomer, writeAuditLog } from "@/lib/server/supabase-admin";
import { requirePlanLimit, requirePlanModule } from "@/lib/server/plan-guards";
import { slugifyTag } from "@/lib/server/tags";

const statusValues = ["new", "in_service", "qualified", "pix_sent", "waiting_payment", "paid", "lost", "risk"] as const;
const temperatureValues = ["hot", "warm", "cold"] as const;

const contactInput = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(7).max(30),
  email: z.string().trim().email().nullable().optional().or(z.literal("")),
  city: z.string().trim().max(100).nullable().optional(),
  state: z.string().trim().max(50).nullable().optional(),
  status: z.enum(statusValues).default("new"),
  score: z.coerce.number().int().min(0).max(100).default(0),
  temperature: z.enum(temperatureValues).default("cold"),
  source: z.string().trim().max(100).nullable().optional(),
  channel: z.string().trim().max(80).nullable().optional(),
  whatsapp_connection_id: z.string().uuid().nullable().optional(),
  campaign_id: z.string().trim().max(180).nullable().optional(),
  adset_id: z.string().trim().max(180).nullable().optional(),
  ad_id: z.string().trim().max(180).nullable().optional(),
  creative_id: z.string().trim().max(180).nullable().optional(),
  utm_source: z.string().trim().max(180).nullable().optional(),
  utm_medium: z.string().trim().max(180).nullable().optional(),
  utm_campaign: z.string().trim().max(180).nullable().optional(),
  utm_content: z.string().trim().max(180).nullable().optional(),
  utm_term: z.string().trim().max(180).nullable().optional(),
  assigned_user_id: z.string().uuid().nullable().optional(),
  ai_summary: z.string().trim().max(4000).nullable().optional(),
  custom_fields: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
});

const contactPatch = contactInput.partial();

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

async function addTimeline({
  context,
  contactId,
  eventType,
  title,
  description,
  metadata = {},
}: {
  context: Awaited<ReturnType<typeof getRequestContext>>;
  contactId: string;
  eventType: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}) {
  const { admin, workspaceId, customerId, profileId } = context;
  await admin.from("contact_timeline").insert({
    customer_id: customerId,
    workspace_id: workspaceId,
    contact_id: contactId,
    event_type: eventType,
    title,
    description: description ?? null,
    metadata_json: metadata,
    created_by: profileId,
  });
}

async function syncTags(context: Awaited<ReturnType<typeof getRequestContext>>, contactId: string, tagNames: string[]) {
  const { admin, workspaceId, customerId, profileId } = context;
  const normalized = [...new Set(tagNames.map((tag) => tag.trim()).filter(Boolean))];
  await admin.from("contact_tags").delete().eq("contact_id", contactId);

  if (!normalized.length) return [];

  const rows = normalized.map((name) => ({
    workspace_id: workspaceId,
    customer_id: customerId,
    name,
    slug: slugifyTag(name),
    color: "#10b981",
    category: "Funil",
    status: "active",
    created_by: profileId,
    updated_by: profileId,
  }));
  const { data: tags, error } = await admin
    .from("tags")
    .upsert(rows, { onConflict: "workspace_id,slug" })
    .select("id,name,color,category,status");
  if (error) throw error;

  const links = (tags ?? []).map((tag) => ({
    customer_id: customerId,
    workspace_id: workspaceId,
    contact_id: contactId,
    tag_id: tag.id,
    created_by: profileId,
  }));
  if (links.length) {
    const { error: linkError } = await admin.from("contact_tags").insert(links);
    if (linkError) throw linkError;
  }

  return tags ?? [];
}

async function saveCustomValues(
  context: Awaited<ReturnType<typeof getRequestContext>>,
  contactId: string,
  customFields?: Record<string, unknown>,
) {
  if (!customFields) return;
  const entries = Object.entries(customFields);
  if (!entries.length) return;

  const { admin, workspaceId } = context;
  const { data: fields, error } = await admin
    .from("custom_fields")
    .select("id,name")
    .eq("workspace_id", workspaceId)
    .in("id", entries.map(([key]) => key));
  if (error) throw error;

  const fieldIds = new Set((fields ?? []).map((field) => field.id));
  const rows = entries
    .filter(([fieldId]) => fieldIds.has(fieldId))
    .map(([fieldId, value]) => ({
      contact_id: contactId,
      custom_field_id: fieldId,
      value,
    }));

  if (rows.length) {
    const { error: upsertError } = await admin
      .from("contact_custom_field_values")
      .upsert(rows, { onConflict: "contact_id,custom_field_id" });
    if (upsertError) throw upsertError;
  }
}

function contactPayload(input: z.infer<typeof contactInput> | z.infer<typeof contactPatch>) {
  return {
    ...input,
    email: "email" in input ? cleanString(input.email) : undefined,
    city: "city" in input ? cleanString(input.city) : undefined,
    state: "state" in input ? cleanString(input.state) : undefined,
    source: "source" in input ? cleanString(input.source) : undefined,
    origin: "source" in input ? cleanString(input.source) : undefined,
    channel: "channel" in input ? cleanString(input.channel) : undefined,
    campaign_id: "campaign_id" in input ? cleanString(input.campaign_id) : undefined,
    campaign: "campaign_id" in input ? cleanString(input.campaign_id) : undefined,
    adset_id: "adset_id" in input ? cleanString(input.adset_id) : undefined,
    adset: "adset_id" in input ? cleanString(input.adset_id) : undefined,
    ad_id: "ad_id" in input ? cleanString(input.ad_id) : undefined,
    ad: "ad_id" in input ? cleanString(input.ad_id) : undefined,
    creative_id: "creative_id" in input ? cleanString(input.creative_id) : undefined,
    creative: "creative_id" in input ? cleanString(input.creative_id) : undefined,
    last_interaction_at: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    const { admin, workspaceId, profileId, role } = context;
    const params = request.nextUrl.searchParams;
    const exportCsv = params.get("export") === "csv";
    const page = Math.max(1, Number(params.get("page") ?? 1));
    const limit = exportCsv ? 1000 : Math.min(200, Math.max(1, Number(params.get("limit") ?? 100)));
    const from = (page - 1) * limit;

    let query = admin
      .from("contacts")
      .select(`
        *,
        assigned_user:users!contacts_assigned_user_id_fkey(id,name,email),
        whatsapp_connection:whatsapp_connections(id,display_name,phone_number),
        contact_tags(tag:tags(id,name,color)),
        custom_values:contact_custom_field_values(id,custom_field_id,value,field:custom_fields(id,name,type,options_json,required))
      `, { count: "exact" })
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("last_interaction_at", { ascending: false })
      .range(from, from + limit - 1);

    if (role === "attendant" && profileId) query = query.eq("assigned_user_id", profileId);

    const search = params.get("search")?.trim();
    if (search) {
      const safeSearch = search.replaceAll(",", " ");
      query = query.or(`name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
    }

    for (const key of ["status", "temperature", "source", "channel", "campaign_id", "assigned_user_id"] as const) {
      const value = params.get(key);
      if (value && value !== "all") query = query.eq(key, value);
    }

    const minScore = params.get("min_score");
    const maxScore = params.get("max_score");
    const dateFrom = params.get("date_from");
    const dateTo = params.get("date_to");
    if (minScore) query = query.gte("score", Number(minScore));
    if (maxScore) query = query.lte("score", Number(maxScore));
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);

    const { data, error, count } = await query;
    if (error) throw error;

    let contacts = (data ?? []).map((contact) => ({
      ...contact,
      tags: (contact.contact_tags ?? []).map((item: { tag?: { id: string; name: string; color: string } }) => item.tag).filter(Boolean),
      custom_values: contact.custom_values ?? [],
    }));

    const tag = params.get("tag");
    if (tag && tag !== "all") {
      contacts = contacts.filter((contact) => contact.tags.some((item: { id: string; name: string }) => item.id === tag || item.name === tag));
    }

    if (exportCsv) {
      const headers = ["Nome", "Telefone", "Email", "Cidade", "Estado", "Status", "Score", "Temperatura", "Origem", "Canal", "Campanha", "Atendente", "Criado em"];
      const rows = contacts.map((contact) => [
        contact.name,
        contact.phone,
        contact.email,
        contact.city,
        contact.state,
        contact.status,
        contact.score,
        contact.temperature,
        contact.source,
        contact.channel,
        contact.campaign_id,
        contact.assigned_user?.name,
        contact.created_at,
      ]);
      await writeAuditLog({
        admin,
        workspaceId,
        userId: profileId,
        request,
        action: "contact.csv_exported",
        targetType: "contact",
        details: { total: contacts.length },
      });
      return new NextResponse([headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=ozion-contatos.csv",
        },
      });
    }

    return NextResponse.json({ contacts, total: count ?? contacts.length, page, limit });
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

    if (body?.action === "duplicate") {
      const id = z.string().uuid().parse(body.id);
      const { data: original, error: lookupError } = await admin
        .from("contacts")
        .select("*, contact_tags(tag:tags(name))")
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .single();
      if (lookupError) throw lookupError;

      const { id: _id, created_at: _createdAt, updated_at: _updatedAt, deleted_at: _deletedAt, contact_tags: contactTags, ...copy } = original;
      void _id; void _createdAt; void _updatedAt; void _deletedAt;
      const { data, error } = await admin
        .from("contacts")
        .insert({
          ...copy,
          name: `Cópia de ${original.name}`,
          customer_id: customerId,
          workspace_id: workspaceId,
          created_by: profileId,
          updated_by: null,
          last_interaction_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      await syncTags(context, data.id, (contactTags ?? []).map((item: { tag?: { name?: string } }) => item.tag?.name).filter(Boolean));
      await addTimeline({ context, contactId: data.id, eventType: "contact.duplicated", title: "Contato duplicado", description: `Criado a partir de ${original.name}.` });
      await writeAuditLog({ admin, workspaceId, userId: profileId, request, action: "contact.duplicated", targetType: "contact", targetId: data.id });
      return NextResponse.json({ contact: data }, { status: 201 });
    }

    const parsed = contactInput.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Contato inválido." }, { status: 400 });
    }

    const { tags = [], custom_fields, ...input } = parsed.data;
    const { count, error: countError } = await admin
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null);
    if (countError) throw countError;
    await requirePlanLimit({ context, request, limit: "contacts", currentCount: count ?? 0, message: "Limite de contatos atingido. Faça upgrade do plano." });

    const { data, error } = await admin
      .from("contacts")
      .insert({
        ...contactPayload(input),
        customer_id: customerId,
        workspace_id: workspaceId,
        created_by: profileId,
      })
      .select()
      .single();
    if (error) throw error;

    await syncTags(context, data.id, tags);
    await saveCustomValues(context, data.id, custom_fields);
    await addTimeline({ context, contactId: data.id, eventType: "contact.created", title: "Contato criado", description: `${data.name} foi criado no CRM.` });
    await writeAuditLog({ admin, workspaceId, userId: profileId, request, action: "contact.created", targetType: "contact", targetId: data.id, details: { name: data.name } });

    return NextResponse.json({ contact: data }, { status: 201 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "O ID do contato é obrigatório." }, { status: 400 });

    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    await requirePlanModule({ context, request, module: "crm" });
    const { admin, workspaceId, profileId } = context;
    const parsed = contactPatch.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Contato inválido." }, { status: 400 });
    }

    const { tags, custom_fields, ...input } = parsed.data;
    const { data: before } = await admin.from("contacts").select("status,assigned_user_id").eq("id", id).eq("workspace_id", workspaceId).maybeSingle();
    const { data, error } = await admin
      .from("contacts")
      .update({
        ...contactPayload(input),
        updated_by: profileId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .select()
      .single();
    if (error) throw error;

    if (tags) {
      await syncTags(context, id, tags);
      await addTimeline({ context, contactId: id, eventType: "tag.updated", title: "Tags atualizadas", description: tags.join(", ") || "Tags removidas." });
    }
    await saveCustomValues(context, id, custom_fields);

    if (before?.status && parsed.data.status && before.status !== parsed.data.status) {
      await addTimeline({ context, contactId: id, eventType: "status.changed", title: "Status alterado", description: `${before.status} → ${parsed.data.status}` });
    } else if (before?.assigned_user_id !== parsed.data.assigned_user_id && "assigned_user_id" in parsed.data) {
      await addTimeline({ context, contactId: id, eventType: "attendant.changed", title: "Atendente atualizado" });
    } else {
      await addTimeline({ context, contactId: id, eventType: "contact.updated", title: "Contato editado" });
    }

    await writeAuditLog({ admin, workspaceId, userId: profileId, request, action: "contact.updated", targetType: "contact", targetId: id });
    return NextResponse.json({ contact: data });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "O ID do contato é obrigatório." }, { status: 400 });

    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    await requirePlanModule({ context, request, module: "crm" });
    const { admin, workspaceId, profileId } = context;
    const deletedAt = new Date().toISOString();
    const { error } = await admin
      .from("contacts")
      .update({ deleted_at: deletedAt, updated_by: profileId, updated_at: deletedAt })
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null);
    if (error) throw error;
    await addTimeline({ context, contactId: id, eventType: "contact.deleted", title: "Contato excluído", description: "Soft delete aplicado." });
    await writeAuditLog({ admin, workspaceId, userId: profileId, request, action: "contact.deleted", targetType: "contact", targetId: id });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
