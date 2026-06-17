import { NextRequest, NextResponse } from "next/server";
import { getRequestContext, publicServerError } from "@/lib/server/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const { admin, workspaceId } = await getRequestContext(request);
    const { data, error } = await admin
      .from("audit_logs")
      .select("id,action,target_type,target_id,details,ip_address,created_at,user:users(name,email)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return NextResponse.json({ logs: data ?? [] });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
