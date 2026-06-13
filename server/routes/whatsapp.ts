import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import { whatsappCredentials, tenants, contacts, conversations, messages } from '../db/schema.js';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { encrypt } from '../lib/encryption.js';
import {
  exchangeCodeForToken,
  getBusinesses,
  getWABAs,
  getPhoneNumbers,
  requestVerificationCode,
  verifyCode,
  registerPhoneNumber,
  subscribeAppToWABA,
} from '../services/meta-api.js';

const router = Router();

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || 'YOUR_APP_ID';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || 'YOUR_APP_SECRET';
const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/api/whatsapp/oauth/callback';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'ozion-verify-token-123';

// ============================================================
// POST /api/whatsapp/oauth/callback
// ============================================================
router.post('/oauth/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    // Exchange code for token
    const tokenData = await exchangeCodeForToken(
      code,
      FACEBOOK_APP_ID,
      FACEBOOK_APP_SECRET,
      REDIRECT_URI
    );

    // Get businesses
    const businesses = await getBusinesses(tokenData.access_token);

    res.json({
      success: true,
      businesses,
      shortLivedToken: tokenData.access_token,
    });
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/whatsapp/connect
// ============================================================
const connectSchema = z.object({
  tenantId: z.string().optional(),
  businessId: z.string(),
  businessName: z.string().optional(),
  wabaId: z.string(),
  wabaName: z.string().optional(),
  phoneNumberId: z.string(),
  pageId: z.string().optional(),
  shortLivedToken: z.string(),
  sessionInfo: z.string().optional(),
});

router.post('/connect', async (req: Request, res: Response) => {
  try {
    const data = connectSchema.parse(req.body);

    // Get or create tenant
    let tenantId = data.tenantId;
    if (!tenantId) {
      const tenantSlug = `tenant-${Date.now()}`;
      const [tenant] = await db.insert(tenants).values({
        id: crypto.randomUUID(),
        name: data.businessName || 'My Business',
        slug: tenantSlug,
      }).returning();
      tenantId = tenant.id;
    }

    // Get token
    const accessToken = data.shortLivedToken;

    // Get phone numbers to verify
    const phoneNumbers = await getPhoneNumbers(data.wabaId, accessToken);
    const phoneNumber = phoneNumbers.find(p => p.id === data.phoneNumberId);

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number not found in WABA' });
    }

    // Subscribe app to webhooks
    try {
      await subscribeAppToWABA(
        data.wabaId,
        accessToken,
        `${BASE_URL}/api/webhooks/whatsapp`,
        WEBHOOK_VERIFY_TOKEN
      );
    } catch (error) {
      console.warn('Webhook subscription skipped:', error);
    }

    // Save credentials
    const existingCred = db.select().from(whatsappCredentials)
      .where(eq(whatsappCredentials.tenantId, tenantId))
      .get();

    const credentialData = {
      id: existingCred?.id || crypto.randomUUID(),
      tenantId,
      businessId: data.businessId,
      businessName: data.businessName,
      wabaId: data.wabaId,
      wabaName: data.wabaName,
      pageId: data.pageId,
      phoneNumberId: data.phoneNumberId,
      displayPhoneNumber: phoneNumber.display_phone_number,
      accessTokenEncrypted: encrypt(accessToken),
      appId: FACEBOOK_APP_ID,
      appSecretEncrypted: encrypt(FACEBOOK_APP_SECRET),
      webhookVerifyToken: WEBHOOK_VERIFY_TOKEN,
      phoneNumberVerified: phoneNumber.code_verification_status === 'VERIFIED',
      messagingTier: phoneNumber.quality_rating || 'UNVERIFIED',
      qualityRating: phoneNumber.quality_rating,
      isOnBizApp: phoneNumber.is_on_biz_app || false,
      connectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingCred) {
      db.update(whatsappCredentials)
        .set(credentialData)
        .where(eq(whatsappCredentials.id, existingCred.id))
        .run();
    } else {
      db.insert(whatsappCredentials).values(credentialData).run();
    }

    res.json({
      success: true,
      tenantId,
      needsVerification: phoneNumber.code_verification_status === 'NOT_VERIFIED',
      phoneNumber: phoneNumber.display_phone_number,
      verifiedName: phoneNumber.verified_name,
    });
  } catch (error: any) {
    console.error('Connect error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /api/whatsapp/status/:tenantId
// ============================================================
router.get('/status/:tenantId', (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const cred = db.select().from(whatsappCredentials)
      .where(eq(whatsappCredentials.tenantId, tenantId))
      .get();

    if (!cred) {
      return res.json({ connected: false, message: 'WhatsApp not connected' });
    }

    res.json({
      connected: true,
      phoneNumber: cred.displayPhoneNumber,
      businessName: cred.businessName,
      wabaName: cred.wabaName,
      verified: cred.phoneNumberVerified,
      qualityRating: cred.qualityRating,
      connectedAt: cred.connectedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET /api/whatsapp/status (simple, for frontend)
// ============================================================
router.get('/status', (req: Request, res: Response) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    const cred = db.select().from(whatsappCredentials)
      .where(eq(whatsappCredentials.tenantId, tid))
      .get();

    if (!cred) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      phoneNumber: cred.displayPhoneNumber,
      businessName: cred.businessName,
      wabaName: cred.wabaName,
      verified: cred.phoneNumberVerified,
      qualityRating: cred.qualityRating,
      connectedAt: cred.connectedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// POST /api/whatsapp/disconnect
// ============================================================
router.post('/disconnect', (req: Request, res: Response) => {
  try {
    const tid = (req.headers['x-tenant-id'] as string) || 'default';
    db.delete(whatsappCredentials).where(eq(whatsappCredentials.tenantId, tid)).run();
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
