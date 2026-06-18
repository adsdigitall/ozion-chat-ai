import { NextRequest, NextResponse } from "next/server";
import { getRequestContext, publicServerError } from "@/lib/server/supabase-admin";

type ConversationRow = {
  id: string;
  status: "open" | "waiting" | "closed";
  assigned_to: string | null;
  updated_at: string;
  contact: { name: string; phone: string } | { name: string; phone: string }[] | null;
  messages: { content: string | null; created_at: string }[] | null;
};

function singleRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function GET(request: NextRequest) {
  try {
    const { admin, workspaceId } = await getRequestContext(request);
    const tagFilter = request.nextUrl.searchParams.get("tag");

    const [
      contactsResult,
      conversationsResult,
      recentResult,
      salesResult,
      tagsResult,
      contactTagsResult,
      flowsResult,
      campaignsResult,
      agentsResult,
      usersResult,
    ] = await Promise.all([
      admin
        .from("contacts")
        .select("id,status,created_at")
        .eq("workspace_id", workspaceId),
      admin
        .from("conversations")
        .select("id,status,assigned_to,updated_at")
        .eq("workspace_id", workspaceId),
      admin
        .from("conversations")
        .select("id,status,assigned_to,updated_at,contact:contacts(name,phone),messages(content,created_at)")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false })
        .order("created_at", { referencedTable: "messages", ascending: false })
        .limit(5),
      admin
        .from("sales")
        .select("id,amount,status,created_at")
        .eq("workspace_id", workspaceId),
      admin
        .from("tags")
        .select("id,name,color")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true }),
      admin
        .from("contact_tags")
        .select("tag_id,contact_id,contact:contacts!inner(workspace_id)")
        .eq("contact.workspace_id", workspaceId),
      admin
        .from("flows")
        .select("id,name,status,version")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false }),
      admin
        .from("campaigns")
        .select("id,name,status,leads,purchases,spent,roi,roas")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false }),
      admin
        .from("ai_agents")
        .select("id,name,status,conversations_handled")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true }),
      admin
        .from("users")
        .select("id,name,role")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true }),
    ]);

    const firstError = [
      contactsResult.error,
      conversationsResult.error,
      recentResult.error,
      salesResult.error,
      tagsResult.error,
      contactTagsResult.error,
      flowsResult.error,
      campaignsResult.error,
      agentsResult.error,
      usersResult.error,
    ].find(Boolean);
    if (firstError) throw firstError;

    const contactTagRows = contactTagsResult.data ?? [];
    const tagContactIds = tagFilter && tagFilter !== "all"
      ? new Set(contactTagRows.filter((item) => item.tag_id === tagFilter).map((item) => item.contact_id))
      : null;
    const contacts = tagContactIds ? (contactsResult.data ?? []).filter((contact) => tagContactIds.has(contact.id)) : contactsResult.data ?? [];
    const conversations = conversationsResult.data ?? [];
    const sales = salesResult.data ?? [];
    const campaigns = campaignsResult.data ?? [];
    const completedSales = sales.filter((sale) => sale.status === "completed");
    const revenue = completedSales.reduce((total, sale) => total + Number(sale.amount ?? 0), 0);
    const wonContacts = contacts.filter((contact) => contact.status === "paid").length;
    const tagUsage = new Map<string, number>();

    for (const item of contactTagRows) {
      tagUsage.set(item.tag_id, (tagUsage.get(item.tag_id) ?? 0) + 1);
    }

    const assignedCounts = new Map<string, number>();
    for (const conversation of conversations) {
      if (conversation.assigned_to) {
        assignedCounts.set(
          conversation.assigned_to,
          (assignedCounts.get(conversation.assigned_to) ?? 0) + 1,
        );
      }
    }

    const recentConversations = ((recentResult.data ?? []) as ConversationRow[]).map((conversation) => {
      const contact = singleRelation(conversation.contact);
      const lastMessage = [...(conversation.messages ?? [])].sort(
        (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
      )[0];

      return {
        id: conversation.id,
        name: contact?.name ?? "Contato sem nome",
        phone: contact?.phone ?? "",
        lastMessage: lastMessage?.content ?? "Conversa iniciada",
        updatedAt: conversation.updated_at,
        status: conversation.status,
      };
    });

    const campaignLeads = campaigns.reduce((total, campaign) => total + Number(campaign.leads ?? 0), 0);
    const campaignPurchases = campaigns.reduce(
      (total, campaign) => total + Number(campaign.purchases ?? 0),
      0,
    );
    const campaignSpend = campaigns.reduce((total, campaign) => total + Number(campaign.spent ?? 0), 0);

    return NextResponse.json({
      summary: {
        contacts: contacts.length,
        wonContacts,
        openConversations: conversations.filter((item) => item.status === "open").length,
        waitingConversations: conversations.filter((item) => item.status === "waiting").length,
        closedConversations: conversations.filter((item) => item.status === "closed").length,
        revenue,
        conversionRate: contacts.length ? (wonContacts / contacts.length) * 100 : 0,
        campaignLeads,
        campaignPurchases,
        campaignSpend,
        roi: campaignSpend ? ((revenue - campaignSpend) / campaignSpend) * 100 : 0,
        roas: campaignSpend ? revenue / campaignSpend : 0,
      },
      recentConversations,
      tags: (tagsResult.data ?? []).map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        count: tagUsage.get(tag.id) ?? 0,
      })),
      flows: (flowsResult.data ?? []).map((flow) => ({
        id: flow.id,
        name: flow.name,
        status: flow.status,
        version: flow.version,
        entries: 0,
        conversions: 0,
        rate: 0,
      })),
      campaigns: campaigns.map((campaign) => ({
        ...campaign,
        leads: Number(campaign.leads ?? 0),
        purchases: Number(campaign.purchases ?? 0),
        spent: Number(campaign.spent ?? 0),
        roi: Number(campaign.roi ?? 0),
        roas: Number(campaign.roas ?? 0),
      })),
      agents: (agentsResult.data ?? []).map((agent) => ({
        id: agent.id,
        name: agent.name,
        status: agent.status,
        conversations: Number(agent.conversations_handled ?? 0),
      })),
      attendants: (usersResult.data ?? []).map((user) => ({
        id: user.id,
        name: user.name,
        role: user.role,
        conversations: assignedCounts.get(user.id) ?? 0,
      })),
    });
  } catch (error) {
    const result = publicServerError(error);
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
}
