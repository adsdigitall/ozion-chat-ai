# Ozion Chat AI — Arquitetura de Integração WhatsApp

## Visão Geral

Esta documentação foi extraída da **documentação oficial da Meta/Facebook** e define a arquitetura correta para integração com WhatsApp Cloud API, Embedded Signup, CTWA Tracking e Meta Conversion API.

---

## 1. Fluxo Geral da Integração

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        USUÁRIO (Browser)                                │
│                                                                         │
│  1. Clica "Conectar WhatsApp"                                          │
│  2. Facebook SDK abre popup (Embedded Signup)                          │
│  3. Login Facebook → Seleciona Business → WABA → Número               │
│  4. Callback: code + session_info retornados                           │
│  5. Frontend envia code para backend                                    │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Node.js)                                │
│                                                                         │
│  6. Troca code → Access Token                                          │
│  7. Troca session_info → System User Token (permanente)                │
│  8. Busca WABAs do Business Manager                                    │
│  9. Busca Phone Numbers da WABA                                        │
│  10. Registra número (se necessário)                                    │
│  11. Verifica número via OTP                                            │
│  12. Inscreve app nos webhooks da WABA                                 │
│  13. Salva credenciais criptografadas                                  │
│  14. Configura Conversions API Dataset                                 │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     WHATSAPP CLOUD API                                  │
│                                                                         │
│  • POST /{PHONE_NUMBER_ID}/messages → Enviar mensagens                 │
│  • GET  /webhook → Receber mensagens e status                          │
│  • POST /{WABA_ID}/subscribed_apps → Inscrever webhook                 │
│  • POST /{DATASET_ID}/events → Conversions API (CTWA)                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Pré-requisitos (O que o usuário precisa ter)

| Item | Descrição | Onde encontrar |
|------|-----------|----------------|
| **Meta Developer Account** | Conta de desenvolvedor Meta | developers.facebook.com |
| **Meta Business Portfolio** | Gerenciador de Negócios | business.facebook.com |
| **Facebook App** | Aplicativo do tipo "Business" | developers.facebook.com |
| **Facebook Page** | Página vinculada ao Business | business.facebook.com |
| **Número de telefone** | Não pode estar no WhatsApp atualmente | — |

### Não precisa de BSP/Parceiro

O Ozion pode acessar a **Cloud API diretamente da Meta** sem intermediários:
- Sem taxas mensais de BSP
- Sem markup por mensagem
- Controle total sobre a integração
- Meta fornece 1.000 conversas grátis/mês (customer-initiated)

---

## 3. Credenciais Necessárias (Serão Coletadas)

### 3.1 O que será salvo por tenant/empresa:

| Credencial | Descrição | Como obter |
|------------|-----------|------------|
| `business_id` | ID do Business Manager | Business Settings → Header |
| `waba_id` | ID da WhatsApp Business Account | Business Settings → Accounts → WhatsApp |
| `page_id` | ID da Página do Facebook | Página → Configurações → Informações |
| `phone_number_id` | ID do número (não é o número!) | API Setup ou GET /{WABA}/phone_numbers |
| `display_phone_number` | Número formatado | Campo na resposta da API |
| `access_token` | Token permanente (System User) | Business Settings → System Users |
| `app_id` | ID do aplicativo | App Dashboard → Settings → Basic |
| `app_secret` | Segredo do aplicativo | App Dashboard → Settings → Basic |

### 3.2 Segurança das Credenciais

```sql
-- Tabela de credenciais WhatsApp
CREATE TABLE whatsapp_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    business_id VARCHAR(50) NOT NULL,
    waba_id VARCHAR(50) NOT NULL,
    page_id VARCHAR(50),
    phone_number_id VARCHAR(50) NOT NULL,
    display_phone_number VARCHAR(20),
    access_token_encrypted TEXT NOT NULL,  -- AES-256 encrypted
    app_id VARCHAR(50) NOT NULL,
    app_secret_encrypted TEXT NOT NULL,    -- AES-256 encrypted
    webhook_verify_token VARCHAR(100),
    phone_number_verified BOOLEAN DEFAULT false,
    messaging_tier VARCHAR(20) DEFAULT 'UNVERIFIED',
    quality_rating VARCHAR(20),
    is_on_biz_app BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id)
);
```

