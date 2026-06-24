import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getSupabase } from '../db/supabase.js';

const TOKEN_EXPIRY = '7d';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing required environment variable: JWT_SECRET');
  return secret;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id: string;
  customer_id?: string;
  permissions: string[];
  is_master: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, getJwtSecret(), { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, getJwtSecret()) as AuthUser;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const user = verifyToken(token);
    
    // Verify user still exists and is active
    const supabase = getSupabase();
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id, is_active')
      .eq('id', user.id)
      .single();
    
    if (error || !dbUser || !dbUser.is_active) {
      return res.status(401).json({ error: 'Usuário inválido ou inativo' });
    }

    // Check if customer is suspended (if user belongs to a customer)
    // Handle gracefully if customers table doesn't have the expected structure
    if (user.customer_id) {
      try {
        const { data: customer } = await supabase
          .from('customers')
          .select('status')
          .eq('id', user.customer_id)
          .single();
        
        if (customer && customer.status === 'suspended') {
          return res.status(403).json({ error: 'Conta suspensa. Entre em contato com o suporte.' });
        }
        
        if (customer && customer.status === 'cancelled') {
          return res.status(403).json({ error: 'Conta cancelada. Entre em contato com o suporte.' });
        }
      } catch (e) {}
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    next();
  };
}

export function requireMaster(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !req.user.is_master) {
    return res.status(403).json({ error: 'Acesso restrito ao Admin Master' });
  }
  next();
}
