import { getSupabase } from '../db/supabase.js';

export type DownloadStatus = 'pending' | 'downloading' | 'stored' | 'failed' | 'expired' | 'skipped';

export async function createMediaFile(params: {
  tenantId: string;
  provider: string;
  externalMediaId?: string;
  messageId?: string;
  contactId?: string;
  conversationId?: string;
  direction: string;
  mediaType: string;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
  caption?: string;
  duration?: number;
  providerUrl?: string;
}): Promise<{ id?: string; error?: string }> {
  const sb = getSupabase();

  if (params.externalMediaId) {
    const existing = await findMediaByExternalId(params.tenantId, params.provider, params.externalMediaId);
    if (existing) return { id: existing.id };
  }

  const { data, error } = await sb.from('media_files').insert({
    tenant_id: params.tenantId,
    provider: params.provider,
    external_media_id: params.externalMediaId || null,
    message_id: params.messageId || null,
    contact_id: params.contactId || null,
    conversation_id: params.conversationId || null,
    direction: params.direction,
    media_type: params.mediaType,
    mime_type: params.mimeType || null,
    file_name: params.fileName || null,
    file_size: params.fileSize ?? null,
    caption: params.caption || null,
    duration: params.duration ?? null,
    provider_url: params.providerUrl || null,
    download_status: 'pending',
  }).select('id').single();

  if (error) return { error: error.message };
  return { id: data?.id };
}

export async function findMediaByExternalId(
  tenantId: string,
  provider: string,
  externalMediaId: string
): Promise<{ id: string } | null> {
  const sb = getSupabase();
  const { data } = await sb.from('media_files')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .eq('external_media_id', externalMediaId)
    .limit(1);

  return data?.[0] || null;
}

async function updateMediaFile(
  id: string,
  updates: Record<string, unknown>
): Promise<void> {
  const sb = getSupabase();
  await sb.from('media_files')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
}

export async function markMediaDownloading(id: string): Promise<void> {
  await updateMediaFile(id, { download_status: 'downloading' });
}

export async function markMediaStored(
  id: string,
  storagePath: string,
  checksum?: string
): Promise<void> {
  await updateMediaFile(id, {
    download_status: 'stored',
    storage_path: storagePath,
    checksum: checksum || null,
    downloaded_at: new Date().toISOString(),
  });
}

export async function markMediaFailed(id: string, errorMessage: string): Promise<void> {
  await updateMediaFile(id, {
    download_status: 'failed',
    error_message: errorMessage,
  });
}

export async function linkMediaToMessage(mediaId: string, messageId: string): Promise<void> {
  await updateMediaFile(mediaId, { message_id: messageId });
}

export async function getMediaForTenant(tenantId: string, limit = 50) {
  const sb = getSupabase();
  const { data } = await sb.from('media_files')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}
