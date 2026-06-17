import { NextRequest, NextResponse } from "next/server";
import { HealthCheckService } from "@/lib/services/health-check";
import { getConnectedIntegrationSecret, getRequestContext, publicServerError } from "@/lib/server/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const health = new HealthCheckService();
    const { admin, workspaceId } = await getRequestContext(request);

    const [{ data: whatsappConnection }, openaiKey, elevenlabsKey, geminiKey, claudeKey, groqKey] = await Promise.all([
      admin
        .from("whatsapp_connections")
        .select("access_token,phone_number_id")
        .eq("workspace_id", workspaceId)
        .eq("status", "connected")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      getConnectedIntegrationSecret({ admin, workspaceId, type: "openai", fallback: process.env.OPENAI_API_KEY }),
      getConnectedIntegrationSecret({ admin, workspaceId, type: "elevenlabs", fallback: process.env.ELEVENLABS_API_KEY }),
      getConnectedIntegrationSecret({ admin, workspaceId, type: "gemini", fallback: process.env.GEMINI_API_KEY }),
      getConnectedIntegrationSecret({ admin, workspaceId, type: "claude", fallback: process.env.CLAUDE_API_KEY }),
      getConnectedIntegrationSecret({ admin, workspaceId, type: "groq", fallback: process.env.GROQ_API_KEY }),
    ]);

    const credentials: Record<string, string> = {
      whatsappToken: whatsappConnection?.access_token || process.env.WHATSAPP_ACCESS_TOKEN || "",
      whatsappPhoneId: whatsappConnection?.phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || "",
      openaiKey: openaiKey || "",
      elevenlabsKey: elevenlabsKey || "",
      geminiKey: geminiKey || "",
      claudeKey: claudeKey || "",
      groqKey: groqKey || "",
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    };

    const results = await health.runAllChecks(credentials);
    const summary = {
      total: results.length,
      online: results.filter((result) => result.status === "online").length,
      error: results.filter((result) => result.status === "error").length,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({ summary, services: results });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
