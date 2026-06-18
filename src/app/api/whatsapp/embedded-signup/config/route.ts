import { NextRequest, NextResponse } from "next/server";
import { getRequestContext, publicServerError } from "@/lib/server/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    await getRequestContext(request);

    const appId = process.env.META_APP_ID;
    const configurationId = process.env.META_EMBEDDED_SIGNUP_CONFIGURATION_ID;
    const graphApiVersion = process.env.META_GRAPH_API_VERSION || "v23.0";

    if (!appId || !configurationId) {
      return NextResponse.json({ ready: false });
    }

    return NextResponse.json({
      ready: true,
      appId,
      configurationId,
      graphApiVersion,
    });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
