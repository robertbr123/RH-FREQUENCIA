import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, ChevronRight, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  created_at: string;
}

interface NotificationToastProps {
  notification: Notification | null;
  onClose: () => void;
  onMarkAsRead: (id: number) => void;
}

export default function NotificationToast({ notification, onClose, onMarkAsRead }: NotificationToastProps) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (notification) {
      // Pequeno delay para animação de entrada
      setTimeout(() => setIsVisible(true), 100);
      
      // Auto-close após 8 segundos
      const timer = setTimeout(() => {
        handleClose();
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsLeaving(false);
      onClose();
    }, 300);
  };

  const handleClick = () => {
    if (notification) {
      onMarkAsRead(notification.id);
      navigate('/portal/inbox');
      handleClose();
    }
  };

  const typeConfig = {
    info: { 
      icon: Info, 
      gradient: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-400/20',
      iconColor: 'text-blue-300'
    },
    warning: { 
      icon: AlertTriangle, 
      gradient: 'from-yellow-500 to-orange-500',
      iconBg: 'bg-yellow-400/20',
      iconColor: 'text-yellow-300'
    },
    success: { 
      icon: CheckCircle, 
      gradient: 'from-green-500 to-emerald-500',
      iconBg: 'bg-green-400/20',
      iconColor: 'text-green-300'
    },
    error: { 
      icon: AlertCircle, 
      gradient: 'from-red-500 to-red-600',
      iconBg: 'bg-red-400/20',
      iconColor: 'text-red-300'
    }
  };

  if (!notification) return null;

  const config = typeConfig[notification.type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <>
      {/* Backdrop com blur sutil */}
      <div 
        className={`fixed inset-0 z-[200] transition-opacity duration-300 ${
          isVisible && !isLeaving ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}
        onClick={handleClose}
      />

      {/* Toast Container */}
      <div 
        className={`fixed top-4 left-4 right-4 z-[201] max-w-md mx-auto transition-all duration-300 ${
          isVisible && !isLeaving 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 -translate-y-full'
        }`}
      >
        {/* Toast Card */}
        <div className={`relative overflow-hidden rounded-2xl shadow-2xl bg-gradient-to-r ${config.gradient}`}>
          {/* Efeito de brilho animado */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -inset-[100%] animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          {/* Ícone de sino animado no canto */}
          <div className="absolute top-2 right-2">
            <div className="animate-bounce">
              <Bell className="w-5 h-5 text-white/50" />
            </div>
          </div>

          {/* Conteúdo */}
          <div className="relative p-4">
            <div className="flex items-start gap-3">
              {/* Ícone do tipo */}
              <div className={`p-2.5 rounded-xl ${config.iconBg} flex-shrink-0`}>
                <Icon className={`w-6 h-6 ${config.iconColor}`} />
              </div>

              {/* Texto */}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white/70 text-xs font-medium uppercase tracking-wider">
                    Nova Notificação
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                </div>
                <h4 className="text-white font-bold text-lg leading-tight truncate">
                  {notification.title}
                </h4>
                <p className="text-white/80 text-sm mt-1 line-clamp-2">
                  {notification.message}
                </p>
              </div>
            </div>

            {/* Botão de Ver */}
            <button
              onClick={handleClick}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-white font-semibold text-sm transition-all active:scale-[0.98]"
            >
              Ver Mensagem
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Botão Fechar */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-8 p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white/70 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Barra de progresso */}
          <div className="h-1 bg-black/20">
            <div 
              className="h-full bg-white/50 animate-[shrink_8s_linear]"
              style={{ transformOrigin: 'left' }}
            />
          </div>
        </div>
      </div>

      {/* Estilos de animação */}
      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  );
}
