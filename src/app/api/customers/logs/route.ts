import { NextRequest, NextResponse } from "next/server";
import { getRequestContext, publicServerError, requirePermission } from "@/lib/server/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const customerId = request.nextUrl.searchParams.get("customerId");
    if (!customerId) return NextResponse.json({ error: "Cliente obrigatório." }, { status: 400 });

    const context = await getRequestContext(request);
    requirePermission(context, "customers.view");

    const { data, error } = await context.admin
      .from("audit_logs")
      .select("id,action,target_type,target_id,details,ip_address,created_at")
      .eq("target_type", "customer")
      .eq("target_id", customerId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;

    return NextResponse.json({ logs: data ?? [] });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
