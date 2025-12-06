import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Hook para controlar modo fullscreen
 */
export function useFullscreen<T extends HTMLElement>() {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<T>(null)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      // Erro silencioso - funcionalidade não crítica
    }
  }, [])

  return {
    isFullscreen,
    containerRef,
    toggleFullscreen
  }
}
