import { decrypt } from '../lib/encryption.js';

const GRAPH_API_VERSION = 'v22.0';
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
const CAPI_VERSION = 'v19.0';
const CAPI_BASE_URL = `https://graph.facebook.com/${CAPI_VERSION}`;

interface TokenExchangeResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface WABA {
  id: string;
  name: string;
}

interface PhoneNumber {
  id: string;
  verified_name: string;
  display_phone_number: string;
  code_verification_status: string;
  quality_rating?: string;
  is_on_biz_app?: boolean;
}

// ============================================================
// TOKEN EXCHANGE
// ============================================================
export async function exchangeCodeForToken(
  code: string,
  appId: string,
  appSecret: string,
  redirectUri: string
): Promise<TokenExchangeResponse> {
  const response = await fetch(
    `${BASE_URL}/oauth/access_token?` +
    `client_id=${appId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `client_secret=${appSecret}&` +
    `code=${code}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${JSON.stringify(error)}`);
  }
  
  return response.json();
}

export async function exchangeSessionInfoForSystemUserToken(
  sessionInfo: string,
  appId: string,
  appSecret: string
): Promise<TokenExchangeResponse> {
  const response = await fetch(
    `${BASE_URL}/oauth/access_token?` +
    `grant_type=fb_exchange_token&` +
    `fb_exchange_token=${encodeURIComponent(sessionInfo)}&` +
    `client_id=${appId}&` +
    `client_secret=${appSecret}`
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Session info exchange failed: ${JSON.stringify(error)}`);
  }
  
  return response.json();
}

// ============================================================
// BUSINESS & WABA
// ============================================================
export async function getBusinesses(accessToken: string): Promise<{ id: string; name: string }[]> {
  const response = await fetch(
    `${BASE_URL}/me?fields=businesses{id,name}&access_token=${accessToken}`
  );
  
  if (!response.ok) throw new Error('Failed to fetch businesses');
  const data = await response.json();
  return data.businesses?.data || [];
}

export async function getWABAs(
  businessId: string,
  accessToken: string
): Promise<WABA[]> {
  const response = await fetch(
    `${BASE_URL}/${businessId}/whatsapp_business_accounts?access_token=${accessToken}`
  );
  
  if (!response.ok) throw new Error('Failed to fetch WABAs');
  const data = await response.json();
  return data.data || [];
}

export async function getPhoneNumbers(
  wabaId: string,
  accessToken: string
): Promise<PhoneNumber[]> {
  const response = await fetch(
    `${BASE_URL}/${wabaId}/phone_numbers?` +
    `fields=id,verified_name,display_phone_number,code_verification_status,quality_rating,is_on_biz_app&` +
    `access_token=${accessToken}`
  );
  
  if (!response.ok) throw new Error('Failed to fetch phone numbers');
  const data = await response.json();
  return data.data || [];
}

// ============================================================
// PHONE NUMBER VERIFICATION
// ============================================================
export async function requestVerificationCode(
  phoneNumberId: string,
  accessToken: string,
  method: 'SMS' | 'VOICE' = 'SMS'
): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/${phoneNumberId}/request_code?code_method=${method}&language=en_US`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Request code failed: ${JSON.stringify(error)}`);
  }
}

export async function verifyCode(
  phoneNumberId: string,
  accessToken: string,
  code: string
): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/${phoneNumberId}/verify_code`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `code=${code}`,
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Verify code failed: ${JSON.stringify(error)}`);
  }
}

export async function registerPhoneNumber(
  phoneNumberId: string,
  accessToken: string,
  pin: string
): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/${phoneNumberId}/register`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        pin,
      }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Register phone failed: ${JSON.stringify(error)}`);
  }
}

// ============================================================
// WEBHOOK SUBSCRIPTION
// ============================================================
export async function subscribeAppToWABA(
  wabaId: string,
  accessToken: string,
  callbackUrl: string,
  verifyToken: string
): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/${wabaId}/subscribed_apps`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        override_callback_uri: callbackUrl,
        verify_token: verifyToken,
      }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Subscribe app failed: ${JSON.stringify(error)}`);
  }
}