---

## 4. Embedded Signup — Fluxo Completo

### 4.1 Configuração no App Dashboard

1. **Facebook Login for Business** → Criar Configuration
   - Template: "WhatsApp Embedded Signup Configuration With 60 Expiration Token"
   - Login Variation: Embedded Signup
   - Required Permissions:
     - `whatsapp_business_management`
     - `whatsapp_business_messaging`
   - Optional: `business_management`, `ads_read`

2. **Configurar Client OAuth Settings**:
   - Client OAuth Login: ✅
   - Web OAuth Login: ✅
   - Enforce HTTPS: ✅
   - Embedded Browser OAuth Login: ✅
   - Strict Mode for Redirect URIs: ✅
   - Login with JavaScript SDK: ✅

3. **Adicionar domínios permitidos**:
   - Allowed Domains: seu-dominio.com
   - Valid OAuth Redirect URIs: https://seu-dominio.com/api/whatsapp/oauth/callback

### 4.2 Frontend — Facebook JavaScript SDK

```html
<!-- Carregar Facebook SDK -->
<script>
  window.fbAsyncInit = function() {
    FB.init({
      appId: '{YOUR_APP_ID}',
      cookie: true,
      xfbml: true,
      version: 'v22.0'
    });
  };

  (function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s);
    js.id = id;
    js.setAttribute('defer', true);
    js.src = 'https://connect.facebook.net/en_US/sdk.js';
    fjs.parentNode.insertBefore(js, fjs);
  })(document, 'script', 'facebook-jssdk');
</script>
```

### 4.3 Frontend — Botão "Conectar WhatsApp"

```javascript
function launchWhatsAppSignup() {
  // Escutar session_info do popup Meta
  window.addEventListener('message', function(event) {
    if (!event.origin.endsWith('facebook.com')) return;
    try {
      var data = JSON.parse(event.data);
      if (data.type === 'WA_EMBEDDED_SIGNUP') {
        if (data.event === 'FINISH') {
          var d = data.data;
          // Enviar para backend
          fetch('/api/whatsapp/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              waba_id: d.waba_id,
              phone_number_id: d.phone_number_id,
              business_id: d.business_id
            })
          });
        } else if (data.event === 'ERROR') {
          console.error('Erro no signup:', data.data.error_message);
        } else {
          console.log('Cancelado etapa:', data.data.current_step);
        }
      }
    } catch(e) {}
  });

  // Abrir dialog de login
  FB.login(function(response) {
    if (response.status === 'connected' && response.authResponse) {
      var code = response.authResponse.code;
      // Enviar code para backend
      fetch('/api/whatsapp/oauth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code })
      });
    } else {
      console.log('Usuário cancelou ou não autorizou');
    }
  }, {
    config_id: '{YOUR_CONFIG_ID}',
    response_type: 'code',
    override_default_response_type: true,
    extras: {
      version: 'v4',
      sessionInfoVersion: '4',
      features: [{ name: 'app_only_install' }],
      setup: { solutionID: '{YOUR_SOLUTION_ID}' }
    }
  });
}
```

### 4.4 Backend — Callback Handler

```javascript
// POST /api/whatsapp/oauth/callback
async function handleOAuthCallback(req, res) {
  const { code, state } = req.body;
  
  // 1. Validar state (CSRF protection)
  if (state !== req.session.oauthState) {
    return res.status(403).json({ error: 'Invalid state' });
  }
  
  // 2. Trocar code por Access Token
  const tokenResponse = await fetch(
    `https://graph.facebook.com/v22.0/oauth/access_token?` +
    `client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}` +
    `&client_secret=${APP_SECRET}&code=${code}`
  );
  const { access_token: shortLivedToken } = await tokenResponse.json();
  
  // 3. Buscar informações do usuário
  const userResponse = await fetch(
    `https://graph.facebook.com/v22.0/me?fields=businesses{id,name}` +
    `&access_token=${shortLivedToken}`
  );
  const userData = await userResponse.json();
  
  // 4. Retornar businesses para seleção
  res.json({
    businesses: userData.businesses,
    short_lived_token: shortLivedToken
  });
}

