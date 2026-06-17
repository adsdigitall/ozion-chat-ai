import "server-only";

import { createHash, randomUUID } from "node:crypto";

const graphVersion = process.env.META_GRAPH_API_VERSION || "v23.0";
const graphUrl = `https://graph.facebook.com/${graphVersion}`;

type MetaAction = { action_type?: string; value?: string };
type MetaCampaign = {
  id: string;
  name: string;
  status?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  insights?: {
    data?: Array<{
      spend?: string;
      actions?: MetaAction[];
      purchase_roas?: MetaAction[];
    }>;
  };
};

export type MetaCTWAConfig = {
  accessToken: string;
  adAccountId: string;
  pixelId: string;
  testEventCode?: string;
};

function actionValue(actions: MetaAction[] | undefined, names: string[]) {
  const action = actions?.find((item) => item.action_type && names.includes(item.action_type));
  return Number(action?.value ?? 0);
}

async function metaRequest<T>(path: string, accessToken: string, init?: RequestInit) {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`${graphUrl}/${path}${separator}access_token=${encodeURIComponent(accessToken)}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok || body.error) {
    throw new Error(body.error?.message || `Meta API error (${response.status}).`);
  }
  return body as T;
}

export async function validateMetaCTWA(config: MetaCTWAConfig) {
  const accountId = config.adAccountId.replace(/^act_/, "");
  const account = await metaRequest<{ id: string; name?: string; account_status?: number }>(
    `act_${accountId}?fields=id,name,account_status`,
    config.accessToken,
  );
  const pixel = await metaRequest<{ id: string; name?: string }>(
    `${config.pixelId}?fields=id,name`,
    config.accessToken,
  );
  return { account, pixel };
}

export async function fetchMetaCampaigns(config: MetaCTWAConfig) {
  const accountId = config.adAccountId.replace(/^act_/, "");
  const fields = [
    "id",
    "name",
    "status",
    "daily_budget",
    "lifetime_budget",
    "insights.date_preset(maximum){spend,actions,purchase_roas}",
  ].join(",");
  const result = await metaRequest<{ data?: MetaCampaign[] }>(
    `act_${accountId}/campaigns?fields=${encodeURIComponent(fields)}&limit=200`,
    config.accessToken,
  );

  return (result.data ?? []).map((campaign) => {
    const insight = campaign.insights?.data?.[0];
    const leads = actionValue(insight?.actions, [
      "lead",
      "onsite_conversion.messaging_conversation_started_7d",
      "onsite_conversion.messaging_first_reply",
    ]);
    const purchases = actionValue(insight?.actions, ["purchase", "omni_purchase"]);
    const spent = Number(insight?.spend ?? 0);
    const roas = actionValue(insight?.purchase_roas, ["purchase", "omni_purchase"]);
    const revenue = spent * roas;
    return {
      external_id: campaign.id,
      name: campaign.name,
      platform: "meta" as const,
      status:
        campaign.status === "ACTIVE"
          ? ("active" as const)
          : campaign.status === "PAUSED"
            ? ("paused" as const)
            : ("completed" as const),
      budget: Number(campaign.daily_budget ?? campaign.lifetime_budget ?? 0) / 100,
      spent,
      leads: Math.round(leads),
      purchases: Math.round(purchases),
      cpa: purchases > 0 ? spent / purchases : 0,
      roi: spent > 0 ? ((revenue - spent) / spent) * 100 : 0,
      roas,
      config: { meta_status: campaign.status },
    };
  });
}

export async function sendMetaPurchaseEvent({
  config,
  phone,
  value,
  currency,
  eventId = randomUUID(),
}: {
  config: MetaCTWAConfig;
  phone: string;
  value: number;
  currency: string;
  eventId?: string;
}) {
  const normalizedPhone = phone.replace(/\D/g, "");
  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "business_messaging",
        messaging_channel: "whatsapp",
        user_data: {
          ph: [createHash("sha256").update(normalizedPhone).digest("hex")],
        },
        custom_data: {
          currency: currency.toUpperCase(),
          value,
        },
      },
    ],
  };
  if (config.testEventCode) payload.test_event_code = config.testEventCode;

  return metaRequest<{ events_received?: number; fbtrace_id?: string }>(
    `${config.pixelId}/events`,
    config.accessToken,
    { method: "POST", body: JSON.stringify(payload) },
  );
}
