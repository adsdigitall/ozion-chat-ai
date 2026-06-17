import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError } from "@/lib/server/supabase-admin";

const contactInput = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(7).max(30),
  email: z.string().trim().email().nullable().optional().or(z.literal("")),
  city: z.string().trim().max(100).nullable().optional(),
  state: z.string().trim().max(50).nullable().optional(),
  status: z.enum(["new", "interested", "qualified", "proposal", "won", "lost", "risk"]).default("new"),
  origin: z.string().trim().max(100).nullable().optional(),
  campaign: z.string().trim().max(160).nullable().optional(),
  score: z.coerce.number().int().min(0).max(100).default(0),
  temperature: z.enum(["hot", "warm", "cold"]).default("cold"),
  ai_summary: z.string().trim().max(4000).nullable().optional(),
  custom_fields: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
});

const contactPatch = contactInput.partial();

export async function GET(request: NextRequest) {
  try {
    const { admin, workspaceId } = await getRequestContext(request);
    const params = request.nextUrl.searchParams;
    const status = params.get("status");
    const search = params.get("search")?.trim();
    const page = Math.max(1, Number(params.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? 50)));
    const from = (page - 1) * limit;

    let query = admin
      .from("contacts")
      .select("*", { count: "exact" })
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    if (status && status !== "all") query = query.eq("status", status);
    if (search) {
      const safeSearch = search.replaceAll(",", " ");
      query = query.or(`name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const contacts = (data ?? []).map((contact) => ({
      ...contact,
      tags: Array.isArray(contact.custom_fields?.tags) ? contact.custom_fields.tags : [],
    }));
    return NextResponse.json({ contacts, total: count ?? 0, page, limit });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin, workspaceId } = await getRequestContext(request);
    const parsed = contactInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid contact." }, { status: 400 });
    }

    const { tags, custom_fields, ...contact } = parsed.data;
    const payload = {
      ...contact,
      email: parsed.data.email || null,
      custom_fields: { ...(custom_fields ?? {}), tags: tags ?? [] },
      workspace_id: workspaceId,
    };
    const { data, error } = await admin.from("contacts").insert(payload).select().single();
    if (error) throw error;
    return NextResponse.json({ contact: data }, { status: 201 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Contact id is required." }, { status: 400 });

    const { admin, workspaceId } = await getRequestContext(request);
    const parsed = contactPatch.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid contact." }, { status: 400 });
    }

    const { tags, custom_fields, ...contact } = parsed.data;
    const update = {
      ...contact,
      ...("email" in parsed.data ? { email: parsed.data.email || null } : {}),
      ...(tags || custom_fields
        ? { custom_fields: { ...(custom_fields ?? {}), ...(tags ? { tags } : {}) } }
        : {}),
    };
    const { data, error } = await admin
      .from("contacts")
      .update(update)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ contact: data });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Contact id is required." }, { status: 400 });

    const { admin, workspaceId } = await getRequestContext(request);
    const { error } = await admin.from("contacts").delete().eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
