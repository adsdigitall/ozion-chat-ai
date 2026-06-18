# Ozion Chat AI

CRM multicanal com atendimento em equipe, WhatsApp Cloud API oficial, automações visuais, agentes de IA, campanhas CTWA, vendas e voz.

## Recursos

- Caixa de entrada em equipe com múltiplos números oficiais
- CRM de contatos e histórico de conversas
- Editor visual de fluxos com 17 tipos de bloco
- Agentes de IA com múltiplos provedores
- WhatsApp Cloud API para envio e recebimento
- Campanhas, CTWA, vendas e indicadores
- Voice Studio com OpenAI e ElevenLabs
- Integrações com credenciais protegidas no servidor
- Usuários, permissões, configurações e logs

## Instalação

Requisitos: Node.js 20 ou mais recente e um projeto Supabase.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Acesse `http://localhost:3000`.

## Banco de dados

Execute as migrações da pasta `supabase/migrations` na ordem numérica:

1. `001_initial_schema.sql`
2. `002_security_hardening.sql`

Revise as políticas de segurança antes de aplicá-las em um banco que já tenha usuários em produção.

## WhatsApp oficial

A Ozion usa Embedded Signup da Meta. O cliente clica em **Conectar WhatsApp Oficial**, faz login no popup oficial da Meta, escolhe a empresa/conta WhatsApp Business, confirma o número e volta automaticamente para o SaaS.

O cliente nunca digita nem visualiza App ID, App Secret, Configuration ID, tokens, webhook ou IDs técnicos. Esses dados ficam no ambiente do servidor:

- `META_APP_ID`
- `META_APP_SECRET`
- `META_EMBEDDED_SIGNUP_CONFIGURATION_ID`
- `META_SYSTEM_USER_ACCESS_TOKEN`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`

Webhook oficial da Ozion: `https://seu-dominio.com/api/whatsapp/webhook`. As credenciais dos números e integrações nunca são retornadas ao navegador.

## Verificação

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Produção

Configure todas as variáveis no provedor de hospedagem, aplique as migrações, use HTTPS e mantenha `SUPABASE_SERVICE_ROLE_KEY`, tokens da Meta e chaves de IA somente no servidor.
