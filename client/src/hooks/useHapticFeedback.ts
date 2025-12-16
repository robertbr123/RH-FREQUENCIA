import { useCallback } from 'react';

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

/**
 * Hook para vibração/haptic feedback em dispositivos móveis
 */
export function useHapticFeedback() {
  const vibrate = useCallback((type: HapticType = 'light') => {
    // Verificar se vibração é suportada
    if (!('vibrate' in navigator)) return;

    // Padrões de vibração para diferentes tipos
    const patterns: Record<HapticType, number | number[]> = {
      light: 10,           // Toque leve
      medium: 20,          // Toque médio
      heavy: 30,           // Toque forte
      success: [50, 50, 50], // Sucesso (triplo curto)
      warning: [100, 50, 100], // Aviso
      error: [150, 100, 150, 100, 150], // Erro (triplo longo)
      selection: 5         // Seleção (muito leve)
    };

    try {
      navigator.vibrate(patterns[type]);
    } catch (e) {
      // Silenciar erros em dispositivos que não suportam
    }
  }, []);

  // Funções de conveniência
  const lightTap = useCallback(() => vibrate('light'), [vibrate]);
  const mediumTap = useCallback(() => vibrate('medium'), [vibrate]);
  const heavyTap = useCallback(() => vibrate('heavy'), [vibrate]);
  const success = useCallback(() => vibrate('success'), [vibrate]);
  const warning = useCallback(() => vibrate('warning'), [vibrate]);
  const error = useCallback(() => vibrate('error'), [vibrate]);
  const selection = useCallback(() => vibrate('selection'), [vibrate]);

  return {
    vibrate,
    lightTap,
    mediumTap,
    heavyTap,
    success,
    warning,
    error,
    selection,
    isSupported: 'vibrate' in navigator
  };
}
