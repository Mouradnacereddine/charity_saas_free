/**
 * Socket.IO event emitter helper for route handlers.
 * Socket.IO is imported lazily so it's not required on Vercel serverless.
 */

let _io: any = null;

export function setIO(io: any) {
  _io = io;
}

export function getIO(): any {
  return _io;
}

/**
 * Notify all clients in an association's room that a resource has changed.
 * No-op on Vercel (serverless).
 */
export function emitInvalidation(associationId: string, resource: string) {
  if (!_io) return;
  try {
    _io.to(`assoc:${associationId}`).emit('invalidate', { resource });
  } catch {
    // Silently ignore — socket not available in serverless
  }
}
