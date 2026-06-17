import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ElevenLabsService } from "@/lib/services/elevenlabs";
import { getConnectedIntegrationSecret, getRequestContext, publicServerError } from "@/lib/server/supabase-admin";

const generateInput = z.object({
  text: z.string().trim().min(1).max(5000),
  voiceId: z.string().trim().min(1).max(200),
  provider: z.enum(["elevenlabs", "openai"]),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { admin, workspaceId } = await getRequestContext(request);
    const parsed = generateInput.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid voice request." }, { status: 400 });

    if (parsed.data.provider === "elevenlabs") {
      const apiKey = await getConnectedIntegrationSecret({
        admin,
        workspaceId,
        type: "elevenlabs",
        fallback: process.env.ELEVENLABS_API_KEY,
      });
      if (!apiKey) return NextResponse.json({ error: "Configure a ElevenLabs em Integrações." }, { status: 409 });
      const service = new ElevenLabsService(apiKey);
      const audio = await service.generateSpeech(parsed.data.voiceId, parsed.data.text, parsed.data.settings);
      return new NextResponse(audio, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-store",
          "X-Ozion-Estimated-Credits": String(Array.from(parsed.data.text).length),
        },
      });
    }

    const apiKey = await getConnectedIntegrationSecret({
      admin,
      workspaceId,
      type: "openai",
      fallback: process.env.OPENAI_API_KEY,
    });
    if (!apiKey) return NextResponse.json({ error: "Configure a OpenAI em Integrações." }, { status: 409 });
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
        input: parsed.data.text,
        voice: parsed.data.voiceId,
        response_format: "mp3",
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI TTS failed (${response.status}): ${detail.slice(0, 300)}`);
    }
    return new NextResponse(await response.arrayBuffer(), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
