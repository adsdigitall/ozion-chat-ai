import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsService } from "@/lib/services/elevenlabs";
import { getConnectedIntegrationSecret, getRequestContext, publicServerError, requireActiveCustomer } from "@/lib/server/supabase-admin";
import { requirePlanLimit, requirePlanModule } from "@/lib/server/plan-guards";

export async function POST(request: NextRequest) {
  try {
    const context = await getRequestContext(request);
    requireActiveCustomer(context);
    await requirePlanModule({ context, request, module: "voice" });
    const { admin, workspaceId, profileId } = context;
    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const files = formData
      .getAll("files")
      .filter((file): file is File => file instanceof File && file.size > 0);

    if (name.length < 2) {
      return NextResponse.json({ error: "Informe um nome para a voz." }, { status: 400 });
    }
    if (!files.length) {
      return NextResponse.json({ error: "Envie pelo menos um áudio de amostra." }, { status: 400 });
    }

    const { count } = await admin
      .from("voice_configs")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
    await requirePlanLimit({
      context,
      request,
      limit: "voices",
      currentCount: count ?? 0,
      message: "Limite de vozes atingido. Faça upgrade do plano.",
    });

    const apiKey = await getConnectedIntegrationSecret({
      admin,
      workspaceId,
      type: "elevenlabs",
      fallback: process.env.ELEVENLABS_API_KEY,
    });
    if (!apiKey) return NextResponse.json({ error: "Configure a ElevenLabs em Integrações." }, { status: 409 });

    const cloned = await new ElevenLabsService(apiKey).cloneVoice(name, files, description || undefined);
    if (!cloned.voice_id) {
      return NextResponse.json({ error: "A ElevenLabs não retornou o ID da voz clonada." }, { status: 502 });
    }

    const { data, error } = await admin
      .from("voice_configs")
      .insert({
        workspace_id: workspaceId,
        created_by: profileId,
        name: cloned.name || name,
        provider: "elevenlabs",
        voice_id: cloned.voice_id,
        language: "pt-BR",
        gender: null,
        style: "cloned",
        config: { source: "elevenlabs_clone" },
        is_cloned: true,
        is_favorite: false,
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ voice: data }, { status: 201 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
