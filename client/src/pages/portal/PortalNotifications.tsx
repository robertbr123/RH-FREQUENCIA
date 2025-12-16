import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Bell, BellOff, Clock, CheckCircle, 
  AlertTriangle, Loader2, Smartphone, Settings, RefreshCw
} from 'lucide-react';
import { Snowfall } from '../../components/christmas';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export default function PortalNotifications() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    isSupported,
    isSubscribed,
    permission,
    settings,
    schedule,
    loading: loadingPush,
    error: pushError,
    subscribe,
    unsubscribe,
    updateSettings,
    scheduleNotifications
  } = usePushNotifications();

  // Reagendar notificações apenas uma vez quando a página abre
  const [hasScheduledOnMount, setHasScheduledOnMount] = useState(false);
  
  useEffect(() => {
    if (isSubscribed && schedule && settings && !hasScheduledOnMount && !loadingPush) {
      setHasScheduledOnMount(true);
      scheduleNotifications();
    }
  }, [isSubscribed, schedule, settings, hasScheduledOnMount, loadingPush]);

  const handleToggleNotifications = async () => {
    setSaving(true);
    setMessage(null);

    try {
      if (isSubscribed) {
        const success = await unsubscribe();
        if (success) {
          setMessage({ type: 'success', text: 'Notificações desativadas' });
        }
      } else {
        const success = await subscribe();
        if (success) {
          setMessage({ type: 'success', text: 'Notificações ativadas! Você receberá lembretes.' });
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao alterar notificações' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSetting = async (key: string, value: boolean | number) => {
    setSaving(true);
    const success = await updateSettings({ [key]: value });
    if (success) {
      setMessage({ type: 'success', text: 'Configuração salva!' });
    } else {
      setMessage({ type: 'error', text: 'Erro ao salvar' });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleRefreshNotifications = async () => {
    setSaving(true);
    await scheduleNotifications();
    setMessage({ type: 'success', text: 'Lembretes reagendados para hoje!' });
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const formatTime = (time: string | null) => {
    if (!time) return '--:--';
    return time.substring(0, 5);
  };

  const reminderOptions = [
    { value: 3, label: '3 min' },
    { value: 5, label: '5 min' },
    { value: 10, label: '10 min' },
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
  ];

  // Verifica se o horário tem intervalo
  const hasBreak = schedule?.break_start && schedule?.break_end;

  const punchTypes = [
    { key: 'remind_entry', label: 'Entrada', time: schedule?.entry_time, color: 'green' },
    ...(hasBreak ? [
      { key: 'remind_break_start', label: 'Início Intervalo', time: schedule?.break_start, color: 'yellow' },
      { key: 'remind_break_end', label: 'Fim Intervalo', time: schedule?.break_end, color: 'blue' },
    ] : []),
    { key: 'remind_exit', label: 'Saída', time: schedule?.exit_time, color: 'red' },
  ];

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
          <h1 className="text-white font-semibold">Notificações</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="pt-20 px-4 max-w-2xl mx-auto">
        {/* Mensagem de feedback */}
        {message && (
          <div className={`mb-4 p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-red-500/20 text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {pushError && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/20 text-red-400 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            {pushError}
          </div>
        )}

        {/* Status de Suporte */}
        {!isSupported && (
          <div className="mb-4 p-4 rounded-xl bg-yellow-500/20 border border-yellow-500/30">
            <div className="flex items-start gap-3">
              <Smartphone className="w-6 h-6 text-yellow-400 flex-shrink-0" />
              <div>
                <p className="text-yellow-400 font-medium">Notificações não suportadas</p>
                <p className="text-yellow-400/70 text-sm mt-1">
                  Seu navegador não suporta notificações push. 
                  Tente usar Chrome, Firefox ou Safari em um dispositivo compatível.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Permissão Bloqueada */}
        {isSupported && permission === 'denied' && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/20 border border-red-500/30">
            <div className="flex items-start gap-3">
              <BellOff className="w-6 h-6 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-red-400 font-medium">Notificações bloqueadas</p>
                <p className="text-red-400/70 text-sm mt-1">
                  Você bloqueou as notificações. Para habilitar, acesse as configurações 
                  do seu navegador e permita notificações para este site.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Card Principal - Ativar/Desativar */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isSubscribed ? 'bg-green-500/20' : 'bg-white/10'
              }`}>
                {isSubscribed ? (
                  <Bell className="w-6 h-6 text-green-400" />
                ) : (
                  <BellOff className="w-6 h-6 text-white/50" />
                )}
              </div>
              <div>
                <p className="text-white font-semibold">Lembretes de Ponto</p>
                <p className="text-white/50 text-sm">
                  {isSubscribed ? 'Ativo - Você receberá lembretes' : 'Inativo'}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleToggleNotifications}
              disabled={!isSupported || saving || loadingPush || permission === 'denied'}
              className={`relative w-14 h-8 rounded-full transition-all ${
                isSubscribed ? 'bg-green-500' : 'bg-white/20'
              } ${(!isSupported || permission === 'denied') ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {saving || loadingPush ? (
                <Loader2 className="w-5 h-5 text-white absolute top-1.5 left-1/2 -translate-x-1/2 animate-spin" />
              ) : (
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${
                  isSubscribed ? 'left-7' : 'left-1'
                }`} />
              )}
            </button>
          </div>
        </div>

        {/* Card Notificações do RH */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                Notification.permission === 'granted' ? 'bg-purple-500/20' : 'bg-white/10'
              }`}>
                {Notification.permission === 'granted' ? (
                  <Bell className="w-6 h-6 text-purple-400" />
                ) : (
                  <BellOff className="w-6 h-6 text-white/50" />
                )}
              </div>
              <div>
                <p className="text-white font-semibold">Mensagens do RH</p>
                <p className="text-white/50 text-sm">
                  {Notification.permission === 'granted' 
                    ? 'Ativo - Você receberá avisos do RH' 
                    : Notification.permission === 'denied'
                    ? 'Bloqueado nas configurações'
                    : 'Toque para ativar'}
                </p>
              </div>
            </div>
            
            {Notification.permission === 'default' && (
              <button
                onClick={async () => {
                  const permission = await Notification.requestPermission();
                  if (permission === 'granted') {
                    setMessage({ type: 'success', text: 'Notificações do RH ativadas!' });
                    // Forçar re-render
                    setSaving(true);
                    setTimeout(() => setSaving(false), 100);
                  }
                }}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-all"
              >
                Ativar
              </button>
            )}
            
            {Notification.permission === 'granted' && (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Ativo</span>
              </div>
            )}
          </div>
          
          {Notification.permission === 'granted' && (
            <div className="mt-4 p-3 bg-purple-500/10 rounded-xl">
              <p className="text-purple-300 text-sm">
                📬 Você receberá notificações mesmo com o app minimizado quando o RH 
                enviar avisos importantes.
              </p>
            </div>
          )}
          
          {Notification.permission === 'denied' && (
            <div className="mt-4 p-3 bg-red-500/10 rounded-xl">
              <p className="text-red-300 text-sm">
                ⚠️ Para receber mensagens do RH, você precisa permitir notificações 
                nas configurações do navegador.
              </p>
            </div>
          )}
        </div>

        {/* Configurações de Lembretes */}
        {isSubscribed && settings && (
          <>
            {/* Tempo de Antecedência */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 mb-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                Tempo de Antecedência
              </h3>
              <p className="text-white/50 text-sm mb-4">
                Receba o lembrete quantos minutos antes do horário?
              </p>
              
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {reminderOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleUpdateSetting('reminder_minutes', option.value)}
                    disabled={saving}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      settings.reminder_minutes === option.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tipos de Lembrete */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 mb-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                Tipos de Lembrete
              </h3>
              <p className="text-white/50 text-sm mb-4">
                Escolha para quais registros deseja receber lembretes:
              </p>

              <div className="space-y-3">
                {punchTypes.map((punch) => {
                  const isEnabled = settings[punch.key as keyof typeof settings];
                  
                  return (
                    <div 
                      key={punch.key}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full bg-${punch.color}-500`} />
                        <div>
                          <p className="text-white font-medium">{punch.label}</p>
                          <p className="text-white/50 text-sm">
                            Horário: {formatTime(punch.time || null)}
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleUpdateSetting(punch.key, !isEnabled)}
                        disabled={saving}
                        className={`w-12 h-7 rounded-full transition-all ${
                          isEnabled ? 'bg-green-500' : 'bg-white/20'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full transition-all mx-1 ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Escala do Funcionário */}
            {loadingPush ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            ) : schedule ? (
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">Sua Escala</h3>
                  <button
                    onClick={handleRefreshNotifications}
                    disabled={saving}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30 transition-all"
                  >
                    <RefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
                    Reagendar
                  </button>
                </div>
                <div className={`grid ${hasBreak ? 'grid-cols-2 gap-4' : 'grid-cols-2 gap-4'}`}>
                  <div className="text-center p-3 rounded-xl bg-green-500/10">
                    <p className="text-green-400 font-mono text-xl">{formatTime(schedule.entry_time)}</p>
                    <p className="text-white/50 text-xs mt-1">Entrada</p>
                  </div>
                  {hasBreak && (
                    <>
                      <div className="text-center p-3 rounded-xl bg-yellow-500/10">
                        <p className="text-yellow-400 font-mono text-xl">{formatTime(schedule.break_start)}</p>
                        <p className="text-white/50 text-xs mt-1">Início Intervalo</p>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-blue-500/10">
                        <p className="text-blue-400 font-mono text-xl">{formatTime(schedule.break_end)}</p>
                        <p className="text-white/50 text-xs mt-1">Fim Intervalo</p>
                      </div>
                    </>
                  )}
                  <div className="text-center p-3 rounded-xl bg-red-500/10">
                    <p className="text-red-400 font-mono text-xl">{formatTime(schedule.exit_time)}</p>
                    <p className="text-white/50 text-xs mt-1">Saída</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <p className="text-yellow-400 text-sm flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>
                    Você não possui uma escala definida. 
                    Entre em contato com o RH para configurar seus horários.
                  </span>
                </p>
              </div>
            )}
          </>
        )}

        {/* Informações */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <p className="text-blue-400 text-sm">
            <strong>Como funciona:</strong> Você receberá uma notificação no seu dispositivo 
            alguns minutos antes do horário definido para cada registro de ponto, 
            mesmo que o aplicativo esteja fechado.
          </p>
        </div>
      </main>
    </div>
  );
}
