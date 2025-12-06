import { useState, useEffect } from 'react'

/**
 * Hook para detectar se Caps Lock está ativado
 */
export function useCapsLock() {
  const [isCapsLock, setIsCapsLock] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // getModifierState retorna true se Caps Lock está ativado
      setIsCapsLock(e.getModifierState('CapsLock'))
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      setIsCapsLock(e.getModifierState('CapsLock'))
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  return isCapsLock
}
