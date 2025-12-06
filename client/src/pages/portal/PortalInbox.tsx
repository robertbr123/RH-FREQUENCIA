import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Bell, Trash2, CheckCircle, AlertTriangle, 
  Info, AlertCircle, Loader2, X, Check, Inbox
} from 'lucide-react';
import { Snowfall } from '../../components/christmas';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export default function PortalInbox() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/portal/notifications');
      setNotifications(res.data.notifications);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    setActionLoading(id);
    try {
      await axios.put(`/api/portal/notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao marcar como lida' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    setActionLoading(-1);
    try {
      await axios.put('/api/portal/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setMessage({ type: 'success', text: 'Todas marcadas como lidas' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao marcar todas' });
    } finally {
      setActionLoading(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDelete = async (id: number) => {
    setActionLoading(id);
    try {
      await axios.delete(`/api/portal/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setMessage({ type: 'success', text: 'Notificação excluída' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao excluir' });
    } finally {
      setActionLoading(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleClearRead = async () => {
    if (!confirm('Excluir todas as notificações lidas?')) return;
    
    setActionLoading(-2);
    try {
      const res = await axios.delete('/api/portal/notifications/clear/read');
      setNotifications(prev => prev.filter(n => !n.is_read));
      setMessage({ type: 'success', text: `${res.data.deleted_count} notificações excluídas` });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao limpar' });
    } finally {
      setActionLoading(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    // Marcar como lida ao clicar
    if (!notif.is_read) {
      handleMarkAsRead(notif.id);
    }
    // Navegar se tiver link
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const typeConfig = {
    info: { icon: Info, color: 'blue', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
    warning: { icon: AlertTriangle, color: 'yellow', bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-400' },
    success: { icon: CheckCircle, color: 'green', bgColor: 'bg-green-500/20', textColor: 'text-green-400' },
    error: { icon: AlertCircle, color: 'red', bgColor: 'bg-red-500/20', textColor: 'text-red-400' }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const readCount = notifications.filter(n => n.is_read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 pb-24">
      <Snowfall count={15} />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => navigate('/portal')} className="text-white flex items-center gap-2">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Voltar</span>
          </button>
          <h1 className="text-white font-semibold flex items-center gap-2">
            <Inbox className="w-5 h-5" />
            Caixa de Entrada
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="pt-20 px-4 max-w-2xl mx-auto">
        {/* Feedback */}
        {message && (
          <div className={`mb-4 p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-red-500/20 text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message.text}
            <button onClick={() => setMessage(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Ações em Lote */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="text-white/70 text-sm">
              {unreadCount > 0 ? (
                <span className="text-blue-400">{unreadCount} não lida(s)</span>
              ) : (
                <span>Todas lidas</span>
              )}
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={actionLoading === -1}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition-all"
                >
                  {actionLoading === -1 ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">Marcar todas</span>
                </button>
              )}
              {readCount > 0 && (
                <button
                  onClick={handleClearRead}
                  disabled={actionLoading === -2}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-all"
                >
                  {actionLoading === -2 ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">Limpar lidas</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Lista de Notificações */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/50">Nenhuma notificação</p>
            <p className="text-white/30 text-sm mt-1">
              As notificações do RH aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => {
              const config = typeConfig[notif.type] || typeConfig.info;
              const Icon = config.icon;
              
              return (
                <div
                  key={notif.id}
                  className={`relative bg-white/5 backdrop-blur-xl rounded-xl border transition-all ${
                    notif.is_read 
                      ? 'border-white/5 opacity-70' 
                      : 'border-white/20 shadow-lg'
                  }`}
                >
                  {/* Indicador de não lida */}
                  {!notif.is_read && (
                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  )}
                  
                  <div 
                    className={`p-4 ${notif.link ? 'cursor-pointer hover:bg-white/5' : ''}`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${config.bgColor} flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${config.textColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-white font-medium">{notif.title}</h3>
                          <span className="text-white/40 text-xs whitespace-nowrap">
                            {formatDate(notif.created_at)}
                          </span>
                        </div>
                        <p className="text-white/60 text-sm mt-1">{notif.message}</p>
                        {notif.link && (
                          <p className="text-blue-400 text-xs mt-2">Toque para ver mais →</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Ações */}
                  <div className="flex items-center justify-end gap-2 px-4 pb-3">
                    {!notif.is_read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notif.id); }}
                        disabled={actionLoading === notif.id}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-white/50 hover:text-white/80 transition-colors"
                      >
                        {actionLoading === notif.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        Marcar como lida
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(notif.id); }}
                      disabled={actionLoading === notif.id}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-red-400/70 hover:text-red-400 transition-colors"
                    >
                      {actionLoading === notif.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info */}
        <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-white/50 text-sm text-center">
            💡 Dica: Configure <button onClick={() => navigate('/portal/notificacoes')} className="text-blue-400 underline">lembretes de ponto</button> para receber avisos automáticos.
          </p>
        </div>
      </main>
    </div>
  );
}
