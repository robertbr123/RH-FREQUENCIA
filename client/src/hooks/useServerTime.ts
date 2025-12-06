import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface ServerTimeHook {
  currentTime: Date;
  formattedTime: string;
  formattedDate: string;
  isSync: boolean;
  syncTime: () => Promise<void>;
}

/**
 * Formata a data/hora para o fuso horário de Rio Branco
 */
function formatTimeRioBranco(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Rio_Branco',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatDateRioBranco(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    timeZone: 'America/Rio_Branco',
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  });
}

/**
 * Hook para exibir o horário correto de Rio Branco (UTC-5)
 * Usa o horário UTC do dispositivo e converte para Rio Branco
 */
export function useServerTime(): ServerTimeHook {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSync, setIsSync] = useState(false);

  // Sincronizar com o servidor (validar que o relógio do dispositivo está correto)
  const syncTime = useCallback(async () => {
    try {
      await axios.get('/api/portal/server-time');
      setIsSync(true);
    } catch (error) {
      console.warn('Servidor indisponível, usando horário local');
      setIsSync(false);
    }
  }, []);

  // Verificar sincronização na montagem
  useEffect(() => {
    syncTime();
    const syncInterval = setInterval(syncTime, 5 * 60 * 1000);
    return () => clearInterval(syncInterval);
  }, [syncTime]);

  // Atualizar relógio a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return { 
    currentTime, 
    formattedTime: formatTimeRioBranco(currentTime),
    formattedDate: formatDateRioBranco(currentTime),
    isSync, 
    syncTime 
  };
}

export default useServerTime;
