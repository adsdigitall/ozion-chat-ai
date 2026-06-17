import { NextRequest, NextResponse } from "next/server";
import { fetchMetaCampaigns } from "@/lib/services/meta-ctwa";
import { getRequestContext, publicServerError, writeAuditLog } from "@/lib/server/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { admin, workspaceId, profileId } = await getRequestContext(request);
    const { data: integration, error } = await admin
      .from("integrations")
      .select("id,credentials,config")
      .eq("workspace_id", workspaceId)
      .eq("type", "meta_ctwa")
      .eq("status", "connected")
      .single();
    if (error || !integration) {
      return NextResponse.json({ error: "Conecte sua conta Meta primeiro." }, { status: 409 });
    }
    const accessToken = integration.credentials?.accessToken;
    const adAccountId = integration.config?.adAccountId;
    const pixelId = integration.config?.pixelId;
    if (typeof accessToken !== "string" || typeof adAccountId !== "string" || typeof pixelId !== "string") {
      return NextResponse.json({ error: "A configuração Meta está incompleta." }, { status: 409 });
    }

    const campaigns = await fetchMetaCampaigns({ accessToken, adAccountId, pixelId });
    for (const campaign of campaigns) {
      const { data: existing } = await admin
        .from("campaigns")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("platform", "meta")
        .eq("external_id", campaign.external_id)
        .maybeSingle();
      if (existing) {
        const { error: updateError } = await admin
          .from("campaigns")
          .update({ ...campaign, updated_at: new Date().toISOString() })
          .eq("id", existing.id)
          .eq("workspace_id", workspaceId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await admin
          .from("campaigns")
          .insert({ ...campaign, workspace_id: workspaceId });
        if (insertError) throw insertError;
      }
    }
    await admin
      .from("integrations")
      .update({ last_sync_at: new Date().toISOString(), last_error: null })
      .eq("id", integration.id);
    await writeAuditLog({
      admin,
      workspaceId,
      userId: profileId,
      request,
      action: "ctwa.synced",
      targetType: "campaign",
      details: { campaigns: campaigns.length },
    });
    return NextResponse.json({ synchronized: campaigns.length });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
