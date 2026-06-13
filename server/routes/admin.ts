// @ts-nocheck
import { Router } from 'express';
import { getSupabase } from '../db/supabase.js';
import { authMiddleware, requireMaster } from '../middleware/auth.js';
import { requirePermission, PERMISSIONS } from '../middleware/rbac.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const router = Router();

// All admin routes require authentication
router.use(authMiddleware);

// ============================================================
// CUSTOMERS (Master only)
// ============================================================

router.get('/customers', requireMaster, async (req, res) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('customers')
      .select('*, plans!inner(name, slug, price), workspaces(id, name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    // Get usage for each customer
    const customersWithUsage = await Promise.all((data || []).map(async (customer) => {
      const [contacts, flows, agents, voices] = await Promise.all([
        sb.from('contacts').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id),
        sb.from('flows').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id),
        sb.from('agents').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id),
        sb.from('voices').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id)
      ]);
      
      return {
        ...customer,
        usage: {
          contacts: contacts.count || 0,
          flows: flows.count || 0,
          agents: agents.count || 0,
          voices: voices.count || 0
        }
      };
    }));
    
    res.json(customersWithUsage);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/customers', requireMaster, async (req, res) => {
  try {
    const sb = getSupabase();
    const { name, email, phone, company, plan_id, notes } = req.body;
    
    // Create customer
    const customerId = crypto.randomUUID();
    const { data: plan } = await sb.from('plans').select('*').eq('id', plan_id).single();
    
    const customer = {
      id: customerId,
      tenant_id: req.user!.tenant_id,
      name,
      email,
      phone,
      company,
      plan_id,
      status: 'active',
      notes,
      max_contacts: plan?.max_contacts || 0,
      max_flows: plan?.max_flows || 0,
      max_workspaces: plan?.max_workspaces || 1,
      max_phone_numbers: plan?.max_phone_numbers || 1,
      max_agents: plan?.max_agents || 0,
      max_voices: plan?.max_voices || 0,
      max_executions: plan?.max_executions || 0,
      max_tokens: plan?.max_tokens || 0,
      max_users: plan?.max_users || 1,
      max_integrations: plan?.max_integrations || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { error } = await sb.from('customers').insert(customer);
    if (error) throw error;
    
    // Create owner user for customer
    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash('123456', 10);
    
    await sb.from('users').insert({
      id: userId,
      tenant_id: req.user!.tenant_id,
      email,
      name,
      password_hash: passwordHash,
      role: 'owner',
      customer_id: customerId,
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    // Create default workspace
    await sb.from('workspaces').insert({
      tenant_id: req.user!.tenant_id,
      customer_id: customerId,
      name: 'Workspace Principal',
      slug: 'principal',
      settings: '{}',
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    // Create subscription
    if (plan_id) {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      
      await sb.from('subscriptions').insert({
        tenant_id: req.user!.tenant_id,
        customer_id: customerId,
        plan_id,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      });
    }
    
    // Log the action
    await sb.from('audit_logs').insert({
      tenant_id: req.user!.tenant_id,
      user_id: req.user!.id,
      action: 'create',
      entity: 'customer',
      entity_id: customerId,
      new_data: JSON.stringify(customer),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.json(customer);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/customers/:id', requireMaster, async (req, res) => {
  try {
    const sb = getSupabase();
    const { id } = req.params;
    const updates = req.body;
    
    // Get old data for audit
    const { data: oldData } = await sb.from('customers').select('*').eq('id', id).single();
    
    updates.updated_at = new Date().toISOString();
    
    const { data, error } = await sb.from('customers').update(updates).eq('id', id).select();
    if (error) throw error;
    
    // Log the action
    await sb.from('audit_logs').insert({
      tenant_id: req.user!.tenant_id,
      user_id: req.user!.id,
      action: 'update',
      entity: 'customer',
      entity_id: id,
      old_data: JSON.stringify(oldData),
      new_data: JSON.stringify(updates),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.json(data?.[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/customers/:id', requireMaster, async (req, res) => {
  try {
    const sb = getSupabase();
    const { id } = req.params;
    
    // Get old data for audit
    const { data: oldData } = await sb.from('customers').select('*').eq('id', id).single();
    
    // Soft delete - set status to cancelled
    const { error } = await sb.from('customers').update({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    }).eq('id', id);
    if (error) throw error;
    
    // Log the action
    await sb.from('audit_logs').insert({
      tenant_id: req.user!.tenant_id,
      user_id: req.user!.id,
      action: 'delete',
      entity: 'customer',
      entity_id: id,
      old_data: JSON.stringify(oldData),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/customers/:id/suspend', requireMaster, async (req, res) => {
  try {
    const sb = getSupabase();
    const { id } = req.params;
    
    const { error } = await sb.from('customers').update({
      status: 'suspended',
      updated_at: new Date().toISOString()
    }).eq('id', id);
    if (error) throw error;
    
    // Log the action
    await sb.from('audit_logs').insert({
      tenant_id: req.user!.tenant_id,
      user_id: req.user!.id,
      action: 'suspend',
      entity: 'customer',
      entity_id: id,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/customers/:id/reactivate', requireMaster, async (req, res) => {
  try {
    const sb = getSupabase();
    const { id } = req.params;
    
    const { error } = await sb.from('customers').update({
      status: 'active',
      updated_at: new Date().toISOString()
    }).eq('id', id);
    if (error) throw error;
    
    // Log the action
    await sb.from('audit_logs').insert({
      tenant_id: req.user!.tenant_id,
      user_id: req.user!.id,
      action: 'reactivate',
      entity: 'customer',
      entity_id: id,
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// PLANS (Master only)
// ============================================================

router.get('/plans', async (req, res) => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('plans').select('*').eq('is_active', 1).order('price');
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/plans', requireMaster, async (req, res) => {
  try {
    const sb = getSupabase();
    const id = crypto.randomUUID();
    const plan = { id, ...req.body, is_active: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { error } = await sb.from('plans').insert(plan);
    if (error) throw error;
    res.json(plan);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/plans/:id', requireMaster, async (req, res) => {
  try {
    const sb = getSupabase();
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    const { data, error } = await sb.from('plans').update(updates).eq('id', id).select();
    if (error) throw error;
    res.json(data?.[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/plans/:id', requireMaster, async (req, res) => {
  try {
    const sb = getSupabase();
    const { id } = req.params;
    const { error } = await sb.from('plans').update({ is_active: 0 }).eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// USERS
// ============================================================

router.get('/users', requirePermission(PERMISSIONS.USERS_VIEW), async (req, res) => {
  try {
    const sb = getSupabase();
    let query = sb.from('users').select('id, email, name, avatar, role, permissions, is_active, customer_id, created_at, updated_at');
    
    // Non-admin users only see users from their customer
    if (!req.user!.is_master && req.user!.customer_id) {
      query = query.eq('customer_id', req.user!.customer_id);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/users', requirePermission(PERMISSIONS.USERS_CREATE), async (req, res) => {
  try {
    const sb = getSupabase();
    const { email, name, password, role, customer_id } = req.body;
    
    // Check if user already exists
    const { data: existing } = await sb.from('users').select('id').eq('email', email).single();
    if (existing) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    
    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password || '123456', 10);
    
    const user = {
      id: userId,
      tenant_id: req.user!.tenant_id,
      email,
      name,
      password_hash: passwordHash,
      role: role || 'agent',
      customer_id: customer_id || req.user!.customer_id,
      is_active: 1,
      permissions: '[]',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { error } = await sb.from('users').insert(user);
    if (error) throw error;
    
    // Log the action
    await sb.from('audit_logs').insert({
      tenant_id: req.user!.tenant_id,
      user_id: req.user!.id,
      action: 'create',
      entity: 'user',
      entity_id: userId,
      new_data: JSON.stringify({ email, name, role }),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.json({ id: userId, email, name, role });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id', requirePermission(PERMISSIONS.USERS_EDIT), async (req, res) => {
  try {
    const sb = getSupabase();
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    
    // Hash password if provided
    if (updates.password) {
      updates.password_hash = await bcrypt.hash(updates.password, 10);
      delete updates.password;
    }
    
    const { data, error } = await sb.from('users').update(updates).eq('id', id).select('id, email, name, role, is_active');
    if (error) throw error;
    res.json(data?.[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.delete('/users/:id', requirePermission(PERMISSIONS.USERS_DELETE), async (req, res) => {
  try {
    const sb = getSupabase();
    const { id } = req.params;
    
    // Soft delete
    const { error } = await sb.from('users').update({ is_active: 0 }).eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// WORKSPACES
// ============================================================

router.get('/workspaces', async (req, res) => {
  try {
    const sb = getSupabase();
    let query = sb.from('workspaces').select('*');
    
    if (!req.user!.is_master && req.user!.customer_id) {
      query = query.eq('customer_id', req.user!.customer_id);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// PLATFORM STATS (Master only)
// ============================================================

router.get('/stats', requireMaster, async (req, res) => {
  try {
    const sb = getSupabase();
    
    const [customers, users, contacts, conversations, flows, agents, sales, subscriptions] = await Promise.all([
      sb.from('customers').select('id, status, plan_id'),
      sb.from('users').select('id, is_active'),
      sb.from('contacts').select('id', { count: 'exact', head: true }),
      sb.from('conversations').select('id', { count: 'exact', head: true }),
      sb.from('flows').select('id', { count: 'exact', head: true }),
      sb.from('agents').select('id', { count: 'exact', head: true }),
      sb.from('sales').select('amount, status'),
      sb.from('subscriptions').select('id, status, plan_id')
    ]);
    
    const allCustomers = customers.data || [];
    const allSales = sales.data || [];
    const allSubscriptions = subscriptions.data || [];
    
    // Calculate revenue
    const revenue = allSales.filter((s: any) => s.status === 'approved').reduce((sum: number, s: any) => sum + (s.amount || 0), 0);
    
    // Customer stats
    const activeCustomers = allCustomers.filter((c: any) => c.status === 'active').length;
    const suspendedCustomers = allCustomers.filter((c: any) => c.status === 'suspended').length;
    const trialCustomers = allCustomers.filter((c: any) => c.status === 'trial').length;
    
    // Subscription stats
    const activeSubscriptions = allSubscriptions.filter((s: any) => s.status === 'active').length;
    
    // Plan distribution
    const planDistribution = allCustomers.reduce((acc: any, c: any) => {
      acc[c.plan_id] = (acc[c.plan_id] || 0) + 1;
      return acc;
    }, {});
    
    res.json({
      totalCustomers: allCustomers.length,
      activeCustomers,
      suspendedCustomers,
      trialCustomers,
      totalUsers: (users.data || []).length,
      activeUsers: (users.data || []).filter((u: any) => u.is_active).length,
      totalContacts: contacts.count || 0,
      totalConversations: conversations.count || 0,
      totalFlows: flows.count || 0,
      totalAgents: agents.count || 0,
      totalSales: allSales.length,
      revenue,
      activeSubscriptions,
      planDistribution
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// SaaS Revenue (Master only)
// ============================================================

router.get('/revenue', requireMaster, async (req, res) => {
  try {
    const sb = getSupabase();
    
    // Get all subscriptions with plan info
    const { data: subscriptions, error: subError } = await sb
      .from('subscriptions')
      .select('*, plans(name, price, slug)')
      .order('created_at', { ascending: false });
    
    if (subError) throw subError;
    
    // Calculate MRR
    const activeSubscriptions = (subscriptions || []).filter((s: any) => s.status === 'active');
    const mrr = activeSubscriptions.reduce((sum: number, s: any) => {
      const price = s.plans?.price || 0;
      return sum + price;
    }, 0);
    
    // Get revenue history
    const { data: revenueHistory } = await sb
      .from('saas_revenue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(12);
    
    // Calculate churn rate
    const totalSubscriptions = (subscriptions || []).length;
    const cancelledSubscriptions = (subscriptions || []).filter((s: any) => s.status === 'cancelled').length;
    const churnRate = totalSubscriptions > 0 ? (cancelledSubscriptions / totalSubscriptions) * 100 : 0;
    
    res.json({
      mrr,
      arr: mrr * 12,
      activeSubscriptions: activeSubscriptions.length,
      cancelledSubscriptions,
      churnRate: Math.round(churnRate * 100) / 100,
      revenueHistory: revenueHistory || []
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// AUDIT LOGS (Master only)
// ============================================================

router.get('/logs', requireMaster, async (req, res) => {
  try {
    const sb = getSupabase();
    const { limit = 50, offset = 0 } = req.query;
    
    const { data, error } = await sb
      .from('audit_logs')
      .select('*, users!inner(name, email)')
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);
    
    if (error) throw error;
    res.json(data || []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
