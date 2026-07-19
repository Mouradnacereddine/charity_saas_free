/**
 * Socket.IO event emitter helper for route handlers.
 * Emits real-time invalidation events so connected clients
 * can refetch their data.
 */
import { Server as SocketIOServer } from 'socket.io';

let _io: SocketIOServer | null = null;

export function setIO(io: SocketIOServer) {
  _io = io;
}

export function getIO(): SocketIOServer | null {
  return _io;
}

/**
 * Notify all clients in an association's room that a resource has changed.
 * Clients should invalidate their TanStack Query cache for the given keys.
 *
 * @param associationId - the multi-tenant scope
 * @param resource - short key matching the queryKey prefix (e.g. 'transactions', 'caisses', 'beneficiaries')
 */
export function emitInvalidation(associationId: string, resource: string) {
  if (!_io) return;
  _io.to(`assoc:${associationId}`).emit('invalidate', { resource });
}
