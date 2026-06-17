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

Cadastre cada número em **WhatsApp** usando os dados da Meta Cloud API. Configure na Meta:

- URL do webhook: `https://seu-dominio.com/api/whatsapp/webhook`
- Token de verificação: mesmo valor de `WHATSAPP_VERIFY_TOKEN`
- Assinatura: defina `WHATSAPP_APP_SECRET`

Assine ao menos os eventos de mensagens. As credenciais dos números e integrações nunca são retornadas ao navegador.

## Verificação

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Produção

Configure todas as variáveis no provedor de hospedagem, aplique as migrações, use HTTPS e mantenha `SUPABASE_SERVICE_ROLE_KEY`, tokens da Meta e chaves de IA somente no servidor.