// POST /api/whatsapp/connect
async function handleWhatsAppConnect(req, res) {
  const { waba_id, phone_number_id, business_id, code } = req.body;
  const tenantId = req.user.tenant_id;
  
  // 1. Trocar code por System User Token
  const tokenResponse = await fetch(
    `https://graph.facebook.com/v22.0/oauth/access_token?` +
    `grant_type=fb_exchange_token&fb_exchange_token=${sessionInfo}` +
    `&client_id=${APP_ID}&client_secret=${APP_SECRET}`
  );
  const { access_token: systemUserToken } = await tokenResponse.json();
  
  // 2. Buscar Phone Numbers
  const phonesResponse = await fetch(
    `https://graph.facebook.com/v22.0/${waba_id}/phone_numbers` +
    `?fields=id,verified_name,display_phone_number,code_verification_status` +
    `&access_token=${systemUserToken}`
  );
  const phonesData = await phonesResponse.json();
  
  // 3. Verificar se número já está verificado
  const phone = phonesData.data.find(p => p.id === phone_number_id);
  if (phone.code_verification_status === 'NOT_VERIFIED') {
    // Solicitar código OTP
    await fetch(
      `https://graph.facebook.com/v22.0/${phone_number_id}/request_code` +
      `?code_method=SMS&language=en_US`,
      { headers: { 'Authorization': `Bearer ${systemUserToken}` } }
    );
    // Retornar para frontend solicitar código ao usuário
    return res.json({ requires_verification: true, phone_number_id });
  }
  
  // 4. Registrar número na Cloud API
  await fetch(
    `https://graph.facebook.com/v22.0/${phone_number_id}/register`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${systemUserToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        pin: generatePin() // PIN de 6 dígitos
      })
    }
  );
  
  // 5. Inscrever app nos webhooks
  await fetch(
    `https://graph.facebook.com/v22.0/${waba_id}/subscribed_apps`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${systemUserToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        override_callback_uri: `${BASE_URL}/api/webhooks/whatsapp`,
        verify_token: generateVerifyToken()
      })
    }
  );
  
  // 6. Salvar credenciais criptografadas
  await saveCredentials(tenantId, {
    business_id,
    waba_id,
    phone_number_id,
    page_id: req.body.page_id,
    access_token: encrypt(systemUserToken),
    app_id: APP_ID,
    app_secret: encrypt(APP_SECRET)
  });
  
  res.json({ success: true });
}
```

---

## 5. Webhook — Receber Mensagens

### 5.1 Configuração do Endpoint

```javascript
// GET /api/webhooks/whatsapp — Verificação
app.get('/api/webhooks/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// POST /api/webhooks/whatsapp — Eventos
app.post('/api/webhooks/whatsapp', (req, res) => {
  const body = req.body;
  
  if (body.object === 'whatsapp_business_account') {
    body.entry.forEach(entry => {
      entry.changes.forEach(change => {
        if (change.field === 'messages') {
          const value = change.value;
          
          // Mensagens recebidas
          if (value.messages) {
            value.messages.forEach(msg => {
              handleIncomingMessage(value.metadata, msg, value.contacts);
            });
          }
          
          // Status de mensagens enviadas
          if (value.statuses) {
            value.statuses.forEach(status => {
              handleMessageStatus(value.metadata, status);
            });
          }
        }
      });
    });
  }
  
  res.sendStatus(200);
});
```

### 5.2 Payload de Mensagem Recebida

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WABA_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "5511999999999",
          "phone_number_id": "7794189252778687"
        },
        "contacts": [{
          "profile": { "name": "João Silva" },
          "wa_id": "5511999999999"
        }],
        "messages": [{
          "from": "5511999999999",
          "id": "wamid.HBg...",
          "timestamp": "1758254144",
          "type": "text",
          "text": { "body": "Olá, gostaria de saber mais" },
          "context": {
            "ad": {
              "id": "AD_ID_123",
              "title": "Promoção de Verão",
              "body": "50% OFF em todos os produtos",
              "source": { "id": "AD_ID", "type": "ad" },
              "ctwa": "CTWA_CLICK_ID_1234567890"
            }
          }
        }]
      },
      "field": "messages"
    }]
  }]
}
```

### 5.3 Handlers por Tipo de Mensagem

```javascript
async function handleIncomingMessage(metadata, message, contacts) {
  const phoneNumberId = metadata.phone_number_id;
  const from = message.from;
  const contact = contacts[0];
  
  // Buscar credenciais pelo phone_number_id
  const credentials = await getCredentialsByPhoneId(phoneNumberId);
  
  // Verificar se é CTWA (tem referral/ad context)
  let ctwaData = null;
  if (message.context?.ad?.ctwa) {
    ctwaData = {
      ctwa_clid: message.context.ad.ctwa,
      ad_id: message.context.ad.source?.id,
      headline: message.context.ad.headline,
      body: message.context.ad.body
    };
  }
  
  // Processar por tipo
  switch (message.type) {
    case 'text':
      await processTextMessage(credentials, from, message.text.body, ctwaData);
      break;
    case 'image':
      await processMediaMessage(credentials, from, 'image', message.image, ctwaData);
      break;
    case 'interactive':
      await processInteractiveMessage(credentials, from, message.interactive, ctwaData);
      break;
    // ... outros tipos
  }
}
```

---

## 6. Enviar Mensagens via Cloud API

### 6.1 Texto Simples

```javascript
async function sendTextMessage(phoneNumberId, accessToken, to, text) {
  const response = await fetch(
    `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: {
          preview_url: true,
          body: text
        }
      })
    }
  );
  return response.json();
}
```

### 6.2 Template Message (após 24h)

```javascript
async function sendTemplateMessage(phoneNumberId, accessToken, to, templateName, langCode, params) {
  const response = await fetch(
    `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: langCode },
          components: params ? [{
            type: 'body',
            parameters: params.map(p => ({ type: 'text', text: p }))
          }] : []
        }
      })
    }
  );
  return response.json();
}
```

### 6.3 Janela de Atendimento (24h)

```
┌─────────────────────────────────────────────────────────────────┐
│                    JANELA DE ATENDIMENTO                         │
│                                                                   │
│  Usuário envia mensagem                                          │
│       ↓                                                          │
│  Janela ABERTA por 24h                                          │
│       ↓                                                          │
│  Pode enviar: text, image, video, audio, document, interactive  │
│       ↓                                                          │
│  Após 24h: APENAS template messages permitidos                  │
│       ↓                                                          │
│  Nova mensagem do usuário reinicia timer de 24h                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. CTWA Tracking — Rastreamento de Campanhas

### 7.1 O que é ctwa_clid

O `ctwa_clid` é um identificador único por clique que a Meta gera quando um usuário clica em um anúncio CTWA. Ele aparece no **primeiro webhook de mensagem** do usuário após o clique.

### 7.2 Extrair ctwa_clid do Webhook

```javascript
function extractCtwaData(message) {
  // Verificar context.ad (Cloud API)
  if (message.context?.ad?.ctwa) {
    return {
      ctwa_clid: message.context.ad.ctwa,
      ad_id: message.context.ad.source?.id,
      headline: message.context.ad.headline,
      body: message.context.ad.body,
      media_type: message.context.ad.media_type,
      source_app: message.context.ad.source?.app
    };
  }
  
  // Verificar referral (formato legado)
  if (message.referral) {
    return {
      ctwa_clid: message.referral.ctwa_clid,
      ad_id: message.referral.source_id,
      headline: message.referral.headline,
      body: message.referral.body,
      media_type: message.referral.media_type,
      source_app: message.referral.source_app
    };
  }
  
  // Orgânico (sem referral)
  return null;
}
```

### 7.3 Meta Conversions API (CTWA)

```javascript
async function sendConversionEvent(datasetId, accessToken, event) {
  const response = await fetch(
    `https://graph.facebook.com/v19.0/${datasetId}/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: [{
          event_name: event.name, // "Lead", "Purchase", etc.
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'business_messaging', // ← IMPORTANTE!
          messaging_channel: 'whatsapp',
          user_data: {
            whatsapp_business_account_id: event.waba_id,
            ctwa_clid: event.ctwa_clid, // ← Chave da atribuição
            // Hash PII com SHA-256
            // phone_number: hashPhone(event.phone),
            // email: hashEmail(event.email)
          },
          custom_data: {
            currency: event.currency,
            value: event.value,
            content_name: event.content_name
          },
          event_id: event.event_id // Deduplicação
        }]
      })
    }
  );
  return response.json();
}
```

### 7.4 Tabela de Rastreamento CTWA

```sql
-- Tabela de atribuição CTWA
CREATE TABLE ctwa_attributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    contact_id UUID REFERENCES contacts(id),
    ctwa_clid VARCHAR(255) NOT NULL UNIQUE,
    ad_id VARCHAR(50),
    campaign_id VARCHAR(50),
    adset_id VARCHAR(50),
    creative_id VARCHAR(50),
    headline TEXT,
    body TEXT,
    media_type VARCHAR(20),
    source_app VARCHAR(20),
    first_message_at TIMESTAMP,
    lead_qualified_at TIMESTAMP,
    purchase_at TIMESTAMP,
    conversion_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX idx_ctwa_clid ON ctwa_attributions(ctwa_clid);
CREATE INDEX idx_ctwa_campaign ON ctwa_attributions(campaign_id);
CREATE INDEX idx_ctwa_tenant ON ctwa_attributions(tenant_id);
```

### 7.5 Buscar Campaign/AdSet do Ad ID

```javascript
async function getAdHierarchy(accessToken, adId) {
  // Buscar campaign_id e adset_id do ad
  const response = await fetch(
    `https://graph.facebook.com/v22.0/${adId}?fields=campaign_id,adset_id,name&access_token=${accessToken}`
  );
  return response.json();
}
```

---

## 8. Permissões Necessárias

### 8.1 Facebook App Permissions

| Permissão | Nível | Uso |
|-----------|-------|-----|
| `whatsapp_business_management` | Advanced | Gerenciar WABA, números, templates |
| `whatsapp_business_messaging` | Advanced | Enviar/receber mensagens |
| `business_management` | Advanced | Gerenciar ativos do Business Manager |
| `ads_read` | Advanced | Ler dados de campanhas (CTWA) |
| `public_profile` | Advanced | Identificar usuário (obrigatório) |

### 8.2 App Review

Para produção (SaaS que envia em nome de outros):
- Necessário **App Review** (3-7 dias úteis)
- Submeter evidências de uso
- Documentar como cada permissão será usada

---

## 9. Limites de Envio

| Tier | Limite (únicos/24h) | Como escalar |
|------|---------------------|--------------|
| Novo negócio | 250 | Verificação do business |
| Tier 2 | 2.000 | Escala automática |
| Tier 3 | 10.000 | Escala automática |
| Tier 4 | 100.000 | Escala automática |
| Ilimitado | ∞ | Alta reputação |

### Rate Limits (por número → mesmo usuário)
- **1 mensagem a cada 6 segundos** (~10/min, ~600/hora)
- Burst: até 45 msgs em 6s (empresta de quota futura)

---

## 10. Fluxo de Verificação de Número

```
1. POST /{PHONE_NUMBER_ID}/request_code
   → Envia SMS ou voz com OTP
   → Resposta: { "success": true }

2. POST /{PHONE_NUMBER_ID}/verify_code
   → Envia código OTP recebido
   → Resposta: { "success": true }

3. POST /{PHONE_NUMBER_ID}/register
   → Registra número na Cloud API
   → Body: { "messaging_product": "whatsapp", "pin": "123456" }
   → PIN necessário para alterações futuras
```

---

## 11. Coexistência (WhatsApp Business App + API)

### Requisitos
- WhatsApp Business App versão **2.24.17+**
- Deve ser **Solution Partner ou Tech Provider**
- Usar **Embedded Signup** com session logging
- Webhook deve tratar `smb_message_echoes` e `smb_app_state_sync`

### Restrições
- Throughput fixo: **20 msg/segundo**
- Abrir WhatsApp Business App a cada **13-14 dias**
- Mensagens do App geram webhook `smb_message_echoes`

---

## 12. Estrutura de Dados Completa

```sql
-- Credenciais WhatsApp por tenant
CREATE TABLE whatsapp_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    business_id VARCHAR(50) NOT NULL,
    business_name VARCHAR(255),
    waba_id VARCHAR(50) NOT NULL,
    waba_name VARCHAR(255),
    page_id VARCHAR(50),
    phone_number_id VARCHAR(50) NOT NULL,
    display_phone_number VARCHAR(20),
    access_token_encrypted TEXT NOT NULL,
    app_id VARCHAR(50) NOT NULL,
    app_secret_encrypted TEXT NOT NULL,
    webhook_verify_token VARCHAR(100),
    phone_number_verified BOOLEAN DEFAULT false,
    messaging_tier VARCHAR(20) DEFAULT 'UNVERIFIED',
    quality_rating VARCHAR(20),
    is_on_biz_app BOOLEAN DEFAULT false,
    connected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id)
);

