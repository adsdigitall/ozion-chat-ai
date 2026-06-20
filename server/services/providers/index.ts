import { getSupabase } from '../../db/supabase.js';
import { MetaMessageProvider } from './meta-provider.js';
import { EvolutionMessageProvider } from './evolution-provider.js';
import type { MessageProvider, ProviderMessageResult } from './types.js';

export type { MessageProvider, ProviderMessageResult } from './types.js';

export async function getProviderForTenant(tenantId: string): Promise<{
  provider: MessageProvider | null;
  error?: string;
}> {
  const sb = getSupabase();
  const { data: cred, error } = await sb
    .from('whatsapp_credentials')
    .select('*')
    .eq('tenant_id', tenantId)
    .limit(1)
    .maybeSingle();

  if (error || !cred) {
    return { provider: null, error: error?.message || 'No credentials found for tenant' };
  }

  return createProviderFromCredential(cred);
}

function createProviderFromCredential(cred: Record<string, any>): {
  provider: MessageProvider | null;
  error?: string;
} {
  const providerType: string = cred.provider || 'meta';

  switch (providerType) {
    case 'meta':
      if (!cred.phone_number_id || !cred.access_token_encrypted) {
        return { provider: null, error: 'Meta credentials incomplete: missing phone_number_id or token' };
      }
      return {
        provider: new MetaMessageProvider(cred.phone_number_id, cred.access_token_encrypted),
      };

    case 'evolution':
      if (!cred.instance_name) {
        return { provider: null, error: 'Evolution credentials incomplete: missing instance_name' };
      }
      return {
        provider: new EvolutionMessageProvider(cred.instance_name),
      };

    default:
      return { provider: null, error: `Unknown provider type: ${providerType}` };
  }
}

export async function sendByProvider(
  tenantId: string,
  sendFn: (provider: MessageProvider) => Promise<ProviderMessageResult>
): Promise<ProviderMessageResult> {
  const { provider, error } = await getProviderForTenant(tenantId);
  if (error || !provider) {
    return { success: false, error: error || 'No provider available' };
  }
  return sendFn(provider);
}
