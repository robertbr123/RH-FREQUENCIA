import { useState, useEffect } from 'react'

/**
 * Hook para exibir relógio em tempo real
 * Otimizado para atualizar apenas quando o segundo muda
 */
export function useClock() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    let frameId: number
    let lastSecond = new Date().getSeconds()
    
    const updateTime = () => {
      const now = new Date()
      const currentSecond = now.getSeconds()
      
      // Só atualizar quando o segundo muda
      if (currentSecond !== lastSecond) {
        setCurrentTime(now)
        lastSecond = currentSecond
      }
      
      frameId = requestAnimationFrame(updateTime)
    }
    
    frameId = requestAnimationFrame(updateTime)
    return () => cancelAnimationFrame(frameId)
  }, [])

  return currentTime
}
