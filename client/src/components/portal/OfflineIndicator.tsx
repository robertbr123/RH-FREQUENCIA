import { useState, useEffect } from 'react';
import { 
  Wifi, WifiOff, Cloud, CloudOff, RefreshCw, 
  CheckCircle, AlertTriangle, X, ChevronUp, ChevronDown 
} from 'lucide-react';
import { useOfflineSync } from '../../hooks/useOfflineSync';

interface OfflineIndicatorProps {
  showDetails?: boolean;
}

export default function OfflineIndicator({ showDetails = false }: OfflineIndicatorProps) {
  const { 
    isOnline, 
    pendingCount, 
    pendingItems,
    lastSyncResult, 
    syncNow, 
    clearQueue 
  } = useOfflineSync();
  
  const [expanded, setExpanded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Mostrar notificação quando sincronizar
  useEffect(() => {
    if (lastSyncResult) {
      if (lastSyncResult.processed > 0) {
        setNotification({
          type: 'success',
          message: `${lastSyncResult.processed} ponto(s) sincronizado(s) com sucesso!`
        });
      } else if (lastSyncResult.failed > 0) {
        setNotification({
          type: 'error',
          message: `${lastSyncResult.failed} ponto(s) falharam na sincronização.`
        });
      }
      
      setSyncing(false);
      
      // Limpar notificação após 5 segundos
      setTimeout(() => setNotification(null), 5000);
    }
  }, [lastSyncResult]);

  const handleSync = async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);
    await syncNow();
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Se está online e não tem pendências, não mostrar nada (a menos que seja modo detalhado)
  if (isOnline && pendingCount === 0 && !showDetails) {
    return null;
  }

  return (
    <>
      {/* Notificação de Sincronização */}
      {notification && (
        <div 
          className={`fixed top-4 left-4 right-4 z-50 p-4 rounded-xl backdrop-blur-xl border flex items-center gap-3 animate-slide-down ${
            notification.type === 'success' 
              ? 'bg-green-500/20 border-green-500/30 text-green-400' 
              : 'bg-red-500/20 border-red-500/30 text-red-400'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="flex-1 text-sm">{notification.message}</span>
          <button onClick={() => setNotification(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Banner Offline */}
      {!isOnline && (
        <div className="bg-yellow-500/20 border-b border-yellow-500/30 px-4 py-2">
          <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm">
            <WifiOff className="w-4 h-4" />
            <span>Você está offline. Os pontos serão sincronizados quando a conexão voltar.</span>
          </div>
        </div>
      )}

      {/* Indicador de Pendências */}
      {pendingCount > 0 && (
        <div className="mx-4 mt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full bg-orange-500/20 backdrop-blur-xl rounded-xl p-4 border border-orange-500/30 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <CloudOff className="w-5 h-5 text-orange-400" />
              </div>
              <div className="text-left">
                <p className="text-orange-400 font-medium">
                  {pendingCount} ponto(s) pendente(s)
                </p>
                <p className="text-orange-400/70 text-sm">
                  {isOnline ? 'Toque para sincronizar' : 'Aguardando conexão'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isOnline && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSync();
                  }}
                  disabled={syncing}
                  className="p-2 bg-orange-500/30 rounded-lg hover:bg-orange-500/40 transition-all"
                >
                  <RefreshCw className={`w-5 h-5 text-orange-400 ${syncing ? 'animate-spin' : ''}`} />
                </button>
              )}
              {expanded ? (
                <ChevronUp className="w-5 h-5 text-orange-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-orange-400" />
              )}
            </div>
          </button>

          {/* Lista de Pendências Expandida */}
          {expanded && pendingItems.length > 0 && (
            <div className="mt-2 bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 space-y-2">
              <p className="text-white/50 text-sm mb-3">Pontos aguardando sincronização:</p>
              {pendingItems.map((item) => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-white/50" />
                    <span className="text-white text-sm">
                      Ponto registrado às {formatTimestamp(item.timestamp)}
                    </span>
                  </div>
                  <span className="text-white/30 text-xs">
                    ID: {item.id.slice(0, 8)}
                  </span>
                </div>
              ))}
              
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSync}
                  disabled={!isOnline || syncing}
                  className="flex-1 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  Sincronizar Agora
                </button>
                <button
                  onClick={clearQueue}
                  className="py-2 px-4 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium"
                >
                  Limpar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Indicador de Status (modo detalhado) */}
      {showDetails && (
        <div className="mx-4 mt-4 bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <>
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-green-400 font-medium">Online</p>
                  <p className="text-white/50 text-sm">Conectado à internet</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <WifiOff className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-yellow-400 font-medium">Offline</p>
                  <p className="text-white/50 text-sm">Modo offline ativo</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
