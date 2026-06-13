import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getSupabase } from '../db/supabase.js';
import { generateToken, authMiddleware, AuthUser } from '../middleware/auth.js';

const router = Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const supabase = getSupabase();
    
    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Conta desativada' });
    }

    // For master admin, accept simple password check
    let passwordValid = false;
    
    if (user.role === 'admin' && !user.password_hash?.startsWith('$2')) {
      // Legacy admin - accept admin123
      passwordValid = password === 'admin123';
    } else if (user.password_hash) {
      passwordValid = await bcrypt.compare(password, user.password_hash);
    }

    if (!passwordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Get tenant info
    const { data: tenant } = await supabase
      .from('tenants')
      .select('is_master')
      .eq('id', user.tenant_id)
      .single();

    // Parse permissions
    let permissions: string[] = [];
    try {
      permissions = JSON.parse(user.permissions || '[]');
    } catch {}

    // Build auth user
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenant_id: user.tenant_id,
      customer_id: user.customer_id || undefined,
      permissions,
      is_master: tenant?.is_master === 1
    };

    // Generate token
    const token = generateToken(authUser);

    // Update last access (ignore if column doesn't exist)
    try {
      await supabase
        .from('users')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', user.id);
    } catch (e) {}

    // Log the login (ignore if audit_logs table doesn't exist)
    try {
      await supabase.from('audit_logs').insert({
        tenant_id: user.tenant_id,
        user_id: user.id,
        action: 'login',
        entity: 'user',
        entity_id: user.id,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
    } catch (e) {}

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        is_master: tenant?.is_master === 1
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const supabase = getSupabase();
    
    // Try to get user with customer_id column, fallback without it
    let user: any = null;
    let error: any = null;
    
    const result = await supabase
      .from('users')
      .select('id, email, name, avatar, role, permissions, customer_id, created_at')
      .eq('id', req.user!.id)
      .single();
    
    if (result.error) {
      // Fallback without customer_id
      const fallback = await supabase
        .from('users')
        .select('id, email, name, avatar, role, permissions, created_at')
        .eq('id', req.user!.id)
        .single();
      user = fallback.data;
      error = fallback.error;
    } else {
      user = result.data;
    }

    if (error || !user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Get tenant info
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, slug, is_master')
      .eq('id', req.user!.tenant_id)
      .single();

    // Get customer info if exists
    let customerInfo = null;
    if (user.customer_id || req.user!.customer_id) {
      try {
        const { data: customer } = await supabase
          .from('customers')
          .select('id, name, company, plan_id, status')
          .eq('id', user.customer_id || req.user!.customer_id)
          .single();
        customerInfo = customer;
      } catch (e) {}
    }

    res.json({
      ...user,
      permissions: JSON.parse(user.permissions || '[]'),
      tenant,
      customer: customerInfo,
      is_master: tenant?.is_master === 1
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const supabase = getSupabase();
    
    // Log the logout (ignore if audit_logs table doesn't exist)
    try {
      await supabase.from('audit_logs').insert({
        tenant_id: req.user!.tenant_id,
        user_id: req.user!.id,
        action: 'logout',
        entity: 'user',
        entity_id: req.user!.id,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
    } catch (e) {}

    res.json({ success: true });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Change password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
    }

    const supabase = getSupabase();
    
    const { data: user, error } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', req.user!.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verify current password
    let valid = false;
    if (user.password_hash?.startsWith('$2')) {
      valid = await bcrypt.compare(currentPassword, user.password_hash);
    } else {
      valid = currentPassword === 'admin123';
    }

    if (!valid) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);

    await supabase
      .from('users')
      .update({ password_hash: newHash, updated_at: new Date().toISOString() })
      .eq('id', req.user!.id);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Impersonate customer (admin only)
router.post('/impersonate/:customerId', authMiddleware, async (req, res) => {
  try {
    if (!req.user!.is_master && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { customerId } = req.params;
    const supabase = getSupabase();

    // Get customer
    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error || !customer) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Find or create user for this customer
    let { data: customerUser } = await supabase
      .from('users')
      .select('id')
      .eq('customer_id', customerId)
      .eq('role', 'owner')
      .single();

    if (!customerUser) {
      // Create owner user for customer
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          tenant_id: req.user!.tenant_id,
          email: customer.email,
          name: customer.name,
          role: 'owner',
          customer_id: customerId,
          is_active: 1
        })
        .select('id')
        .single();
      customerUser = newUser;
    }

    // Generate impersonation token
    const authUser: AuthUser = {
      id: customerUser!.id,
      email: customer.email,
      name: customer.name,
      role: 'owner',
      tenant_id: req.user!.tenant_id,
      customer_id: customerId,
      permissions: [],
      is_master: false
    };

    const token = generateToken(authUser);

    // Log impersonation (ignore if audit_logs doesn't exist)
    try {
      await supabase.from('audit_logs').insert({
        tenant_id: req.user!.tenant_id,
        user_id: req.user!.id,
        action: 'impersonate',
        entity: 'customer',
        entity_id: customerId,
        new_data: JSON.stringify({ impersonated_by: req.user!.id }),
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      });
    } catch (e) {}

    res.json({
      token,
      user: {
        id: customerUser!.id,
        email: customer.email,
        name: customer.name,
        role: 'owner',
        impersonated: true,
        impersonated_by: req.user!.name
      },
      customer
    });
  } catch (error: any) {
    console.error('Impersonate error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