// ============================================================
// MESSAGING
// ============================================================
export interface SendMessagePayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: string;
  [key: string]: any;
}

export async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  payload: SendMessagePayload
): Promise<any> {
  const response = await fetch(
    `${BASE_URL}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Send message failed: ${JSON.stringify(error)}`);
  }
  
  return response.json();
}

export async function sendTextMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
) {
  return sendWhatsAppMessage(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: {
      preview_url: text.includes('http'),
      body: text.substring(0, 4096),
    },
  });
}

export async function sendTemplateMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  langCode: string = 'pt_BR',
  params?: string[]
) {
  const components = params
    ? [{
        type: 'body',
        parameters: params.map(p => ({ type: 'text', text: p })),
      }]
    : [];

  return sendWhatsAppMessage(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: langCode },
      components,
    },
  });
}

// ============================================================
// TEMPLATES MANAGEMENT
// ============================================================
export async function getMessageTemplates(
  wabaId: string,
  accessToken: string
): Promise<any[]> {
  const response = await fetch(
    `${BASE_URL}/${wabaId}/message_templates?access_token=${accessToken}`
  );
  
  if (!response.ok) throw new Error('Failed to fetch templates');
  const data = await response.json();
  return data.data || [];
}

// ============================================================
// META CONVERSIONS API (CTWA TRACKING)
// ============================================================
interface ConversionEvent {
  eventName: string;
  eventTime: number;
  ctwaClid: string;
  wabaId: string;
  eventId?: string;
  currency?: string;
  value?: number;
  contentName?: string;
  phone?: string;
  email?: string;
}

export async function sendConversionEvent(
  datasetId: string,
  accessToken: string,
  event: ConversionEvent
): Promise<any> {
  const userData: Record<string, any> = {
    whatsapp_business_account_id: event.wabaId,
    ctwa_clid: event.ctwaClid,
  };

  if (event.phone) {
    userData.ph = event.phone;
  }
  if (event.email) {
    userData.em = event.email;
  }

  const customData: Record<string, any> = {};
  if (event.currency) customData.currency = event.currency;
  if (event.value) customData.value = event.value;
  if (event.contentName) customData.content_name = event.contentName;

  const payload = {
    data: [{
      event_name: event.eventName,
      event_time: event.eventTime,
      action_source: 'business_messaging',
      messaging_channel: 'whatsapp',
      user_data: userData,
      ...(Object.keys(customData).length > 0 && { custom_data: customData }),
      ...(event.eventId && { event_id: event.eventId }),
    }],
  };

  const response = await fetch(
    `${CAPI_BASE_URL}/${datasetId}/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`CAPI event failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

// ============================================================
// AD HIERARCHY (for CTWA attribution)
// ============================================================
export async function getAdHierarchy(
  accessToken: string,
  adId: string
): Promise<{ campaign_id: string; adset_id: string; name: string }> {
  const response = await fetch(
    `${BASE_URL}/${adId}?fields=campaign_id,adset_id,name&access_token=${accessToken}`
  );
  
  if (!response.ok) throw new Error('Failed to fetch ad hierarchy');
  return response.json();
}

// ============================================================
// VALIDATE TOKEN
// ============================================================
export async function validateToken(
  inputToken: string,
  appId: string,
  appSecret: string
): Promise<any> {
  const response = await fetch(
    `${BASE_URL}/debug_token?input_token=${inputToken}&access_token=${appId}|${appSecret}`
  );
  
  if (!response.ok) throw new Error('Failed to validate token');
  return response.json();
}

// ============================================================
// HELPER: Get decrypted token for tenant
// ============================================================
export async function getDecryptedToken(
  encryptedToken: string
): Promise<string> {
  return decrypt(encryptedToken);
}
