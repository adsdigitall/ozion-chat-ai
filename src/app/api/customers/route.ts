import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { getRequestContext, publicServerError, requirePermission, writeAuditLog } from "@/lib/server/supabase-admin";

const planSchema = z.enum(["start", "pro", "scale", "enterprise"]);
const statusSchema = z.enum(["active", "suspended", "inactive"]);

const customerInput = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(160),
  company: z.string().trim().min(2, "Informe a empresa.").max(180),
  email: z.string().trim().email("Informe um e-mail válido.").max(250),
  phone: z.string().trim().max(40).optional().nullable(),
  plan_id: planSchema.default("start"),
  status: statusSchema.default("active"),
});

const customerPatch = customerInput.partial();

function slugFromCustomer(id: string) {
  return `cliente-${id.replaceAll("-", "").slice(0, 16)}`;
}

function temporaryPassword() {
  return `Oz!${randomBytes(18).toString("base64url")}9`;
}

async function listCustomers(admin: SupabaseClient) {
  const { data: customers, error } = await admin
    .from("customers")
    .select("id,name,company,email,phone,status,plan_id,created_at,updated_at,last_access_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const customerIds = (customers ?? []).map((customer) => customer.id);
  if (!customerIds.length) return [];

  const [{ data: workspaces }, { data: users }] = await Promise.all([
    admin.from("workspaces").select("id,customer_id").in("customer_id", customerIds),
    admin.from("users").select("id,customer_id").in("customer_id", customerIds),
  ]);

  return (customers ?? []).map((customer) => ({
    ...customer,
    workspaces_count: (workspaces ?? []).filter((workspace) => workspace.customer_id === customer.id).length,
    users_count: (users ?? []).filter((user) => user.customer_id === customer.id).length,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requirePermission(context, "customers.view");
    const customers = await listCustomers(context.admin);
    return NextResponse.json({ customers });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requirePermission(context, "customers.view");
    const parsed = customerInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Cliente inválido." }, { status: 400 });
    }

    const admin = context.admin;
    const input = {
      ...parsed.data,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone || null,
    };

    const { data: customer, error: customerError } = await admin
      .from("customers")
      .insert(input)
      .select("id,name,company,email,phone,status,plan_id,created_at,updated_at,last_access_at")
      .single();
    if (customerError) throw customerError;

    const password = temporaryPassword();
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: input.email,
      password,
      email_confirm: true,
      user_metadata: { name: input.name, full_name: input.name, customer_id: customer.id },
      app_metadata: { customer_id: customer.id, role: "client" },
    });
    if (authError || !authUser.user) {
      await admin.from("customers").delete().eq("id", customer.id);
      throw authError || new Error("Não foi possível criar o usuário administrador.");
    }

    const { data: workspace, error: workspaceError } = await admin
      .from("workspaces")
      .insert({
        name: input.company,
        slug: slugFromCustomer(customer.id),
        owner_id: authUser.user.id,
        plan: input.plan_id,
        customer_id: customer.id,
      })
      .select("id")
      .single();
    if (workspaceError) throw workspaceError;

    const { error: userError } = await admin.from("users").insert({
      auth_id: authUser.user.id,
      email: input.email,
      name: input.name,
      role: "client",
      workspace_id: workspace.id,
      customer_id: customer.id,
    });
    if (userError) throw userError;

    await admin.from("subscriptions").upsert({
      customer_id: customer.id,
      plan_id: input.plan_id,
      status: input.status === "active" ? "active" : "inactive",
      current_period_start: new Date().toISOString(),
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "customer_id" });

    await writeAuditLog({
      admin,
      workspaceId: context.adminWorkspaceId ?? context.workspaceId,
      userId: context.profileId,
      request,
      action: "customer.created",
      targetType: "customer",
      targetId: customer.id,
      details: { email: customer.email, company: customer.company, plan_id: customer.plan_id, workspace_id: workspace.id },
    });

    return NextResponse.json({
      customer: { ...customer, workspaces_count: 1, users_count: 1 },
      temporary_password: password,
    }, { status: 201 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID do cliente é obrigatório." }, { status: 400 });

    const context = await getRequestContext(request);
    requirePermission(context, "customers.view");
    const parsed = customerPatch.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Cliente inválido." }, { status: 400 });
    }

    const { data: previousCustomer } = await context.admin
      .from("customers")
      .select("status")
      .eq("id", id)
      .maybeSingle();

    const payload = {
      ...parsed.data,
      email: parsed.data.email?.toLowerCase(),
      phone: parsed.data.phone || undefined,
      updated_at: new Date().toISOString(),
    };

    const { data: customer, error } = await context.admin
      .from("customers")
      .update(payload)
      .eq("id", id)
      .select("id,name,company,email,phone,status,plan_id,created_at,updated_at,last_access_at")
      .single();
    if (error) throw error;

    if (parsed.data.plan_id) {
      await context.admin.from("workspaces").update({ plan: parsed.data.plan_id }).eq("customer_id", id);
      await context.admin.from("subscriptions").upsert({
        customer_id: id,
        plan_id: parsed.data.plan_id,
        status: "active",
        current_period_start: new Date().toISOString(),
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "customer_id" });
    }
    if (parsed.data.email || parsed.data.name) {
      await context.admin
        .from("users")
        .update({
          email: parsed.data.email?.toLowerCase(),
          name: parsed.data.name,
          updated_at: new Date().toISOString(),
        })
        .eq("customer_id", id);
    }

    const action = parsed.data.plan_id
      ? "customer.plan_applied"
      : previousCustomer?.status !== parsed.data.status && parsed.data.status === "suspended"
      ? "customer.suspended"
      : previousCustomer?.status !== parsed.data.status && parsed.data.status === "active"
        ? "customer.reactivated"
        : "customer.edited";

    await writeAuditLog({
      admin: context.admin,
      workspaceId: context.adminWorkspaceId ?? context.workspaceId,
      userId: context.profileId,
      request,
      action,
      targetType: "customer",
      targetId: id,
      details: parsed.data,
    });

    return NextResponse.json({ customer });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID do cliente é obrigatório." }, { status: 400 });

    const context = await getRequestContext(request);
    requirePermission(context, "customers.view");
    const admin = context.admin;

    const { data: users, error: userLookupError } = await admin
      .from("users")
      .select("auth_id")
      .eq("customer_id", id);
    if (userLookupError) throw userLookupError;

    await writeAuditLog({
      admin,
      workspaceId: context.adminWorkspaceId ?? context.workspaceId,
      userId: context.profileId,
      request,
      action: "customer.deleted",
      targetType: "customer",
      targetId: id,
    });

    await admin.from("users").delete().eq("customer_id", id);
    await admin.from("workspaces").delete().eq("customer_id", id);
    const { error } = await admin.from("customers").delete().eq("id", id);
    if (error) throw error;

    for (const user of users ?? []) {
      if (user.auth_id) await admin.auth.admin.deleteUser(user.auth_id);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