-- Conversas WhatsApp
CREATE TABLE whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    contact_id UUID REFERENCES contacts(id),
    phone_number_id VARCHAR(50) NOT NULL,
    contact_wa_id VARCHAR(20) NOT NULL,
    contact_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'open',
    is_ctwa BOOLEAN DEFAULT false,
    ctwa_clid VARCHAR(255),
    ad_id VARCHAR(50),
    campaign_id VARCHAR(50),
    started_at TIMESTAMP DEFAULT NOW(),
    last_message_at TIMESTAMP,
    closed_at TIMESTAMP
);

-- Mensagens WhatsApp
CREATE TABLE whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES whatsapp_conversations(id),
    message_id VARCHAR(255), -- wamid
    direction VARCHAR(10) NOT NULL, -- inbound/outbound
    type VARCHAR(20) NOT NULL, -- text, image, template, etc.
    content JSONB,
    status VARCHAR(20), -- sent, delivered, read, failed
    error_code INTEGER,
    error_message TEXT,
    sent_at TIMESTAMP DEFAULT NOW(),
    delivered_at TIMESTAMP,
    read_at TIMESTAMP
);

-- Atribuição CTWA
CREATE TABLE ctwa_attributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    contact_id UUID REFERENCES contacts(id),
    conversation_id UUID REFERENCES whatsapp_conversations(id),
    ctwa_clid VARCHAR(255) NOT NULL UNIQUE,
    ad_id VARCHAR(50),
    campaign_id VARCHAR(50),
    adset_id VARCHAR(50),
    creative_id VARCHAR(50),
    headline TEXT,
    body TEXT,
    media_type VARCHAR(20),
    source_app VARCHAR(20),
    first_message_at TIMESTAMP,
    lead_qualified_at TIMESTAMP,
    purchase_at TIMESTAMP,
    conversion_sent_to_meta BOOLEAN DEFAULT false,
    conversion_event_name VARCHAR(50),
    conversion_event_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Templates WhatsApp
