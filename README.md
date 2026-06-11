# Ozion Chat AI

WhatsApp CRM with AI Agents - Meta Cloud API Integration

## Setup

### 1. Prerequisites
- Node.js 18+
- PostgreSQL database
- Meta Developer Account
- Facebook App (Business type)

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
- `FACEBOOK_APP_ID` - Your Facebook App ID
- `FACEBOOK_APP_SECRET` - Your Facebook App Secret
- `FACEBOOK_CONFIG_ID` - Embedded Signup Configuration ID
- `DATABASE_URL` - PostgreSQL connection string
- `ENCRYPTION_KEY` - 32-character encryption key

### 4. Setup Database

```bash
npm run db:generate
npm run db:migrate
```

### 5. Start Server

```bash
npm run dev
```

Server runs at http://localhost:3000

## Facebook App Configuration

### 1. Create Facebook App
1. Go to developers.facebook.com
2. Create app → Type: Business
3. Add "WhatsApp" product

### 2. Configure Facebook Login for Business
1. Go to Facebook Login for Business → Settings
2. Enable:
   - Client OAuth Login
   - Web OAuth Login
   - Embedded Browser OAuth Login
   - Strict Mode for Redirect URIs

3. Add Allowed Domains:
   - localhost
   - your-domain.com

4. Add Valid OAuth Redirect URIs:
   - http://localhost:3000/api/whatsapp/oauth/callback

### 3. Create Configuration
1. Go to Facebook Login for Business → Configurations
2. Create Configuration:
   - Template: WhatsApp Embedded Signup
   - Required Permissions: whatsapp_business_management, whatsapp_business_messaging
3. Copy the Configuration ID

### 4. Webhook Configuration
The server automatically configures webhooks when you connect WhatsApp.

## API Endpoints

### WhatsApp Connection
- `POST /api/whatsapp/oauth/callback` - Exchange code for tokens
- `POST /api/whatsapp/connect` - Complete WhatsApp connection
- `POST /api/whatsapp/verify-phone` - Verify phone number
- `GET /api/whatsapp/status/:tenantId` - Get connection status

### Webhooks
- `GET /api/webhooks/whatsapp` - Webhook verification
- `POST /api/webhooks/whatsapp` - Receive events

### Messages
- `POST /api/messages/send` - Send message
- `GET /api/messages/:conversationId` - Get messages
- `GET /api/messages/conversations/:tenantId` - List conversations

### CTWA Tracking
- `GET /api/ctwa/:tenantId` - Get attributions
- `GET /api/ctwa/:tenantId/analytics` - Get analytics
- `POST /api/ctwa/track` - Track conversion

### Analytics
- `GET /api/analytics/:tenantId/dashboard` - Dashboard metrics
- `GET /api/analytics/:tenantId/campaigns` - Campaign performance
- `GET /api/analytics/:tenantId/funnel` - Lead funnel

### Contacts
- `GET /api/contacts/:tenantId` - List contacts
- `GET /api/contacts/:tenantId/:id` - Contact detail
- `POST /api/contacts/:tenantId` - Create contact
- `PUT /api/contacts/:tenantId/:id` - Update contact
- `POST /api/contacts/:tenantId/:id/tags` - Add tags

## Frontend Pages

- `/index.html` - Dashboard with connection wizard
- `/chat.html` - Live chat interface
- `/ctwa.html` - CTWA analytics
- `/contacts.html` - Contact management
- `/analytics.html` - Full analytics

## Architecture

```
Frontend (HTML/JS)
    ↓
Express Server (TypeScript)
    ↓
PostgreSQL (Drizzle ORM)
    ↓
Meta Cloud API
```

## Production Checklist

- [ ] Configure Facebook App for production
- [ ] Complete App Review
- [ ] Set up System User Token
- [ ] Configure encryption keys
- [ ] Set up database backups
- [ ] Configure HTTPS
- [ ] Set up monitoring
