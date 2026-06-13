import { Request, Response, NextFunction } from 'express';

// Permission definitions
export const PERMISSIONS = {
  // CRM
  CONTACTS_VIEW: 'contacts:view',
  CONTACTS_CREATE: 'contacts:create',
  CONTACTS_EDIT: 'contacts:edit',
  CONTACTS_DELETE: 'contacts:delete',
  CONTACTS_EXPORT: 'contacts:export',
  
  // Chat
  CHAT_VIEW: 'chat:view',
  CHAT_SEND: 'chat:send',
  CHAT_CLOSE: 'chat:close',
  CHAT_TRANSFER: 'chat:transfer',
  CHAT_AI_TOGGLE: 'chat:ai_toggle',
  
  // Flows
  FLOWS_VIEW: 'flows:view',
  FLOWS_CREATE: 'flows:create',
  FLOWS_EDIT: 'flows:edit',
  FLOWS_DELETE: 'flows:delete',
  FLOWS_EXECUTE: 'flows:execute',
  
  // Agents
  AGENTS_VIEW: 'agents:view',
  AGENTS_CREATE: 'agents:create',
  AGENTS_EDIT: 'agents:edit',
  AGENTS_DELETE: 'agents:delete',
  AGENTS_TEST: 'agents:test',
  
  // Voice
  VOICE_VIEW: 'voice:view',
  VOICE_CREATE: 'voice:create',
  VOICE_EDIT: 'voice:edit',
  VOICE_DELETE: 'voice:delete',
  VOICE_USE: 'voice:use',
  
  // Sales
  SALES_VIEW: 'sales:view',
  SALES_CREATE: 'sales:create',
  SALES_EDIT: 'sales:edit',
  SALES_DELETE: 'sales:delete',
  SALES_EXPORT: 'sales:export',
  
  // Analytics
  ANALYTICS_VIEW: 'analytics:view',
  ANALYTICS_EXPORT: 'analytics:export',
  
  // Integrations
  INTEGRATIONS_VIEW: 'integrations:view',
  INTEGRATIONS_CREATE: 'integrations:create',
  INTEGRATIONS_EDIT: 'integrations:edit',
  INTEGRATIONS_DELETE: 'integrations:delete',
  
  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',
  
  // Users (admin only)
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_EDIT: 'users:edit',
  USERS_DELETE: 'users:delete',
  
  // Customers (master only)
  CUSTOMERS_VIEW: 'customers:view',
  CUSTOMERS_CREATE: 'customers:create',
  CUSTOMERS_EDIT: 'customers:edit',
  CUSTOMERS_DELETE: 'customers:delete',
  CUSTOMERS_IMPERSONATE: 'customers:impersonate',
  
  // Plans (master only)
  PLANS_VIEW: 'plans:view',
  PLANS_CREATE: 'plans:create',
  PLANS_EDIT: 'plans:edit',
  PLANS_DELETE: 'plans:delete',
  
  // System (master only)
  SYSTEM_VIEW: 'system:view',
  SYSTEM_EDIT: 'system:edit',
  SYSTEM_BACKUP: 'system:backup',
  SYSTEM_RESTORE: 'system:restore'
};

