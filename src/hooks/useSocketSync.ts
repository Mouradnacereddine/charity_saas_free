import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';

// The API URL, without the /api suffix
const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') ||
  (typeof window !== 'undefined' && window.location.origin.startsWith('http://localhost')
    ? 'http://localhost:3001'
    : window.location.origin);

// Map resource strings (from server) to queryKey prefixes to invalidate
const RESOURCE_TO_QUERY_KEYS: Record<string, string[]> = {
  transactions: ['transactions', 'finance-allocations', 'caisses', 'dashboard'],
  'finance-allocations': ['finance-allocations'],
  'bank-accounts': ['bank-accounts'],
  caisses: ['caisses'],
  dashboard: ['dashboard'],
  beneficiaries: ['beneficiaries'],
  donors: ['donors'],
  articles: ['articles'],
  'article-categories': ['article-categories'],
  'storage-locations': ['storage-locations'],
  'school-grades': ['school-grades'],
  'article-statuses': ['article-statuses'],
  loans: ['loans'],
  'medical-referrals': ['medical-referrals'],
  'analysis-types': ['analysis-types'],
  hospitals: ['hospitals'],
  doctors: ['doctors'],
  'doctor-specialties': ['doctor-specialties'],
  notifications: ['notifications'],
  attributs: ['attributs'],
  users: ['users'],
  invites: ['invites'],
  'finance-stats': ['finance-stats'],
  allocations: ['allocations'],
};

export function useSocketSync() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    let cleanup = false;

    import('socket.io-client').then(({ io }) => {
      if (cleanup) return;

      const socket = io(API_BASE, {
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        console.log('🔌 Socket connected');
        // Join the association room
        socket.emit('join-association', user.associationId);
      });

      socket.on('invalidate', (data: { resource: string }) => {
        const keys = RESOURCE_TO_QUERY_KEYS[data.resource];
        if (keys) {
          for (const key of keys) {
            queryClient.invalidateQueries({ queryKey: [key] });
          }
        }
      });

      socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected');
      });

      socketRef.current = socket;
    }).catch((err) => {
      console.warn('⚠️ Socket.IO not available, real-time sync disabled:', err.message);
    });

    return () => {
      cleanup = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, user?.associationId]);
}
