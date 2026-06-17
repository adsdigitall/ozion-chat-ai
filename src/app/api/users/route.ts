import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, writeAuditLog } from "@/lib/server/supabase-admin";

const userInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(250),
  role: z.enum(["master", "admin", "agent", "viewer"]).default("agent"),
});

export async function GET(request: NextRequest) {
  try {
    const { admin, workspaceId } = await getRequestContext(request);
    const { data, error } = await admin
      .from("users")
      .select("id,name,email,avatar,role,auth_id,created_at,updated_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ users: data ?? [] });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin, workspaceId, profileId } = await getRequestContext(request);
    const parsed = userInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Usuário inválido." }, { status: 400 });
    }

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      parsed.data.email,
      {
        data: { name: parsed.data.name, workspace_id: workspaceId },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin}/login`,
      },
    );
    if (inviteError) throw inviteError;

    const { data, error } = await admin
      .from("users")
      .insert({
        ...parsed.data,
        auth_id: invited.user.id,
        workspace_id: workspaceId,
      })
      .select("id,name,email,avatar,role,auth_id,created_at,updated_at")
      .single();
    if (error) throw error;
    await writeAuditLog({
      admin,
      workspaceId,
      userId: profileId,
      request,
      action: "user.invited",
      targetType: "user",
      targetId: data.id,
      details: { name: data.name, email: data.email, role: data.role },
    });
    return NextResponse.json({ user: data }, { status: 201 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "O ID do usuário é obrigatório." }, { status: 400 });
    const { admin, workspaceId } = await getRequestContext(request);
    const parsed = userInput.partial().safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Usuário inválido." }, { status: 400 });
    }
    const { data, error } = await admin
      .from("users")
      .update(parsed.data)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select("id,name,email,avatar,role,auth_id,created_at,updated_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ user: data });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "O ID do usuário é obrigatório." }, { status: 400 });
    const { admin, workspaceId, profileId } = await getRequestContext(request);
    if (id === profileId) {
      return NextResponse.json({ error: "Você não pode remover seu próprio usuário." }, { status: 409 });
    }
    const { data: user, error: lookupError } = await admin
      .from("users")
      .select("auth_id,role")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();
    if (lookupError) throw lookupError;
    if (user.role === "master") {
      return NextResponse.json({ error: "O usuário master não pode ser removido." }, { status: 409 });
    }
    const { error } = await admin.from("users").delete().eq("id", id).eq("workspace_id", workspaceId);
    if (error) throw error;
    if (user.auth_id) await admin.auth.admin.deleteUser(user.auth_id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