// Role-based permission sets
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: Object.values(PERMISSIONS), // Admin master has all permissions
  
  owner: [
    PERMISSIONS.CONTACTS_VIEW, PERMISSIONS.CONTACTS_CREATE, PERMISSIONS.CONTACTS_EDIT, PERMISSIONS.CONTACTS_DELETE, PERMISSIONS.CONTACTS_EXPORT,
    PERMISSIONS.CHAT_VIEW, PERMISSIONS.CHAT_SEND, PERMISSIONS.CHAT_CLOSE, PERMISSIONS.CHAT_TRANSFER, PERMISSIONS.CHAT_AI_TOGGLE,
    PERMISSIONS.FLOWS_VIEW, PERMISSIONS.FLOWS_CREATE, PERMISSIONS.FLOWS_EDIT, PERMISSIONS.FLOWS_DELETE, PERMISSIONS.FLOWS_EXECUTE,
    PERMISSIONS.AGENTS_VIEW, PERMISSIONS.AGENTS_CREATE, PERMISSIONS.AGENTS_EDIT, PERMISSIONS.AGENTS_DELETE, PERMISSIONS.AGENTS_TEST,
    PERMISSIONS.VOICE_VIEW, PERMISSIONS.VOICE_CREATE, PERMISSIONS.VOICE_EDIT, PERMISSIONS.VOICE_DELETE, PERMISSIONS.VOICE_USE,
    PERMISSIONS.SALES_VIEW, PERMISSIONS.SALES_CREATE, PERMISSIONS.SALES_EDIT, PERMISSIONS.SALES_DELETE, PERMISSIONS.SALES_EXPORT,
    PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.ANALYTICS_EXPORT,
    PERMISSIONS.INTEGRATIONS_VIEW, PERMISSIONS.INTEGRATIONS_CREATE, PERMISSIONS.INTEGRATIONS_EDIT, PERMISSIONS.INTEGRATIONS_DELETE,
    PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_EDIT,
    PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_EDIT, PERMISSIONS.USERS_DELETE
  ],
  
  manager: [
    PERMISSIONS.CONTACTS_VIEW, PERMISSIONS.CONTACTS_CREATE, PERMISSIONS.CONTACTS_EDIT, PERMISSIONS.CONTACTS_DELETE, PERMISSIONS.CONTACTS_EXPORT,
    PERMISSIONS.CHAT_VIEW, PERMISSIONS.CHAT_SEND, PERMISSIONS.CHAT_CLOSE, PERMISSIONS.CHAT_TRANSFER, PERMISSIONS.CHAT_AI_TOGGLE,
    PERMISSIONS.FLOWS_VIEW, PERMISSIONS.FLOWS_CREATE, PERMISSIONS.FLOWS_EDIT, PERMISSIONS.FLOWS_DELETE, PERMISSIONS.FLOWS_EXECUTE,
    PERMISSIONS.AGENTS_VIEW, PERMISSIONS.AGENTS_CREATE, PERMISSIONS.AGENTS_EDIT, PERMISSIONS.AGENTS_DELETE, PERMISSIONS.AGENTS_TEST,
    PERMISSIONS.VOICE_VIEW, PERMISSIONS.VOICE_CREATE, PERMISSIONS.VOICE_EDIT, PERMISSIONS.VOICE_DELETE, PERMISSIONS.VOICE_USE,
    PERMISSIONS.SALES_VIEW, PERMISSIONS.SALES_CREATE, PERMISSIONS.SALES_EDIT, PERMISSIONS.SALES_DELETE, PERMISSIONS.SALES_EXPORT,
    PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.ANALYTICS_EXPORT,
    PERMISSIONS.INTEGRATIONS_VIEW, PERMISSIONS.INTEGRATIONS_CREATE, PERMISSIONS.INTEGRATIONS_EDIT, PERMISSIONS.INTEGRATIONS_DELETE,
    PERMISSIONS.SETTINGS_VIEW
  ],
  
  agent: [
    PERMISSIONS.CONTACTS_VIEW, PERMISSIONS.CONTACTS_CREATE, PERMISSIONS.CONTACTS_EDIT,
    PERMISSIONS.CHAT_VIEW, PERMISSIONS.CHAT_SEND, PERMISSIONS.CHAT_CLOSE, PERMISSIONS.CHAT_TRANSFER,
    PERMISSIONS.FLOWS_VIEW,
    PERMISSIONS.AGENTS_VIEW,
    PERMISSIONS.VOICE_VIEW, PERMISSIONS.VOICE_USE,
    PERMISSIONS.SALES_VIEW, PERMISSIONS.SALES_CREATE, PERMISSIONS.SALES_EDIT,
    PERMISSIONS.ANALYTICS_VIEW
  ],
  
  financial: [
    PERMISSIONS.CONTACTS_VIEW,
    PERMISSIONS.CHAT_VIEW,
    PERMISSIONS.SALES_VIEW, PERMISSIONS.SALES_CREATE, PERMISSIONS.SALES_EDIT, PERMISSIONS.SALES_EXPORT,
    PERMISSIONS.ANALYTICS_VIEW, PERMISSIONS.ANALYTICS_EXPORT
  ]
};

// Get user's effective permissions
export function getUserPermissions(user: { role: string; permissions?: string[] }): string[] {
  const rolePerms = ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS.agent;
  const customPerms = user.permissions || [];
  
  // Combine role permissions with custom permissions (remove duplicates)
  return [...new Set([...rolePerms, ...customPerms])];
}

// Check if user has a specific permission
export function hasPermission(user: { role: string; permissions?: string[] }, permission: string): boolean {
  // Admin master always has all permissions
  if (user.role === 'admin') return true;
  
  const perms = getUserPermissions(user);
  return perms.includes(permission);
}

// Middleware to require specific permissions
export function requirePermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    
    // Admin master bypasses permission checks
    if (req.user.is_master || req.user.role === 'admin') {
      return next();
    }
    
    const userPerms = getUserPermissions(req.user);
    
    for (const perm of permissions) {
      if (!userPerms.includes(perm)) {
        return res.status(403).json({ error: 'Permissão insuficiente', required: perm });
      }
    }
    
    next();
  };
}

// Middleware to check plan limits
export function checkPlanLimit(metric: string, limitCheck: (req: Request) => Promise<{ allowed: boolean; current: number; limit: number }>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    
    // Admin master bypasses limits
    if (req.user.is_master || req.user.role === 'admin') {
      return next();
    }
    
    try {
      const { allowed, current, limit } = await limitCheck(req);
      
      if (!allowed) {
        return res.status(403).json({
          error: `Limite atingido para ${metric}`,
          metric,
          current,
          limit,
          upgrade_required: true
        });
      }
      
      // Add limit info to response headers
      res.setHeader('X-Plan-Limit', limit.toString());
      res.setHeader('X-Plan-Current', current.toString());
      
      next();
    } catch (error) {
      next();
    }
  };
}
