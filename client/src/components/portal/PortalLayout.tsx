import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { usePortalAuth } from '../../context/PortalAuthContext';
import axios from 'axios';
import { 
  Home, Camera, Calendar, User, 
  Download, X, Share, Inbox
} from 'lucide-react';
import NotificationToast from './NotificationToast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PortalNotification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  created_at: string;
}

export default function PortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = usePortalAuth();
  
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  
  // Estados para toast de notificação
  const [toastNotification, setToastNotification] = useState<PortalNotification | null>(null);
  const lastNotificationIdRef = useRef<number | null>(null);
  const shownNotificationsRef = useRef<Set<number>>(new Set());

  // Iniciar verificação de notificações em background no Service Worker
  useEffect(() => {
    const startBackgroundNotifications = async () => {
      // Verificar se Service Worker está disponível
      if (!('serviceWorker' in navigator)) return;
      
      try {
        const registration = await navigator.serviceWorker.ready;
        
        // Pegar o token do localStorage
        const token = localStorage.getItem('portal_token');
        if (!token) return;
        
        // Solicitar permissão de notificações se ainda não concedida
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            console.log('Permissão de notificações negada');
            return;
          }
        }
        
        if (Notification.permission !== 'granted') {
          console.log('Notificações bloqueadas pelo usuário');
          return;
        }
        
        // Enviar mensagem para o Service Worker iniciar a verificação
        registration.active?.postMessage({
          type: 'START_NOTIFICATION_CHECK',
          token: token,
          lastNotificationId: lastNotificationIdRef.current || 0
        });
        
        console.log('Verificação de notificações em background iniciada');
      } catch (error) {
        console.error('Erro ao iniciar notificações em background:', error);
      }
    };

    startBackgroundNotifications();

    // Ouvir mensagens do Service Worker
    const handleSWMessage = (event: MessageEvent) => {
      const { type, notification, unreadCount } = event.data || {};
      
      if (type === 'NEW_ADMIN_NOTIFICATION' && notification) {
        // Atualizar contador
        if (unreadCount !== undefined) {
          setUnreadNotifications(unreadCount);
        }
        
        // Mostrar toast se a página estiver visível e não for inbox
        if (document.visibilityState === 'visible' && location.pathname !== '/portal/inbox') {
          if (!shownNotificationsRef.current.has(notification.id)) {
            setToastNotification(notification);
            shownNotificationsRef.current.add(notification.id);
          }
        }
        
        // Atualizar último ID conhecido
        if (notification.id > (lastNotificationIdRef.current || 0)) {
          lastNotificationIdRef.current = notification.id;
        }
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    // Parar verificação ao desmontar
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, [location.pathname]);

  // Buscar contagem de notificações não lidas e verificar novas
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await axios.get('/api/portal/notifications');
        const notifications: PortalNotification[] = res.data.notifications || [];
        const unreadCount = res.data.unread_count || 0;
        
        setUnreadNotifications(unreadCount);

        // Verificar se há nova notificação não lida que ainda não foi mostrada
        const unreadNotifs = notifications.filter((n: PortalNotification) => !n.is_read);
        
        if (unreadNotifs.length > 0) {
          // Pegar a notificação mais recente não lida
          const latestUnread = unreadNotifs[0];
          
          // Só mostrar toast se:
          // 1. Não for a página de inbox (para não duplicar)
          // 2. A notificação ainda não foi mostrada nesta sessão
          // 3. Não estamos na primeira carga (evitar toast ao abrir o app)
          if (
            location.pathname !== '/portal/inbox' &&
            !shownNotificationsRef.current.has(latestUnread.id) &&
            lastNotificationIdRef.current !== null &&
            latestUnread.id > lastNotificationIdRef.current
          ) {
            // Mostrar toast
            setToastNotification(latestUnread);
            shownNotificationsRef.current.add(latestUnread.id);
          }
          
          // Atualizar o ID da última notificação conhecida
          if (lastNotificationIdRef.current === null || latestUnread.id > lastNotificationIdRef.current) {
            lastNotificationIdRef.current = latestUnread.id;
          }
        }
        
        // Na primeira carga, apenas registrar o último ID sem mostrar toast
        if (lastNotificationIdRef.current === null && notifications.length > 0) {
          lastNotificationIdRef.current = notifications[0].id;
        }
      } catch (error: unknown) {
        // Se token inválido/expirado, fazer logout
        if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
          console.log('Token inválido, fazendo logout...');
          logout();
          navigate('/portal/login');
          return;
        }
        console.error('Erro ao buscar notificações:', error);
      }
    };

    fetchNotifications();
    
    // Verificar a cada 30 segundos (sincronizado com o Service Worker)
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  // Marcar notificação como lida
  const handleMarkAsRead = async (id: number) => {
    try {
      await axios.put(`/api/portal/notifications/${id}/read`);
      setUnreadNotifications((prev: number) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  // Fechar toast
  const handleCloseToast = () => {
    setToastNotification(null);
  };

  // Detectar se é iOS e se está em modo standalone
  useEffect(() => {
    const ua = window.navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua);
    setIsIOS(iOS);
    
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    
    // Se não está instalado, mostrar banner após 3 segundos
    if (!standalone) {
      const timer = setTimeout(() => {
        const dismissed = localStorage.getItem('pwa_install_dismissed');
        if (!dismissed) {
          setShowInstallBanner(true);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Capturar evento de instalação (Android/Desktop)
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }
    
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  const navItems = [
    { icon: Home, label: 'Início', path: '/portal' },
    { icon: Camera, label: 'Ponto', path: '/portal/ponto' },
    { icon: Inbox, label: 'Inbox', path: '/portal/inbox', badge: unreadNotifications > 0 ? unreadNotifications : undefined },
    { icon: Calendar, label: 'Frequência', path: '/portal/frequencia' },
    { icon: User, label: 'Perfil', path: '/portal/perfil' },
  ];

  // Não mostrar navegação em telas específicas
  const hideNav = ['/portal/login', '/portal/trocar-senha'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Toast de Notificação */}
      <NotificationToast
        notification={toastNotification}
        onClose={handleCloseToast}
        onMarkAsRead={handleMarkAsRead}
      />

      {/* Banner de Instalação */}
      {showInstallBanner && !isStandalone && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 safe-top">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Instalar App</p>
                <p className="text-xs text-white/80">Acesso rápido ao portal</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="px-4 py-2 bg-white text-blue-600 font-semibold rounded-lg text-sm hover:bg-white/90 transition-all active:scale-95"
              >
                Instalar
              </button>
              <button onClick={dismissInstallBanner} className="p-2 text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de instruções iOS */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-end justify-center">
          <div className="bg-slate-800 rounded-t-3xl w-full max-w-lg p-6 pb-safe animate-slideUp">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Instalar no iPhone</h3>
              <button onClick={() => setShowIOSInstructions(false)} className="text-white/70">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-400 font-bold">1</span>
                </div>
                <div>
                  <p className="text-white font-medium">Toque no botão de compartilhar</p>
                  <p className="text-white/60 text-sm">
                    Na barra inferior do Safari, toque em 
                    <Share className="w-4 h-4 inline mx-1" />
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-400 font-bold">2</span>
                </div>
                <div>
                  <p className="text-white font-medium">Role e toque em "Adicionar à Tela de Início"</p>
                  <p className="text-white/60 text-sm">
                    Pode precisar rolar para baixo no menu
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-400 font-bold">3</span>
                </div>
                <div>
                  <p className="text-white font-medium">Confirme tocando em "Adicionar"</p>
                  <p className="text-white/60 text-sm">
                    O app aparecerá na sua tela inicial
                  </p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowIOSInstructions(false)}
              className="w-full mt-6 py-3 bg-blue-500 text-white font-semibold rounded-xl active:scale-[0.98]"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <div className={hideNav ? '' : 'pb-20'}>
        <Outlet />
      </div>

      {/* Navegação inferior (estilo app mobile) */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 safe-bottom z-50">
          <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              // Mostrar badge de notificações não lidas no Inbox
              const showNotificationBadge = item.badge && item.badge > 0;
              
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`relative flex flex-col items-center justify-center w-16 h-full transition-all ${
                    isActive ? 'text-blue-400' : 'text-white/50'
                  }`}
                >
                  <div className="relative">
                    <item.icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
                    {showNotificationBadge && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-[8px] text-white font-bold">{item.badge! > 9 ? '9+' : item.badge}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                  {isActive && (
                    <div className="absolute top-0 w-12 h-1 bg-blue-400 rounded-b-full" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* CSS para safe areas */}
      <style>{`
        .safe-top {
          padding-top: env(safe-area-inset-top);
        }
        .safe-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom);
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slide-down {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
