import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ElevenLabsService } from "@/lib/services/elevenlabs";
import { getConnectedIntegrationSecret, getRequestContext, publicServerError } from "@/lib/server/supabase-admin";

const voiceInput = z.object({
  name: z.string().trim().min(1).max(120),
  provider: z.enum(["elevenlabs", "openai", "cartesia"]),
  voice_id: z.string().trim().min(1).max(200),
  language: z.string().trim().max(20).default("pt-BR"),
  gender: z.string().trim().max(40).nullable().optional(),
  style: z.string().trim().max(80).nullable().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  is_cloned: z.boolean().default(false),
  clone_source_url: z.string().url().nullable().optional(),
  is_favorite: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const { admin, workspaceId } = await getRequestContext(request);
    const { data, error } = await admin.from("voice_configs").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
    if (error) throw error;

    const localVoices = data ?? [];
    const configuredVoiceIds = new Set(localVoices.map((voice) => voice.voice_id).filter(Boolean));
    const elevenlabsKey = await getConnectedIntegrationSecret({
      admin,
      workspaceId,
      type: "elevenlabs",
      fallback: process.env.ELEVENLABS_API_KEY,
    });

    let elevenlabsVoices: Array<Record<string, unknown>> = [];
    let elevenlabsUsage: Record<string, unknown> | null = null;
    if (elevenlabsKey) {
      try {
        const service = new ElevenLabsService(elevenlabsKey);
        const [remoteVoices, subscription] = await Promise.all([
          service.getVoices(),
          service.getSubscription().catch(() => null),
        ]);
        if (subscription) {
          const used = Number(subscription.character_count ?? 0);
          const limit = Number(subscription.character_limit ?? 0);
          elevenlabsUsage = {
            provider: "elevenlabs",
            tier: subscription.tier ?? null,
            used,
            limit,
            remaining: Math.max(limit - used, 0),
            resetAt: subscription.next_character_count_reset_unix
              ? new Date(subscription.next_character_count_reset_unix * 1000).toISOString()
              : null,
          };
        }
        elevenlabsVoices = remoteVoices
          .filter((voice: Record<string, unknown>) =>
            typeof voice.voice_id === "string" &&
            !configuredVoiceIds.has(voice.voice_id) &&
            (voice.category === "cloned" || voice.category === "instant_voice_cloning" || voice.category === "professional_voice_cloning")
          )
          .map((voice: Record<string, unknown>) => ({
            id: `elevenlabs-remote-${voice.voice_id}`,
            workspace_id: workspaceId,
            name: typeof voice.name === "string" ? voice.name : "ElevenLabs Voice",
            provider: "elevenlabs",
            voice_id: voice.voice_id,
            language: "pt-BR",
            gender: null,
            style: typeof voice.category === "string" ? voice.category : "ElevenLabs",
            config: { source: "elevenlabs_remote" },
            is_cloned: true,
            clone_source_url: null,
            is_favorite: false,
            created_at: new Date().toISOString(),
          }));
      } catch (voiceError) {
        return NextResponse.json({
          voices: localVoices,
          warning: voiceError instanceof Error ? voiceError.message : "Falha ao carregar vozes da ElevenLabs.",
        });
      }
    }

    return NextResponse.json({ voices: [...elevenlabsVoices, ...localVoices], usage: elevenlabsUsage });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { admin, workspaceId } = await getRequestContext(request);
    const parsed = voiceInput.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid voice." }, { status: 400 });
    const { data, error } = await admin.from("voice_configs").insert({ ...parsed.data, workspace_id: workspaceId }).select().single();
    if (error) throw error;
    return NextResponse.json({ voice: data }, { status: 201 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Voice id is required." }, { status: 400 });
    const { admin, workspaceId } = await getRequestContext(request);
    const parsed = voiceInput.partial().safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid voice." }, { status: 400 });
    const { data, error } = await admin.from("voice_configs").update(parsed.data).eq("id", id).eq("workspace_id", workspaceId).select().single();
    if (error) throw error;
    return NextResponse.json({ voice: data });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Voice id is required." }, { status: 400 });
    const { admin, workspaceId } = await getRequestContext(request);
    const deleteRemote = request.nextUrl.searchParams.get("remote") === "1";
    const remoteVoiceId = request.nextUrl.searchParams.get("voiceId");

    if (deleteRemote && remoteVoiceId) {
      const apiKey = await getConnectedIntegrationSecret({
        admin,
        workspaceId,
        type: "elevenlabs",
        fallback: process.env.ELEVENLABS_API_KEY,
      });
      if (!apiKey) return NextResponse.json({ error: "Configure a ElevenLabs em Integrações." }, { status: 409 });
      await new ElevenLabsService(apiKey).deleteVoice(remoteVoiceId);
    }

    if (!id.startsWith("elevenlabs-remote-")) {
      const { error } = await admin.from("voice_configs").delete().eq("id", id).eq("workspace_id", workspaceId);
      if (error) throw error;
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
