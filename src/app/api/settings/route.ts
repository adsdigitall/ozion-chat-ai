import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRequestContext, publicServerError, writeAuditLog } from "@/lib/server/supabase-admin";

const settingsInput = z.object({
  profile: z
    .object({
      name: z.string().trim().min(1).max(120).optional(),
      email: z.string().trim().email().max(250).optional(),
      phone: z.string().trim().max(40).optional(),
    })
    .optional(),
  company: z
    .object({
      name: z.string().trim().min(1).max(160).optional(),
      description: z.string().trim().max(1000).optional(),
      logo_url: z.string().trim().url().max(1000).optional().or(z.literal("")),
      color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      document: z.string().trim().max(40).optional(),
      website: z.string().trim().max(300).optional(),
      timezone: z.string().trim().max(80).optional(),
    })
    .optional(),
  notifications: z.record(z.string(), z.boolean()).optional(),
  appearance: z
    .object({
      theme: z.enum(["dark", "light", "system"]).optional(),
      accent: z.enum(["emerald", "blue", "purple", "amber", "red", "pink"]).optional(),
    })
    .optional(),
});

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function GET(request: NextRequest) {
  try {
    const { admin, workspaceId, profileId } = await getRequestContext(request);
    const [workspaceResult, profileResult] = await Promise.all([
      admin.from("workspaces").select("id,name,slug,plan,logo,logo_url,description,color,status,settings").eq("id", workspaceId).single(),
      profileId
        ? admin.from("users").select("id,name,email,avatar,role").eq("id", profileId).single()
        : admin
            .from("users")
            .select("id,name,email,avatar,role")
            .eq("workspace_id", workspaceId)
            .order("created_at", { ascending: true })
            .limit(1)
            .single(),
    ]);
    if (workspaceResult.error) throw workspaceResult.error;
    if (profileResult.error) throw profileResult.error;

    const settings = objectValue(workspaceResult.data.settings);
    return NextResponse.json({
      profile: {
        ...profileResult.data,
        phone: typeof settings.profilePhone === "string" ? settings.profilePhone : "",
      },
      company: {
        id: workspaceResult.data.id,
        name: workspaceResult.data.name,
        slug: workspaceResult.data.slug,
        plan: workspaceResult.data.plan,
        logo: workspaceResult.data.logo_url ?? workspaceResult.data.logo,
        description: workspaceResult.data.description ?? "",
        color: workspaceResult.data.color ?? "#10b981",
        status: workspaceResult.data.status ?? "active",
        document: typeof settings.companyDocument === "string" ? settings.companyDocument : "",
        website: typeof settings.companyWebsite === "string" ? settings.companyWebsite : "",
        timezone:
          typeof settings.timezone === "string" ? settings.timezone : "America/Sao_Paulo",
      },
      notifications: objectValue(settings.notifications),
      appearance: {
        theme: typeof settings.theme === "string" ? settings.theme : "dark",
        accent: typeof settings.accent === "string" ? settings.accent : "emerald",
      },
    });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { admin, workspaceId, profileId } = await getRequestContext(request);
    const parsed = settingsInput.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Configuração inválida." },
        { status: 400 },
      );
    }

    const { data: workspace, error: workspaceError } = await admin
      .from("workspaces")
      .select("settings")
      .eq("id", workspaceId)
      .single();
    if (workspaceError) throw workspaceError;

    const currentSettings = objectValue(workspace.settings);
    const nextSettings = {
      ...currentSettings,
      ...(parsed.data.profile?.phone !== undefined
        ? { profilePhone: parsed.data.profile.phone }
        : {}),
      ...(parsed.data.company?.document !== undefined
        ? { companyDocument: parsed.data.company.document }
        : {}),
      ...(parsed.data.company?.website !== undefined
        ? { companyWebsite: parsed.data.company.website }
        : {}),
      ...(parsed.data.company?.timezone !== undefined
        ? { timezone: parsed.data.company.timezone }
        : {}),
      ...(parsed.data.notifications
        ? {
            notifications: {
              ...objectValue(currentSettings.notifications),
              ...parsed.data.notifications,
            },
          }
        : {}),
      ...(parsed.data.appearance?.theme ? { theme: parsed.data.appearance.theme } : {}),
      ...(parsed.data.appearance?.accent ? { accent: parsed.data.appearance.accent } : {}),
    };

    const updates = [];
    if (parsed.data.profile && profileId) {
      const profileFields: Record<string, unknown> = { ...parsed.data.profile };
      delete profileFields.phone;
      if (Object.keys(profileFields).length) {
        updates.push(
          admin.from("users").update(profileFields).eq("id", profileId).eq("workspace_id", workspaceId),
        );
      }
    }

    const workspaceFields: Record<string, unknown> = { settings: nextSettings };
    if (parsed.data.company?.name) workspaceFields.name = parsed.data.company.name;
    if (parsed.data.company?.description !== undefined) workspaceFields.description = parsed.data.company.description;
    if (parsed.data.company?.logo_url !== undefined) workspaceFields.logo_url = parsed.data.company.logo_url || null;
    if (parsed.data.company?.color) workspaceFields.color = parsed.data.company.color;
    updates.push(admin.from("workspaces").update(workspaceFields).eq("id", workspaceId));

    const results = await Promise.all(updates);
    const updateError = results.map((result) => result.error).find(Boolean);
    if (updateError) throw updateError;

    await writeAuditLog({
      admin,
      workspaceId,
      userId: profileId,
      request,
      action: "settings.updated",
      targetType: "workspace",
      targetId: workspaceId,
      details: { sections: Object.keys(parsed.data) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
