// @ts-nocheck
import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Missing required environment variable: JWT_SECRET');
}

let io: SocketServer | null = null;

export function initWebSocket(server: HttpServer): SocketServer {
  io = new SocketServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    path: '/ws',
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token as string, JWT_SECRET) as any;
      (socket as any).userId = decoded.userId;
      (socket as any).tenantId = decoded.tenantId;
      (socket as any).role = decoded.role;
      next();
    } catch (e) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = (socket as any).userId;
    const tenantId = (socket as any).tenantId;
    console.log(`🔌 WebSocket connected: user=${userId} tenant=${tenantId}`);

    // Join tenant room
    if (tenantId) {
      socket.join(`tenant:${tenantId}`);
    }

    // Join user room for personal notifications
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Handle joining conversation rooms
    socket.on('join:conversation', (conversationId: string) => {
      socket.join(`conv:${conversationId}`);
      console.log(`📎 User ${userId} joined conversation ${conversationId}`);
    });

    socket.on('leave:conversation', (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
    });

    // Handle typing indicators
    socket.on('typing:start', (conversationId: string) => {
      socket.to(`conv:${conversationId}`).emit('typing:start', {
        conversationId,
        userId,
        timestamp: Date.now(),
      });
    });

    socket.on('typing:stop', (conversationId: string) => {
      socket.to(`conv:${conversationId}`).emit('typing:stop', {
        conversationId,
        userId,
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 WebSocket disconnected: user=${userId}`);
    });
  });

  return io;
}

export function getIO(): SocketServer | null {
  return io;
}

// ─── Emit Helpers ──────────────────────────────────────────────
export function emitToTenant(tenantId: string, event: string, data: any): void {
  if (io) io.to(`tenant:${tenantId}`).emit(event, data);
}

export function emitToConversation(conversationId: string, event: string, data: any): void {
  if (io) io.to(`conv:${conversationId}`).emit(event, data);
}

export function emitToUser(userId: string, event: string, data: any): void {
  if (io) io.to(`user:${userId}`).emit(event, data);
}

// ─── Real-time Events ──────────────────────────────────────────
export function broadcastNewMessage(conversationId: string, tenantId: string, message: any): void {
  emitToConversation(conversationId, 'message:new', {
    conversationId,
    message,
    timestamp: Date.now(),
  });

  // Also notify tenant about new message
  emitToTenant(tenantId, 'conversation:message', {
    conversationId,
    message,
  });
}

export function broadcastConversationUpdate(conversationId: string, tenantId: string, update: any): void {
  emitToTenant(tenantId, 'conversation:update', {
    conversationId,
    ...update,
  });
}

export function broadcastNewConversation(tenantId: string, conversation: any): void {
  emitToTenant(tenantId, 'conversation:new', conversation);
}

export function broadcastTransfer(conversationId: string, tenantId: string, transfer: any): void {
  emitToTenant(tenantId, 'conversation:transfer', {
    conversationId,
    ...transfer,
  });

  // Notify all operators in tenant
  emitToTenant(tenantId, 'notification', {
    type: 'transfer',
    title: 'Conversa transferida',
    message: transfer.reason,
    conversationId,
    timestamp: Date.now(),
  });
}
