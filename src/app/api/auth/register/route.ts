import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, publicServerError } from "@/lib/server/supabase-admin";

const registerInput = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(120),
  email: z.string().trim().email("Informe um e-mail válido.").max(250),
  password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres.").max(120),
});

function workspaceSlug(userId: string) {
  return `workspace-${userId.replaceAll("-", "")}`;
}

export async function POST(request: NextRequest) {
  try {
    const parsed = registerInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Cadastro inválido." },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();
    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { name, full_name: name },
    });

    if (authError) {
      const alreadyExists = /already|exists|registered/i.test(authError.message);
      return NextResponse.json(
        {
          error: alreadyExists
            ? "Esse e-mail já existe. Entre com a senha cadastrada ou use outro e-mail."
            : authError.message,
        },
        { status: alreadyExists ? 409 : 400 },
      );
    }

    if (!authUser.user) {
      return NextResponse.json({ error: "Não foi possível criar o usuário." }, { status: 500 });
    }

    const { data: existingProfile, error: profileLookupError } = await admin
      .from("users")
      .select("id,workspace_id")
      .eq("auth_id", authUser.user.id)
      .maybeSingle();
    if (profileLookupError) throw profileLookupError;

    if (existingProfile?.workspace_id) {
      await admin
        .from("users")
        .update({ name, email: normalizedEmail, role: "master" })
        .eq("id", existingProfile.id);

      return NextResponse.json({
        user: { id: authUser.user.id, email: normalizedEmail, name, workspace_id: existingProfile.workspace_id },
      });
    }

    const { data: workspace, error: workspaceError } = await admin
      .from("workspaces")
      .insert({
        name,
        slug: workspaceSlug(authUser.user.id),
        owner_id: authUser.user.id,
        plan: "free",
      })
      .select("id")
      .single();
    if (workspaceError) throw workspaceError;

    const { data: profile, error: profileError } = await admin
      .from("users")
      .insert({
        auth_id: authUser.user.id,
        email: normalizedEmail,
        name,
        role: "master",
        workspace_id: workspace.id,
      })
      .select("id,workspace_id")
      .single();
    if (profileError) throw profileError;

    return NextResponse.json(
      {
        user: {
          id: profile.id,
          email: normalizedEmail,
          name,
          workspace_id: profile.workspace_id,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
