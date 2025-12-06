import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface NotificationSettings {
  push_enabled: boolean;
  reminder_minutes: number;
  remind_entry: boolean;
  remind_break_start: boolean;
  remind_break_end: boolean;
  remind_exit: boolean;
}

interface Schedule {
  entry_time: string;
  break_start: string;
  break_end: string;
  exit_time: string;
}

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | 'unsupported';
  settings: NotificationSettings | null;
  schedule: Schedule | null;
  loading: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
  scheduleNotifications: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);

  // Verificar suporte e status inicial
  useEffect(() => {
    const checkSupport = async () => {
      // Verificar se o navegador suporta
      const supported = 'serviceWorker' in navigator && 
                       'Notification' in window;
      
      setIsSupported(supported);
      
      if (!supported) {
        setPermission('unsupported');
        setLoading(false);
        return;
      }

      setPermission(Notification.permission);

      // Verificar se já está ativo
      try {
        const [settingsRes, scheduleRes] = await Promise.all([
          axios.get('/api/portal/push/settings'),
          axios.get('/api/portal/schedule')
        ]);
        
        setSettings(settingsRes.data);
        setSchedule(scheduleRes.data.schedule);
        setIsSubscribed(settingsRes.data.push_enabled && Notification.permission === 'granted');
      } catch (err) {
        console.error('Erro ao verificar notificações:', err);
      }

      setLoading(false);
    };

    checkSupport();
  }, []);

  // Agendar notificações quando as configurações mudam
  const scheduleNotifications = useCallback(async () => {
    if (!isSupported || !settings?.push_enabled || !schedule) return;
    if (Notification.permission !== 'granted') return;
    if (isScheduling) return; // Evitar agendamentos duplicados

    setIsScheduling(true);
    
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Enviar mensagem para o Service Worker agendar as notificações
      registration.active?.postMessage({
        type: 'SCHEDULE_NOTIFICATIONS',
        schedule: schedule,
        reminderMinutes: settings.reminder_minutes || 5,
        settings: {
          remind_entry: settings.remind_entry,
          remind_break_start: settings.remind_break_start,
          remind_break_end: settings.remind_break_end,
          remind_exit: settings.remind_exit
        }
      });
      
      console.log('Notificações agendadas com sucesso');
    } catch (err) {
      console.error('Erro ao agendar notificações:', err);
    } finally {
      // Permitir novo agendamento após um delay
      setTimeout(() => setIsScheduling(false), 1000);
    }
  }, [isSupported, settings, schedule, isScheduling]);

  // Reagendar apenas na primeira carga quando tudo estiver pronto
  const [hasInitialSchedule, setHasInitialSchedule] = useState(false);
  
  useEffect(() => {
    if (isSubscribed && settings && schedule && !hasInitialSchedule && !loading) {
      setHasInitialSchedule(true);
      scheduleNotifications();
    }
  }, [isSubscribed, settings, schedule, hasInitialSchedule, loading]);

  // Solicitar permissão
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (err) {
      console.error('Erro ao solicitar permissão:', err);
      return false;
    }
  }, [isSupported]);

  // Ativar notificações
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Notificações não suportadas neste navegador');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Solicitar permissão se necessário
      if (Notification.permission === 'default') {
        const granted = await requestPermission();
        if (!granted) {
          setError('Permissão negada para notificações');
          setLoading(false);
          return false;
        }
      } else if (Notification.permission === 'denied') {
        setError('Notificações bloqueadas. Habilite nas configurações do navegador.');
        setLoading(false);
        return false;
      }

      // Registrar service worker se necessário
      await navigator.serviceWorker.ready;

      // Salvar configuração no servidor
      await axios.put('/api/portal/push/settings', {
        ...settings,
        push_enabled: true
      });

      // Buscar escala atualizada
      const scheduleRes = await axios.get('/api/portal/schedule');
      setSchedule(scheduleRes.data.schedule);

      // Atualizar estado local
      setSettings((prev: NotificationSettings | null) => prev ? { ...prev, push_enabled: true } : null);
      setIsSubscribed(true);
      
      // Agendar notificações
      setTimeout(() => scheduleNotifications(), 500);

      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Erro ao ativar notificações:', err);
      setError(err.message || 'Erro ao ativar notificações');
      setLoading(false);
      return false;
    }
  }, [isSupported, settings, requestPermission, scheduleNotifications]);

  // Desativar notificações
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    setLoading(true);
    setError(null);

    try {
      // Cancelar notificações agendadas
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({
        type: 'CANCEL_NOTIFICATIONS'
      });

      // Salvar no servidor
      await axios.put('/api/portal/push/settings', {
        ...settings,
        push_enabled: false
      });

      setSettings((prev: NotificationSettings | null) => prev ? { ...prev, push_enabled: false } : null);
      setIsSubscribed(false);
      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Erro ao desativar notificações:', err);
      setError(err.message || 'Erro ao desativar notificações');
      setLoading(false);
      return false;
    }
  }, [isSupported, settings]);

  // Atualizar configurações
  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const merged = { ...settings, ...newSettings };
      await axios.put('/api/portal/push/settings', merged);
      setSettings(merged as NotificationSettings);
      
      // Reagendar notificações com novas configurações
      if (isSubscribed) {
        setTimeout(() => scheduleNotifications(), 500);
      }
      
      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Erro ao atualizar configurações:', err);
      setError(err.message || 'Erro ao salvar configurações');
      setLoading(false);
      return false;
    }
  }, [settings, isSubscribed, scheduleNotifications]);

  return {
    isSupported,
    isSubscribed,
    permission,
    settings,
    schedule,
    loading,
    error,
    subscribe,
    unsubscribe,
    updateSettings,
    requestPermission,
    scheduleNotifications
  };
}

export default usePushNotifications;