CREATE TABLE whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    template_name VARCHAR(100) NOT NULL,
    language_code VARCHAR(10) NOT NULL,
    category VARCHAR(20) NOT NULL, -- marketing, utility, authentication
    status VARCHAR(20) NOT NULL, -- approved, pending, rejected
    components JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP,
    UNIQUE(tenant_id, template_name, language_code)
);
```

---

## 13. Checklist de Implementação

### Fase 1: Conexão WhatsApp
- [ ] Criar Facebook App do tipo Business
- [ ] Configurar Facebook Login for Business
- [ ] Criar Configuration ID para Embedded Signup
- [ ] Implementar frontend (Facebook SDK + botão conectar)
- [ ] Implementar backend (OAuth callback + token exchange)
- [ ] Implementar verificação de número (OTP)
- [ ] Salvar credenciais criptografadas
- [ ] Testar conexão em sandbox

### Fase 2: Mensageria
- [ ] Configurar endpoint de webhook
- [ ] Implementar verificação de webhook (GET)
- [ ] Implementar recebimento de mensagens (POST)
- [ ] Implementar envio de mensagens (Cloud API)
- [ ] Implementar janela de 24h + templates
- [ ] Criar interface de chat no CRM
- [ ] Testar envio/recebimento

### Fase 3: CTWA Tracking
- [ ] Habilitar Ads Attribution no WABA
- [ ] Extrair ctwa_clid do webhook
- [ ] Salvar atribuição CTWA no banco
- [ ] Implementar Meta Conversions API
- [ ] Enviar eventos Lead/Purchase com ctwa_clid
- [ ] Buscar hierarquia Campaign/AdSet/Ad
- [ ] Criar dashboard de atribuição

### Fase 4: Produção
- [ ] Completar App Review
- [ ] Configurar System User Token (permanente)
- [ ] Implementar tratamento de erros
- [ ] Implementar retry com backoff
- [ ] Monitorar quality rating
- [ ] Escalar messaging tiers

---

## 14. Endpoints da API

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/v22.0/oauth/access_token` | GET | Trocar code por token |
| `/v22.0/me?fields=businesses` | GET | Buscar businesses do usuário |
| `/v22.0/{BIZ_ID}/whatsapp_business_accounts` | GET | Listar WABAs |
| `/v22.0/{WABA_ID}/phone_numbers` | GET | Listar números |
| `/v22.0/{PHONE_ID}/request_code` | POST | Solicitar OTP |
| `/v22.0/{PHONE_ID}/verify_code` | POST | Verificar OTP |
| `/v22.0/{PHONE_ID}/register` | POST | Registrar número |
| `/v22.0/{PHONE_ID}/messages` | POST | Enviar mensagem |
| `/v22.0/{WABA_ID}/subscribed_apps` | POST | Inscrever webhook |
| `/v22.0/{WABA_ID}/message_templates` | GET/POST | Gerenciar templates |
| `/v19.0/{DATASET_ID}/events` | POST | Conversions API |

