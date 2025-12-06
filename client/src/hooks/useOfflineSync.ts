import { useState, useEffect, useCallback } from 'react';

interface OfflineQueueItem {
  id: string;
  url: string;
  method: string;
  body: string;
  headers: Record<string, string>;
  timestamp: number;
}

interface UseOfflineSyncReturn {
  isOnline: boolean;
  pendingCount: number;
  pendingItems: OfflineQueueItem[];
  lastSyncResult: { processed: number; failed: number } | null;
  syncNow: () => Promise<void>;
  clearQueue: () => Promise<void>;
  cachePortalData: () => Promise<void>;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingItems, setPendingItems] = useState<OfflineQueueItem[]>([]);
  const [lastSyncResult, setLastSyncResult] = useState<{ processed: number; failed: number } | null>(null);

  // Monitorar status online/offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Tentar sincronizar automaticamente quando voltar online
      syncNow();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Escutar mensagens do Service Worker
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, ...data } = event.data || {};

      switch (type) {
        case 'OFFLINE_QUEUE_PROCESSED':
          setLastSyncResult({ processed: data.processed, failed: data.failed });
          setPendingCount(data.remaining);
          refreshQueueStatus();
          break;
          
        case 'OFFLINE_QUEUE_STATUS':
          setPendingItems(data.queue || []);
          setPendingCount(data.queue?.length || 0);
          break;
          
        case 'OFFLINE_QUEUE_CLEARED':
          setPendingItems([]);
          setPendingCount(0);
          break;
          
        case 'PORTAL_DATA_CACHED':
          console.log('[OfflineSync] Dados do portal cacheados para modo offline');
          break;
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    // Buscar status inicial da fila
    refreshQueueStatus();

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  // Atualizar status da fila
  const refreshQueueStatus = useCallback(async () => {
    if (!navigator.serviceWorker?.controller) return;

    navigator.serviceWorker.controller.postMessage({
      type: 'GET_OFFLINE_QUEUE'
    });
  }, []);

  // Sincronizar fila offline manualmente
  const syncNow = useCallback(async () => {
    if (!navigator.serviceWorker?.controller) return;
    if (!navigator.onLine) return;

    navigator.serviceWorker.controller.postMessage({
      type: 'PROCESS_OFFLINE_QUEUE'
    });
  }, []);

  // Limpar fila offline
  const clearQueue = useCallback(async () => {
    if (!navigator.serviceWorker?.controller) return;

    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_OFFLINE_QUEUE'
    });
  }, []);

  // Cachear dados do portal para uso offline
  const cachePortalData = useCallback(async () => {
    if (!navigator.serviceWorker?.controller) return;

    const token = localStorage.getItem('portal_token');
    if (!token) return;

    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_PORTAL_DATA',
      token
    });
  }, []);

  return {
    isOnline,
    pendingCount,
    pendingItems,
    lastSyncResult,
    syncNow,
    clearQueue,
    cachePortalData
  };
}

export default useOfflineSync;
