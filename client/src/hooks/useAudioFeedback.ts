import { useCallback } from 'react'

// Tipos de ponto
type PunchType = 'entry' | 'break_start' | 'break_end' | 'exit'

// Configuração de volume (pode ser expandido para usar localStorage/Context)
const DEFAULT_VOLUME = 0.5

/**
 * Hook para reproduzir sons de feedback com suporte a diferentes tipos de ponto,
 * vibração mobile e volume configurável
 */
export function useAudioFeedback() {
  // Função auxiliar para tocar um beep individual
  const playBeep = useCallback((
    audioContext: AudioContext,
    startTime: number,
    frequency: number,
    duration: number,
    volume: number
  ) => {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    
    oscillator.frequency.value = frequency
    oscillator.type = 'sine'
    
    gain.gain.setValueAtTime(volume, startTime)
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
    
    oscillator.start(startTime)
    oscillator.stop(startTime + duration)
  }, [])

  // Função para vibrar o dispositivo (se suportado)
  const vibrate = useCallback((pattern: number | number[]) => {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern)
      }
    } catch (e) {
      // Vibração não suportada - ignorar
    }
  }, [])

  // Som de ENTRADA - Melodia ascendente alegre (do-mi-sol)
  const playEntrySound = useCallback((volume = DEFAULT_VOLUME) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      if (audioContext.state === 'suspended') audioContext.resume()
      
      const now = audioContext.currentTime
      const noteDuration = 0.12
      const gap = 0.03
      
      // Acorde ascendente (Dó-Mi-Sol) - sensação de início
      playBeep(audioContext, now, 523, noteDuration, volume)                    // Dó
      playBeep(audioContext, now + noteDuration + gap, 659, noteDuration, volume) // Mi
      playBeep(audioContext, now + (noteDuration + gap) * 2, 784, noteDuration * 1.5, volume) // Sol (mais longo)
      
      vibrate([50, 30, 50]) // Vibração dupla curta
    } catch (e) {}
  }, [playBeep, vibrate])

  // Som de INÍCIO INTERVALO - Melodia suave descendente
  const playBreakStartSound = useCallback((volume = DEFAULT_VOLUME) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      if (audioContext.state === 'suspended') audioContext.resume()
      
      const now = audioContext.currentTime
      const noteDuration = 0.15
      
      // Duas notas descendentes suaves - sensação de pausa
      playBeep(audioContext, now, 659, noteDuration, volume * 0.8)      // Mi
      playBeep(audioContext, now + noteDuration + 0.05, 523, noteDuration * 1.2, volume * 0.7) // Dó
      
      vibrate(100) // Vibração única média
    } catch (e) {}
  }, [playBeep, vibrate])

  // Som de FIM INTERVALO - Melodia ascendente de retorno
  const playBreakEndSound = useCallback((volume = DEFAULT_VOLUME) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      if (audioContext.state === 'suspended') audioContext.resume()
      
      const now = audioContext.currentTime
      const noteDuration = 0.1
      const gap = 0.02
      
      // Três notas rápidas ascendentes - sensação de retorno energético
      playBeep(audioContext, now, 440, noteDuration, volume * 0.7)                // Lá
      playBeep(audioContext, now + noteDuration + gap, 523, noteDuration, volume * 0.8) // Dó
      playBeep(audioContext, now + (noteDuration + gap) * 2, 659, noteDuration, volume) // Mi
      
      vibrate([30, 20, 30, 20, 50]) // Vibração tripla
    } catch (e) {}
  }, [playBeep, vibrate])

  // Som de SAÍDA - Melodia de encerramento (sol-mi-dó)
  const playExitSound = useCallback((volume = DEFAULT_VOLUME) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      if (audioContext.state === 'suspended') audioContext.resume()
      
      const now = audioContext.currentTime
      const noteDuration = 0.15
      const gap = 0.05
      
      // Acorde descendente completo - sensação de conclusão
      playBeep(audioContext, now, 784, noteDuration, volume)                     // Sol
      playBeep(audioContext, now + noteDuration + gap, 659, noteDuration, volume * 0.9) // Mi
      playBeep(audioContext, now + (noteDuration + gap) * 2, 523, noteDuration * 1.8, volume * 0.8) // Dó (mais longo)
      
      vibrate([100, 50, 150]) // Vibração de conclusão
    } catch (e) {}
  }, [playBeep, vibrate])

  // Som genérico de sucesso (mantido para compatibilidade)
  const playSuccessSound = useCallback((volume = DEFAULT_VOLUME) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      if (audioContext.state === 'suspended') {
        audioContext.resume()
      }
      
      const now = audioContext.currentTime
      const beepDuration = 0.15
      const gapDuration = 0.05
      
      playBeep(audioContext, now, 1000, beepDuration, volume)
      playBeep(audioContext, now + beepDuration + gapDuration, 800, beepDuration, volume)
      
      vibrate([50, 30, 50])
    } catch (e) {}
  }, [playBeep, vibrate])

  // Som de erro
  const playErrorSound = useCallback((volume = DEFAULT_VOLUME) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      if (audioContext.state === 'suspended') {
        audioContext.resume()
      }
      
      const now = audioContext.currentTime
      playBeep(audioContext, now, 300, 0.4, volume * 0.6)
      
      vibrate([200, 100, 200]) // Vibração de erro (longa)
    } catch (e) {}
  }, [playBeep, vibrate])

  // Função principal que toca o som baseado no tipo de ponto
  const playPunchSound = useCallback((punchType: PunchType, volume = DEFAULT_VOLUME) => {
    switch (punchType) {
      case 'entry':
        playEntrySound(volume)
        break
      case 'break_start':
        playBreakStartSound(volume)
        break
      case 'break_end':
        playBreakEndSound(volume)
        break
      case 'exit':
        playExitSound(volume)
        break
      default:
        playSuccessSound(volume)
    }
  }, [playEntrySound, playBreakStartSound, playBreakEndSound, playExitSound, playSuccessSound])

  return {
    playSuccessSound,
    playErrorSound,
    playPunchSound,
    playEntrySound,
    playBreakStartSound,
    playBreakEndSound,
    playExitSound,
    vibrate
  }
}