---

## 15. Erros Comuns

| Erro | Causa | Solução |
|------|-------|---------|
| `redirect_uri must match` | URL não confere | Garantir match exato com trailing slash |
| `App not active` | App em modo dev | Mudar para Live no App Dashboard |
| `Feature unavailable` | Falta `public_profile` | Solicitar Advanced Access |
| `Token expired` | Token de 60 dias expirou | Usar System User Token |
| `136024` | Número já verificado | Verificar `code_verification_status` |
| `131056` | Rate limit par | Aguardar 6s entre mensagens |
| `ctwa_clid` ausente | Ads Attribution desabilitado | Ativar no WABA settings |

---

## Referências

| Documento | URL |
|-----------|-----|
| WhatsApp Cloud API | developers.facebook.com/docs/whatsapp/cloud-api |
| Embedded Signup | developers.facebook.com/docs/whatsapp/cloud-api/embedded-signup |
| Webhooks | developers.facebook.com/docs/whatsapp/cloud-api/webhooks |
| Conversions API | developers.facebook.com/docs/marketing-api/conversions-api |
| CTWA Ads | developers.facebook.com/docs/marketing-api/ad-creative/messaging-ads/click-to-whatsapp |
| Business Management | developers.facebook.com/docs/marketing-api/business-management |
